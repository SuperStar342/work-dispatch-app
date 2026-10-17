<template>
  <view class="chips">
    <view v-for="n in chips" :key="n" class="chip" @click="$emit('add', n)">+{{ n }}</view>
  </view>
</template>

<script setup lang="ts">
defineProps({
  chips: { type: Array as () => number[], default: () => [50, 100, 200, 500] },
})
defineEmits(['add'])
</script>

<style lang="scss" scoped>
.chips {
  display: flex;
  gap: 16rpx;
}
.chip {
  flex: 1;
  height: 64rpx;
  border-radius: 16rpx;
  background: #eef3fb;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 600;
}
.chip:active {
  opacity: 0.8;
}
</style>
