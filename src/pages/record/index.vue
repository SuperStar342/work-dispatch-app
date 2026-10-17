<template>
  <view class="page">
    <view class="status" :style="{ height: statusBar + 'px' }" />
    <view class="head">
      <text class="title">{{ t('record.title') }}</text>
    </view>
    <scroll-view scroll-x class="filters" :show-scrollbar="false">
      <view v-for="f in filters" :key="f.key" class="chip" :class="{ on: range === f.key }" @click="range = f.key">{{ f.label }}</view>
    </scroll-view>
    <view class="list">
      <view v-if="loading && !rows.length" class="pad">{{ t('common.loading') }}</view>
      <EmptyState v-else-if="!shown.length" :title="t('record.empty')" :desc="t('record.emptyDesc')" />
      <view v-for="r in shown" :key="r.reportNo || r.id" class="card rec" @click="open(r)">
        <view class="row">
          <view>
            <text class="code">{{ r.wtNo }}  {{ r.goodsName || r.prcName }}</text>
            <text class="d">{{ r.reportTime }}</text>
            <text class="d">{{ r.mode === 'time' ? t('record.hourLine') : t('record.qtyLine') }} {{ fmtQty(r.hours || r.reportQty) }} · ¥ {{ money(lineWage(r)) }}</text>
          </view>
          <StatusTag :text="r.mode === 'time' ? '计时' : tagOf(r)" />
        </view>
      </view>
    </view>
    <AppTabBar current="/pages/record/index" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import AppTabBar from '@/components/AppTabBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusTag from '@/components/StatusTag.vue'
import { getReportRecords } from '@/api/mes/workReport'
import { fmtQty, parseTime, startOfRecentDays } from '@/utils/format'
import { useUserStore } from '@/store/user'
import { getToken } from '@/utils/auth'
import { t } from '@/i18n'
import { go } from '@/utils/nav'
import { lineWage, listTimeReports, money, rememberRecord } from '@/utils/wage'
import type { WorkReportRecord } from '@/types/mes'

const statusBar = uni.getSystemInfoSync().statusBarHeight || 20
const user = useUserStore()
const loading = ref(false)
const rows = ref<any[]>([])
const range = ref('all')
const filters = computed(() => [
  { key: 'all', label: t('filter.all') },
  { key: '1', label: t('filter.today') },
  { key: '3', label: t('filter.d3') },
  { key: '7', label: t('filter.d7') },
])

const shown = computed(() => {
  if (range.value === 'all') return rows.value
  const from = startOfRecentDays(Number(range.value)).getTime()
  return rows.value.filter((r) => parseTime(r.reportTime) >= from)
})

const tagOf = (r: any) => {
  if (Number(r.defectQty) > 0) return '不良品'
  return '已通过'
}
const open = (row: WorkReportRecord) => {
  rememberRecord(row)
  go('/pages/record/detail')
}

const load = async () => {
  loading.value = true
  try {
    const mine = !user.isLeader
    const res = await getReportRecords(
      { pageNo: 1, pageSize: 50, keyword: mine ? undefined : user.empNo || user.displayName },
      { mine },
    )
    const server = (res.data.list || []).map((row: WorkReportRecord) => ({ ...row, mode: row.mode || 'piece' }))
    rows.value = [...listTimeReports(), ...server].sort((a, b) => String(b.reportTime || '').localeCompare(String(a.reportTime || '')))
  } catch {
    rows.value = listTimeReports()
  } finally {
    loading.value = false
  }
}

onShow(() => {
  if (!getToken()) return uni.reLaunch({ url: '/pages/login/index' })
  load()
})
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.head {
  padding: 12rpx 32rpx;
}
.title {
  font-size: 40rpx;
  font-weight: 800;
}
.filters {
  white-space: nowrap;
  padding: 0 24rpx 16rpx;
}
.chip {
  display: inline-flex;
  padding: 10rpx 24rpx;
  margin-right: 12rpx;
  border-radius: 999rpx;
  background: #fff;
  color: var(--color-text-muted);
}
.chip.on {
  background: var(--color-primary);
  color: #fff;
}
.list {
  padding: 0 24rpx;
}
.rec {
  padding: 28rpx;
  margin-bottom: 16rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
}
.code {
  display: block;
  font-weight: 700;
}
.d {
  display: block;
  margin-top: 8rpx;
  color: var(--color-text-muted);
  font-size: 24rpx;
}
.pad {
  padding: 40rpx;
  text-align: center;
  color: var(--color-text-muted);
}
</style>
