<template>
  <view class="page page--sub">
    <NavBar :title="t('wage.title')" />
    <view class="body">
      <view class="month">
        <text class="arrow" @click="shift(-1)">‹</text>
        <text>{{ month }}</text>
        <text class="arrow" :class="{ off: futureBlocked }" @click="shift(1)">›</text>
      </view>
      <view class="hero card">
        <text class="label">{{ t('wage.month') }}</text>
        <text class="big">¥ {{ money(total) }}</text>
        <view class="split">
          <view><text>{{ t('wage.piece') }}</text><text>¥ {{ money(piece) }}</text></view>
          <view><text>{{ t('wage.time') }}</text><text>¥ {{ money(timed) }}</text></view>
        </view>
      </view>
      <text class="note">{{ t('wage.note') }}</text>
      <view class="sec">
        <text class="h">{{ t('wage.section') }}</text>
        <text class="count">{{ t('wage.count', { n: lines.length }) }}</text>
      </view>
      <view v-if="loading && !rows.length" class="pad">{{ t('common.loading') }}</view>
      <EmptyState v-else-if="!lines.length" :title="t('wage.empty')" />
      <view v-for="row in lines" :key="row.reportNo || row.id" class="card line" @click="open(row)">
        <view class="line-main">
          <text class="name">{{ row.goodsName || row.prcName || row.wtNo }}</text>
          <text class="sub">{{ String(row.reportTime || '').slice(0, 16) }}</text>
        </view>
        <view class="line-side">
          <text class="tag" :class="row.mode === 'time' ? 'time' : 'piece'">{{ row.mode === 'time' ? t('record.time') : t('record.piece') }}</text>
          <text class="pay">¥ {{ money(lineWage(row)) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { t } from '@/i18n'
import { getReportRecords } from '@/api/mes/workReport'
import { useUserStore } from '@/store/user'
import { go } from '@/utils/nav'
import { lineWage, listTimeReports, money, rememberRecord } from '@/utils/wage'
import type { WorkReportRecord } from '@/types/mes'

const user = useUserStore()
const cursor = ref(new Date())
const rows = ref<WorkReportRecord[]>([])
const loading = ref(false)

const month = computed(() => {
  const d = cursor.value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})
const lines = computed(() => rows.value.filter((row) => String(row.reportTime || '').startsWith(month.value)))
const piece = computed(() => lines.value.filter((row) => row.mode !== 'time').reduce((sum, row) => sum + lineWage(row), 0))
const timed = computed(() => lines.value.filter((row) => row.mode === 'time').reduce((sum, row) => sum + lineWage(row), 0))
const total = computed(() => piece.value + timed.value)
const futureBlocked = computed(() => {
  const now = new Date()
  return cursor.value.getFullYear() > now.getFullYear() || (cursor.value.getFullYear() === now.getFullYear() && cursor.value.getMonth() >= now.getMonth())
})

const shift = (step: number) => {
  if (step > 0 && futureBlocked.value) return
  const next = new Date(cursor.value)
  next.setMonth(next.getMonth() + step)
  cursor.value = next
}
const open = (row: WorkReportRecord) => {
  rememberRecord(row)
  go('/pages/record/detail')
}

const load = async () => {
  loading.value = true
  const local = listTimeReports()
  try {
    const mine = !user.isLeader
    const res = await getReportRecords({ pageNo: 1, pageSize: 200, keyword: mine ? undefined : user.empNo }, { mine })
    const server = (res.data.list || []).map((row: WorkReportRecord) => ({ ...row, mode: row.mode || 'piece' }))
    rows.value = [...local, ...server]
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
  padding: 12rpx 24rpx 40rpx;
}
.month {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40rpx;
  font-size: 32rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}
.arrow {
  font-size: 48rpx;
  color: var(--color-text-muted);
  padding: 0 12rpx;
}
.arrow.off {
  opacity: 0.25;
}
.note {
  display: block;
  margin-top: 16rpx;
  color: var(--color-text-muted);
  font-size: 22rpx;
  line-height: 1.5;
}
.sec {
  margin: 24rpx 0 12rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.count {
  color: var(--color-text-muted);
  font-size: 22rpx;
}
.pad {
  padding: 40rpx;
  text-align: center;
  color: var(--color-text-muted);
}
.hero {
  padding: 32rpx;
  background: linear-gradient(135deg, #5b94f7, #3d7af0);
  color: #fff;
}
.label {
  font-size: 24rpx;
  opacity: 0.9;
}
.big {
  display: block;
  margin: 12rpx 0 20rpx;
  font-size: 64rpx;
  font-weight: 800;
}
.split {
  display: flex;
  gap: 24rpx;
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
.h {
  font-size: 30rpx;
  font-weight: 800;
}
.line {
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}
.line-main {
  flex: 1;
  min-width: 0;
}
.line-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}
.tag {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}
.tag.piece {
  background: #e8f0fe;
  color: #2563eb;
}
.tag.time {
  background: #e8f8ee;
  color: #16a34a;
}
.name {
  display: block;
  font-weight: 700;
}
.sub {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text-muted);
  font-size: 22rpx;
}
.pay {
  font-size: 32rpx;
  font-weight: 800;
  color: #f59e0b;
}
</style>
