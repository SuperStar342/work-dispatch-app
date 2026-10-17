<template>
  <view class="progress">
    <view v-if="labeled" class="head">
      <text>{{ t('progress.label') }}</text>
      <text class="pct">{{ percent }}%</text>
    </view>
    <view class="bar">
      <view class="track">
        <view class="fill" :class="{ full: percent >= 100 }" :style="{ width: percent + '%' }" />
      </view>
      <text v-if="!labeled && !hidePercent" class="pct">{{ percent }}%</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { num } from '@/utils/format'

const props = defineProps<{
  done: number | string
  total: number | string
  labeled?: boolean
  hidePercent?: boolean
}>()

const percent = computed(() => {
  const total = num(props.total)
  if (total <= 0) return 0
  return Math.min(100, Math.round((num(props.done) / total) * 100))
})
</script>

<style lang="scss" scoped>
.progress {
  margin-top: 16rpx;
}
.head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  color: var(--color-text-secondary);
}
.bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.track {
  flex: 1;
  height: 12rpx;
  border-radius: 999rpx;
  background: #dbe3ee;
  overflow: hidden;
}
.fill {
  height: 100%;
  border-radius: 999rpx;
  background: var(--color-primary);
  min-width: 0;
}
.fill.full {
  background: var(--color-success);
}
.pct {
  min-width: 64rpx;
  text-align: right;
  font-size: 22rpx;
  font-weight: 700;
  color: var(--color-text-secondary);
}
</style>
