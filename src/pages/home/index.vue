<template>
  <view class="page home">
    <view class="status" :style="{ height: statusBar + 'px' }" />
    <view class="header">
      <view class="who">
        <view class="avatar">{{ (user.loginName || t('common.employee')).slice(0, 1) }}</view>
        <view>
          <text class="hi">{{ user.loginName }}</text>
          <text class="shift">{{ t('home.emp', { no: user.empNo || '--' }) }}{{ user.isLeader ? t('home.leader') : '' }}</text>
        </view>
      </view>
    </view>

    <view class="hero card" @click="go('/pages/wage/index')">
      <text class="hero-label">{{ t('home.wageToday') }}</text>
      <view class="hero-num">
        <text class="yen">¥</text>
        <text class="big">{{ money(todayWage) }}</text>
      </view>
      <text v-if="deltaText" class="delta">{{ deltaText }}</text>
      <text v-else class="delta">{{ subline }}</text>
    </view>

    <view class="stats">
      <view class="stat card" @click="goTab('/pages/task/index?filter=todo')">
        <text class="sk">{{ t('home.statTodo') }}</text>
        <text class="sv warn">{{ todoCount }}</text>
      </view>
      <view class="stat card" @click="goTab('/pages/task/index?filter=run')">
        <text class="sk">{{ t('home.statRun') }}</text>
        <text class="sv run">{{ runCount }}</text>
      </view>
      <view class="stat card" @click="goTab('/pages/task/index?filter=done')">
        <text class="sk">{{ t('home.statDone') }}</text>
        <text class="sv ok">{{ doneCount }}</text>
      </view>
    </view>

    <view class="modes">
      <view class="mode mode--piece" @click="goTab('/pages/task/index?mode=piece')">
        <view class="mode-copy">
          <text class="mt">{{ t('home.piece') }}</text>
          <text class="ms">{{ t('home.pieceSub') }}</text>
        </view>
        <view class="mode-ico">
          <wd-icon name="chart-bar" size="22px" color="#ffffff" />
        </view>
      </view>
      <view class="mode mode--time" @click="goTab('/pages/task/index?mode=time')">
        <view class="mode-copy">
          <text class="mt">{{ t('home.time') }}</text>
          <text class="ms">{{ t('home.timeSub') }}</text>
        </view>
        <view class="mode-ico">
          <wd-icon name="clock" size="22px" color="#ffffff" />
        </view>
      </view>
    </view>

    <view class="links">
      <text @click="go('/pages/scan/index')">{{ t('home.scan') }}</text>
      <text @click="go('/pages/batch/index')">{{ t('home.batch') }}</text>
      <text @click="go('/pages/exception/index')">{{ t('home.exception') }}</text>
    </view>

    <view class="sec">
      <text class="sec-title">{{ t('home.todayTasks') }}</text>
      <text class="more" @click="goTab('/pages/task/index')">{{ t('home.taskCount', { n: list.length }) }}</text>
    </view>

    <view v-if="ctx.loading && !list.length" class="pad">{{ t('common.loading') }}</view>
    <EmptyState v-else-if="ctx.error" :title="t('home.loadFail')" :desc="tx(ctx.error)" />
    <EmptyState v-else-if="!list.length" :title="t('home.empty')" :desc="t('home.emptyDesc')" />
    <TaskCard v-for="task in list" :key="task.id" :task="task" @click="openTask(task)" />

    <AppTabBar current="/pages/home/index" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { t, tx } from '@/i18n'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useReportContext } from '@/store/reportContext'
import { getReportRecords } from '@/api/mes/workReport'
import { fmtQty, todayPrefix } from '@/utils/format'
import { go, goTab } from '@/utils/nav'
import { getToken } from '@/utils/auth'
import AppTabBar from '@/components/AppTabBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import TaskCard from '@/components/TaskCard.vue'
import type { MyTask, WorkReportRecord } from '@/types/mes'
import { isTimeWage, lineWage, listTimeReports, money } from '@/utils/wage'

const statusBar = uni.getSystemInfoSync().statusBarHeight || 20
const user = useUserStore()
const ctx = useReportContext()
const todayQty = ref(0)
const records = ref<WorkReportRecord[]>([])

const list = computed(() => ctx.tasks.filter((task) => task.pendingQty > 0).slice(0, 8))
const todoCount = computed(() => ctx.tasks.filter((task) => task.status === '待开始').length)
const runCount = computed(() => ctx.tasks.filter((task) => task.status === '生产中').length)
const doneCount = computed(() => ctx.tasks.filter((task) => task.status === '已完成').length)

const dayWage = (day: string) => {
  const server = records.value
    .filter((row) => String(row.reportTime || '').startsWith(day))
    .reduce((sum, row) => sum + lineWage(row), 0)
  const local = listTimeReports()
    .filter((row) => String(row.reportTime || '').startsWith(day))
    .reduce((sum, row) => sum + lineWage(row), 0)
  return server + local
}

const localHours = computed(() => {
  void records.value
  const today = todayPrefix()
  return listTimeReports()
    .filter((row) => String(row.reportTime || '').startsWith(today))
    .reduce((sum, row) => sum + Number(row.hours || row.reportQty || 0), 0)
})
const subline = computed(() => {
  const piece = todayQty.value > 0 ? t('home.today', { n: fmtQty(todayQty.value) }) : ''
  const timed = localHours.value > 0 ? t('home.todayTime', { n: fmtQty(localHours.value) }) : ''
  return [piece, timed].filter(Boolean).join(' · ') || t('home.today', { n: 0 })
})
const todayWage = computed(() => dayWage(todayPrefix()))
const deltaText = computed(() => {
  const prevDate = new Date()
  prevDate.setDate(prevDate.getDate() - 1)
  const p = (n: number) => String(n).padStart(2, '0')
  const prev = `${prevDate.getFullYear()}-${p(prevDate.getMonth() + 1)}-${p(prevDate.getDate())}`
  const before = dayWage(prev)
  if (before <= 0) return ''
  const pct = Math.round(((todayWage.value - before) / before) * 100)
  const text = `${pct > 0 ? '+' : ''}${pct}%`
  return t('home.wageDelta', { n: text })
})

const load = async (force = false) => {
  await ctx.load({ force, pageSize: 10, empNo: user.empNo, isLeader: user.isLeader })
  try {
    const scoped = !user.isLeader
    const rec = await getReportRecords(
      { pageNo: 1, pageSize: 50, keyword: scoped ? undefined : user.empNo },
      { mine: scoped },
    )
    records.value = rec.data.list || []
    const today = todayPrefix()
    todayQty.value = records.value.reduce((sum, row) => {
      const time = String(row.reportTime || '')
      const mine = scoped || !user.empNo || String(row.reporter || '').includes(user.empNo) || String(row.reporter || '').includes(user.displayName)
      return time.startsWith(today) && mine ? sum + Number(row.reportQty || 0) : sum
    }, 0)
  } catch {
    records.value = []
    todayQty.value = 0
  }
}

const openTask = (task: MyTask) => {
  const mode = isTimeWage(task.pWageType) ? 'time' : 'piece'
  go(`/pages/report/index?id=${encodeURIComponent(task.id)}&mode=${mode}`)
}

onShow(() => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  load()
})
onPullDownRefresh(async () => {
  await load(true)
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.home {
  padding: 0 24rpx 24rpx;
}
.header {
  padding: 12rpx 8rpx 20rpx;
}
.who {
  display: flex;
  gap: 20rpx;
  align-items: center;
}
.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(180deg, #7aa7f8, #4e88f3);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.hi {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
}
.shift {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text-muted);
  font-size: 24rpx;
}
.hero {
  padding: 32rpx;
  background: linear-gradient(135deg, #5b94f7 0%, #3d7af0 100%);
  color: #fff;
  box-shadow: 0 16rpx 40rpx rgba(61, 122, 240, 0.28);
}
.hero-label {
  font-size: 24rpx;
  opacity: 0.92;
}
.hero-num {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-top: 12rpx;
}
.yen {
  font-size: 36rpx;
  font-weight: 700;
}
.big {
  font-size: 72rpx;
  font-weight: 800;
  line-height: 1;
}
.delta {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  opacity: 0.9;
}
.stats {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16rpx;
}
.stat {
  padding: 22rpx 8rpx;
  text-align: center;
}
.sk {
  display: block;
  font-size: 22rpx;
  color: var(--color-text-muted);
}
.sv {
  display: block;
  margin-top: 8rpx;
  font-size: 44rpx;
  font-weight: 800;
}
.sv.warn {
  color: #f59e0b;
}
.sv.run {
  color: var(--color-primary);
}
.sv.ok {
  color: #16a34a;
}
.modes {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.mode {
  min-height: 140rpx;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  color: #fff;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.mode-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8rpx;
}
.mode-ico {
  flex: none;
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
}
.mode--piece {
  background: linear-gradient(135deg, #5b94f7, #3d7af0);
}
.mode--time {
  background: linear-gradient(135deg, #3dce86, #16a34a);
}
.mt {
  font-size: 34rpx;
  font-weight: 800;
}
.ms {
  font-size: 22rpx;
  opacity: 0.9;
}
.links {
  margin: 20rpx 8rpx 8rpx;
  display: flex;
  gap: 28rpx;
  color: var(--color-text-secondary);
  font-size: 24rpx;
}
.sec {
  margin: 12rpx 0 16rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.sec-title {
  font-size: 32rpx;
  font-weight: 800;
}
.more {
  font-size: 24rpx;
  color: var(--color-text-muted);
}
.pad {
  padding: 40rpx;
  text-align: center;
  color: var(--color-text-muted);
}
</style>
