# 报工 H5 自动部署与手动部署

## 流程

`.github/workflows/deploy.yml` 一个工作流完成全部部署：

1. **构建**（GitHub Ubuntu）：同时构建根路径版（`site-root`）和 `/work/` 子路径版（`site-work`），和 `scripts/ci/deploy-h5.sh` 一起打包，上传到临时 Release `ci-h5-<运行号>`（不占 Artifact 存储配额）。
2. **部署**（内网 Windows Runner）：按 `.github/deploy-targets.json` 逐台执行 `scripts/ci/deploy.ps1`。服务器上先备份当前文件再发布，然后确认 Nginx（`127.0.0.1:8081`）返回的就是新版本入口文件，任何一步失败都自动恢复。
3. **清理**：部署成功后删除临时 Release；失败时保留，可以直接点 **Re-run failed jobs** 重试。

触发方式：push 到 `main` 自动部署仓库变量 `DEFAULT_DEPLOY_ENV` 指定的服务器（未设置时为 `webdock-vps`）；
手动运行可选服务器，或勾选 `check_only` 只测试 SSH 连通性。

发布目录以 `/work` 结尾时发布子路径版，否则发布根路径版。

## 服务器配置

`.github/deploy-targets.json` 列出 Environment 名称（`webdock-vps`、`product-server`、`downstairs-server`），
地址等仍在各 Environment 中配置，与原来相同：

| 名称 | 类型 | 说明 |
|---|---|---|
| `DEPLOY_HOST` | Variable | SSH 地址；写成 `77.46.140.135` 时自动改连内网 `192.168.251.120`，用户 `root` |
| `DEPLOY_USER` | Variable | SSH 用户 |
| `DEPLOY_PATH` | Variable | 发布目录，例如 `/var/www/myapp/dist/work` |
| `DEPLOY_SSH_KEY` | Secret | SSH 私钥 |
| `DEPLOY_KNOWN_HOSTS` | Variable | 服务器主机公钥（known_hosts 格式） |
| `DEPLOY_PORT` | Variable | SSH 端口，默认 22 |

也可以直接在 JSON 中给某台服务器写 `host`、`user`，优先于 Environment 变量。

## 手动部署（CI 不可用时）

```powershell
$env:VITE_APP_BASE_URL = '/api'
$env:VITE_DINGTALK_CLIENT_ID = 'ding6klbziftyuowibuu'
pnpm run build:h5:work
New-Item -ItemType Directory -Force package\site-work | Out-Null
Copy-Item -Recurse -Force dist\build\h5\* package\site-work\
Copy-Item scripts\ci\deploy-h5.sh package\
tar -czf work-dispatch-h5.tar.gz -C package .

$env:DEPLOY_HOST = '192.168.251.120'
$env:DEPLOY_USER = 'root'
$env:DEPLOY_KEY_FILE = "$HOME\.ssh\work_dispatch_deploy_rsa"
$env:DEPLOY_HOST_KEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILqU1tthVrMOt9YyIIdcqU+B12y92Pb9vlRpmHl0pejL'
.\scripts\ci\deploy.ps1 -Package .\work-dispatch-h5.tar.gz -Entry deploy-h5.sh -Arguments @('/var/www/myapp/dist/work')
```

手动部署后要把代码推送到 `main`，否则下次 CI 会用仓库代码覆盖。

## 存储清理

`.github/workflows/ci-cleanup.yml` 每天北京时间 03:30 自动运行（也可手动运行）：删除 7 天前的运行记录和日志
（始终保留最新 20 条）、Artifact、一天前遗留的临时 `ci-*` Release，以及 7 天未使用的缓存。
服务器上的部署临时目录用完即删。
