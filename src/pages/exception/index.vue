<template>
  <view class="page page--sub">
    <NavBar :title="t('ex.title')" />
    <view class="card warn">
      <text>{{ t('ex.banner') }}</text>
    </view>
    <view class="card form">
      <text class="label">{{ t('ex.type') }}</text>
      <view class="types">
        <view v-for="item in typeKeys" :key="item" class="type" :class="{ on: type === item }" @click="type = item">{{ t('ex.' + item) }}</view>
      </view>
      <text class="label">{{ t('ex.wt') }}</text>
      <input :key="'wt-' + locale" v-model="wtNo" class="input" :placeholder="t('ex.wtPh')" />
      <text class="label">{{ t('ex.note') }}</text>
      <textarea :key="'note-' + locale" v-model="remark" class="area" :placeholder="t('ex.notePh')" />
      <text class="label">{{ t('ex.photo') }}</text>
      <view class="photos">
        <image v-for="(p, i) in photos" :key="i" :src="p" class="ph" mode="aspectFill" />
        <view class="add" @click="pick">+</view>
      </view>
      <view class="btn-primary" @click="saveDraft">{{ t('ex.save') }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { locale, t } from '@/i18n'

const typeKeys = ['quality', 'shortage', 'equipment', 'other']
const type = ref('quality')
const wtNo = ref('')
const remark = ref('')
const photos = ref<string[]>([])

const pick = () => {
  uni.chooseImage({
    count: 3,
    success: (res) => {
      photos.value = [...photos.value, ...(res.tempFilePaths || [])].slice(0, 3)
    },
  })
}

const saveDraft = () => {
  const drafts = uni.getStorageSync('wd-exception-drafts') || []
  drafts.unshift({
    type: type.value,
    wtNo: wtNo.value,
    remark: remark.value,
    photos: photos.value,
    at: Date.now(),
    demo: true,
  })
  uni.setStorageSync('wd-exception-drafts', drafts.slice(0, 20))
  uni.showModal({
    title: t('ex.modalTitle'),
    content: t('ex.modalBody'),
    showCancel: false,
    confirmText: t('common.confirm'),
  })
}
</script>

<style lang="scss" scoped>
.warn {
  margin: 12rpx 24rpx;
  padding: 20rpx 24rpx;
  background: #fff4e0;
  color: #92400e;
  font-size: 24rpx;
  line-height: 1.5;
}
.form {
  margin: 0 24rpx;
  padding: 28rpx;
}
.label {
  display: block;
  margin: 16rpx 0 12rpx;
  color: var(--color-text-secondary);
}
.types {
  display: flex;
  gap: 12rpx;
}
.type {
  flex: 1;
  height: 64rpx;
  border-radius: 16rpx;
  background: #f6f8fc;
  display: flex;
  align-items: center;
  justify-content: center;
}
.type.on {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 700;
}
.input,
.area {
  width: 100%;
  background: #f6f8fc;
  border-radius: 16rpx;
  padding: 20rpx;
  box-sizing: border-box;
}
.area {
  min-height: 160rpx;
}
.photos {
  display: flex;
  gap: 12rpx;
  margin-bottom: 32rpx;
}
.ph,
.add {
  width: 140rpx;
  height: 140rpx;
  border-radius: 16rpx;
  background: #f6f8fc;
}
.add {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  color: #9ca3af;
}
</style>
