import { defineStore } from 'pinia'
import type { MyTask } from '@/types/mes'
import { composeMyTasks } from '@/services/taskCompose'

export const useReportContext = defineStore('reportContext', {
  state: () => ({
    tasks: [] as MyTask[],
    total: 0,
    loading: false,
    error: '',
    loadedAt: 0,
    pageNo: 1,
    pageSize: 12,
    lastResult: null as Record<string, any> | null,
  }),
  getters: {
    pendingTasks: (s) => s.tasks.filter((t) => t.pendingQty > 0),
    pendingCount: (s) => s.tasks.filter((t) => t.pendingQty > 0).length,
    processShortcuts: (s) => {
      const map = new Map<string, { prcCode: string; prcName: string; count: number }>()
      s.tasks.forEach((t) => {
        if (!t.prcCode) return
        const cur = map.get(t.prcCode) || { prcCode: t.prcCode, prcName: t.prcName, count: 0 }
        cur.count += 1
        map.set(t.prcCode, cur)
      })
      return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 4)
    },
  },
  actions: {
    async load(opts?: { force?: boolean; pageNo?: number; pageSize?: number; empNo?: string; isLeader?: boolean }) {
      const now = Date.now()
      if (!opts?.force && this.loadedAt && now - this.loadedAt < 20000 && this.tasks.length) return
      this.loading = true
      this.error = ''
      try {
        const pageNo = opts?.pageNo || 1
        const pageSize = opts?.pageSize || this.pageSize
        const res = await composeMyTasks({
          pageNo,
          pageSize,
          empNo: opts?.empNo,
          isLeader: opts?.isLeader,
        })
        this.tasks = res.list
        this.total = res.total
        this.pageNo = pageNo
        this.loadedAt = Date.now()
      } catch (e: any) {
        this.tasks = []
        this.total = 0
        const msg = String(e?.message || '')
        this.error = /请求未授权|权限不足|无访问权限/.test(msg)
          ? (opts?.isLeader ? 'i18n:err.noMenuLeader' : 'i18n:err.relogin')
          : msg || 'i18n:err.loadFail'
      } finally {
        this.loading = false
      }
    },
    findTask(id: string) {
      return this.tasks.find((t) => t.id === id)
    },
    setLastResult(payload: Record<string, any>) {
      this.lastResult = payload
    },
  },
})
