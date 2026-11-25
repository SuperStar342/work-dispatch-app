# 报工 H5 自动部署与手动部署

## 流程

`.github/workflows/deploy.yml` 一个工作流完成全部部署：

1. **构建**（GitHub Ubuntu）：同时构建根路径版（`site-root`）和 `/work/` 子路径版（`site-work`），和 `scripts/ci/deploy-h5.sh` 一起打包，上传到临时 Release `ci-h5-<运行号>`（不占 Artifact 存储配额）。
2. **部署**（内网 Windows Runner）：按 `.github/deploy-targets.json` 逐台执行 `scripts/ci/deploy.ps1`。服务器上先备份当前文件再发布，然后确认 Nginx（`127.0.0.1:8081`）返回的就是新版本入口文件，任何一步失败都自动恢复。
3. **清理**：部署成功后删除临时 Release；失败时保留，可以直接点 **Re-run failed jobs** 重试。

发布目录以 `/work` 结尾时发布子路径版，否则发布根路径版。

## 统一的服务器（三个仓库相同）

GitHub Environment 按服务器命名，三个仓库使用同一套名字：

| Environment | 角色 | 地址 | blade-master 后端 | shop-vite-main 前端 | work-dispatch-app 报工 H5 |
|---|---|---|---|---|---|
| `server-120` | **生产（默认）** | 192.168.251.120 | 全部 10 个微服务 | 网站根目录 | `/var/www/myapp/dist/work` |
| `server-150` | 测试 | 192.168.251.150 | blade-system | 网站根目录 | `/var/www/myapp/dist/work` |
| `myvps` | VPS | 45.148.30.143 | blade-system | 网站根目录 | 需设置发布目录 |

服务器地址、SSH 用户、主机公钥和私钥集中在部署 Runner 上配置，见下方“服务器集中配置”。
注意：`server-150` 是由 `server-120` 克隆的虚拟机，两台的 SSH 主机公钥相同。后端的 Spring Profile 按服务器上实际配置填写：120 为 `test`，150 为 `prod`。

## 默认部署与手动选择

- **push 到 `main`**：部署到默认服务器，即生产 `server-120`。如果要改默认服务器，在仓库变量 `DEPLOY_TARGETS` 中设置（例如 `server-150`，或 `server-120,myvps`），不用改代码。
- **手动部署**：Actions → 部署工作流 → Run workflow → 选择 `target`：
  - `default`：部署到默认服务器；
  - `server-120`（生产）/ `server-150`（测试）/ `myvps`：部署到指定服务器；
  - `all`：本仓库的全部服务器，逐台部署。
- 勾选 `check_only`：只测试 SSH 能否连通，不构建不部署。
- PR：只构建，检查能否编译，不部署。
- 建议先手动部署到测试 `server-150`，确认没问题后再合并到 `main`，自动部署生产。

## 服务器集中配置（所有仓库共用，只改一处）

服务器的地址、端口、SSH 用户、主机公钥和私钥**只在部署 Runner 这台电脑上配置一次**，所有仓库的部署都按服务器名字读取：

```
C:\ProgramData\ci-deploy\
  servers.json   服务器清单（名字 → 地址、端口、用户、主机公钥）
  id_deploy      部署用 SSH 私钥
```

- **服务器换 IP**：只改 `servers.json` 里对应服务器的 `host`，所有仓库下次部署自动生效。
- **换私钥**：只替换 `id_deploy`。某台服务器要用别的私钥时，在它的配置里加 `"keyFile": "其他文件名"`。
- **GitHub 上不需要配置任何部署 Secret**，新增仓库也不用。
- 目录权限只开放给 SYSTEM、管理员、当前用户和 Runner 服务账户（NETWORK SERVICE，只读）。这台电脑重装或更换前，记得备份这个目录。
- `servers.json` 示例：
  ```json
  { "servers": {
      "server-120": { "role": "生产", "host": "192.168.251.120", "port": 22, "user": "root",
                      "hostKey": "ssh-ed25519 AAAA..." } } }
  ```
  `hostKey` 可以在能连上服务器的电脑上用 `ssh-keyscan -t ed25519 <IP>` 读取。

各仓库的 `.github/deploy-targets.json` 只写服务器名字和本仓库的部署参数（目录、脚本等），不写 IP。

## 回滚到上一版

每次部署成功后，服务器上都会保留"部署前的版本"：后端保留上一版镜像，前端和报工 H5 保留上一版文件。

- **怎么回滚**：Actions → 部署工作流 → Run workflow → 选择服务器 → 勾选 `rollback`。不重新构建，通常一两分钟完成。
- 回滚撤销的是该服务器上**最近一次**部署；再执行一次 `rollback` 会切回来。
- 回滚同样会检查：后端确认服务启动成功，前端确认 Nginx 返回的是切换后的版本，失败时恢复到回滚前的状态。
- 新流程在某台服务器上至少成功部署一次后，才有可回滚的版本。

## 增加一台服务器

1. 在 Runner 的 `servers.json` 里加一条（名字、地址、用户、主机公钥），并把 `id_deploy` 对应的公钥加到这台服务器部署用户的 `~/.ssh/authorized_keys`。
2. 在需要部署到它的仓库的 `.github/deploy-targets.json` 里加 `{ "name": "新名字", ... }`。
3. 各仓库工作流 `target` 的 `options` 里加上这个名字（保持各仓库一致），然后手动运行一次 `check_only` 确认能连通。

本仓库额外说明：发布目录写在 JSON 的 `"dir"`；`myvps` 还没有写，部署前在 JSON 里补上或在 Environment `myvps` 设置变量 `DEPLOY_PATH`。

## 手动部署（CI 不可用时）

```powershell
$env:VITE_APP_BASE_URL = '/api'
$env:VITE_DINGTALK_CLIENT_ID = 'ding6klbziftyuowibuu'
pnpm run build:h5:work
New-Item -ItemType Directory -Force package\site-work | Out-Null
Copy-Item -Recurse -Force dist\build\h5\* package\site-work\
Copy-Item scripts\ci\deploy-h5.sh package\
tar -czf work-dispatch-h5.tar.gz -C package .

$env:DEPLOY_SERVER = 'server-120'   # 地址和私钥从 C:\ProgramData\ci-deploy 读取
.\scripts\ci\deploy.ps1 -Package .\work-dispatch-h5.tar.gz -Entry deploy-h5.sh -Arguments @('/var/www/myapp/dist/work')
```

手动部署后要把代码推送到 `main`，否则下次 CI 会用仓库代码覆盖。

## 存储清理

`.github/workflows/ci-cleanup.yml` 每天北京时间 03:30 自动运行（也可手动运行）：删除 7 天前的运行记录和日志
（始终保留最新 20 条）、Artifact、一天前遗留的临时 `ci-*` Release，以及 7 天未使用的缓存。
服务器上的部署临时目录用完即删。
