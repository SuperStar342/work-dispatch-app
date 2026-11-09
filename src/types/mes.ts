export type TaskStatus = '待开始' | '生产中' | '待报工' | '已完成'

export type MyTask = {
  id: string
  wtNo: string
  woNo: string
  moNo: string
  goodsName: string
  goodsCode: string
  sizeDesc?: string
  quickCode?: string
  materialName?: string
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
  /** 非生产派工单号（计时报工提交时用） */
  owtNo?: string
  /** 非生产派工行序号 */
  sNo?: number
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
  /** 报工单审核标记。1 或「已审核」表示审核通过 */
  cFlag?: string
  /** 审核人 */
  approver?: string
  /** 审核时间 */
  appDate?: string
  /** 审核状态文案：已审核 / 未审核 / 已驳回 / 已撤回 */
  auditStatus?: string
  /** 驳回/撤回人 */
  canceler?: string
  /** 驳回/撤回时间 */
  cancelDate?: string
  /** 审核人写下的驳回原因 */
  rejectReason?: string
  /** 非生产派工单号 */
  owtNo?: string
  /** 派工单行序号 */
  sNo?: number
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
