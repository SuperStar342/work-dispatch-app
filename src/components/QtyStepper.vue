<template>
  <view class="step">
    <view class="btn" @click="change(-1)">−</view>
    <input class="val" type="text" inputmode="numeric" pattern="[0-9]*" :value="modelValue" @input="onInput" />
    <view class="btn plus" @click="change(1)">+</view>
  </view>
</template>

<script setup lang="ts">
import { normalizeWholeQuantity, syncWholeQuantityInput } from '@/utils/quantity'

const props = defineProps<{ modelValue: number }>()
const emit = defineEmits(['update:modelValue'])
const change = (d: number) => emit('update:modelValue', normalizeWholeQuantity(Number(props.modelValue || 0) + d))
const onInput = (e: any) => {
  const value = normalizeWholeQuantity(e.detail.value)
  emit('update:modelValue', value)
  return syncWholeQuantityInput(e, value)
}
</script>

<style lang="scss" scoped>
.step {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  background: #f3f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  color: #6b7280;
}
.plus {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
.val {
  width: 120rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 700;
}
</style>
