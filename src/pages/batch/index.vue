<template>
  <view class="page page--sub">
    <NavBar :title="t('batch.title')" />
    <view class="summary card">
      <text>{{ t('batch.selected', { n: selected.length }) }}</text>
      <text>{{ t('batch.picked', { name: process?.prcName || t('batch.one') }) }}</text>
    </view>
    <view class="steps">
      <text :class="{ on: step === 1 }">{{ t('batch.step1') }}</text>
      <text :class="{ on: step === 2 }">{{ t('batch.step2') }}</text>
      <text :class="{ on: step === 3 }">{{ t('batch.step3') }}</text>
    </view>

    <view v-if="step === 1" class="body">
      <text class="h">{{ t('batch.pick') }}</text>
      <view v-for="p in processes" :key="p.prcCode" class="card row" :class="{ on: process?.prcCode === p.prcCode }" @click="pickProcess(p)">
        <view>
          <text class="code">{{ p.prcCode }} {{ p.prcName }}</text>
          <text class="d">{{ t('batch.canReport', { n: p.count }) }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <EmptyState v-if="!processes.length" :title="t('batch.none')" />
    </view>

    <view v-if="step === 2" class="body">
      <view class="bar">
        <text>{{ t('batch.choose', { a: selected.length, b: candidates.length }) }}</text>
        <text class="link" @click="toggleAll">{{ t('batch.all') }}</text>
      </view>
      <view v-for="row in candidates" :key="row.id" class="card row" @click="toggle(row.id)">
        <view class="check" :class="{ on: selected.includes(row.id) }" />
        <view class="grow">
          <text class="code">{{ row.wtNo }}</text>
          <text class="d">{{ fmtQty(row.fnQty) }} / {{ fmtQty(row.planQty) }} · {{ row.empName }}</text>
        </view>
      </view>
    </view>

    <view v-if="step === 3" class="body">
      <text class="h">{{ t('batch.qty') }}</text>
      <view v-for="row in selectedTasks" :key="row.id" class="card qty-row">
        <view>
          <text class="code">{{ row.wtNo }}</text>
          <text class="d">{{ t('batch.pending', { n: fmtQty(row.pendingQty) }) }}</text>
        </view>
        <input class="q" type="number" :value="qtyMap[row.id]" @input="(e: any) => setQty(row.id, e.detail.value, row.pendingQty)" />
      </view>
    </view>

    <view class="dock dual">
      <view v-if="step === 1" class="ghost-btn" @click="back">{{ t('common.cancel') }}</view>
      <view v-else class="ghost-btn" @click="step -= 1">{{ t('batch.prev') }}</view>
      <view class="btn-primary" :class="{ 'is-disabled': submitting }" @click="next">
        {{ step < 3 ? t('batch.next') : submitting ? t('report.submitting') : t('report.submit') }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useUserStore } from '@/store/user'
import { useReportContext } from '@/store/reportContext'
import { submitDispatchReportBatch } from '@/api/mes/workReport'
import { fmtQty, nowText } from '@/utils/format'
import { back } from '@/utils/nav'
import { t } from '@/i18n'
import { playReportSound, unlockReportSound } from '@/utils/sound'

const user = useUserStore()
const ctx = useReportContext()
const step = ref(1)
const process = ref<{ prcCode: string; prcName: string; count: number } | null>(null)
const selected = ref<string[]>([])
const qtyMap = reactive<Record<string, number>>({})
const submitting = ref(false)

const pending = computed(() => ctx.tasks.filter((t) => t.pendingQty > 0))
const processes = computed(() => {
  const map = new Map<string, { prcCode: string; prcName: string; count: number }>()
  pending.value.forEach((t) => {
    const cur = map.get(t.prcCode) || { prcCode: t.prcCode, prcName: t.prcName, count: 0 }
    cur.count += 1
    map.set(t.prcCode, cur)
  })
  return [...map.values()].sort((a, b) => b.count - a.count)
})
const candidates = computed(() => pending.value.filter((t) => t.prcCode === process.value?.prcCode))
const selectedTasks = computed(() => candidates.value.filter((t) => selected.value.includes(t.id)))

const pickProcess = (p: any) => {
  process.value = p
  selected.value = pending.value.filter((t) => t.prcCode === p.prcCode).map((t) => t.id)
  step.value = 2
}
const toggle = (id: string) => {
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id]
}
const toggleAll = () => {
  selected.value = selected.value.length === candidates.value.length ? [] : candidates.value.map((t) => t.id)
}
const setQty = (id: string, v: any, max: number) => {
  qtyMap[id] = Math.min(max, Math.max(0, Number(v || 0)))
}

const next = async () => {
  if (step.value === 1) {
    if (!process.value) return uni.showToast({ title: t('batch.needProcess'), icon: 'none' })
    step.value = 2
    return
  }
  if (step.value === 2) {
    if (!selected.value.length) return uni.showToast({ title: t('batch.needOrder'), icon: 'none' })
    selectedTasks.value.forEach((t) => {
      qtyMap[t.id] = t.pendingQty
    })
    step.value = 3
    return
  }
  const payloads = selectedTasks.value.map((t) => {
    const reportQty = Number(qtyMap[t.id] || 0)
    return {
      wtNo: t.wtNo,
      woNo: t.woNo,
      moNo: t.moNo,
      goodsId: t.goodsId,
      goodsName: t.goodsName,
      prcCode: t.prcCode,
      prcName: t.prcName,
      woBorSno: t.woBorSno,
      empNo: t.empNo,
      empName: t.empName,
      pendingQty: t.pendingQty,
      reportQty,
      passQty: reportQty,
      defectQty: 0,
      reworkQty: 0,
      reportTime: nowText(),
      reportMethod: '移动批量报工',
    }
  })
  submitting.value = true
  unlockReportSound()
  try {
    const data = await submitDispatchReportBatch(payloads, { mine: !user.isLeader })
    ctx.setLastResult({
      reportNo: (data.reportNos || []).join('、'),
      reportQty: payloads.reduce((s, p) => s + p.reportQty, 0),
      workerFnQty: data.successCount,
      workerPendingQty: data.failCount,
      wtNo: t('batch.result', { ok: data.successCount, fail: data.failCount }),
      prcName: process.value?.prcName,
    })
    if (data.successCount > 0) playReportSound()
    uni.redirectTo({ url: '/pages/result/index' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || t('batch.failed'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onShow(() => {
  if (user.token) ctx.load({ empNo: user.empNo, isLeader: user.isLeader, pageSize: 20 })
})
</script>

<style lang="scss" scoped>
.summary {
  margin: 12rpx 24rpx;
  padding: 20rpx 24rpx;
  display: flex;
  justify-content: space-between;
  color: var(--color-text-secondary);
}
.steps {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 32rpx 16rpx;
  font-size: 22rpx;
  color: var(--color-text-muted);
}
.steps .on {
  color: var(--color-success);
  font-weight: 700;
}
.body {
  padding: 0 24rpx 40rpx;
}
.h,
.bar {
  display: flex;
  justify-content: space-between;
  margin: 8rpx 0 16rpx;
  font-weight: 700;
}
.link {
  color: var(--color-primary);
  font-weight: 500;
}
.row {
  padding: 28rpx;
  margin-bottom: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}
.row.on {
  box-shadow: 0 0 0 2rpx var(--color-primary) inset;
}
.code {
  display: block;
  font-weight: 700;
}
.d {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text-muted);
  font-size: 24rpx;
}
.check {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  border: 4rpx solid #d1d5db;
}
.check.on {
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.grow {
  flex: 1;
}
.qty-row {
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.q {
  width: 160rpx;
  text-align: right;
  font-size: 36rpx;
  font-weight: 800;
}
.dock.dual {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 16rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #f4f7fb;
}
</style>
