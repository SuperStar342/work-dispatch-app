<template>
  <view class="nav" :class="{ dark }">
    <view class="status" :style="{ height: statusBar + 'px' }" />
    <view class="bar">
      <view class="back" @click="onBack">
        <text class="chev">‹</text>
      </view>
      <text class="title">{{ title }}</text>
      <view class="right">
        <slot name="right" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { back } from '@/utils/nav'

defineProps<{ title: string; dark?: boolean }>()
const statusBar = uni.getSystemInfoSync().statusBarHeight || 20
const onBack = () => back()
</script>

<style lang="scss" scoped>
.nav {
  background: var(--color-bg);
}
.nav.dark {
  background: #111827;
  color: #fff;
}
.bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
  position: relative;
}
.back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chev {
  font-size: 56rpx;
  line-height: 1;
}
.title {
  position: absolute;
  left: 120rpx;
  right: 120rpx;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
}
.right {
  margin-left: auto;
}
</style>
