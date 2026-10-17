import { t } from '@/i18n'

export const num = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export const fmtQty = (v: any) => {
  const n = num(v)
  if (Number.isInteger(n)) return String(n)
  return String(Math.round(n * 1000) / 1000)
}

export const nowText = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export const todayPrefix = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const greeting = () => {
  const h = new Date().getHours()
  if (h < 11) return t('greet.morning')
  if (h < 14) return t('greet.noon')
  if (h < 18) return t('greet.afternoon')
  return t('greet.evening')
}

export const isAudited = (flag: any) => {
  const s = String(flag ?? '')
  return s === '1' || s.includes('已审核')
}

export const isYesFlag = (flag: any) => {
  const s = String(flag ?? '')
  return s === '1' || s.includes('已结案') || s.includes('已作废') || s === '结案' || s === '作废'
}

export const isFinished = (flag: any) => {
  const s = String(flag ?? '')
  return s === '1' || s.includes('已完成')
}

export const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

/** 含今天在内的最近 n 个自然日，从当天 0 点起算。近 3 天 = 前天、昨天、今天。 */
export const startOfRecentDays = (days: number) => {
  const start = daysAgo(Math.max(days - 1, 0))
  start.setHours(0, 0, 0, 0)
  return start
}

export const parseTime = (v?: string) => {
  if (!v) return 0
  const t = Date.parse(String(v).replace(/-/g, '/'))
  return Number.isFinite(t) ? t : 0
}
