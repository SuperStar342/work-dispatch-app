import { request } from '@/utils/request'
import { adaptPage, unwrap } from '@/utils/bladeAdapter'

export async function getWtList(params?: Record<string, any>) {
  const res: any = await request({
    url: '/blade-system/dispatch/list',
    method: 'GET',
    params: {
      current: params?.pageNo || 1,
      size: params?.pageSize || 20,
      wtNo: params?.wtNo || undefined,
      moNo: params?.moNo || undefined,
      cFlag: params?.cFlag,
      ifClose: params?.ifClose,
      ifCancel: params?.ifCancel,
      finishFlag: params?.finishFlag,
    },
  })
  return adaptPage(res)
}

export async function getWtItems(wtNo: string) {
  const res: any = await request({
    url: '/blade-system/dispatch/items',
    method: 'GET',
    params: { wtNo },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getWtWorkers(params: {
  wtNo: string
  woNo?: string
  moNo?: string
  goodsId?: number | string
  prcCode?: string
  woBorSno?: string
}) {
  const res: any = await request({
    url: '/blade-system/dispatch/workers',
    method: 'GET',
    params: {
      wtNo: params.wtNo,
      woNo: params.woNo || undefined,
      moNo: params.moNo || undefined,
      goodsId: params.goodsId || undefined,
      prcCode: params.prcCode || undefined,
      woBorSno: params.woBorSno || undefined,
    },
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function searchEmployees(params?: { deptId?: string | number; keyword?: string }) {
  const res: any = await request({
    url: '/blade-system/quick-dispatch/employees',
    method: 'GET',
    params: {
      deptId: params?.deptId,
      keyword: params?.keyword,
    },
    silentError: true,
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : data?.records || data?.list || []
}
