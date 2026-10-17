<template>
  <view class="lang">
    <text class="opt" :class="{ on: locale === 'zh' }" @click="setLocale('zh')">中文</text>
    <text class="opt" :class="{ on: locale === 'en' }" @click="setLocale('en')">EN</text>
  </view>
</template>

<script setup lang="ts">
import { locale, setLocale } from '@/i18n'
</script>

<style lang="scss" scoped>
.lang {
  display: inline-flex;
  padding: 4rpx;
  border-radius: 999rpx;
  background: #eef3fb;
}
.opt {
  min-width: 72rpx;
  height: 48rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: var(--color-text-muted);
  font-weight: 600;
}
.opt.on {
  background: #fff;
  color: var(--color-primary);
  box-shadow: 0 2rpx 8rpx rgba(31, 56, 88, 0.08);
}
</style>
