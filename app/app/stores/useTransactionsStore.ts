import { defineStore } from 'pinia'

const STORAGE_KEY = 'transactionsData'

export interface JobTransactionCache {
  jobId: string
  lastFetchedPage: number
  pageSize: number
  rows: any[]
  consecutiveEmpty: number
  completed: boolean
  // optional total rows known from server meta
  totalRows?: number
}

export const useTransactionsStore = defineStore('transactions', {
  state: () => ({
    jobs: {} as Record<string, JobTransactionCache>
  }),

  actions: {
    init() {
      if (typeof window === 'undefined') return
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          this.jobs = JSON.parse(raw) as Record<string, JobTransactionCache>
        }
      } catch (e) {
        this.jobs = {}
      }
    },

    persist() {
      if (typeof window === 'undefined') return
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.jobs))
      } catch (e) {
        // ignore
      }
    },

    ensureJob(jobId: string, pageSize = 10) {
      if (!this.jobs[jobId]) {
        this.jobs[jobId] = {
          jobId,
          lastFetchedPage: 0,
          pageSize,
          rows: [],
          consecutiveEmpty: 0,
          completed: false,
          totalRows: undefined
        }
        this.persist()
      }
      return this.jobs[jobId]
    },

    appendPage(jobId: string, page: number, data: any[]) {
      const job = this.ensureJob(jobId)
      if (data && data.length > 0) {
        // Server returns rows in older->newer order per page; we display newest first.
        const batch = [...data].reverse()
        const existingSet = new Set(job.rows.map(r => JSON.stringify(r)))
        for (const r of batch) {
          const key = JSON.stringify(r)
          if (!existingSet.has(key)) {
            // insert at beginning so newest appear first
            job.rows.unshift(r)
            existingSet.add(key)
          }
        }
        job.lastFetchedPage = Math.max(job.lastFetchedPage, page)
        job.consecutiveEmpty = 0
      } else {
        job.consecutiveEmpty = (job.consecutiveEmpty ?? 0) + 1
      }
      this.persist()
    },

    setTotal(jobId: string, total: number) {
      const job = this.ensureJob(jobId)
      job.totalRows = total
      this.persist()
    },

    markCompleted(jobId: string) {
      const job = this.ensureJob(jobId)
      job.completed = true
      job.consecutiveEmpty = 0
      this.persist()
    },

    clearJob(jobId: string) {
      delete this.jobs[jobId]
      this.persist()
    }
  }
})
