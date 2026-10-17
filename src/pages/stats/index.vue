<template>
  <view class="page page--sub">
    <NavBar :title="t('stats.title')" />
    <view class="body">
      <view class="periods">
        <text v-for="item in periods" :key="item.key" class="chip" :class="{ on: period === item.key }" @click="period = item.key">{{ item.label }}</text>
      </view>
      <view v-if="period === 'custom'" class="dates">
        <picker mode="date" :value="customStart" @change="onStart">
          <view class="date"><text>{{ t('stats.from') }}</text><text>{{ customStart }}</text></view>
        </picker>
        <picker mode="date" :value="customEnd" @change="onEnd">
          <view class="date"><text>{{ t('stats.to') }}</text><text>{{ customEnd }}</text></view>
        </picker>
      </view>

      <view class="sections">
        <text v-for="item in sections" :key="item.key" :class="{ on: section === item.key }" @click="section = item.key">{{ item.label }}</text>
      </view>

      <view v-if="loading && !rows.length" class="pad">{{ t('common.loading') }}</view>
      <template v-else>
        <view class="hero card">
          <text class="label">{{ t('stats.total') }}</text>
          <text class="big">¥ {{ money(current.wage) }}</text>
          <text class="delta">{{ deltaText }}</text>
          <view class="split">
            <view><text>{{ t('wage.piece') }}</text><text>¥ {{ money(current.pieceWage) }}</text></view>
            <view><text>{{ t('wage.time') }}</text><text>¥ {{ money(current.timeWage) }}</text></view>
          </view>
        </view>
        <text class="note">{{ t('stats.note') }}</text>

        <template v-if="section === 'overview'">
          <text class="h">{{ t('stats.trend') }}</text>
          <view class="card panel">
            <view v-if="!trend.length" class="pad">{{ t('stats.empty') }}</view>
            <view v-else class="bars">
              <view v-for="point in trend" :key="point.label" class="bar-col">
                <view class="bar-stack">
                  <view class="bar piece" :style="{ height: barHeight(point.piece) }" />
                  <view class="bar time" :style="{ height: barHeight(point.time) }" />
                </view>
                <text>{{ point.label }}</text>
              </view>
            </view>
          </view>
          <text class="h">{{ t('stats.qty') }}</text>
          <view class="card qty">
            <view>
              <text class="qty-n">{{ fmtQty(current.pieceQty) }}</text>
              <text class="qty-sub">{{ t('record.piece') }}</text>
            </view>
            <view class="donut" :style="donutStyle">
              <view class="hole"><text>{{ share(current.pieceWage, current.wage) }}%</text></view>
            </view>
            <view>
              <text class="qty-n">{{ fmtQty(current.hours) }}</text>
              <text class="qty-sub">{{ t('record.time') }} · {{ t('report.hourUnit') }}</text>
            </view>
          </view>
        </template>

        <template v-else>
          <view class="periods inner">
            <text v-for="item in groups" :key="item.key" class="chip" :class="{ on: group === item.key }" @click="group = item.key">{{ item.label }}</text>
          </view>
          <view v-if="section === 'wage'" class="card mix">
            <view class="donut lg" :style="donutStyle">
              <view class="hole"><text>¥ {{ money(current.wage) }}</text></view>
            </view>
            <view class="legend">
              <view class="legend-row"><view class="dot piece" /><text>{{ t('record.piece') }} {{ share(current.pieceWage, current.wage) }}% · ¥ {{ money(current.pieceWage) }}</text></view>
              <view class="legend-row"><view class="dot time" /><text>{{ t('record.time') }} {{ share(current.timeWage, current.wage) }}% · ¥ {{ money(current.timeWage) }}</text></view>
            </view>
          </view>
          <text class="h">{{ section === 'wage' ? t('stats.orders') : t('stats.rank') }}</text>
          <EmptyState v-if="!ranked.length" :title="t('stats.empty')" />
          <view v-for="(row, index) in ranked" :key="row.key" class="card line">
            <text class="rank">{{ index + 1 }}</text>
            <view class="line-main">
              <text class="name">{{ row.label }}</text>
              <view class="track"><view :style="{ width: share(section === 'wage' ? row.wage : row.pieceQty + row.hours, rankBase) + '%' }" /></view>
            </view>
            <view class="line-side">
              <text v-if="section === 'wage'" class="pay">¥ {{ money(row.wage) }}</text>
              <text v-else class="pay">{{ fmtQty(row.pieceQty) }} / {{ fmtQty(row.hours) }}h</text>
              <text class="sub">{{ section === 'wage' ? share(row.wage, current.wage) : outputShare(row) }}%</text>
            </view>
          </view>
        </template>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { t } from '@/i18n'
import { fmtQty } from '@/utils/format'
import { getReportRecords } from '@/api/mes/workReport'
import { useUserStore } from '@/store/user'
import { lineWage, listTimeReports, money } from '@/utils/wage'
import { groupRows, monthBounds, previousWindow, rowsInRange, share, spanDays, topBuckets, trendPoints, type StatGroup } from '@/utils/stats'
import type { WorkReportRecord } from '@/types/mes'

const user = useUserStore()
const rows = ref<WorkReportRecord[]>([])
const loading = ref(false)
const period = ref<'month' | 'last' | 'custom'>('month')
const section = ref<'overview' | 'wage' | 'output'>('overview')
const group = ref<StatGroup>('order')
const initial = monthBounds(0)
const customStart = ref(initial.start)
const customEnd = ref(initial.end)

const periods = computed(() => [
  { key: 'month' as const, label: t('stats.thisMonth') },
  { key: 'last' as const, label: t('stats.lastMonth') },
  { key: 'custom' as const, label: t('stats.custom') },
])
const sections = computed(() => [
  { key: 'overview' as const, label: t('stats.overview') },
  { key: 'wage' as const, label: t('stats.wage') },
  { key: 'output' as const, label: t('stats.output') },
])
const groups = computed(() => [
  { key: 'order' as const, label: t('stats.byOrder') },
  { key: 'process' as const, label: t('stats.byProcess') },
  { key: 'date' as const, label: t('stats.byDate') },
])

const range = computed(() => {
  if (period.value === 'last') return monthBounds(-1)
  if (period.value === 'custom') return { start: customStart.value, end: customEnd.value }
  return monthBounds(0)
})
const currentRows = computed(() => rowsInRange(rows.value, range.value.start, range.value.end))
const sumOf = (list: WorkReportRecord[]) =>
  list.reduce(
    (sum, row) => {
      const wage = lineWage(row)
      sum.wage += wage
      if (row.mode === 'time') {
        sum.timeWage += wage
        sum.hours += Number(row.hours || row.reportQty || 0)
      } else {
        sum.pieceWage += wage
        sum.pieceQty += Number(row.reportQty || 0)
      }
      return sum
    },
    { wage: 0, pieceWage: 0, timeWage: 0, pieceQty: 0, hours: 0 },
  )
const current = computed(() => sumOf(currentRows.value))
const previous = computed(() => {
  const prev = previousWindow(range.value.start, range.value.end)
  return sumOf(rowsInRange(rows.value, prev.start, prev.end))
})
const deltaText = computed(() => {
  if (previous.value.wage <= 0) return current.value.wage > 0 ? t('stats.noBase') : ''
  const pct = Math.round(((current.value.wage - previous.value.wage) / previous.value.wage) * 100)
  return t('stats.delta', { n: `${pct > 0 ? '+' : ''}${pct}%` })
})
const trend = computed(() => trendPoints(currentRows.value, range.value.start, range.value.end))
const trendMax = computed(() => Math.max(1, ...trend.value.map((point) => point.piece + point.time)))
const barHeight = (value: number) => `${Math.max(0, Math.round((value / trendMax.value) * 120))}rpx`
const donutStyle = computed(() => {
  if (current.value.wage <= 0) return { background: '#e5e7eb' }
  const deg = Math.round((current.value.pieceWage / current.value.wage) * 360)
  return { background: `conic-gradient(#4e88f3 0deg ${deg}deg, #22c55e ${deg}deg 360deg)` }
})
const ranked = computed(() =>
  topBuckets(groupRows(currentRows.value, group.value), 6, t('stats.other'), (row) =>
    section.value === 'output' ? row.pieceQty * 100000 + row.hours : row.wage,
  ),
)
const rankBase = computed(() => {
  if (section.value === 'output') return Math.max(1, ...ranked.value.map((row) => row.pieceQty + row.hours))
  return Math.max(current.value.wage, 1)
})
const outputShare = (row: { pieceQty: number; hours: number }) => {
  if (current.value.pieceQty > 0) return share(row.pieceQty, current.value.pieceQty)
  return share(row.hours, current.value.hours)
}

const applyCustom = (start: string, end: string) => {
  if (end < start) {
    uni.showToast({ title: t('stats.rangeInvalid'), icon: 'none' })
    return
  }
  if (spanDays(start, end) > 92) {
    uni.showToast({ title: t('stats.rangeLong'), icon: 'none' })
    return
  }
  customStart.value = start
  customEnd.value = end
}
const onStart = (e: any) => applyCustom(String(e.detail.value || customStart.value), customEnd.value)
const onEnd = (e: any) => applyCustom(customStart.value, String(e.detail.value || customEnd.value))

const load = async () => {
  loading.value = true
  const local = listTimeReports()
  try {
    const mine = !user.isLeader
    const res = await getReportRecords({ pageNo: 1, pageSize: 200, keyword: mine ? undefined : user.empNo }, { mine })
    const server = (res.data.list || []).map((row: WorkReportRecord) => ({ ...row, mode: row.mode || 'piece' }))
    const seen = new Set(server.map((row: WorkReportRecord) => row.reportNo).filter(Boolean))
    rows.value = [...local.filter((row) => !row.reportNo || !seen.has(row.reportNo)), ...server]
  } catch {
    rows.value = local
  } finally {
    loading.value = false
  }
}

onShow(() => {
  load()
})
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.body {
  padding: 12rpx 24rpx 48rpx;
}
.periods,
.sections {
  display: flex;
  gap: 12rpx;
}
.chip,
.sections text {
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: #fff;
  color: var(--color-text-secondary);
  font-size: 24rpx;
  font-weight: 700;
}
.chip.on,
.sections text.on {
  background: var(--color-primary);
  color: #fff;
}
.sections {
  margin: 20rpx 0;
}
.sections text {
  flex: 1;
  text-align: center;
}
.dates {
  margin-top: 16rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}
.date {
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx 18rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  font-size: 22rpx;
  color: var(--color-text-muted);
}
.date text:last-child {
  color: var(--color-text);
  font-size: 28rpx;
  font-weight: 800;
}
.hero {
  margin-top: 20rpx;
  padding: 32rpx;
  background: linear-gradient(135deg, #5b94f7, #3d7af0);
  color: #fff;
}
.label,
.delta {
  font-size: 24rpx;
  opacity: 0.92;
}
.big {
  display: block;
  margin: 8rpx 0;
  font-size: 64rpx;
  font-weight: 800;
}
.split {
  display: flex;
  gap: 16rpx;
  margin-top: 18rpx;
}
.split view {
  flex: 1;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 16rpx;
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  font-size: 22rpx;
}
.split text:last-child {
  font-size: 30rpx;
  font-weight: 800;
}
.note {
  display: block;
  margin-top: 14rpx;
  color: var(--color-text-muted);
  font-size: 22rpx;
  line-height: 1.5;
}
.h {
  display: block;
  margin: 24rpx 0 12rpx;
  font-size: 30rpx;
  font-weight: 800;
}
.panel,
.qty,
.mix,
.line {
  padding: 24rpx;
}
.bars {
  min-height: 180rpx;
  display: flex;
  align-items: flex-end;
  gap: 8rpx;
  overflow-x: auto;
  padding-bottom: 4rpx;
}
.bar-col {
  flex: 1 0 64rpx;
  min-width: 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.bar-col text {
  font-size: 18rpx;
  color: var(--color-text-muted);
}
.bar-stack {
  width: 28rpx;
  height: 140rpx;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4rpx;
}
.bar {
  width: 100%;
  border-radius: 8rpx 8rpx 0 0;
  min-height: 0;
}
.bar.piece,
.dot.piece {
  background: #4e88f3;
}
.bar.time,
.dot.time {
  background: #22c55e;
}
.qty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.qty-n {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
}
.qty-sub {
  display: block;
  margin-top: 4rpx;
  color: var(--color-text-muted);
  font-size: 22rpx;
}
.donut {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.donut.lg {
  width: 180rpx;
  height: 180rpx;
}
.hole {
  width: 86rpx;
  height: 86rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 800;
}
.donut.lg .hole {
  width: 116rpx;
  height: 116rpx;
  font-size: 20rpx;
}
.mix {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  font-size: 24rpx;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  display: inline-block;
}
.inner {
  margin-bottom: 16rpx;
}
.line {
  margin-bottom: 14rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.rank {
  width: 40rpx;
  font-size: 28rpx;
  font-weight: 800;
  color: var(--color-primary);
}
.line-main {
  flex: 1;
  min-width: 0;
}
.name {
  display: block;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.track {
  margin-top: 10rpx;
  height: 8rpx;
  border-radius: 8rpx;
  background: #eef2f7;
  overflow: hidden;
}
.track view {
  height: 100%;
  background: #4e88f3;
}
.line-side {
  flex: none;
  text-align: right;
}
.pay {
  display: block;
  font-weight: 800;
  color: #f59e0b;
}
.sub {
  display: block;
  margin-top: 4rpx;
  color: var(--color-text-muted);
  font-size: 22rpx;
}
.pad {
  padding: 28rpx;
  text-align: center;
  color: var(--color-text-muted);
}
</style>
