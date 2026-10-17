<template>
  <view class="page result">
    <view class="card panel">
      <view class="ok">✓</view>
      <text class="h">{{ result?.edited ? t('record.editSaved') : t('result.ok') }}</text>
      <text class="no">{{ result?.reportNo || '--' }}</text>
      <view class="kpis">
        <view><text>{{ t('result.this') }}</text><text class="n">{{ fmtQty(result?.reportQty) }}</text></view>
        <view v-if="result?.workerFnQty != null"><text>{{ t('result.sum') }}</text><text class="n">{{ fmtQty(result?.workerFnQty) }}</text></view>
        <view v-if="result?.workerPendingQty != null"><text>{{ t('result.left') }}</text><text class="n">{{ fmtQty(result?.workerPendingQty) }}</text></view>
      </view>
      <text v-if="result?.wage != null" class="meta">¥ {{ Number(result.wage).toFixed(2) }}</text>
      <text class="meta">{{ result?.wtNo }} {{ result?.prcName }}</text>
    </view>
    <view class="btn-primary" @click="goHome">{{ t('result.home') }}</view>
    <view class="ghost-btn" style="margin-top: 20rpx" @click="goRecords">{{ t('result.records') }}</view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useReportContext } from '@/store/reportContext'
import { fmtQty } from '@/utils/format'
import { goTab } from '@/utils/nav'
import { t } from '@/i18n'

const ctx = useReportContext()
const result = computed(() => ctx.lastResult)
const goHome = () => uni.reLaunch({ url: '/pages/home/index' })
const goRecords = () => goTab('/pages/record/index')
</script>

<style lang="scss" scoped>
.result {
  padding: 120rpx 40rpx;
}
.panel {
  padding: 48rpx 32rpx;
  text-align: center;
  margin-bottom: 48rpx;
}
.ok {
  width: 96rpx;
  height: 96rpx;
  margin: 0 auto 16rpx;
  border-radius: 50%;
  background: var(--color-success);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
}
.h {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
}
.no {
  display: block;
  margin-top: 8rpx;
  color: var(--color-text-muted);
}
.kpis {
  margin-top: 32rpx;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}
.kpis view {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  color: var(--color-text-muted);
  font-size: 22rpx;
}
.n {
  font-size: 36rpx;
  font-weight: 800;
  color: var(--color-text);
}
.meta {
  display: block;
  margin-top: 24rpx;
  color: var(--color-text-secondary);
}
</style>
