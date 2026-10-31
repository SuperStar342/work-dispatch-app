import { reactive } from 'vue'
import type { WorkReportRecord } from '@/types/mes'
import { isAudited } from '@/utils/format'
import { STORAGE_KEYS } from '@/utils/config'

export type AuditState = 'audited' | 'pending' | 'unknown' | 'rejected' | 'withdrawn'

const accountOf = () => {
  const cached = uni.getStorageSync(STORAGE_KEYS.user)
  return String(cached?.account || 'anon')
}
const seenKey = () => `wd-audit-seen:${accountOf()}`

const readSeen = () => {
  const rows = uni.getStorageSync(seenKey())
  return Array.isArray(rows) ? rows.map(String) : []
}

/** 服务端备注里的驳回/撤回标记前缀 */
const REJECT_PREFIX = '[已驳回]'
const WITHDRAW_PREFIX = '[已撤回]'

/** 拆出备注里的驳回原因：[已驳回]原因 | 原备注 */
export const parseRejectReason = (remark?: string) => {
  const text = String(remark || '').trim()
  if (!text.startsWith(REJECT_PREFIX)) return ''
  return text.slice(REJECT_PREFIX.length).split('|')[0].trim()
}

/** 拆出备注里员工原始申报的内容（去掉 [已驳回]/[已撤回] 标记） */
export const parseOrigRemark = (remark?: string) => {
  const text = String(remark || '').trim()
  if (!text) return ''
  const isMarker = text.startsWith(REJECT_PREFIX) || text.startsWith(WITHDRAW_PREFIX)
  if (!isMarker) return text.replace(/^App计时报工/, '').trim()
  const idx = text.indexOf('|')
  if (idx < 0) return ''
  return text.slice(idx + 1).trim().replace(/^App计时报工/, '').trim()
}

export const auditState = (row: WorkReportRecord): AuditState => {
  const raw = row.cFlag ?? (row as WorkReportRecord & { fCFlag?: string; auditFlag?: string }).fCFlag ?? (row as WorkReportRecord & { auditFlag?: string }).auditFlag
  const status = String(row.auditStatus || '').trim()
  const remark = String(row.remark || '')
  if (status === '已撤回' || remark.startsWith(WITHDRAW_PREFIX)) return 'withdrawn'
  if (status === '已驳回' || remark.startsWith(REJECT_PREFIX)) return 'rejected'
  if (raw == null || String(raw).trim() === '') {
    // 无审核位但状态文案为已审核时也算通过
    return status === '已审核' ? 'audited' : 'unknown'
  }
  const text = String(raw).trim()
  if (isAudited(text) || text.includes('审核通过')) return 'audited'
  return 'pending'
}

export const auditNotices = reactive<{ items: WorkReportRecord[] }>({ items: [] })

/** 已结束审核的单据进入消息中心（通过和驳回都需要通知员工）。 */
const finalizedRows = (rows: WorkReportRecord[]) =>
  rows.filter((row) => {
    const state = auditState(row)
    return row.reportNo && (state === 'audited' || state === 'rejected')
  })

const recentEnough = (row: WorkReportRecord) => {
  const state = auditState(row)
  const decidedAt = state === 'rejected' ? row.cancelDate : row.appDate
  const day = String(decidedAt || row.reportTime || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const limit = new Date()
  limit.setDate(limit.getDate() - 3)
  const p = (n: number) => String(n).padStart(2, '0')
  const floor = `${limit.getFullYear()}-${p(limit.getMonth() + 1)}-${p(limit.getDate())}`
  return day >= floor
}

/** Recent decisions the current account has not dismissed. */
export const refreshAuditNotices = (rows: WorkReportRecord[]) => {
  const seen = new Set(readSeen())
  auditNotices.items = finalizedRows(rows).filter((row) => recentEnough(row) && !seen.has(String(row.reportNo)))
}

export const resetAuditNotices = () => {
  auditNotices.items = []
}

export const isUnreadAudit = (row: WorkReportRecord) =>
  auditNotices.items.some((item) => String(item.reportNo) === String(row.reportNo))

export const ackAuditNotices = (reportNos?: string[]) => {
  const ids = (reportNos?.length ? reportNos : auditNotices.items.map((row) => row.reportNo)).map(String)
  const next = [...new Set([...readSeen(), ...ids])].slice(0, 200)
  uni.setStorageSync(seenKey(), next)
  const drop = new Set(ids)
  auditNotices.items = auditNotices.items.filter((row) => !drop.has(String(row.reportNo)))
}
