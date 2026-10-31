import { getWtItems, getWtList, getWtWorkers } from '@/api/mes/dispatch'
import { request } from '@/utils/request'
import { unwrap } from '@/utils/bladeAdapter'
import type { MyTask, TaskStatus, WtWorker } from '@/types/mes'
import { isAudited, isFinished, isYesFlag, num } from '@/utils/format'

const mapStatus = (fnQty: number, pendingQty: number): TaskStatus => {
  if (pendingQty <= 0) return '已完成'
  if (fnQty <= 0) return '待开始'
  return '生产中'
}

/** 全部 / 待开始 / 生产中 / 已完成 互斥。待报工不是独立状态，未完成的任务只会落在前两类。 */
export function matchesTaskFilter(status: string, key: string) {
  if (!key || key === 'all') return true
  return status === key
}

const workerPending = (w: any) => Math.max(0, num(w.planQty) - num(w.fnQty))

const taskIdOf = (wtNo: string, w: any) =>
  `${wtNo}|${w.woNo || ''}|${w.goodsId || ''}|${w.prcCode || ''}|${w.woBorSno || ''}|${w.empNo || ''}`

const itemKeyOf = (row: any) =>
  `${row.woNo || ''}|${row.moNo || ''}|${row.goodsId || ''}|${row.prcCode || ''}|${row.woBorSno || ''}`

async function mapWt(wt: any, empNo?: string, isLeader?: boolean): Promise<MyTask[]> {
  if (!isAudited(wt.cFlag) || isYesFlag(wt.ifClose) || isYesFlag(wt.ifCancel) || isFinished(wt.finishFlag)) {
    return []
  }
  const wtNo = String(wt.wtNo || '')
  const [items, workers] = await Promise.all([getWtItems(wtNo), getWtWorkers({ wtNo })])
  const itemByKey = new Map<string, any>()
  items.forEach((it: any) => {
    itemByKey.set(itemKeyOf(it), it)
  })
  let rows: any[] = workers
  if (!isLeader && empNo) {
    rows = workers.filter((w: any) => String(w.empNo || '') === String(empNo))
  }
  return rows
    .map((w: any) => {
      const pendingQty = workerPending(w)
      const item = itemByKey.get(itemKeyOf(w)) || {}
      const fnQty = num(w.fnQty)
      const planQty = num(w.planQty)
      const task: MyTask = {
        id: taskIdOf(wtNo, w),
        wtNo,
        woNo: String(w.woNo || item.woNo || ''),
        moNo: String(w.moNo || item.moNo || wt.moNo || ''),
        goodsName: String(item.goodsName || w.goodsName || ''),
        goodsCode: String(item.goodsCode || ''),
        sizeDesc: item.sizeDesc || item.productSizeDesc || '',
        prcCode: String(w.prcCode || item.prcCode || ''),
        prcName: String(item.prcName || w.prcName || ''),
        woBorSno: String(w.woBorSno || item.woBorSno || ''),
        goodsId: w.goodsId != null && w.goodsId !== '' ? w.goodsId : item.goodsId,
        wsName: wt.wsName || item.wsName,
        deptName: wt.deptName || w.deptName,
        empNo: String(w.empNo || ''),
        empName: String(w.empName || ''),
        wtQty: num(item.wtQty) || planQty,
        fnQty,
        planQty,
        pendingQty,
        cFlag: wt.cFlag,
        finishFlag: wt.finishFlag,
        machiningUp: num(item.machiningUp),
        pWageType: String(item.pWageType || w.pWageType || ''),
        status: mapStatus(fnQty, pendingQty),
      }
      return task
    })
    .filter((t) => t.prcCode)
}

/** 普通员工：后端按登录工号直接返回本人任务，不依赖派工菜单权限 */
async function composeOwnTasks(opts: { pageSize?: number; keyword?: string }) {
  const [prodRes, nonProdRes] = await Promise.all([
    request({
      url: '/blade-system/employee-task/tasks',
      method: 'GET',
      params: { keyword: opts.keyword || '', limit: Math.max(opts.pageSize || 200, 200) },
    }),
    request({
      url: '/blade-system/employee-task/non-prod-tasks',
      method: 'GET',
      params: { keyword: opts.keyword || '', limit: 200 },
      silentError: true,
    }).catch(() => null),
  ])
  const rows: any[] = (unwrap(prodRes) as any[]) || []
  const nonProdData = nonProdRes ? unwrap(nonProdRes) : []
  const nonProdRows: any[] = Array.isArray(nonProdData) ? nonProdData : []
  const list: MyTask[] = [...rows, ...nonProdRows]
    .filter((w) => w.prcCode || w.prcName || w.owtNo)
    .map((w) => {
      const fnQty = num(w.fnQty)
      const planQty = num(w.planQty)
      const taskNo = String(w.wtNo || w.owtNo || '')
      // 后端已按人员级口径算好剩余量；缺失时退回 planQty - fnQty
      const pendingQty = w.pendingQty != null ? Math.max(0, num(w.pendingQty)) : Math.max(0, planQty - fnQty)
      const task: MyTask = {
        id: taskIdOf(taskNo, w),
        wtNo: taskNo,
        woNo: String(w.woNo || ''),
        moNo: String(w.moNo || ''),
        goodsName: String(w.goodsName || ''),
        goodsCode: String(w.goodsCode || ''),
        sizeDesc: w.sizeDesc || '',
        prcCode: String(w.prcCode || ''),
        prcName: String(w.prcName || ''),
        woBorSno: String(w.woBorSno || ''),
        goodsId: w.goodsId,
        wsName: w.wsName || w.deptName,
        deptName: w.deptName,
        empNo: String(w.empNo || ''),
        empName: String(w.empName || ''),
        wtQty: num(w.wtQty) || planQty,
        fnQty,
        planQty,
        pendingQty,
        cFlag: w.cFlag,
        finishFlag: w.finishFlag,
        machiningUp: num(w.machiningUp),
        pWageType: String(w.owtNo ? '3' : (w.pWageType || '')),
        owtNo: String(w.owtNo || ''),
        sNo: Number(w.sNo || 1),
        status: w.status || mapStatus(fnQty, pendingQty),
      }
      return task
    })
  return { list, total: list.length, wtCount: new Set(list.map((t) => t.wtNo)).size }
}

export async function composeMyTasks(opts: {
  pageNo?: number
  pageSize?: number
  empNo?: string
  isLeader?: boolean
  wtNo?: string
}) {
  if (!opts.isLeader) return composeOwnTasks({ pageSize: opts.pageSize, keyword: opts.wtNo })
  const page = await getWtList({
    pageNo: opts.pageNo || 1,
    pageSize: opts.pageSize || 12,
    wtNo: opts.wtNo,
    cFlag: '1',
    ifClose: '0',
    ifCancel: '0',
  })
  const wts = page.data.list || []
  const chunks: MyTask[][] = []
  const size = 3
  for (let i = 0; i < wts.length; i += size) {
    const part = wts.slice(i, i + size)
    const mapped = await Promise.all(part.map((wt: any) => mapWt(wt, opts.empNo, opts.isLeader)))
    chunks.push(...mapped)
  }
  const list = chunks.flat()
  return { list, total: page.data.total, wtCount: wts.length }
}

export function toWorkers(rows: any[]): WtWorker[] {
  return (rows || []).map((w) => ({
    empNo: String(w.empNo || ''),
    empName: String(w.empName || ''),
    deptName: w.deptName,
    planQty: num(w.planQty),
    fnQty: num(w.fnQty),
    pendingQty: Math.max(0, num(w.planQty) - num(w.fnQty)),
    woBorSno: w.woBorSno,
    woNo: w.woNo,
    moNo: w.moNo,
    prcCode: w.prcCode,
    goodsId: w.goodsId,
  }))
}
