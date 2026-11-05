<template>
  <view class="page login">
    <view class="lang-bar">
      <LangSwitch />
    </view>
    <view class="hero">
      <text class="eyebrow">{{ t('login.brand') }}</text>
      <text class="h1">{{ t('login.title') }}</text>
      <text class="sub">{{ t('login.sub') }}</text>
    </view>
    <view class="card form">
      <view class="field">
        <text class="label">{{ t('login.account') }}</text>
        <input :key="'user-' + locale" v-model="username" :placeholder="t('login.accountPh')" confirm-type="next" />
      </view>
      <view class="field">
        <text class="label">{{ t('login.password') }}</text>
        <input :key="'pass-' + locale" v-model="password" password :placeholder="t('login.passwordPh')" confirm-type="done" @confirm="onLogin" />
      </view>
      <view class="btn-primary" :class="{ 'is-disabled': loading }" @click="onLogin">{{ loading ? t('login.submitting') : t('login.submit') }}</view>
      <text class="tip">{{ t('login.tip') }}</text>
      <text v-if="errorText" class="err">{{ errorText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/store/user'
import { locale, t } from '@/i18n'
import LangSwitch from '@/components/LangSwitch.vue'

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorText = ref('')
const user = useUserStore()

const onLogin = async () => {
  if (loading.value) return
  if (!username.value.trim() || !password.value) {
    uni.showToast({ title: t('login.needBoth'), icon: 'none' })
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    await user.login(username.value.trim(), password.value)
    uni.reLaunch({ url: '/pages/home/index' })
  } catch (e: any) {
    errorText.value = e?.message || t('login.failed')
    uni.showToast({ title: errorText.value, icon: 'none', duration: 3000 })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login {
  padding: 0 40rpx;
  padding-top: calc(24rpx + env(safe-area-inset-top));
}
.lang-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 48rpx;
}
.hero {
  margin-bottom: 48rpx;
}
.eyebrow {
  font-size: 24rpx;
  color: var(--color-primary);
  letter-spacing: 4rpx;
}
.h1 {
  display: block;
  margin-top: 12rpx;
  font-size: 56rpx;
  font-weight: 800;
}
.sub {
  display: block;
  margin-top: 12rpx;
  color: var(--color-text-secondary);
}
.form {
  padding: 40rpx 32rpx 48rpx;
}
.field {
  margin-bottom: 28rpx;
}
.label {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-muted);
  margin-bottom: 12rpx;
}
input {
  height: 88rpx;
  background: #f6f8fc;
  border-radius: 16rpx;
  padding: 0 24rpx;
}
.tip {
  display: block;
  margin-top: 24rpx;
  font-size: 22rpx;
  color: var(--color-text-muted);
  line-height: 1.5;
}
.err {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: var(--color-danger);
  line-height: 1.5;
}
</style>
