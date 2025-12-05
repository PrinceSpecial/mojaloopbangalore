import { defineStore } from 'pinia'

export type UploadStatus = 'in_progress' | 'completed' | 'failed'

export interface UploadedFile {
  id: string
  filename: string
  timestamp: number
  rowCount: number
  status: UploadStatus
  jobId?: string
  // progress percentage 0-100
  progress?: number
  // optional known total rows provided by server meta
  totalRows?: number
}

const STORAGE_KEY = 'uploadedFiles'

export const useUploadStore = defineStore('upload', {
  state: () => ({
    files: [] as UploadedFile[]
  }),

  actions: {
    init() {
      if (typeof window === 'undefined') return
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          this.files = JSON.parse(raw) as UploadedFile[]
        }
      } catch (e) {
        // ignore malformed data or unavailable storage
        this.files = []
      }
    },

    persist() {
      if (typeof window === 'undefined') return
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.files))
      } catch (e) {
        // ignore storage errors (private mode, quota, etc.)
      }
    },

  addFile(payload: { filename: string; rowCount?: number; timestamp?: number; status?: UploadStatus; jobId?: string }) {
      const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
      const file: UploadedFile = {
        id,
        filename: payload.filename,
        timestamp: payload.timestamp ?? Date.now(),
        rowCount: payload.rowCount ?? 0,
        status: payload.status ?? 'in_progress',
        jobId: payload.jobId,
        progress: 0,
        // Keep a copy of expected total rows to drive progress
        totalRows: payload.rowCount ?? undefined
      }
      this.files.unshift(file)
      this.persist()
      return file
    },

    updateFile(id: string, patch: Partial<UploadedFile>) {
      const idx = this.files.findIndex(f => f.id === id)
      if (idx === -1) return false
      const current = this.files[idx]!
      if (!current) return false
      // Merge explicitly to avoid assigning `undefined` from a Partial<UploadedFile>
      this.files[idx] = {
        id: current.id,
        filename: patch.filename ?? current.filename,
        timestamp: patch.timestamp ?? current.timestamp,
        rowCount: patch.rowCount ?? current.rowCount,
        status: patch.status ?? current.status,
        jobId: patch.jobId ?? current.jobId,
        progress: patch.progress ?? current.progress,
        // keep total rows in sync with rowCount when provided
        totalRows: patch.totalRows ?? patch.rowCount ?? current.totalRows
      }
      this.persist()
      return true
    },

    removeFile(id: string) {
      this.files = this.files.filter(f => f.id !== id)
      this.persist()
    },

    clear() {
      this.files = []
      this.persist()
    }
  }
})
