export type TaskStatus = '待开始' | '生产中' | '待报工' | '已完成'

export type MyTask = {
  id: string
  wtNo: string
  woNo: string
  moNo: string
  goodsName: string
  goodsCode: string
  sizeDesc?: string
  prcCode: string
  prcName: string
  woBorSno: string
  goodsId?: string | number
  wsName?: string
  deptName?: string
  empNo: string
  empName: string
  wtQty: number
  fnQty: number
  planQty: number
  pendingQty: number
  cFlag?: string
  finishFlag?: string
  status: TaskStatus
  /** 工序工价。计件为元/件，计时为元/时 */
  machiningUp?: number
  /** 1集体计件 2个人计件 3计时 4不计件，接口也可能返回中文 */
  pWageType?: string
}

export type DispatchReportPayload = {
  wtNo: string
  woNo?: string
  moNo?: string
  /** 同一工序下多个部件共用工单和 BOR 序号，必须带上才能定位到这一行 */
  goodsId?: string | number
  goodsName?: string
  prcCode?: string
  prcName?: string
  woBorSno?: string
  empNo?: string
  empName?: string
  pendingQty: number
  reportQty: number
  passQty: number
  defectQty: number
  reworkQty: number
  reportTime: string
  defectReason?: string
  remark?: string
  reportMethod?: string
  /** 修改已有报工时传入 */
  reportNo?: string
}

export type DispatchReportResult = {
  reportNo: string
  reportQty: number
  workerFnQty: number
  workerPendingQty: number
  itemFnQty: number
}

export type DispatchReportBatchResult = {
  successCount: number
  failCount: number
  reportNos: string[]
  errors?: { empNo?: string; empName?: string; message: string }[]
}

export type WorkReportRecord = {
  id?: string
  reportNo: string
  wtNo: string
  woNo?: string
  moNo?: string
  goodsName?: string
  prcName?: string
  prcCode?: string
  reportQty: number
  passQty?: number
  defectQty?: number
  reworkQty?: number
  reportTime?: string
  reporter?: string
  defectReason?: string
  remark?: string
  reportMethod?: string
  wageAmt?: number
  machiningUp?: number
  pWageType?: string
  goodsId?: string | number
  woBorSno?: string
  empNo?: string
  mode?: 'piece' | 'time'
  hours?: number
  wage?: number
  start?: string
  end?: string
}

export type WtWorker = {
  empNo: string
  empName: string
  deptName?: string
  planQty: number
  fnQty: number
  pendingQty: number
  woBorSno?: string
  woNo?: string
  moNo?: string
  prcCode?: string
  goodsId?: string | number
}
