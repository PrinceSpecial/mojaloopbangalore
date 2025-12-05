import fs from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'

export default async function (req: any, res?: any) {
  // Normalize environment: handler may be called with (req,res) or (event)
  const nodeReq = (req && req.node && req.node.req) ? req.node.req : (req && req.req ? req.req : req)
  const nodeRes = res ?? (req && req.node && req.node.res) ? req.node.res : (req && req.res ? req.res : undefined)

  const urlBase = nodeReq?.url ?? req?.url ?? '/' 
  const host = nodeReq?.headers?.host ?? req?.headers?.host ?? 'localhost'
  const url = new URL(urlBase, `http://${host}`)
  const jobId = url.pathname.split('/').pop()
  if (!jobId) {
    const payload = { error: 'jobId required' }
    if (nodeRes) {
      nodeRes.statusCode = 400
      nodeRes.end(JSON.stringify(payload))
      return
    }
    return payload
  }

  const metaPath = `public/reports/${jobId}.meta.json`
  try {
    if (fs.existsSync(metaPath)) {
      const raw = await fs.promises.readFile(metaPath, 'utf8')
      try {
        const meta = JSON.parse(raw)
        if (nodeRes) {
          nodeRes.setHeader('Content-Type', 'application/json')
          nodeRes.end(JSON.stringify(meta))
          return
        }
        return meta
      } catch (parseErr) {
        // attempt a progressive repair: trim trailing characters until JSON.parse succeeds
        let candidate = raw
        const first = candidate.indexOf('{')
        if (first !== -1) candidate = candidate.substring(first)
        let repaired: any | null = null
        let attempts = 0
        while (candidate.length > 2 && attempts < 10) {
          try {
            repaired = JSON.parse(candidate)
            break
          } catch (e) {
            // remove last character and retry
            candidate = candidate.slice(0, -1)
            attempts++
          }
        }

        if (repaired) {
          try {
            await fs.promises.writeFile(metaPath, JSON.stringify(repaired), 'utf8')
          } catch (e) {
            // ignore write failures
          }
          if (nodeRes) {
            nodeRes.setHeader('Content-Type', 'application/json')
            nodeRes.end(JSON.stringify(repaired))
            return
          }
          return repaired
        }

        const payload = { error: 'invalid_meta', details: String(parseErr), content: raw }
        if (nodeRes) {
          nodeRes.statusCode = 500
          nodeRes.end(JSON.stringify(payload))
          return
        }
        return payload
      }
    }

    // if meta does not exist but CSV exists, we can return basic info
    const csvPath = `public/reports/${jobId}.csv`
    if (fs.existsSync(csvPath)) {
      // count lines as fallback
      const txt = await fs.promises.readFile(csvPath, 'utf8')
      const total = txt.split('\n').filter(l => l.trim().length > 0).length - 1
      const payload = { jobId, processed: total, total, status: 'completed' }
      if (nodeRes) {
        nodeRes.setHeader('Content-Type', 'application/json')
        nodeRes.end(JSON.stringify(payload))
        return
      }
      return payload
    }
    const payload = { error: 'not_found' }
    if (nodeRes) {
      nodeRes.statusCode = 404
      nodeRes.end(JSON.stringify(payload))
      return
    }
    return payload
  } catch (e) {
    const payload = { error: 'server_error', details: String(e) }
    if (nodeRes) {
      nodeRes.statusCode = 500
      nodeRes.end(JSON.stringify(payload))
      return
    }
    return payload
  }
}
