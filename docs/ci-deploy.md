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

服务器地址、SSH 用户、主机公钥写在各仓库的 `.github/deploy-targets.json`；只有 SSH 私钥（和密码）放在 GitHub Secret。
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

## GitHub 一次性配置

在每个仓库的 Settings 中：

1. **Secrets and variables → Actions → Repository secrets**：设置 `DEPLOY_KEY`，填 SSH 私钥全文。`server-120` 和 `server-150` 都用 `root` 登录，本机的 `work_dispatch_deploy_rsa` 两台都能登录，三个仓库都用它即可。某台服务器要用不同的私钥时，在该 Environment 里再建一个同名 Secret `DEPLOY_KEY`，会覆盖仓库级的值。
2. **SSH 用户**：`myvps` 在 Repository variables 或 Environment `myvps` 的 variables 里设置 `DEPLOY_USER`（也可以在 `deploy-targets.json` 里写 `"user"`）。
3. **默认服务器（可选）**：Repository variables 中设置 `DEPLOY_TARGETS`，不设置就是 `server-120`。
4. **Environments**：第一次部署到某台服务器时 GitHub 会自动创建同名 Environment。生产 `server-120` 是 push 后自动部署的目标；如果希望每次部署都要人工确认，可在 Settings → Environments 给它开启 *Required reviewers*。
5. 新流程验证通过后，可以删除旧的 Environment：`test`、`production`、`webdock-vps`、`product-server`、`downstairs-server`。

## 增加一台服务器

1. 在用到它的仓库的 `.github/deploy-targets.json` 里加一条，例如：
   ```json
   { "name": "server-200", "host": "192.168.251.200", "user": "deploy",
     "hostKey": "ssh-ed25519 AAAA..." }
   ```
   `hostKey` 可以在能连上服务器的电脑上用 `ssh-keyscan -t ed25519 192.168.251.200` 读取。
2. 三个仓库工作流 `target` 的 `options` 里加上 `server-200`，保持三个仓库一致。
3. 把 `DEPLOY_KEY` 对应的公钥加到这台服务器，然后手动运行一次 `check_only` 确认能连通。

本仓库额外说明：发布目录写在 JSON 的 `"dir"`；`myvps` 还没有写，部署前在 JSON 里补上或在 Environment `myvps` 设置变量 `DEPLOY_PATH`。旧的 Secret 名称 `DEPLOY_SSH_KEY` 在过渡期间仍可使用。

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
