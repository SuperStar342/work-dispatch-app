<template>
  <view class="page page--sub scan-page">
    <NavBar :title="t('scan.title')" dark />
    <view class="cam">
      <view class="frame" />
      <text class="hint">{{ t('scan.hint') }}</text>
      <view class="btn-scan" @click="doScan">
        <wd-icon name="scan" size="18px" color="#ffffff" />
        <text>{{ t('scan.start') }}</text>
      </view>
    </view>
    <view class="sheet">
      <view class="input-row">
        <input :key="'code-' + locale" v-model="code" :placeholder="t('scan.ph')" confirm-type="search" @confirm="lookup" />
        <view class="go" @click="lookup">{{ t('scan.find') }}</view>
      </view>
      <view class="two">
        <view class="tile" @click="doScan">
          <view class="mark">
            <wd-icon name="qrcode" size="22px" color="#4e88f3" />
          </view>
          <view>
            <text class="t">{{ t('scan.order') }}</text>
            <text class="d">{{ t('scan.orderDesc') }}</text>
          </view>
        </view>
        <view class="tile" @click="doScan">
          <view class="mark mark--green">
            <wd-icon name="detection" size="22px" color="#16a34a" />
          </view>
          <view>
            <text class="t">{{ t('scan.process') }}</text>
            <text class="d">{{ t('scan.processDesc') }}</text>
          </view>
        </view>
      </view>
      <view class="sec">
        <text>{{ t('scan.shortcuts') }}</text>
      </view>
      <view class="grid">
        <view v-for="p in ctx.processShortcuts" :key="p.prcCode" class="p" @click="byProcess(p.prcCode)">
          {{ p.prcCode }} {{ p.prcName }}
        </view>
        <view v-if="!ctx.processShortcuts.length" class="empty-wrap">
          <EmptyState :title="t('scan.none')" :desc="t('scan.noneDesc')" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useUserStore } from '@/store/user'
import { useReportContext } from '@/store/reportContext'
import { composeMyTasks } from '@/services/taskCompose'
import { getWtList } from '@/api/mes/dispatch'
import { go } from '@/utils/nav'
import { locale, t } from '@/i18n'

const code = ref('')
const user = useUserStore()
const ctx = useReportContext()

const openFirst = (list: any[], prcCode?: string) => {
  const hit = prcCode ? list.find((t) => t.prcCode === prcCode) : list[0]
  if (!hit) {
    uni.showToast({ title: t('scan.notFound'), icon: 'none' })
    return
  }
  go(`/pages/report/index?id=${encodeURIComponent(hit.id)}&wtNo=${encodeURIComponent(hit.wtNo)}&prcCode=${encodeURIComponent(hit.prcCode)}`)
}

const lookup = async () => {
  const kw = code.value.trim()
  if (!kw) {
    uni.showToast({ title: t('scan.needCode'), icon: 'none' })
    return
  }
  uni.showLoading({ title: t('scan.locating') })
  try {
    const byWt = await composeMyTasks({ pageNo: 1, pageSize: 20, wtNo: kw, empNo: user.empNo, isLeader: user.isLeader })
    if (byWt.list.length) {
      openFirst(byWt.list)
      return
    }
    const page = await getWtList({ pageNo: 1, pageSize: 20, moNo: kw, cFlag: '1', ifClose: '0' })
    const first = page.data.list?.[0]
    if (first?.wtNo) {
      const res = await composeMyTasks({ pageNo: 1, pageSize: 20, wtNo: first.wtNo, empNo: user.empNo, isLeader: user.isLeader })
      openFirst(res.list)
      return
    }
    const local = ctx.tasks.filter((t) => t.wtNo.includes(kw) || t.woNo.includes(kw) || t.prcCode === kw)
    openFirst(local)
  } finally {
    uni.hideLoading()
  }
}

const doScan = () => {
  uni.scanCode({
    success: (res) => {
      code.value = String(res.result || '').trim()
      lookup()
    },
    fail: () => {
      uni.showToast({ title: t('scan.noCamera'), icon: 'none' })
    },
  })
}

const byProcess = (prcCode: string) => {
  const list = ctx.tasks.filter((t) => t.prcCode === prcCode && t.pendingQty > 0)
  openFirst(list, prcCode)
}

onShow(() => {
  if (user.token) ctx.load({ empNo: user.empNo, isLeader: user.isLeader })
})
</script>

<style lang="scss" scoped>
.scan-page {
  background: #111827 !important;
  min-height: 100vh;
  color: #fff;
}
.cam {
  height: 520rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
}
.frame {
  width: 360rpx;
  height: 360rpx;
  border: 6rpx solid #fff;
  border-radius: 24rpx;
  box-shadow: 0 0 0 8rpx rgba(78, 136, 243, 0.35);
}
.hint {
  color: #d1d5db;
}
.btn-scan {
  height: 80rpx;
  padding: 0 36rpx;
  border-radius: 999rpx;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 28rpx;
  font-weight: 600;
}
.sheet {
  background: #fff;
  color: var(--color-text);
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 24rpx 40rpx;
  min-height: 50vh;
}
.input-row {
  display: flex;
  gap: 12rpx;
  background: #f6f8fc;
  border-radius: 16rpx;
  padding: 8rpx 8rpx 8rpx 20rpx;
}
.input-row input {
  flex: 1;
  height: 72rpx;
  color: var(--color-text);
}
.go {
  height: 64rpx;
  background: var(--color-primary);
  color: #fff;
  border-radius: 32rpx;
  padding: 0 28rpx;
  display: flex;
  align-items: center;
  font-size: 26rpx;
  font-weight: 600;
}
.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-top: 24rpx;
}
.tile {
  background: #f6f8fc;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.mark {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: #e8f0fe;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.mark--green {
  background: #e8f8ee;
}
.t {
  display: block;
  font-weight: 700;
  color: var(--color-text);
}
.empty-wrap {
  grid-column: 1 / -1;
}
.d {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--color-text-muted);
}
.sec {
  margin: 28rpx 0 12rpx;
  font-weight: 700;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}
.p {
  background: #f6f8fc;
  border-radius: 16rpx;
  padding: 24rpx;
  font-size: 26rpx;
}
</style>
