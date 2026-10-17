<template>
  <view class="page page--sub">
    <NavBar :title="mode === 'time' ? t('report.timeTitle') : t('report.pieceTitle')" />
    <view v-if="!task" class="pad">{{ loading ? t('common.loading') : t('report.missing') }}</view>
    <view v-else class="body">
      <view class="card head">
        <view class="row">
          <text class="wt">{{ task.wtNo }}</text>
          <StatusTag :text="task.status" />
        </view>
        <text class="meta">{{ specLine }}</text>
        <view class="tag" :class="mode">{{ mode === 'time' ? t('record.time') : t('record.piece') }}</view>
      </view>

      <view class="card block">
        <text class="h">{{ t('report.process') }}</text>
        <view class="prc">
          <text class="code">{{ task.prcCode }}</text>
          <text class="name">{{ task.prcName }}</text>
        </view>
        <text class="sub">{{ task.deptName || task.wsName || '' }}</text>
        <view class="nums">
          <view><text>{{ t('report.plan') }}</text><text class="n">{{ fmtQty(task.planQty) }}</text></view>
          <view><text>{{ t('report.doneQty') }}</text><text class="n">{{ fmtQty(task.fnQty) }}</text></view>
          <view><text>{{ t('report.left') }}</text><text class="n remain">{{ fmtQty(task.pendingQty) }}</text></view>
        </view>
        <ReportProgress labeled :done="task.fnQty" :total="task.planQty || task.wtQty" />
        <EmpSwitcher
          :visible="user.isLeader"
          :workers="workers"
          :current-no="empNo"
          :current-name="empName"
          @change="onEmp"
        />
      </view>

      <view v-if="mode === 'piece'" class="card block">
        <text class="h">{{ t('report.qty') }}</text>
        <input class="qty" type="number" :value="reportQty" @input="onQty" />
        <view class="chips">
          <QtyChips :chips="[10, 20, 50]" @add="addQty" />
          <view class="custom" @click="fillMax">{{ t('report.custom') }}</view>
        </view>
        <text v-if="editing" class="note">{{ t('report.editHint', { no: editing.reportNo, n: fmtQty(originalQty), max: fmtQty(maxQty) }) }}</text>
        <view class="fee">
          <view class="row"><text>{{ t('report.price') }}</text><text>{{ t('task.pricePiece', { n: money(price) }) }}</text></view>
          <view class="row est"><text>{{ t('report.estimate') }}</text><text class="estn">¥ {{ money(pieceWage) }}</text></view>
        </view>
      </view>

      <view v-else class="card block">
        <view class="row"><text class="h">{{ t('report.hourPrice') }}</text><text>{{ t('task.priceHour', { n: money(price) }) }}</text></view>
        <view class="switch">
          <text :class="{ on: !timingMode }" @click="timingMode = false">{{ t('report.manual') }}</text>
          <text :class="{ on: timingMode }" @click="timingMode = true">{{ t('report.timer') }}</text>
        </view>
        <view v-if="!timingMode" class="times">
          <picker mode="time" :value="startAt" @change="onStart">
            <view class="time-field">
              <text class="time-label">{{ t('report.startAt') }}</text>
              <view class="time-val">
                <text>{{ startAt }}</text>
                <wd-icon name="arrow-down" size="14px" color="#9aa3b2" />
              </view>
            </view>
          </picker>
          <picker mode="time" :value="endAt" @change="onEnd">
            <view class="time-field">
              <text class="time-label">{{ t('report.endAt') }}</text>
              <view class="time-val">
                <text>{{ endAt }}</text>
                <wd-icon name="arrow-down" size="14px" color="#9aa3b2" />
              </view>
            </view>
          </picker>
        </view>
        <view v-else class="timer" @click="toggleTimer">{{ timing ? t('report.timing', { n: elapsedText }) : t('report.timer') }}</view>
        <text class="h">{{ t('report.hours') }}</text>
        <input class="qty" type="digit" :value="hours" @input="onHours" />
        <view class="fee">
          <view class="row est"><text>{{ t('report.estimate') }}</text><text class="estn">¥ {{ money(timeWage) }}</text></view>
        </view>
        <text class="note">{{ editing ? t('report.editTimeHint') : t('report.timeNote') }}</text>
      </view>

      <view v-if="mode === 'piece'" class="card block">
        <view class="row">
          <text class="h">{{ t('report.defect') }}</text>
          <QtyStepper v-model="defectQty" />
        </view>
        <input v-if="defectQty > 0" :key="'defect-' + locale" v-model="defectReason" class="input" :placeholder="t('report.defectPh')" />
      </view>

      <view class="card block">
        <text class="h">{{ t('report.remark') }}</text>
        <textarea :key="'remark-' + locale" v-model="remark" class="area" :placeholder="t('report.remarkPh')" />
      </view>
    </view>

    <view class="dock">
      <view class="btn-primary" :class="{ 'is-disabled': blocked }" @click="submit">
        {{ submitLabel }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import NavBar from '@/components/NavBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import QtyChips from '@/components/QtyChips.vue'
import QtyStepper from '@/components/QtyStepper.vue'
import EmpSwitcher from '@/components/EmpSwitcher.vue'
import ReportProgress from '@/components/ReportProgress.vue'
import { useUserStore } from '@/store/user'
import { useReportContext } from '@/store/reportContext'
import { composeMyTasks, toWorkers } from '@/services/taskCompose'
import { getWtWorkers } from '@/api/mes/dispatch'
import { submitDispatchReport, updateDispatchReport } from '@/api/mes/workReport'
import { fmtQty, nowText } from '@/utils/format'
import { locale, t } from '@/i18n'
import { isTimeWage, money, readRecord, saveTimeReport, taskPrice, touchRecent, updateTimeReport } from '@/utils/wage'
import { playReportSound, unlockReportSound } from '@/utils/sound'
import type { MyTask, WorkReportRecord, WtWorker } from '@/types/mes'

const user = useUserStore()
const ctx = useReportContext()
const loading = ref(true)
const submitting = ref(false)
const task = ref<MyTask | null>(null)
const workers = ref<WtWorker[]>([])
const empNo = ref('')
const empName = ref('')
const reportQty = ref(0)
const defectQty = ref(0)
const defectReason = ref('')
const remark = ref('')
const mode = ref<'piece' | 'time'>('piece')
const editing = ref<WorkReportRecord | null>(null)
const hours = ref(0)
const startAt = ref('08:00')
const endAt = ref('12:00')
const timingMode = ref(false)
const timing = ref(false)
const elapsed = ref(0)
let clock = 0

const originalQty = computed(() => Number(editing.value?.hours || editing.value?.reportQty || 0))
const maxQty = computed(() => {
  if (!task.value) return 0
  if (editing.value && mode.value === 'piece') return task.value.pendingQty + originalQty.value
  return task.value.pendingQty
})
const blocked = computed(() => submitting.value || !task.value || (mode.value === 'piece' && !editing.value && task.value.pendingQty <= 0))
const submitLabel = computed(() => {
  if (submitting.value) return editing.value ? t('report.saving') : t('report.submitting')
  return editing.value ? t('report.save') : t('report.submit')
})
const price = computed(() => taskPrice(task.value))
const pieceWage = computed(() => reportQty.value * price.value)
const timeWage = computed(() => hours.value * price.value)
const elapsedText = computed(() => {
  const sec = Math.floor(elapsed.value / 1000)
  const h = String(Math.floor(sec / 3600)).padStart(2, '0')
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
})

const specLine = computed(() =>
  [task.value?.sizeDesc, task.value?.goodsName, task.value?.woNo ? t('report.wo', { no: task.value.woNo }) : ''].filter(Boolean).join('  |  ')
)

const applyTask = (t: MyTask) => {
  task.value = t
  empNo.value = t.empNo
  empName.value = t.empName
  reportQty.value = t.pendingQty
  defectQty.value = 0
}

const onEmp = (w: WtWorker) => {
  empNo.value = w.empNo
  empName.value = w.empName
  if (task.value) {
    task.value = {
      ...task.value,
      empNo: w.empNo,
      empName: w.empName,
      goodsId: w.goodsId ?? task.value.goodsId,
      woNo: w.woNo || task.value.woNo,
      moNo: w.moNo || task.value.moNo,
      prcCode: w.prcCode || task.value.prcCode,
      woBorSno: w.woBorSno || task.value.woBorSno,
      planQty: w.planQty,
      fnQty: w.fnQty,
      pendingQty: w.pendingQty,
    }
    reportQty.value = w.pendingQty
  }
}

const onQty = (e: any) => {
  reportQty.value = Math.max(0, Number(e.detail.value || 0))
}
const fillMax = () => {
  if (task.value) reportQty.value = maxQty.value
}
const addQty = (n: number) => {
  const next = reportQty.value + n
  reportQty.value = task.value ? Math.min(maxQty.value, next) : next
}
const onHours = (e: any) => {
  hours.value = Math.max(0, Number(e.detail.value || 0))
}
const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map((part) => Number(part) || 0)
  return h * 60 + m
}
const applyRange = () => {
  if (!startAt.value || !endAt.value) return
  let mins = minutesOf(endAt.value) - minutesOf(startAt.value)
  if (mins < 0) mins += 24 * 60
  hours.value = Math.round((mins / 60) * 10) / 10
}
const onStart = (e: any) => {
  startAt.value = String(e.detail.value || startAt.value)
  applyRange()
}
const onEnd = (e: any) => {
  endAt.value = String(e.detail.value || endAt.value)
  applyRange()
}
const pad = (n: number) => String(n).padStart(2, '0')
const clockText = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const toggleTimer = () => {
  if (!timing.value) {
    timing.value = true
    const started = Date.now()
    elapsed.value = 0
    startAt.value = clockText(new Date(started))
    clock = setInterval(() => {
      elapsed.value = Date.now() - started
      hours.value = Math.round((elapsed.value / 3600000) * 10) / 10
    }, 1000) as unknown as number
    return
  }
  timing.value = false
  clearInterval(clock)
  endAt.value = clockText(new Date())
}

const timePayload = () => {
  if (!task.value) return null
  return {
    mode: 'time' as const,
    wtNo: task.value.wtNo,
    woNo: task.value.woNo,
    moNo: task.value.moNo,
    goodsId: task.value.goodsId,
    goodsName: task.value.goodsName,
    prcName: task.value.prcName,
    prcCode: task.value.prcCode,
    woBorSno: task.value.woBorSno,
    empNo: empNo.value,
    reportQty: hours.value,
    hours: hours.value,
    wage: timeWage.value,
    price: price.value,
    machiningUp: price.value,
    remark: [startAt.value && endAt.value ? `${startAt.value}-${endAt.value}` : '', remark.value].filter(Boolean).join(' '),
    reporter: empName.value,
    start: startAt.value,
    end: endAt.value,
  }
}
const submitTime = async () => {
  unlockReportSound()
  if (!task.value || hours.value <= 0) {
    uni.showToast({ title: t('report.needHours'), icon: 'none' })
    return
  }
  const payload = timePayload()
  if (!payload) return
  const row = editing.value
    ? updateTimeReport(editing.value.id || editing.value.reportNo, payload)
    : saveTimeReport({
        ...payload,
        id: `time-${Date.now()}`,
        reportNo: `T${Date.now()}`,
        reportTime: nowText(),
      })
  if (!row) {
    uni.showToast({ title: t('record.timeMissing'), icon: 'none' })
    return
  }
  ctx.setLastResult({
    reportNo: row.reportNo,
    reportQty: hours.value,
    wage: row.wage,
    wtNo: task.value.wtNo,
    prcName: task.value.prcName,
    goodsName: task.value.goodsName,
    edited: Boolean(editing.value),
  })
  playReportSound(Boolean(editing.value))
  uni.redirectTo({ url: '/pages/result/index' })
}

const submit = async () => {
  if (!task.value || submitting.value) return
  unlockReportSound()
  if (mode.value === 'time') return submitTime()
  if (!editing.value && task.value.pendingQty <= 0) return
  const passQty = Math.max(0, reportQty.value - defectQty.value)
  submitting.value = true
  try {
    const payload = {
      reportNo: editing.value?.reportNo,
      wtNo: task.value.wtNo,
      woNo: task.value.woNo,
      moNo: task.value.moNo,
      goodsId: task.value.goodsId,
      goodsName: task.value.goodsName,
      prcCode: task.value.prcCode,
      prcName: task.value.prcName,
      woBorSno: task.value.woBorSno,
      empNo: empNo.value,
      empName: empName.value,
      pendingQty: editing.value ? maxQty.value : task.value.pendingQty,
      reportQty: reportQty.value,
      passQty,
      defectQty: defectQty.value,
      reworkQty: 0,
      reportTime: nowText(),
      defectReason: defectReason.value,
      remark: remark.value,
      reportMethod: '移动报工',
    }
    const data = editing.value
      ? await updateDispatchReport(payload, { mine: !user.isLeader })
      : await submitDispatchReport(payload, { mine: !user.isLeader })
    ctx.setLastResult({
      ...data,
      wage: pieceWage.value,
      wtNo: task.value.wtNo,
      prcName: task.value.prcName,
      goodsName: task.value.goodsName,
      edited: Boolean(editing.value),
    })
    playReportSound(Boolean(editing.value))
    uni.redirectTo({ url: '/pages/result/index' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || t('report.failed'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onLoad(async (q) => {
  loading.value = true
  if (q?.mode === 'time' || isTimeWage(String(q?.mode || ''))) mode.value = 'time'
  if (q?.mode === 'piece') mode.value = 'piece'
  if (q?.edit === '1') editing.value = readRecord()
  try {
    const id = decodeURIComponent(String(q?.id || ''))
    let found = ctx.findTask(id)
    if (!found && q?.wtNo) {
      const res = await composeMyTasks({
        pageNo: 1,
        pageSize: 30,
        wtNo: String(q.wtNo),
        empNo: user.empNo,
        isLeader: user.isLeader,
      })
      found =
        res.list.find((t) => t.id === id) ||
        res.list.find((t) => t.wtNo === q.wtNo && (!q.prcCode || t.prcCode === q.prcCode)) ||
        res.list[0]
    }
    if (!found && id) found = ctx.tasks.find((t) => t.wtNo === id)
    if (found) {
      applyTask(found)
      touchRecent(found.id)
      if (q?.mode !== 'piece' && q?.mode !== 'time' && isTimeWage(found.pWageType)) mode.value = 'time'
      if (editing.value) {
        const range = editing.value.start && editing.value.end ? `${editing.value.start}-${editing.value.end}` : ''
        const note = editing.value.remark || ''
        remark.value = range && note.startsWith(range) ? note.slice(range.length).trim() : note
        if (mode.value === 'time') {
          hours.value = Number(editing.value.hours || editing.value.reportQty || 0)
          if (editing.value.start) startAt.value = editing.value.start
          if (editing.value.end) endAt.value = editing.value.end
        } else {
          reportQty.value = Number(editing.value.reportQty || 0)
          defectQty.value = Number(editing.value.defectQty || 0)
          defectReason.value = editing.value.defectReason || ''
        }
      } else if (mode.value === 'time') {
        applyRange()
      }
      if (user.isLeader) {
        const list = await getWtWorkers({
          wtNo: found.wtNo,
          woNo: found.woNo,
          moNo: found.moNo,
          goodsId: found.goodsId,
          prcCode: found.prcCode,
          woBorSno: found.woBorSno,
        })
        workers.value = toWorkers(list).filter((w) => w.pendingQty > 0 || w.empNo === found!.empNo)
      } else {
        workers.value = toWorkers([found])
      }
    }
  } finally {
    loading.value = false
  }
})
onUnmounted(() => clearInterval(clock))
</script>

<style lang="scss" scoped>
.body {
  padding: 12rpx 24rpx 40rpx;
}
.head,
.block {
  padding: 28rpx;
  margin-bottom: 20rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.wt {
  font-size: 34rpx;
  font-weight: 800;
}
.meta,
.sub {
  display: block;
  margin-top: 8rpx;
  color: var(--color-text-muted);
  font-size: 24rpx;
}
.h {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  font-weight: 600;
}
.prc {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 12rpx;
}
.code {
  font-size: 40rpx;
  font-weight: 800;
}
.name {
  font-size: 32rpx;
}
.nums {
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12rpx;
}
.nums view {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  color: var(--color-text-muted);
  font-size: 22rpx;
}
.n {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--color-text);
}
.remain {
  color: var(--color-primary);
}
.qty {
  margin: 16rpx 0;
  font-size: 72rpx;
  font-weight: 800;
  height: 96rpx;
  text-align: center;
}
.tag {
  display: inline-flex;
  margin-top: 12rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
.tag.time {
  color: #16a34a;
  background: #e8f8ee;
}
.chips {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.custom {
  height: 64rpx;
  padding: 0 20rpx;
  border-radius: 16rpx;
  background: #eef3fb;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  font-size: 26rpx;
  font-weight: 600;
}
.fee {
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--color-line);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  font-size: 26rpx;
  color: var(--color-text-secondary);
}
.estn {
  font-size: 40rpx;
  font-weight: 800;
  color: #f59e0b;
}
.switch {
  margin: 20rpx 0;
  display: flex;
  background: #f3f6fb;
  border-radius: 16rpx;
  padding: 6rpx;
}
.switch text {
  flex: 1;
  text-align: center;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 12rpx;
  color: var(--color-text-muted);
}
.switch text.on {
  background: #fff;
  color: var(--color-primary);
  font-weight: 700;
}
.times {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.time-field {
  background: #f4f7fb;
  border-radius: 16rpx;
  padding: 16rpx 20rpx 18rpx;
}
.time-label {
  display: block;
  font-size: 22rpx;
  color: var(--color-text-muted);
}
.time-val {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 34rpx;
  font-weight: 700;
}
.timer {
  margin: 12rpx 0 20rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: #e8f8ee;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.note {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: var(--color-text-muted);
  line-height: 1.5;
}
.input,
.area {
  margin-top: 16rpx;
  width: 100%;
  background: #f6f8fc;
  border-radius: 16rpx;
  padding: 20rpx;
  box-sizing: border-box;
}
.area {
  min-height: 140rpx;
}
.dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(244, 247, 251, 0), #f4f7fb 30%);
}
.pad {
  padding: 80rpx;
  text-align: center;
  color: var(--color-text-muted);
}
</style>
