<template>
  <view v-if="visible" class="switch">
    <text class="label">{{ t('emp.label') }}</text>
    <view class="picker" @click="open = true">
      <text>{{ currentName || currentNo || t('emp.pick') }}</text>
      <text class="arrow">›</text>
    </view>
    <view v-if="open" class="mask" @click="open = false">
      <view class="sheet" @click.stop>
        <text class="sheet-title">{{ t('emp.sheet') }}</text>
        <text class="hint">{{ t('emp.hint') }}</text>
        <scroll-view scroll-y class="list">
          <view v-for="w in workers" :key="w.empNo" class="row" :class="{ on: w.empNo === currentNo }" @click="pick(w)">
            <view>
              <text class="name">{{ w.empName }}</text>
              <text class="no">{{ t('emp.pending', { no: w.empNo, n: w.pendingQty }) }}</text>
            </view>
            <text v-if="w.empNo === currentNo" class="check">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { WtWorker } from '@/types/mes'
import { t } from '@/i18n'

const props = defineProps<{
  visible: boolean
  workers: WtWorker[]
  currentNo: string
  currentName?: string
}>()
const emit = defineEmits(['change'])
const open = ref(false)
const pick = (w: WtWorker) => {
  emit('change', w)
  open.value = false
}
</script>

<style lang="scss" scoped>
.switch {
  margin-top: 16rpx;
}
.label {
  font-size: 24rpx;
  color: var(--color-text-muted);
}
.picker {
  margin-top: 8rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: #f6f8fc;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.arrow {
  color: #9ca3af;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 40;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
}
.hint {
  display: block;
  margin-top: 8rpx;
  color: var(--color-text-muted);
  font-size: 22rpx;
}
.list {
  max-height: 520rpx;
  margin-top: 20rpx;
}
.row {
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--color-line);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.name {
  display: block;
  font-weight: 600;
}
.no {
  font-size: 22rpx;
  color: var(--color-text-muted);
}
.check {
  color: var(--color-primary);
  font-weight: 700;
}
</style>
