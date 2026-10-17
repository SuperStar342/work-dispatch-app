<template>
  <view class="empty">
    <text class="title">{{ title || t('empty.default') }}</text>
    <text class="desc">{{ desc }}</text>
  </view>
</template>

<script setup lang="ts">
import { t } from '@/i18n'

defineProps({
  title: { type: String, default: '' },
  desc: { type: String, default: '' },
})
</script>

<style lang="scss" scoped>
.empty {
  padding: 80rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.title {
  font-size: 30rpx;
  color: var(--color-text-secondary);
}
.desc {
  font-size: 24rpx;
  color: var(--color-text-muted);
  text-align: center;
}
</style>
