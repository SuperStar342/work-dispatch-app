<template>
  <view class="auth-page">
    <view class="language"><LangSwitch /></view>

    <view class="auth-shell">
      <view class="brand" aria-label="智造报工">
        <image class="brand-logo" src="/static/dingtalk-work-report-icon.png" mode="aspectFit" />
        <text class="brand-name">{{ t('login.product') }}</text>
      </view>

      <view v-if="showTabs" class="auth-tabs" role="tablist" aria-label="登录方式">
        <button
          class="auth-tab"
          :class="{ active: mode === 'dingtalk' }"
          role="tab"
          :aria-selected="mode === 'dingtalk'"
          @click="mode = 'dingtalk'"
        >
          <text class="ding-mark">➤</text>{{ t('login.dingTab') }}
        </button>
        <button
          class="auth-tab"
          :class="{ active: mode === 'password' }"
          role="tab"
          :aria-selected="mode === 'password'"
          @click="mode = 'password'"
        >
          <text class="user-mark">♙</text>{{ t('login.passwordTab') }}
        </button>
      </view>

      <view v-if="mode === 'dingtalk'" class="identity-panel" :aria-busy="dingState === 'checking'">
        <view class="identity-copy">
          <text class="identity-title">{{ t('login.welcome') }}</text>
          <text class="identity-subtitle">{{ t('login.capabilities') }}</text>
        </view>

        <view class="trust-visual" :class="`is-${dingState}`" aria-hidden="true">
          <view class="orbit orbit-a"></view>
          <view class="orbit orbit-b"></view>
          <view class="shield">
            <image src="/static/dingtalk-work-report-icon.png" mode="aspectFit" />
            <text v-if="dingState === 'verified'" class="verified-mark">✓</text>
          </view>
          <view class="signal signal-left"></view>
          <view class="signal signal-right"></view>
        </view>

        <view class="identity-status" aria-live="polite">
          <text class="status-title">{{ dingStatusTitle }}</text>
          <view v-if="dingState === 'checking'" class="progress-track">
            <view class="progress-value"></view>
          </view>
          <view class="secure-note">
            <text class="lock-mark">▣</text>
            <text>{{ t('login.noPassword') }}</text>
          </view>
        </view>

        <view v-if="dingState === 'signedOut'" class="error-card account-choice" role="status">
          <text class="error-title">{{ t('login.signedOut') }}</text>
          <text class="error-message">{{ t('login.chooseAccount') }}</text>
          <button class="primary-action" :disabled="loading" @click="onDingTalkLogin(true)">
            {{ t('login.currentDing') }}
          </button>
          <button class="secondary-action" :disabled="loading" @click="onOtherDingTalkAccount">
            {{ t('login.otherDing') }}
          </button>
          <button class="back-to-ding" @click="mode = 'password'">{{ t('login.usePassword') }}</button>
        </view>

        <view v-else-if="dingState === 'failed'" class="error-card" role="alert">
          <text class="error-title">{{ dingErrorTitle }}</text>
          <text class="error-message">{{ dingErrorMessage }}</text>
          <button v-if="dingTalk" class="primary-action" :disabled="loading" @click="onDingTalkLogin(true)">
            {{ t('login.retry') }}
          </button>
          <button class="secondary-action" @click="mode = 'password'">{{ t('login.usePassword') }}</button>
        </view>

        <view v-else-if="!dingTalk" class="open-in-ding">
          <text>{{ t('login.openInDing') }}</text>
          <button class="secondary-action" @click="mode = 'password'">{{ t('login.usePassword') }}</button>
        </view>

        <text class="privacy-note">{{ t('login.secure') }}</text>
      </view>

      <view v-else class="password-panel">
        <view class="identity-copy password-copy">
          <text class="identity-title">{{ t('login.title') }}</text>
          <text class="identity-subtitle">{{ t('login.fallback') }}</text>
        </view>

        <view class="field">
          <text class="field-label">{{ t('login.account') }}</text>
          <input
            :key="'user-' + locale"
            v-model="username"
            :aria-label="t('login.account')"
            :placeholder="t('login.accountPh')"
            autocomplete="username"
            confirm-type="next"
          />
        </view>
        <view class="field">
          <text class="field-label">{{ t('login.password') }}</text>
          <input
            :key="'pass-' + locale"
            v-model="password"
            :aria-label="t('login.password')"
            password
            :placeholder="t('login.passwordPh')"
            autocomplete="current-password"
            confirm-type="done"
            @confirm="onLogin"
          />
        </view>
        <button class="primary-action password-submit" :disabled="loading" @click="onLogin">
          {{ loading ? t('login.submitting') : t('login.submit') }}
        </button>
        <button v-if="dingTalk" class="back-to-ding" @click="mode = 'dingtalk'">{{ t('login.dingTab') }}</button>
        <text class="backup-tip">{{ t('login.tip') }}</text>
        <text v-if="errorText" class="password-error" role="alert">{{ errorText }}</text>
      </view>

      <view class="factory-scene" aria-hidden="true">
        <view class="factory-arm"><view class="factory-joint"></view></view>
        <view class="conveyor">
          <view v-for="index in 5" :key="index" class="roller"></view>
        </view>
        <view class="factory-box box-a"></view>
        <view class="factory-box box-b"></view>
        <view class="factory-monitor">✓</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/store/user'
import { locale, t } from '@/i18n'
import LangSwitch from '@/components/LangSwitch.vue'
import { closeForDingTalkAccountSwitch, isDingTalkContainer, requestDingTalkAuthCode } from '@/utils/dingtalk'
import { STORAGE_KEYS } from '@/utils/config'

type LoginMode = 'dingtalk' | 'password'
type DingState = 'idle' | 'checking' | 'verified' | 'failed' | 'signedOut'

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorText = ref('')
const mode = ref<LoginMode>('dingtalk')
const dingState = ref<DingState>('idle')
const user = useUserStore()
const dingTalk = isDingTalkContainer()

const showTabs = computed(() => !dingTalk || dingState.value === 'failed' || mode.value === 'password')
const missingJobNumber = computed(() => /未维护工号|员工工号|employee number/i.test(errorText.value))
const dingStatusTitle = computed(() => {
  if (dingState.value === 'verified') return t('login.verified')
  if (dingState.value === 'signedOut') return t('login.signedOut')
  if (dingState.value === 'failed') return t('login.dingFailed')
  if (!dingTalk) return t('login.dingTitle')
  return t('login.identifying')
})
const dingErrorTitle = computed(() =>
  missingJobNumber.value ? t('login.missingJobTitle') : t('login.dingFailTitle'),
)
const dingErrorMessage = computed(() =>
  missingJobNumber.value ? t('login.missingJobDesc') : errorText.value || t('login.dingFailed'),
)

const onDingTalkLogin = async (manual = false) => {
  if (loading.value) return
  if (manual) uni.removeStorageSync(STORAGE_KEYS.dingAutoLoginBlocked)
  loading.value = true
  dingState.value = 'checking'
  errorText.value = ''
  try {
    const code = await requestDingTalkAuthCode()
    await user.loginWithDingTalk(code)
    uni.removeStorageSync(STORAGE_KEYS.dingAutoLoginBlocked)
    dingState.value = 'verified'
    await new Promise((resolve) => setTimeout(resolve, 260))
    uni.reLaunch({ url: '/pages/home/index' })
  } catch (error: any) {
    errorText.value = error?.message || t('login.dingFailed')
    dingState.value = 'failed'
  } finally {
    loading.value = false
  }
}

const onLogin = async () => {
  if (loading.value) return
  if (!username.value.trim() || !password.value) {
    errorText.value = t('login.needBoth')
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    await user.login(username.value.trim(), password.value)
    uni.removeStorageSync(STORAGE_KEYS.dingAutoLoginBlocked)
    uni.reLaunch({ url: '/pages/home/index' })
  } catch (error: any) {
    errorText.value = error?.message || t('login.failed')
  } finally {
    loading.value = false
  }
}

const onOtherDingTalkAccount = () => {
  uni.showModal({
    title: t('login.switchDingTitle'),
    content: t('login.switchDingDesc'),
    confirmText: t('login.switchDingConfirm'),
    cancelText: t('common.cancel'),
    success: (result) => {
      if (result.confirm) closeForDingTalkAccountSwitch()
    },
  })
}

onMounted(() => {
  if (!dingTalk) return
  const blocked = uni.getStorageSync(STORAGE_KEYS.dingAutoLoginBlocked)
  if (blocked && typeof blocked === 'object' && blocked.reason === 'logout') {
    dingState.value = 'signedOut'
    return
  }
  if (blocked) {
    errorText.value = t('login.sessionRejected')
    dingState.value = 'failed'
    return
  }
  void onDingTalkLogin()
})
</script>

<style lang="scss" scoped src="./index.scss"></style>
