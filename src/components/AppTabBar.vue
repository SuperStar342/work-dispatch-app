<template>
  <view class="tabbar">
    <view class="tabbar__inner">
      <view
        v-for="item in items"
        :key="item.url"
        class="tab"
        :class="{ active: current === item.url }"
        @click="go(item.url)"
      >
        <view class="glyph">
          <wd-icon :name="item.icon" size="22px" :color="current === item.url ? '#4e88f3' : '#8b95a7'" />
        </view>
        <text class="label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { goTab } from '@/utils/nav'
import { t } from '@/i18n'

const props = defineProps<{ current: string }>()

const items = computed(() => [
  { icon: 'home', label: t('tab.home'), url: '/pages/home/index' },
  { icon: 'goods', label: t('tab.task'), url: '/pages/task/index' },
  { icon: 'note', label: t('tab.record'), url: '/pages/record/index' },
  { icon: 'user', label: t('tab.mine'), url: '/pages/mine/index' },
])

const go = (url: string) => {
  const hash = typeof location !== 'undefined' ? location.hash.replace(/^#/, '') : ''
  const path = hash.split('?')[0]
  if (path === url && hash.includes('?')) {
    uni.redirectTo({ url })
    return
  }
  if (url === props.current) return
  goTab(url)
}
</script>

<style lang="scss" scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
  border-top: 1rpx solid #eef1f6;
}
.tabbar__inner {
  height: 112rpx;
  display: flex;
  max-width: 750px;
  margin: 0 auto;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  color: #8b95a7;
}
.glyph {
  width: 56rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
}
.tab.active .glyph {
  background: var(--color-primary-soft);
}
.label {
  font-size: 22rpx;
  line-height: 1.2;
}
.tab.active .label {
  color: var(--color-primary);
  font-weight: 600;
}
</style>
