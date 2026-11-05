# 员工报工钉钉免登配置

## 工作方式

1. H5 在钉钉容器内获取一次性免登授权码。
2. `blade-auth` 使用服务端保存的 AppKey/AppSecret 向钉钉校验授权码。
3. 服务端读取当前钉钉员工的 `job_number`，作为 ERP 工号；不查询、创建或绑定 Blade 用户账号。
4. 签发仅供员工报工接口使用的钉钉员工会话。ERP 工号保存在令牌的 `detail.employee_no`，后端从这个已签名字段取值，完全忽略前端传入的人员或工号。
5. 钉钉免登会固定进入“本人报工”范围；即使该员工在其他系统中有班组长角色，也只查询、提交、修改和撤回本人数据。Blade 账号密码登录仍独立保留给后台管理与故障回退。

## 钉钉后台

- 应用首页地址：`http://77.46.140.135:8081/work/?corpid=$CORPID$#/`
- PC 端首页地址：`http://77.46.140.135:8081/work/?corpid=$CORPID$#/`
- 内网测试地址仍为：`http://192.168.6.108:8082/?corpid=$CORPID$#/`，不要配置到正式工作台。
- 为应用开通查询成员详情所需的通讯录权限，具体名称以钉钉后台当前展示为准。
- 确保应用可见范围包含测试员工。

`$CORPID$` 会在从钉钉工作台打开时替换为员工所在企业的 CorpId。普通浏览器无法完成钉钉免登，会保留账号密码登录入口。

## 前端构建参数

```dotenv
VITE_DINGTALK_CLIENT_ID=<企业内部应用 AppKey>
VITE_DINGTALK_CORP_ID=
VITE_DINGTALK_AUTO_LOGIN=true
```

如果首页地址已包含 `corpid=$CORPID$`，`VITE_DINGTALK_CORP_ID` 可保持为空。AppSecret 严禁写入前端环境文件。

## blade-auth 服务端参数

```text
DINGTALK_SSO_ENABLED=true
DINGTALK_APP_KEY=<企业内部应用 AppKey>
DINGTALK_APP_SECRET=<企业内部应用 AppSecret>
```

钉钉通讯录必须维护 ERP 工号 `job_number`；它只需与 ERP 派工数据中的工号一致，和 Blade 后台账号无关。工号为空时拒绝免登，不退回 `userid` 或手机号，防止把错误人员带入 ERP 报工范围。

## 验收

1. 从钉钉工作台打开应用，不出现密码输入步骤并进入首页。
2. 调用 `/api/blade-system/employee-task/whoami`，`empNo` 应为当前钉钉员工的 ERP 工号；它不依赖该员工是否拥有 Blade 账号。
3. “我的任务”、扫码查工序、报工记录、工资、统计和审核消息都只出现该工号的数据。
4. 使用未维护 ERP 工号的钉钉员工测试，系统应拒绝登录并提示补充工号；即使该员工没有 Blade 账号，也应可在工号正确时完成报工。
5. 普通浏览器仍可使用账号密码登录，作为维护和故障回退入口。
