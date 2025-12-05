import fs from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'

export default async function (req: any, res?: any) {
  const nodeReq = (req && req.node && req.node.req) ? req.node.req : (req && req.req ? req.req : req)
  const urlBase = nodeReq?.url ?? req?.url ?? '/'
  const host = nodeReq?.headers?.host ?? req?.headers?.host ?? 'localhost'
  const url = new URL(urlBase, `http://${host}`)
  const jobId = url.pathname.split('/').pop()

  if (!jobId) {
    const payload = { error: 'jobId required' }
    if (res) { res.statusCode = 400; res.end(JSON.stringify(payload)); return }
    return payload
  }

  const csvPath = `public/reports/${jobId}.csv`
  const metaPath = `public/reports/${jobId}.meta.json`

  try {
    let removed: string[] = []
    if (fs.existsSync(csvPath)) {
      await fs.promises.unlink(csvPath)
      removed.push(csvPath)
    }
    if (fs.existsSync(metaPath)) {
      await fs.promises.unlink(metaPath)
      removed.push(metaPath)
    }

    const payload = { jobId, removed }
    if (res) { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(payload)); return }
    return payload
  } catch (e) {
    const payload = { error: 'delete_failed', details: String(e) }
    if (res) { res.statusCode = 500; res.end(JSON.stringify(payload)); return }
    return payload
  }
}
