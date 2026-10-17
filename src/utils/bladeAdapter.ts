export const getEnvelope = (res: any) => {
  if (!res || typeof res !== 'object') return res
  if (res.data != null && (res.statusCode != null || res.status != null || res.headers != null) && !('success' in res)) {
    return res.data
  }
  return res
}

export const unwrap = (res: any) => {
  const envelope = getEnvelope(res)
  if (envelope == null) return envelope
  if (typeof envelope === 'object' && !Array.isArray(envelope) && 'data' in envelope && ('code' in envelope || 'success' in envelope)) {
    return envelope.data
  }
  return envelope
}

export const adaptPage = (res: any, mapRow?: (row: any) => any) => {
  const envelope = getEnvelope(res) || {}
  const page = unwrap(res) || {}
  const records = Array.isArray(page) ? page : page.records || page.list || (Array.isArray(page.data) ? page.data : [])
  const list = mapRow ? records.map(mapRow) : records
  return {
    code: envelope?.code ?? 200,
    success: envelope?.success ?? true,
    msg: envelope?.msg || '操作成功',
    data: {
      list,
      total: Number(page.total ?? list.length),
    },
  }
}

export function assertOk(res: any, fallback = '请求失败') {
  const envelope = getEnvelope(res) || {}
  if (envelope.success === false || (envelope.code != null && Number(envelope.code) !== 200 && Number(envelope.code) !== 0)) {
    throw new Error(envelope.msg || envelope.error_description || fallback)
  }
  return unwrap(res)
}
