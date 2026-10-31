import { num } from '@/utils/format'
import { auditState } from '@/utils/auditNotice'
import type { MyTask, WorkReportRecord } from '@/types/mes'

/** 工价、工费先不展示。改回 true 即可恢复，不必改各页面。 */
export const showWage = false

const TIME_KEY = 'wd-time-reports'
const RECENT_KEY = 'wd-recent-tasks'

export type TimeReport = WorkReportRecord & {
  mode: 'time'
  hours: number
  wage: number
  price: number
  start?: string
  end?: string
}

export const money = (v: any) => {
  const n = Math.round(num(v) * 100) / 100
  return n.toFixed(2)
}

export const isTimeWage = (type?: string) => {
  const s = String(type || '')
  return s === '3' || s.includes('计时')
}

export const taskPrice = (task?: Pick<MyTask, 'machiningUp'> | null) => num(task?.machiningUp)

export const lineWage = (row: WorkReportRecord) => {
  if (row.mode === 'time') return num(row.wage)
  const amt = num(row.wageAmt)
  if (amt > 0) return amt
  return num(row.reportQty) * num(row.machiningUp)
}

/** 已被驳回/撤回的单据不计工费 */
export const isCountableWage = (row: WorkReportRecord) => {
  const state = auditState(row)
  return state !== 'rejected' && state !== 'withdrawn'
}

export const listTimeReports = (): TimeReport[] => {
  const rows = uni.getStorageSync(TIME_KEY)
  return Array.isArray(rows) ? rows : []
}

/** 服务端计时报工记录 -> 本地 TimeReport 结构 */
export const mapServerTimeReports = (rows: any[]): TimeReport[] =>
  (rows || []).map((r) => {
    const hours = Number(r.workTime ?? r.fnQty ?? 0)
    const remark = String(r.remark || '')
    // 驳回/撤回时备注前缀为标记位，原始申报内容在 " | " 之后
    const hasMarker = remark.startsWith('[已驳回]') || remark.startsWith('[已撤回]')
    const idx = remark.indexOf('|')
    const origRemark = hasMarker ? (idx >= 0 ? remark.slice(idx + 1).trim() : '') : remark
    return {
      id: `time-${r.fnNo}`,
      reportNo: String(r.fnNo || ''),
      wtNo: String(r.owtNo || ''),
      owtNo: String(r.owtNo || ''),
      sNo: Number(r.sNo || 1),
      goodsName: String(r.goodsName || ''),
      prcName: String(r.prcName || ''),
      empNo: String(r.empNo || ''),
      reportQty: hours,
      hours,
      wage: Number(r.wageAmt || 0),
      price: Number(r.prcUp || 0),
      machiningUp: Number(r.prcUp || 0),
      remark: origRemark.replace(/^App计时报工/, '').trim(),
      rejectReason: remark.startsWith('[已驳回]')
        ? remark.slice('[已驳回]'.length).split('|')[0].trim()
        : '',
      reporter: String(r.empName || ''),
      reportTime: String(r.createDate || r.fnDate || ''),
      cFlag: String(r.cFlag ?? '0'),
      auditStatus: String(r.auditStatus || '未审核'),
      approver: String(r.approver || ''),
      appDate: String(r.appDate || ''),
      canceler: String(r.canceler || ''),
      cancelDate: String(r.cancelDate || ''),
      mode: 'time' as const,
    }
  })

/**
 * 合并服务端与本地：服务端优先，本地仅保留服务端没有的（离线草稿）。
 * 本地草稿没有 reportNo 的以本地 id 标识。
 */
export const mergeTimeReports = (server: TimeReport[], local: TimeReport[]): TimeReport[] => {
  const serverNos = new Set(server.map((r) => String(r.reportNo)))
  const extras = local.filter((r) => !serverNos.has(String(r.reportNo)))
  return [...server, ...extras]
}

export const saveTimeReport = (row: TimeReport) => {
  const rows = listTimeReports()
  rows.unshift(row)
  uni.setStorageSync(TIME_KEY, rows.slice(0, 200))
  return row
}

export const updateTimeReport = (id: string, patch: Partial<TimeReport>) => {
  const rows = listTimeReports()
  const index = rows.findIndex((row) => row.id === id || row.reportNo === id)
  if (index < 0) return null
  rows[index] = { ...rows[index], ...patch, mode: 'time' }
  uni.setStorageSync(TIME_KEY, rows.slice(0, 200))
  return rows[index]
}

export const removeTimeReport = (id: string) => {
  const rows = listTimeReports().filter((row) => row.id !== id && row.reportNo !== id)
  uni.setStorageSync(TIME_KEY, rows.slice(0, 200))
}

export const touchRecent = (id: string) => {
  const prev = recentIds().filter((item) => item !== id)
  prev.unshift(id)
  uni.setStorageSync(RECENT_KEY, prev.slice(0, 20))
}

export const recentIds = (): string[] => {
  const rows = uni.getStorageSync(RECENT_KEY)
  return Array.isArray(rows) ? rows.map(String) : []
}

export const rememberRecord = (row: WorkReportRecord) => {
  uni.setStorageSync('wd-open-record', row)
}

export const readRecord = (): WorkReportRecord | null => {
  const row = uni.getStorageSync('wd-open-record')
  return row && typeof row === 'object' ? row : null
}
