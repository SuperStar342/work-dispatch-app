import { num } from '@/utils/format'
import type { MyTask, WorkReportRecord } from '@/types/mes'

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

export const listTimeReports = (): TimeReport[] => {
  const rows = uni.getStorageSync(TIME_KEY)
  return Array.isArray(rows) ? rows : []
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
