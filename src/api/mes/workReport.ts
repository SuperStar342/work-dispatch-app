import { request } from '@/utils/request'
import { t } from '@/i18n'
import { adaptPage, getEnvelope, unwrap } from '@/utils/bladeAdapter'
import { isWholeQuantity } from '@/utils/quantity'
import type { DispatchReportBatchResult, DispatchReportPayload, DispatchReportResult } from '@/types/mes'

export function validateDispatchReport(payload: DispatchReportPayload) {
  if (!payload.wtNo) return t('val.wt')
  if (!payload.empNo) return t('val.emp')
  if (payload.reportQty <= 0) return t('val.qty')
  if (![payload.reportQty, payload.passQty, payload.defectQty, payload.reworkQty].every(isWholeQuantity)) {
    return t('val.integer')
  }
  if (payload.reportQty > payload.pendingQty) return t('val.over', { n: payload.pendingQty })
  const sum = payload.passQty + payload.defectQty + payload.reworkQty
  if (sum !== payload.reportQty) return t('val.sum')
  if (payload.defectQty > 0 && !payload.defectReason?.trim()) return t('val.reason')
  return ''
}

export async function submitDispatchReport(payload: DispatchReportPayload, opts?: { mine?: boolean }) {
  const err = validateDispatchReport(payload)
  if (err) throw new Error(err)
  const res: any = await request({
    url: opts?.mine ? '/blade-system/employee-task/submit' : '/blade-system/work-report/submit-dispatch',
    method: 'POST',
    data: payload,
  })
  const envelope = getEnvelope(res) || {}
  if (envelope.success === false || (envelope.code != null && Number(envelope.code) !== 200)) {
    throw new Error(envelope.msg || envelope.error_description || t('report.failed'))
  }
  const data = unwrap(res) as DispatchReportResult
  if (!data?.reportNo) throw new Error(envelope.msg || t('val.noReportNo'))
  return data
}

export async function submitDispatchReportBatch(payloads: DispatchReportPayload[], opts?: { mine?: boolean }) {
  if (!payloads.length) throw new Error(t('val.emptyBatch'))
  for (const payload of payloads) {
    const err = validateDispatchReport(payload)
    if (err) throw new Error(err)
  }
  const res: any = await request({
    url: opts?.mine ? '/blade-system/employee-task/submit-batch' : '/blade-system/work-report/submit-batch',
    method: 'POST',
    data: { payloads },
  })
  const envelope = getEnvelope(res) || {}
  if (envelope.success === false || (envelope.code != null && Number(envelope.code) !== 200)) {
    throw new Error(envelope.msg || envelope.error_description || t('val.batchFail'))
  }
  const data = unwrap(res) as DispatchReportBatchResult
  if (!data || (data.successCount == null && !Array.isArray(data.reportNos))) {
    throw new Error(t('val.batchEmpty'))
  }
  return data
}

export async function updateDispatchReport(payload: DispatchReportPayload, opts?: { mine?: boolean }) {
  const err = validateDispatchReport(payload)
  if (err) throw new Error(err)
  if (!payload.reportNo) throw new Error(t('val.reportNo'))
  const res: any = await request({
    url: opts?.mine ? '/blade-system/employee-task/update' : '/blade-system/work-report/update',
    method: 'POST',
    data: payload,
  })
  const envelope = getEnvelope(res) || {}
  if (envelope.success === false || (envelope.code != null && Number(envelope.code) !== 200)) {
    throw new Error(envelope.msg || envelope.error_description || t('report.failed'))
  }
  return unwrap(res) as DispatchReportResult
}

export async function withdrawDispatchReport(reportNo: string, opts?: { mine?: boolean }) {
  if (!reportNo) throw new Error(t('val.reportNo'))
  const res: any = await request({
    url: opts?.mine ? '/blade-system/employee-task/withdraw' : '/blade-system/work-report/withdraw',
    method: 'POST',
    data: { reportNo },
  })
  const envelope = getEnvelope(res) || {}
  if (envelope.success === false || (envelope.code != null && Number(envelope.code) !== 200)) {
    throw new Error(envelope.msg || envelope.error_description || t('report.failed'))
  }
  return unwrap(res)
}

export async function getReportRecords(params?: Record<string, any>, opts?: { mine?: boolean }) {
  const res: any = await request({
    url: opts?.mine ? '/blade-system/employee-task/records' : '/blade-system/work-report/records',
    method: 'GET',
    params: {
      current: params?.pageNo || 1,
      size: params?.pageSize || 50,
      wtNo: params?.wtNo,
      woNo: params?.woNo,
      prcCode: params?.prcCode,
      prcName: params?.prcName,
      keyword: params?.keyword,
    },
  })
  return adaptPage(res)
}

export async function getNonProdTasks(params?: {
  keyword?: string
  onlyPending?: boolean
  limit?: number
}) {
  const res: any = await request({
    url: '/blade-system/employee-task/non-prod-tasks',
    method: 'GET',
    params: {
      keyword: params?.keyword || '',
      onlyPending: params?.onlyPending || false,
      limit: params?.limit || 200,
    },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

/** 提交计时报工（非生产派工）：写入 ERP 非生产完工申报，待 PC 端审核 */
export async function submitTimeReport(payload: {
  owtNo: string
  sNo?: number
  hours: number
  reportTime?: string
  remark?: string
}) {
  if (!payload.owtNo) throw new Error(t('val.owt'))
  if (!payload.hours || payload.hours <= 0) throw new Error(t('report.needHours'))
  const res: any = await request({
    url: '/blade-system/employee-task/submit-time',
    method: 'POST',
    data: payload,
  })
  const envelope = getEnvelope(res) || {}
  if (envelope.success === false || (envelope.code != null && Number(envelope.code) !== 200)) {
    throw new Error(envelope.msg || envelope.error_description || t('report.failed'))
  }
  const data = unwrap(res)
  if (!data?.fnNo) throw new Error(envelope.msg || t('val.noReportNo'))
  return data as { fnNo: string; reportNo: string; hours: number; workTime: number; wageAmt: number; pendingQty: number }
}

/** 本人计时报工记录（服务端，含审核状态） */
export async function getTimeRecords(params?: { keyword?: string; limit?: number }) {
  const res: any = await request({
    url: '/blade-system/employee-task/time-records',
    method: 'GET',
    params: {
      keyword: params?.keyword || '',
      limit: params?.limit || 200,
    },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

/** 撤回本人计时报工（仅未审核；已驳回的也可撤回后重新提交） */
export async function withdrawTimeReport(fnNo: string) {
  if (!fnNo) throw new Error(t('val.reportNo'))
  const res: any = await request({
    url: '/blade-system/employee-task/withdraw-time',
    method: 'POST',
    params: { fnNo },
  })
  const envelope = getEnvelope(res) || {}
  if (envelope.success === false || (envelope.code != null && Number(envelope.code) !== 200)) {
    throw new Error(envelope.msg || envelope.error_description || t('report.failed'))
  }
  return unwrap(res)
}

/** 修改本人计时报工（仅未审核；服务端改单，不产生新单） */
export async function updateTimeReport(
  fnNo: string,
  payload: { hours: number; reportTime?: string; remark?: string }
) {
  if (!fnNo) throw new Error(t('val.reportNo'))
  if (!payload.hours || payload.hours <= 0) throw new Error(t('report.needHours'))
  const res: any = await request({
    url: '/blade-system/employee-task/update-time',
    method: 'POST',
    params: { fnNo },
    data: payload,
  })
  const envelope = getEnvelope(res) || {}
  if (envelope.success === false || (envelope.code != null && Number(envelope.code) !== 200)) {
    throw new Error(envelope.msg || envelope.error_description || t('report.failed'))
  }
  const data = unwrap(res)
  if (!data?.fnNo) throw new Error(envelope.msg || t('report.failed'))
  return data as { fnNo: string; reportNo: string; hours: number; workTime: number; wageAmt: number }
}
