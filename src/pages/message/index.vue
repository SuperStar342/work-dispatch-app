<template>
  <view class="page page--sub">
    <NavBar :title="t('msg.title')">
      <template #right>
        <text v-if="auditNotices.items.length" class="read-all" @click="ackAuditNotices()">{{ t('msg.readAll') }}</text>
      </template>
    </NavBar>
    <view v-if="loading && !auditNotices.items.length" class="pad">{{ t('common.loading') }}</view>
    <EmptyState v-else-if="!auditNotices.items.length" :title="t('msg.empty')" :desc="t('msg.emptyDesc')" />
    <view v-else class="list">
      <view v-for="row in auditNotices.items" :key="row.reportNo" class="card item" @click="open(row)">
        <view class="ico" :class="{ rejected: auditState(row) === 'rejected' }">{{ auditState(row) === 'rejected' ? '!' : '✓' }}</view>
        <view class="copy">
          <text class="k">{{ auditState(row) === 'rejected' ? t('audit.rejected') : t('audit.passed') }}</text>
          <text class="name">{{ row.goodsName || row.prcName || row.wtNo }}</text>
          <text class="meta">{{ decisionMeta(row) }}</text>
        </view>
        <view class="dot" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { t } from '@/i18n'
import { go } from '@/utils/nav'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/store/user'
import { getReportRecords, getTimeRecords } from '@/api/mes/workReport'
import { mapServerTimeReports, rememberRecord } from '@/utils/wage'
import { ackAuditNotices, auditNotices, auditState, refreshAuditNotices } from '@/utils/auditNotice'
import type { WorkReportRecord } from '@/types/mes'

const user = useUserStore()
const loading = ref(false)

const decisionMeta = (row: WorkReportRecord) => {
  const rejected = auditState(row) === 'rejected'
  const who = rejected ? row.canceler : row.approver
  const at = rejected ? row.cancelDate : row.appDate
  return `${who || '--'} · ${at || row.reportTime || '--'}`
}

const load = async () => {
  loading.value = true
  try {
    const scoped = user.isOwnScope
    const rec = await getReportRecords({ pageNo: 1, pageSize: 50 }, { mine: scoped })
    let rows = rec.data.list || []
    // 计时报工审核通过也进消息中心
    let timeRows: any[] = []
    try {
      const raw = await getTimeRecords({ limit: 200 })
      timeRows = mapServerTimeReports(raw)
    } catch {
      timeRows = []
    }
    refreshAuditNotices([...timeRows, ...rows])
  } catch {
    /* keep the notices already on screen */
  } finally {
    loading.value = false
  }
}

const open = (row: WorkReportRecord) => {
  rememberRecord(row)
  go('/pages/record/detail')
}

onShow(() => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  load()
})
</script>

<style lang="scss" scoped>
.read-all {
  color: var(--color-primary);
  font-size: 26rpx;
  font-weight: 700;
}
.list {
  padding: 8rpx 24rpx 40rpx;
}
.item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
}
.ico {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #e8f8ee;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 800;
  flex: none;
}
.ico.rejected {
  background: #feecec;
  color: #dc2626;
}
.copy {
  flex: 1;
  min-width: 0;
}
.k {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
}
.name {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: var(--color-text);
}
.meta {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--color-text-muted);
}
.dot {
  width: 16rpx;
  height: 16rpx;
  margin-top: 12rpx;
  border-radius: 50%;
  background: #ef4444;
  flex: none;
}
.pad {
  padding: 80rpx;
  text-align: center;
  color: var(--color-text-muted);
}
</style>
