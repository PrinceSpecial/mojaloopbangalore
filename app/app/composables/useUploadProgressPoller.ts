import { useUploadStore } from '~/stores/useUploadStore'
import { useTransactionsStore } from '~/stores/useTransactionsStore'

let timer: ReturnType<typeof setInterval> | null = null
// track inflight fetches per job to avoid duplicate page fetches
const inFlight: Record<string, boolean> = {}

export function startUploadProgressPoller(interval = 3000) {
  if (process.server) return
  if (timer) return
  const store = useUploadStore()
  const txStore = useTransactionsStore()

  const resolveTotalRows = (file: any, job: any) => file?.totalRows ?? file?.rowCount ?? job?.totalRows

  async function tick() {
    try {
      const files = store.files.slice()
      for (const f of files) {
        if (!f.jobId) continue
        if (f.status === 'completed') continue

        const jobCache = txStore.ensureJob(f.jobId)
        // seed total rows from upload store if not already present
        const seededTotal = resolveTotalRows(f, jobCache)
        if (seededTotal && !jobCache.totalRows) {
          txStore.setTotal(f.jobId, seededTotal)
        }

        let serverCompleted = false

        // 1) fetch status meta (if available) to get totals/processed
        try {
          const res = await $fetch(`/api/payments/status/${f.jobId}`, { method: 'GET' })
          // @ts-ignore
          const processed = res.processed ?? res.processedRows ?? 0
          // @ts-ignore
          const total = res.total ?? res.totalRows ?? 0
          // @ts-ignore
          const status = res.status ?? 'processing'

          // update totals from server but keep progress driven by datatable rows
          if (total > 0) {
            txStore.setTotal(f.jobId, total)
            store.updateFile(f.id, { totalRows: total, rowCount: f.rowCount || total })
          }

          if (status === 'completed') {
            serverCompleted = true
          }
        } catch (e) {
          // ignore per-file status errors
        }

        // 2) fetch next result page in background (one page per tick)
        try {
          const jobCache = txStore.ensureJob(f.jobId)
          const nextPage = (jobCache.lastFetchedPage || 0) + 1

          // avoid duplicate fetches for same job
          const inflightKey = `${f.jobId}:${nextPage}`
          if (inFlight[inflightKey]) continue
          inFlight[inflightKey] = true

          try {
            const res = await $fetch(`/api/payments/result/${f.jobId}`, { params: { page: nextPage } })
            const data = (res as any).data as any[] | undefined

            if (!data || data.length === 0) {
              txStore.appendPage(f.jobId, nextPage, [])
            } else {
              txStore.appendPage(f.jobId, nextPage, data)
            }

            // update progress estimate from cached rows + known total
            const jobNow = txStore.ensureJob(f.jobId)
            const processedNow = jobNow.rows.length
            const totalKnown = resolveTotalRows(f, jobNow)

            let progress = f.progress ?? 0
            if (totalKnown && totalKnown > 0) {
              progress = Math.min(100, Math.round((processedNow / totalKnown) * 100))
            } else {
              // heuristic: pages fetched vs pages attempted
              const denom = Math.max(1, (jobNow.lastFetchedPage || 1) * jobNow.pageSize)
              progress = Math.min(99, Math.round((processedNow / denom) * 100))
            }
            store.updateFile(f.id, { progress, rowCount: totalKnown ?? f.rowCount, totalRows: totalKnown })

            // only mark completed when we have reached the known total rows,
            // or when the server reports completed AND we've observed empties twice
            if ((totalKnown && totalKnown > 0 && processedNow >= totalKnown) || (serverCompleted && jobNow.consecutiveEmpty >= 2)) {
              txStore.markCompleted(f.jobId)
              store.updateFile(f.id, { status: 'completed', progress: 100, rowCount: totalKnown ?? f.rowCount, totalRows: totalKnown ?? f.totalRows })

              try {
                await $fetch('/api/payments/send-file', {
                  method: 'POST',
                  body: { jobId: f.jobId }
                })
                console.log(`Fichier envoyé à n8n pour jobId ${f.jobId}`)
              } catch (err) {
                console.error("Erreur lors de l'envoi du fichier à n8n :", err)
              }
            }
          } finally {
            delete inFlight[inflightKey]
          }
        } catch (e) {
          // ignore page fetch error
        }
      }
    } catch (e) {
      // global error - ignore
    }
  }

  // run immediately then schedule
  void tick()
  timer = setInterval(tick, interval)
}

export function stopUploadProgressPoller() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
