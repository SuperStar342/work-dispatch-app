<template>
  <view class="page page--sub">
    <NavBar :title="t('pwd.title')" />
    <view class="body">
      <view class="card form">
        <text class="lead">{{ t('pwd.lead') }}</text>
        <view class="field">
          <text class="label">{{ t('pwd.old') }}</text>
          <view class="box">
            <input :key="'old-' + locale" v-model="oldPassword" :password="!showOld" :placeholder="t('pwd.oldPh')" />
            <wd-icon :name="showOld ? 'browse' : 'eye-close'" size="18px" color="#9aa3b2" @click="showOld = !showOld" />
          </view>
        </view>
        <view class="field">
          <text class="label">{{ t('pwd.new') }}</text>
          <view class="box">
            <input :key="'new-' + locale" v-model="newPassword" :password="!showNew" :placeholder="t('pwd.newPh')" />
            <wd-icon :name="showNew ? 'browse' : 'eye-close'" size="18px" color="#9aa3b2" @click="showNew = !showNew" />
          </view>
        </view>
        <view class="field">
          <text class="label">{{ t('pwd.confirm') }}</text>
          <view class="box">
            <input :key="'confirm-' + locale" v-model="confirmPassword" :password="!showConfirm" :placeholder="t('pwd.confirmPh')" confirm-type="done" @confirm="submit" />
            <wd-icon :name="showConfirm ? 'browse' : 'eye-close'" size="18px" color="#9aa3b2" @click="showConfirm = !showConfirm" />
          </view>
        </view>
        <text class="rule">{{ t('pwd.rule') }}</text>
        <view class="btn-primary" :class="{ 'is-disabled': submitting }" @click="submit">
          {{ submitting ? t('pwd.saving') : t('pwd.submit') }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { locale, t } from '@/i18n'
import { updatePassword } from '@/api/auth'
import { useUserStore } from '@/store/user'

const user = useUserStore()
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showOld = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const submitting = ref(false)

const submit = async () => {
  if (submitting.value) return
  const oldValue = oldPassword.value
  const newValue = newPassword.value
  if (!oldValue) return uni.showToast({ title: t('pwd.needOld'), icon: 'none' })
  if (!newValue) return uni.showToast({ title: t('pwd.needNew'), icon: 'none' })
  if (newValue.length < 6) return uni.showToast({ title: t('pwd.short'), icon: 'none' })
  if (newValue === oldValue) return uni.showToast({ title: t('pwd.same'), icon: 'none' })
  if (newValue !== confirmPassword.value) return uni.showToast({ title: t('pwd.mismatch'), icon: 'none' })
  submitting.value = true
  try {
    await updatePassword(oldValue, newValue)
    uni.showToast({ title: t('pwd.ok'), icon: 'none' })
    setTimeout(() => user.logout(), 700)
  } catch {
    /* request already shows the server message */
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.body {
  padding: 12rpx 24rpx 40rpx;
}
.form {
  padding: 32rpx 28rpx;
}
.lead {
  display: block;
  margin-bottom: 28rpx;
  color: var(--color-text-secondary);
  font-size: 26rpx;
  line-height: 1.5;
}
.field {
  margin-bottom: 24rpx;
}
.label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--color-text-secondary);
}
.box {
  height: 88rpx;
  padding: 0 20rpx;
  border-radius: 16rpx;
  background: #f4f7fb;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.box input {
  flex: 1;
  height: 88rpx;
  font-size: 30rpx;
}
.rule {
  display: block;
  margin: 4rpx 0 28rpx;
  color: var(--color-text-muted);
  font-size: 22rpx;
  line-height: 1.5;
}
</style>
