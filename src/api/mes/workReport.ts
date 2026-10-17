import { request } from '@/utils/request'
import { t } from '@/i18n'
import { adaptPage, getEnvelope, unwrap } from '@/utils/bladeAdapter'
import type { DispatchReportBatchResult, DispatchReportPayload, DispatchReportResult } from '@/types/mes'

export function validateDispatchReport(payload: DispatchReportPayload) {
  if (!payload.wtNo) return t('val.wt')
  if (!payload.empNo) return t('val.emp')
  if (payload.reportQty <= 0) return t('val.qty')
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
