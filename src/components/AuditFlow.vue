<template>
  <view class="flow" :class="{ compact }">
    <text v-if="!compact" class="flow-title">{{ t('audit.flow') }}</text>
    <view class="step done">
      <view class="rail"><view class="dot" /></view>
      <view class="copy">
        <text class="k">{{ t('audit.submit') }}</text>
        <text class="v">{{ row.reporter || '--' }}</text>
        <text class="t">{{ row.reportTime || '--' }}</text>
      </view>
    </view>
    <view class="step" :class="stepClass">
      <view class="rail"><view class="dot" /></view>
      <view class="copy">
        <text class="k">{{ stepLabel }}</text>
        <text class="v">{{ stepValue }}</text>
        <text class="t">{{ stepTime }}</text>
        <text v-if="rejectReason" class="reason">{{ t('record.rejectReason') }}：{{ rejectReason }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { auditState, parseRejectReason } from '@/utils/auditNotice'
import type { WorkReportRecord } from '@/types/mes'

const props = defineProps<{ row: WorkReportRecord; compact?: boolean }>()

const state = computed(() => auditState(props.row))
const audited = computed(() => state.value === 'audited')
const rejected = computed(() => state.value === 'rejected')
const withdrawn = computed(() => state.value === 'withdrawn')

/** 驳回原因：优先取服务端解析好的值，其次从备注里解析 */
const rejectReason = computed(
  () => props.row.rejectReason || parseRejectReason(props.row.remark)
)

const stepClass = computed(() => {
  if (audited.value) return 'done'
  if (rejected.value || withdrawn.value) return 'bad'
  return 'wait'
})

const stepLabel = computed(() => {
  if (audited.value) return t('audit.passed')
  if (rejected.value) return t('audit.rejected')
  if (withdrawn.value) return t('audit.withdrawn')
  return t('audit.waiting')
})

const stepValue = computed(() => {
  if (audited.value) return props.row.approver || '--'
  if (rejected.value) return props.row.canceler || t('audit.review')
  if (withdrawn.value) return props.row.canceler || '--'
  return t('audit.review')
})

const stepTime = computed(() => {
  if (audited.value) return props.row.appDate || '--'
  if (rejected.value || withdrawn.value) return props.row.cancelDate || ''
  return ''
})
</script>

<style lang="scss" scoped>
.flow-title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 28rpx;
  font-weight: 800;
}
.step {
  display: flex;
  gap: 16rpx;
}
.rail {
  width: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dot {
  width: 18rpx;
  height: 18rpx;
  margin-top: 8rpx;
  border-radius: 50%;
  background: #cbd5e1;
  flex: none;
}
.step.done .dot {
  background: #16a34a;
}
.step.wait .dot {
  background: #fff;
  border: 4rpx solid #f59e0b;
  box-sizing: border-box;
}
.step.bad .dot {
  background: #dc2626;
}
.step:first-of-type .rail::after,
.flow-title + .step .rail::after {
  content: '';
  width: 2rpx;
  flex: 1;
  min-height: 28rpx;
  margin: 6rpx 0;
  background: #e2e8f0;
}
.copy {
  flex: 1;
  min-width: 0;
  padding-bottom: 18rpx;
}
.k {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
}
.v,
.t {
  display: block;
  margin-top: 4rpx;
  color: var(--color-text-muted);
  font-size: 24rpx;
}
.step.done .v {
  color: var(--color-text);
}
.step.bad .k {
  color: #dc2626;
}
.reason {
  display: block;
  margin-top: 6rpx;
  color: #dc2626;
  font-size: 24rpx;
  line-height: 1.5;
  word-break: break-all;
}
.compact {
  margin-top: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid var(--color-line);
}
.compact .k,
.compact .v,
.compact .t,
.compact .reason {
  display: inline;
  margin-right: 8rpx;
}
.compact .copy {
  padding-bottom: 8rpx;
}
</style>
