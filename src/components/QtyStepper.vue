<template>
  <view class="step">
    <view class="btn" @click="change(-1)">−</view>
    <input class="val" type="number" :value="modelValue" @input="onInput" />
    <view class="btn plus" @click="change(1)">+</view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: number }>()
const emit = defineEmits(['update:modelValue'])
const change = (d: number) => emit('update:modelValue', Math.max(0, Number(props.modelValue || 0) + d))
const onInput = (e: any) => emit('update:modelValue', Math.max(0, Number(e.detail.value || 0)))
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
