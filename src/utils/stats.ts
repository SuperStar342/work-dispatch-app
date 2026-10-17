import type { WorkReportRecord } from '@/types/mes'
import { num } from '@/utils/format'
import { lineWage } from '@/utils/wage'

export type StatGroup = 'order' | 'process' | 'date'

export type StatBucket = {
  key: string
  label: string
  wage: number
  pieceWage: number
  timeWage: number
  pieceQty: number
  hours: number
}

const pad = (n: number) => String(n).padStart(2, '0')

export const formatDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const monthBounds = (offset: number) => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { start: formatDay(start), end: formatDay(end) }
}

export const previousWindow = (start: string, end: string) => {
  const from = new Date(`${start}T00:00:00`)
  const to = new Date(`${end}T00:00:00`)
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
  const prevEnd = new Date(from)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - (days - 1))
  return { start: formatDay(prevStart), end: formatDay(prevEnd) }
}

export const spanDays = (start: string, end: string) => {
  const from = new Date(`${start}T00:00:00`)
  const to = new Date(`${end}T00:00:00`)
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1
}

const dayOf = (row: WorkReportRecord) => String(row.reportTime || '').slice(0, 10)

const inRange = (day: string, start: string, end: string) => day >= start && day <= end

const isTime = (row: WorkReportRecord) => row.mode === 'time'

export const rowsInRange = (rows: WorkReportRecord[], start: string, end: string) =>
  rows.filter((row) => {
    const day = dayOf(row)
    return /^\d{4}-\d{2}-\d{2}$/.test(day) && inRange(day, start, end)
  })

const weekLabel = (day: string, start: string) => {
  const date = new Date(`${day}T00:00:00`)
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  const labelDay = formatDay(monday) < start ? start : formatDay(monday)
  return labelDay.slice(5)
}

export const trendPoints = (rows: WorkReportRecord[], start: string, end: string) => {
  const span = spanDays(start, end)
  const days = new Set(rows.map((row) => dayOf(row)).filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)))
  const daily = span <= 16 || days.size <= 12
  const map = new Map<string, { label: string; piece: number; time: number }>()
  rows.forEach((row) => {
    const day = dayOf(row)
    const label = daily ? day.slice(5) : weekLabel(day, start)
    const cur = map.get(label) || { label, piece: 0, time: 0 }
    const wage = lineWage(row)
    if (isTime(row)) cur.time += wage
    else cur.piece += wage
    map.set(label, cur)
  })
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
}

export const groupRows = (rows: WorkReportRecord[], by: StatGroup): StatBucket[] => {
  const map = new Map<string, StatBucket>()
  rows.forEach((row) => {
    const day = dayOf(row)
    const key = by === 'order' ? row.wtNo || '-' : by === 'process' ? row.prcName || row.prcCode || '-' : day
    const label = by === 'order' ? row.goodsName || row.wtNo || '-' : by === 'process' ? row.prcName || row.prcCode || '-' : day.slice(5)
    const cur = map.get(key) || { key, label, wage: 0, pieceWage: 0, timeWage: 0, pieceQty: 0, hours: 0 }
    const wage = lineWage(row)
    cur.wage += wage
    if (isTime(row)) {
      cur.timeWage += wage
      cur.hours += num(row.hours || row.reportQty)
    } else {
      cur.pieceWage += wage
      cur.pieceQty += num(row.reportQty)
    }
    if (by === 'order' && row.goodsName) cur.label = row.goodsName
    map.set(key, cur)
  })
  return [...map.values()]
}

export const topBuckets = (rows: StatBucket[], limit = 6, otherLabel = '', score: (row: StatBucket) => number = (row) => row.wage) => {
  const sorted = [...rows].sort((a, b) => score(b) - score(a))
  if (sorted.length <= limit) return sorted
  const head = sorted.slice(0, limit - 1)
  const rest = sorted.slice(limit - 1)
  const other = rest.reduce(
    (sum, row) => {
      sum.wage += row.wage
      sum.pieceWage += row.pieceWage
      sum.timeWage += row.timeWage
      sum.pieceQty += row.pieceQty
      sum.hours += row.hours
      return sum
    },
    { key: '__other__', label: otherLabel, wage: 0, pieceWage: 0, timeWage: 0, pieceQty: 0, hours: 0 },
  )
  return [...head, other]
}

export const share = (part: number, total: number) => {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}
