<template>
  <view class="page">
    <view class="status" :style="{ height: statusBar + 'px' }" />
    <view class="head">
      <text class="title">{{ picking ? t('task.pickTitle') : t('task.title') }}</text>
      <text class="sub">{{ user.isLeader ? t('task.leaderSub') : t('task.workerSub') }}</text>
    </view>
    <view class="search card">
      <input :key="'kw-' + locale" v-model="keyword" :placeholder="t('task.searchPh')" confirm-type="search" @confirm="reload" />
    </view>
    <scroll-view scroll-x class="filters" :show-scrollbar="false">
      <view v-for="f in filters" :key="f.key" class="chip" :class="{ on: filter === f.key }" @click="filter = f.key">{{ f.label }}</view>
    </scroll-view>
    <view class="list">
      <view v-if="ctx.loading && !shown.length" class="pad">{{ t('common.loading') }}</view>
      <EmptyState v-else-if="ctx.error" :title="t('home.loadFail')" :desc="tx(ctx.error)" />
      <EmptyState v-else-if="!shown.length" :title="t('task.empty')" />
      <TaskCard v-for="task in shown" :key="task.id" :task="task" @click="openTask(task)" />
    </view>
    <AppTabBar current="/pages/task/index" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useReportContext } from '@/store/reportContext'
import { go } from '@/utils/nav'
import { getToken } from '@/utils/auth'
import AppTabBar from '@/components/AppTabBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import TaskCard from '@/components/TaskCard.vue'
import type { MyTask } from '@/types/mes'
import { locale, t, tx } from '@/i18n'
import { isTimeWage, recentIds, touchRecent } from '@/utils/wage'

const statusBar = uni.getSystemInfoSync().statusBarHeight || 20
const user = useUserStore()
const ctx = useReportContext()
const filter = ref('all')
const keyword = ref('')
const mode = ref<'piece' | 'time'>('piece')
const picking = ref(false)
const filters = computed(() => [
  { key: 'all', label: t('filter.all') },
  { key: 'todo', label: t('task.todo') },
  { key: 'run', label: t('home.statRun') },
  { key: 'done', label: t('filter.done') },
  { key: 'recent', label: t('task.recent') },
])

const shown = computed(() => {
  let rows = ctx.tasks
  if (picking.value) {
    rows = rows.filter((task) => (mode.value === 'time' ? isTimeWage(task.pWageType) : !isTimeWage(task.pWageType)))
  }
  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    rows = rows.filter(
      (task) =>
        task.wtNo.toLowerCase().includes(kw) ||
        task.woNo.toLowerCase().includes(kw) ||
        task.prcName.toLowerCase().includes(kw) ||
        task.goodsName.toLowerCase().includes(kw)
    )
  }
  if (filter.value === 'todo') rows = rows.filter((task) => task.pendingQty > 0)
  else if (filter.value === 'run') rows = rows.filter((task) => task.status === '生产中')
  else if (filter.value === 'done') rows = rows.filter((task) => task.status === '已完成')
  else if (filter.value === 'recent') {
    const order = new Map(recentIds().map((id, index) => [id, index]))
    rows = rows.filter((task) => order.has(task.id)).sort((a, b) => (order.get(a.id) || 0) - (order.get(b.id) || 0))
  }
  return rows
})

const reload = () => ctx.load({ force: true, pageSize: 20, empNo: user.empNo, isLeader: user.isLeader })
const openTask = (task: MyTask) => {
  touchRecent(task.id)
  const reportMode = isTimeWage(task.pWageType) ? 'time' : 'piece'
  go(`/pages/report/index?id=${encodeURIComponent(task.id)}&mode=${reportMode}`)
}

const syncEntry = (q?: Record<string, any>) => {
  const hash = typeof location !== 'undefined' ? location.hash : ''
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  const fromHash: Record<string, string> = {}
  query.split('&').forEach((part) => {
    if (!part) return
    const [k, v] = part.split('=')
    fromHash[decodeURIComponent(k)] = decodeURIComponent(v || '')
  })
  const modeQ = fromHash.mode || q?.mode
  const filterQ = fromHash.filter || q?.filter
  if (modeQ === 'time' || modeQ === 'piece') {
    mode.value = modeQ
    picking.value = true
  } else {
    picking.value = false
  }
  if (filterQ === 'todo' || filterQ === 'run' || filterQ === 'done' || filterQ === 'recent') {
    filter.value = String(filterQ)
  }
}

onLoad((q) => {
  syncEntry(q as Record<string, any>)
})

onShow(() => {
  if (!getToken()) return uni.reLaunch({ url: '/pages/login/index' })
  syncEntry()
  reload()
})
onPullDownRefresh(async () => {
  await reload()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.head {
  padding: 12rpx 32rpx 8rpx;
}
.title {
  font-size: 40rpx;
  font-weight: 800;
}
.sub {
  display: block;
  margin-top: 6rpx;
  color: var(--color-text-muted);
  font-size: 24rpx;
}
.search {
  margin: 16rpx 24rpx;
  padding: 8rpx 24rpx;
}
.search input {
  height: 72rpx;
}
.filters {
  white-space: nowrap;
  padding: 0 24rpx 16rpx;
}
.chip {
  display: inline-flex;
  padding: 10rpx 24rpx;
  margin-right: 12rpx;
  border-radius: 999rpx;
  background: #fff;
  color: var(--color-text-muted);
}
.chip.on {
  background: var(--color-primary);
  color: #fff;
}
.list {
  padding: 0 24rpx;
}
.pad {
  padding: 40rpx;
  text-align: center;
  color: var(--color-text-muted);
}
</style>
