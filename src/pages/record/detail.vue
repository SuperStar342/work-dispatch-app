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
        <AuditFlow v-if="showFlow" :row="row" />
        <view v-if="row.mode === 'time' && auditText" class="line">
          <text>{{ t('record.auditStatus') }}</text>
          <text :class="auditClass">{{ auditText }}</text>
        </view>
        <view v-if="row.mode === 'time' && row.approver" class="line">
          <text>{{ t('record.approver') }}</text>
          <text>{{ row.approver }}</text>
        </view>
        <view v-if="rejectReason && !showFlow" class="line">
          <text>{{ t('record.rejectReason') }}</text>
          <text class="reject">{{ rejectReason }}</text>
        </view>
        <view v-if="showFlow && rejectReason" class="reject-block">
          <view v-if="row.canceler" class="line"><text>{{ t('record.rejectedBy') }}</text><text>{{ row.canceler }}</text></view>
          <view v-if="row.cancelDate" class="line"><text>{{ t('record.rejectedAt') }}</text><text>{{ row.cancelDate }}</text></view>
          <view v-if="origRemark" class="line"><text>{{ t('report.remark') }}</text><text>{{ origRemark }}</text></view>
        </view>
        <view v-if="showWage" class="line"><text>{{ t('report.estimate') }}</text><text class="pay">¥ {{ money(lineWage(row)) }}</text></view>
        <view class="line"><text>{{ t('record.title') }}</text><text>{{ row.reportTime || '--' }}</text></view>
        <view class="line"><text>{{ t('emp.label') }}</text><text>{{ row.reporter || '--' }}</text></view>
        <view v-if="row.remark" class="line"><text>{{ t('report.remark') }}</text><text>{{ displayRemark }}</text></view>
        <view class="line"><text>{{ row.mode === 'time' ? t('record.local') : t('status.passed') }}</text><text>{{ row.reportNo }}</text></view>
      </view>
      <view class="ops">
        <view v-if="canWithdraw" class="danger-btn" :class="{ 'is-disabled': acting }" @click="withdraw">{{ t('record.withdraw') }}</view>
        <view v-if="canEdit" class="btn-primary" :class="{ 'is-disabled': acting }" @click="edit">{{ t('record.edit') }}</view>
      </view>
      <view class="ghost-btn again" @click="again">{{ t('record.again') }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/NavBar.vue'
import { t } from '@/i18n'
import { fmtQty } from '@/utils/format'
import { go } from '@/utils/nav'
import { lineWage, money, readRecord, rememberRecord, removeTimeReport, showWage } from '@/utils/wage'
import AuditFlow from '@/components/AuditFlow.vue'
import { ackAuditNotices, auditState, parseOrigRemark, parseRejectReason } from '@/utils/auditNotice'
import { withdrawDispatchReport, withdrawTimeReport } from '@/api/mes/workReport'
import { useUserStore } from '@/store/user'
import type { WorkReportRecord } from '@/types/mes'

const user = useUserStore()
const row = ref<WorkReportRecord | null>(null)
const acting = ref(false)
/** 审核流转：计件与计时都展示（已审核 / 待审核 / 已驳回 / 已撤回） */
const showFlow = computed(() => {
  if (!row.value) return false
  const state = auditState(row.value)
  return state === 'audited' || state === 'pending' || state === 'rejected' || state === 'withdrawn'
})
const state = computed(() => (row.value ? auditState(row.value) : 'unknown'))
/** 审核状态文案 */
const auditText = computed(() => {
  const s = state.value
  if (s === 'audited') return t('status.audited')
  if (s === 'pending') return t('status.pendingAudit')
  if (s === 'rejected') return t('record.rejected')
  if (s === 'withdrawn') return t('record.withdrawn')
  return ''
})
const auditClass = computed(() => {
  const s = state.value
  if (s === 'audited') return 'is-audited'
  if (s === 'pending') return 'is-pending'
  if (s === 'rejected') return 'is-rejected'
  if (s === 'withdrawn') return 'is-withdrawn'
  return 'is-pending'
})
/** 驳回原因 */
const rejectReason = computed(() => row.value?.rejectReason || parseRejectReason(row.value?.remark))
/** 驳回/撤回前的原始申报备注 */
const origRemark = computed(() => (row.value ? parseOrigRemark(row.value.remark) : ''))
/** 备注展示：驳回/撤回单据去掉标记前缀，还原员工原始申报内容 */
const displayRemark = computed(() => {
  const remark = row.value?.remark
  if (!remark) return ''
  const state = auditState(row.value!)
  if (state === 'rejected' || state === 'withdrawn') {
    return parseOrigRemark(remark) || remark
  }
  return remark
})
/** 已审核的不能撤回；已撤回的不能再撤回 */
const canWithdraw = computed(() => {
  if (!row.value) return false
  const s = state.value
  if (s === 'audited' || s === 'withdrawn') return false
  if (row.value.mode !== 'time') return true
  return row.value.auditStatus !== '已审核'
})
/** 只有未审核的单据可以修改；已驳回的需先撤回 */
const canEdit = computed(() => {
  if (!row.value) return false
  const s = state.value
  if (s === 'audited' || s === 'rejected' || s === 'withdrawn') return false
  return true
})
onShow(() => {
  row.value = readRecord()
  const current = row.value
  if (current?.reportNo && auditState(current) === 'audited') {
    ackAuditNotices([current.reportNo])
  }
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
          // 服务端已落库：优先撤回服务端单据，未落库（如离线草稿）则清本地
          try {
            await withdrawTimeReport(current.reportNo)
          } catch (e: any) {
            const msg = String(e?.message || '')
            if (!/不存在|未找到/.test(msg)) throw e
          }
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
.is-audited {
  color: #16a34a;
}
.is-pending {
  color: #f59e0b;
}
.is-rejected {
  color: #dc2626;
}
.is-withdrawn {
  color: var(--color-text-muted);
}
.reject {
  color: #dc2626 !important;
  text-align: right;
  max-width: 60%;
}
.reject-block {
  margin-top: 12rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: #feecec;
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
