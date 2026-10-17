<template>
  <view class="tag" :class="tone"><text class="label">{{ label }}</text></view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'

const statusKey: Record<string, string> = {
  已完成: 'status.done',
  完成: 'status.done',
  已通过: 'status.passed',
  去报工: 'status.report',
  待报工: 'status.toReport',
  待开始: 'status.notStarted',
  待审核: 'status.pendingAudit',
  不良品: 'status.defect',
  异常: 'status.exception',
  进行中: 'status.doing',
  生产中: 'status.producing',
  计时: 'record.time',
  计件: 'record.piece',
}

const props = defineProps<{ text: string }>()
const label = computed(() => (statusKey[props.text] ? t(statusKey[props.text]) : props.text))
const tone = computed(() => {
  const t = props.text
  if (['已完成', '已通过', '完成'].includes(t)) return 'ok'
  if (['去报工', '待报工', '待开始', '待审核'].includes(t)) return 'warn'
  if (['不良品', '异常'].includes(t)) return 'bad'
  return 'info'
})
</script>

<style lang="scss" scoped>
.tag {
  align-self: flex-start;
  flex: none;
  display: inline-flex;
  align-items: center;
  height: 44rpx;
  padding: 0 16rpx;
  border-radius: 22rpx;
  box-sizing: border-box;
}
.label {
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}
.ok {
  color: #16a34a;
  background: #e8f8ee;
}
.warn {
  color: #d97706;
  background: #fff4e0;
}
.info {
  color: #2563eb;
  background: #e8f0fe;
}
.bad {
  color: #dc2626;
  background: #feecec;
}
</style>
