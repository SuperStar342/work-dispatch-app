<template>
  <view class="page">
    <view class="status" :style="{ height: statusBar + 'px' }" />
    <view class="card profile">
      <view class="avatar">{{ (user.loginName || t('common.employee')).slice(0, 1) }}</view>
      <view>
        <text class="name">{{ user.loginName }}</text>
        <text class="meta">{{ t('mine.account', { no: user.account || '--' }) }}</text>
        <text class="meta">{{ t('mine.emp', { no: user.empNo || '--' }) }}{{ user.isLeader ? t('mine.leader') : '' }}</text>
      </view>
    </view>

    <view class="card block">
      <text class="h">{{ t('mine.bind') }}</text>
      <text class="tip">{{ t('mine.bindTip') }}</text>
      <input :key="'emp-' + locale" v-model="empNo" class="input" :placeholder="t('mine.empPh')" />
      <input :key="'name-' + locale" v-model="empName" class="input" :placeholder="t('mine.namePh')" />
      <view class="btn-primary" @click="save">{{ t('mine.save') }}</view>
    </view>

    <view class="card menu">
      <view class="item sound-row" @click="toggleSound">
        <view class="item-l">
          <wd-icon name="sound" size="18px" color="#22c55e" />
          <text>{{ t('mine.sound') }}</text>
        </view>
        <view class="sw" :class="{ on: soundOn }"><view class="knob" /></view>
      </view>
      <view v-if="soundOn" class="sounds">
        <text v-for="item in soundChoices" :key="item.id" class="chip" :class="{ on: style === item.id }" @click="pickSound(item.id)">{{ item.label }}</text>
      </view>
      <view class="item" @click="go('/pages/stats/index')">
        <view class="item-l">
          <wd-icon name="chart-bar" size="18px" color="#4e88f3" />
          <text>{{ t('mine.stats') }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="item" @click="go('/pages/wage/index')">
        <view class="item-l">
          <wd-icon name="wallet" size="18px" color="#f59e0b" />
          <text>{{ t('mine.wage') }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="item" @click="go('/pages/password/index')">
        <view class="item-l">
          <wd-icon name="secured" size="18px" color="#4e88f3" />
          <text>{{ t('mine.password') }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="item lang-row">
        <text>{{ t('mine.language') }}</text>
        <LangSwitch />
      </view>
      <view class="item" @click="go('/pages/exception/index')">
        <view class="item-l">
          <wd-icon name="warning" size="18px" color="#ef4444" />
          <text>{{ t('mine.exception') }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="item" @click="goTab('/pages/record/index')">
        <view class="item-l">
          <wd-icon name="note" size="18px" color="#4e88f3" />
          <text>{{ t('mine.records') }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <view class="ghost-btn logout" @click="logout">{{ t('mine.logout') }}</view>
    <AppTabBar current="/pages/mine/index" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppTabBar from '@/components/AppTabBar.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import { useUserStore } from '@/store/user'
import { go, goTab } from '@/utils/nav'
import { locale, t } from '@/i18n'
import { playReportSound, previewSound, setSoundEnabled, setSoundStyle, soundEnabled, soundStyle, type SoundStyle } from '@/utils/sound'

const statusBar = uni.getSystemInfoSync().statusBarHeight || 20
const user = useUserStore()
const empNo = ref(user.empNo)
const empName = ref(user.empName)
const soundOn = ref(soundEnabled())
const style = ref<SoundStyle>(soundStyle())
const soundChoices = computed(() => [
  { id: 'crisp' as const, label: t('mine.soundCrisp') },
  { id: 'charge' as const, label: t('mine.soundCharge') },
  { id: 'victory' as const, label: t('mine.soundVictory') },
  { id: 'drum' as const, label: t('mine.soundDrum') },
])

onShow(() => {
  empNo.value = user.empNo
  empName.value = user.empName
  soundOn.value = soundEnabled()
  style.value = soundStyle()
})

const toggleSound = () => {
  soundOn.value = !soundOn.value
  setSoundEnabled(soundOn.value)
  if (soundOn.value) playReportSound()
}

const pickSound = (id: SoundStyle) => {
  style.value = id
  setSoundStyle(id)
  previewSound(id)
}

const save = () => {
  if (!empNo.value.trim()) return uni.showToast({ title: t('mine.needEmp'), icon: 'none' })
  user.setEmp(empNo.value.trim(), empName.value.trim())
  uni.showToast({ title: t('mine.saved'), icon: 'success' })
}

const logout = () => {
  uni.showModal({
    title: t('mine.logoutTitle'),
    content: t('mine.logoutBody'),
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel'),
    success: (res) => {
      if (res.confirm) user.logout()
    },
  })
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}
.profile {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  align-items: center;
}
.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 700;
}
.name {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
}
.meta {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text-muted);
  font-size: 24rpx;
}
.block {
  margin-top: 20rpx;
  padding: 28rpx;
}
.h {
  font-weight: 700;
}
.tip {
  display: block;
  margin: 8rpx 0 16rpx;
  font-size: 22rpx;
  color: var(--color-text-muted);
}
.input {
  height: 80rpx;
  background: #f6f8fc;
  border-radius: 16rpx;
  padding: 0 20rpx;
  margin-bottom: 16rpx;
}
.menu {
  margin-top: 20rpx;
}
.item {
  padding: 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid var(--color-line);
}
.lang-row {
  font-weight: 600;
}
.sound-row {
  border-bottom: none;
}
.item-l {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-weight: 600;
}
.arrow {
  color: #c5ccd8;
}
.sw {
  width: 84rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: #d7dee8;
  padding: 4rpx;
  box-sizing: border-box;
  transition: background 0.2s;
}
.sw.on {
  background: #22c55e;
}
.knob {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}
.sw.on .knob {
  transform: translateX(36rpx);
}
.sounds {
  display: flex;
  gap: 12rpx;
  padding: 0 28rpx 24rpx;
  border-bottom: 1rpx solid var(--color-line);
}
.chip {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  border-radius: 999rpx;
  background: #eef3fb;
  color: var(--color-text-secondary);
  font-size: 24rpx;
  font-weight: 700;
}
.chip.on {
  background: #22c55e;
  color: #fff;
}
.logout {
  margin-top: 40rpx;
}
</style>
