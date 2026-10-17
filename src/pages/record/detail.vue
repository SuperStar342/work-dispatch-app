<template>
  <view class="page page--sub">
    <NavBar :title="t('record.detail')" />
    <view v-if="!row" class="pad">{{ t('report.missing') }}</view>
    <view v-else class="body">
      <view class="card block">
        <view class="row">
          <text class="no">{{ row.wtNo }}</text>
          <text class="tag">{{ row.mode === 'time' ? t('record.time') : t('record.piece') }}</text>
        </view>
        <text class="name">{{ row.goodsName || row.prcName }}</text>
        <text class="sub">{{ row.prcName }}</text>
      </view>
      <view class="card block">
        <view class="line"><text>{{ row.mode === 'time' ? t('record.hourLine') : t('record.qtyLine') }}</text><text>{{ fmtQty(row.hours || row.reportQty) }}</text></view>
        <view class="line"><text>{{ t('report.estimate') }}</text><text class="pay">¥ {{ money(lineWage(row)) }}</text></view>
        <view class="line"><text>{{ t('record.title') }}</text><text>{{ row.reportTime || '--' }}</text></view>
        <view class="line"><text>{{ t('emp.label') }}</text><text>{{ row.reporter || '--' }}</text></view>
        <view v-if="row.remark" class="line"><text>{{ t('report.remark') }}</text><text>{{ row.remark }}</text></view>
        <view class="line"><text>{{ row.mode === 'time' ? t('record.local') : t('status.passed') }}</text><text>{{ row.reportNo }}</text></view>
      </view>
      <view class="ops">
        <view class="danger-btn" :class="{ 'is-disabled': acting }" @click="withdraw">{{ t('record.withdraw') }}</view>
        <view class="btn-primary" :class="{ 'is-disabled': acting }" @click="edit">{{ t('record.edit') }}</view>
      </view>
      <view class="ghost-btn again" @click="again">{{ t('record.again') }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/NavBar.vue'
import { t } from '@/i18n'
import { fmtQty } from '@/utils/format'
import { go } from '@/utils/nav'
import { lineWage, money, readRecord, rememberRecord, removeTimeReport } from '@/utils/wage'
import { withdrawDispatchReport } from '@/api/mes/workReport'
import { useUserStore } from '@/store/user'
import type { WorkReportRecord } from '@/types/mes'

const user = useUserStore()
const row = ref<WorkReportRecord | null>(null)
const acting = ref(false)
onShow(() => {
  row.value = readRecord()
})
const taskQuery = (record: WorkReportRecord, mode: string, edit: boolean) => {
  const id = [record.wtNo, record.woNo || '', record.goodsId ?? '', record.prcCode || '', record.woBorSno || '', record.empNo || ''].join('|')
  const editFlag = edit ? '&edit=1' : ''
  return `/pages/report/index?id=${encodeURIComponent(id)}&wtNo=${encodeURIComponent(record.wtNo)}&mode=${mode}${editFlag}`
}
const again = () => {
  if (!row.value) return
  const mode = row.value.mode === 'time' ? 'time' : 'piece'
  go(taskQuery(row.value, mode, false))
}
const edit = () => {
  if (!row.value || acting.value) return
  rememberRecord(row.value)
  const mode = row.value.mode === 'time' ? 'time' : 'piece'
  go(taskQuery(row.value, mode, true))
}
const withdraw = () => {
  const current = row.value
  if (!current || acting.value) return
  uni.showModal({
    title: t('record.withdraw'),
    content: current.mode === 'time' ? t('record.withdrawTimeAsk') : t('record.withdrawAsk'),
    confirmText: t('record.withdraw'),
    cancelText: t('common.cancel'),
    success: async (res) => {
      if (!res.confirm) return
      acting.value = true
      try {
        if (current.mode === 'time') {
          removeTimeReport(current.id || current.reportNo)
        } else {
          await withdrawDispatchReport(current.reportNo, { mine: !user.isLeader })
        }
        uni.showToast({ title: t('record.withdrawn'), icon: 'none' })
        setTimeout(() => uni.navigateBack(), 400)
      } catch (e: any) {
        uni.showToast({ title: e?.message || t('report.failed'), icon: 'none' })
      } finally {
        acting.value = false
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.body {
  padding: 12rpx 24rpx 40rpx;
}
.block {
  padding: 28rpx;
  margin-bottom: 20rpx;
}
.row,
.line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}
.line {
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--color-line);
  font-size: 26rpx;
  color: var(--color-text-secondary);
}
.line text:last-child {
  color: var(--color-text);
  font-weight: 700;
}
.no {
  font-size: 34rpx;
  font-weight: 800;
}
.name {
  display: block;
  margin-top: 12rpx;
  font-size: 32rpx;
  font-weight: 700;
}
.sub {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text-muted);
}
.tag {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 22rpx;
  font-weight: 700;
}
.pay {
  color: #f59e0b !important;
  font-size: 34rpx;
}
.ops {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.danger-btn {
  height: 96rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #dc2626;
  border: 2rpx solid #fecaca;
  font-size: 32rpx;
  font-weight: 700;
}
.danger-btn.is-disabled,
.ops .is-disabled {
  opacity: 0.45;
}
.again {
  margin-top: 20rpx;
}
.pad {
  padding: 80rpx;
  text-align: center;
  color: var(--color-text-muted);
}
</style>
