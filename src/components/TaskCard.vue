<template>
  <view class="task card">
    <view class="head">
      <view class="title">{{ title }}</view>
      <view class="badges">
        <text class="wage" :class="timed ? 'time' : 'piece'">{{ timed ? t('record.time') : t('record.piece') }}</text>
        <view v-if="process" class="prc">{{ process }}</view>
      </view>
    </view>
    <text class="sub">{{ subLine }}</text>
    <text class="price">{{ priceLine }}</text>
    <view class="foot">
      <view class="progress-col">
        <view class="qty">
          <text class="done" :class="{ full: done }">{{ fmtQty(task.fnQty) }}</text>
          <text class="slash"> / {{ fmtQty(total) }}</text>
          <text class="pct">{{ percent }}%</text>
        </view>
        <ReportProgress hide-percent :done="task.fnQty" :total="total" />
      </view>
      <view class="act" :class="tone" @click.stop="onAct">{{ actionLabel }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MyTask } from '@/types/mes'
import { fmtQty, num } from '@/utils/format'
import { t } from '@/i18n'
import { isTimeWage, money, taskPrice } from '@/utils/wage'
import ReportProgress from './ReportProgress.vue'

const props = defineProps<{ task: MyTask }>()
const emit = defineEmits(['click'])

const total = computed(() => props.task.planQty || props.task.wtQty)
const done = computed(() => props.task.status === '已完成' || props.task.pendingQty <= 0)
const tone = computed(() => {
  if (done.value) return 'done'
  if (props.task.status === '待开始' || props.task.fnQty <= 0) return 'wait'
  return 'run'
})
const percent = computed(() => {
  const all = num(total.value)
  if (all <= 0) return 0
  return Math.min(100, Math.round((num(props.task.fnQty) / all) * 100))
})
const process = computed(() => props.task.prcName || props.task.prcCode)
const timed = computed(() => isTimeWage(props.task.pWageType))
const title = computed(() => {
  const name = props.task.goodsName
  const spec = props.task.sizeDesc && props.task.sizeDesc !== name ? props.task.sizeDesc : ''
  return [name, spec].filter(Boolean).join(' · ') || process.value || props.task.wtNo
})
const subLine = computed(() => {
  const order = props.task.wtNo ? t('task.orderLine', { no: props.task.wtNo }) : ''
  const shop = props.task.wsName || props.task.deptName || ''
  return [order, shop].filter(Boolean).join(' · ')
})
const priceLine = computed(() => {
  const left = t('task.remain', { n: fmtQty(props.task.pendingQty) })
  const price = taskPrice(props.task)
  if (price <= 0) return left
  const label = timed.value
    ? t('task.priceHour', { n: money(price) })
    : t('task.pricePiece', { n: money(price) })
  return `${left} · ${label}`
})
const actionLabel = computed(() => {
  if (tone.value === 'done') return t('status.done')
  if (tone.value === 'wait') return t('task.start')
  return t('status.report')
})

const onAct = () => {
  if (done.value) return
  emit('click')
}
</script>

<style lang="scss" scoped>
.task {
  padding: 28rpx 28rpx 24rpx;
  margin-bottom: 24rpx;
}
.head {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.title {
  flex: 1;
  min-width: 0;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.35;
  color: var(--color-text);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.badges {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8rpx;
  max-width: 46%;
  margin-top: 4rpx;
}
.wage {
  flex: none;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.2;
}
.wage.piece {
  background: #e8f0fe;
  color: #2563eb;
}
.wage.time {
  background: #e8f8ee;
  color: #16a34a;
}
.prc {
  flex: none;
  max-width: 180rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
  font-size: 24rpx;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub,
.price {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.4;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.price {
  margin-top: 6rpx;
  color: var(--color-text-secondary);
}
.foot {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 20rpx;
}
.progress-col {
  flex: 1;
  min-width: 0;
}
.qty {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}
.done {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
}
.done.full {
  color: var(--color-success);
}
.slash {
  font-size: 26rpx;
  font-weight: 600;
  color: #c5ccd8;
}
.pct {
  margin-left: auto;
  font-size: 22rpx;
  font-weight: 700;
  color: var(--color-text-muted);
}
.act {
  flex: none;
  min-width: 168rpx;
  height: 88rpx;
  padding: 0 28rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  white-space: nowrap;
}
.act.wait {
  background: #eef1f6;
  color: #4b5563;
}
.act.run {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 8rpx 18rpx rgba(78, 136, 243, 0.28);
}
.act.done {
  background: #f3f4f6;
  color: #9ca3af;
}
.act.wait:active,
.act.run:active {
  opacity: 0.86;
}
</style>
