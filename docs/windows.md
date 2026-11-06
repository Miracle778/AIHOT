# 在 Windows 上直接部署（不用 Docker、不用 WSL）

需要 Windows 10/11 或 Windows Server 2019 以上（64 位）、Node.js 24.11 以上和 PostgreSQL 16 或 17。三个进程（api、worker、web）直接用 Node 跑，pm2 守护。仓库的 [Windows 检查](../.github/workflows/windows.yml) 在 GitHub 的 Windows 机器上跑类型检查、构建、全部后端测试，再起三个进程跑站点冒烟检查。

下面的命令都在 PowerShell 里执行，假设仓库放在 `D:\agenthot`（路径里最好不要有空格和中文）。

## 1. 安装 PostgreSQL

1. 从 <https://www.postgresql.org/download/windows/> 下载 PostgreSQL 17 的安装包（EDB 提供，单个 exe，可以在外网下载后拷进内网）。
2. 安装时组件选 PostgreSQL Server 和 Command Line Tools（pgAdmin 可选），给 `postgres` 用户设一个密码并记下来，端口保持 5432，其余用默认值。装完它是一个开机自启的 Windows 服务。
3. 建这个站用的库和账号：

   ```powershell
   $psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
   & $psql -U postgres -c "CREATE ROLE agenthot LOGIN PASSWORD '换成你的密码'"
   & $psql -U postgres -c "CREATE DATABASE agenthot OWNER agenthot"
   ```

公司已经有 PostgreSQL 服务的，跳过这一步，向 DBA 要一个库和账号。

## 2. 安装 Node.js 和代码

1. 从 <https://nodejs.org/> 下载 Node.js 24 的 Windows 安装包（.msi）安装；`node -v` 应显示 v24.11 或更高。
2. 拿到代码：用 Git for Windows `git clone -b codeagent-intel https://github.com/Miracle778/AIHOT.git D:\agenthot`，或者把仓库打包成 zip 拷过去。仓库的 `.gitattributes` 让文本文件在 Windows 上也保持 LF，不用改 Git 的设置。
3. 装依赖（内网有 npm 镜像时加 `--registry=<镜像地址>`）：

   ```powershell
   cd D:\agenthot
   npm ci --no-audit --no-fund
   ```

   依赖里的 sharp、lightningcss 等原生模块有 Windows 版，`npm ci` 会自动装对应的那一份。内网连不上 npm 镜像时，在一台能上网的 **Windows** 电脑上执行 `npm ci`，再把整个文件夹（含 `node_modules`）拷过去；不要从 Mac 或 Linux 上拷 `node_modules`，原生模块的平台不一样。

## 3. 配置 .env

```powershell
node scripts/init-env.ts --llm-key <模型的 API Key>
notepad .env
```

`init-env.ts` 生成随机密钥和管理员密码（只打印一次，也写在 `.env` 的 `ADMIN_PASSWORD` 里）。再在 `.env` 里改这几项：

```dotenv
DATABASE_URL=postgres://agenthot:你的密码@127.0.0.1:5432/agenthot
API_BASE_URL=http://127.0.0.1:3001
# 同事访问的地址（这台电脑的内网 IP 或域名）
SITE_URL=http://10.x.x.x:3000
# 网页对局域网开放（默认只有本机能打开）；api 仍只听本机
WEB_HOST=0.0.0.0
# 内网模型（任何 OpenAI 兼容接口）
LLM_BASE_URL=http://内网模型网关/v1
LLM_MODEL=内网的模型名
# GLM 这类推理模型要留推理额度；接口不支持 JSON 模式时再加 LLM_JSON_MODE=false
# LLM_REASONING_TOKENS=4000
# 出外网抓信源要走公司代理时
# EGRESS_PROXY_URL=http://代理地址:端口
```

## 4. 建表、导入信源、构建网页

```powershell
node --env-file=.env scripts/migrate.ts
node --env-file=.env scripts/seed.ts
npm run build -w @aihot/web
```

## 5. 先手动跑一次

开三个 PowerShell 窗口，各跑一个：

```powershell
# 窗口 1：接口（3001 端口）
cd D:\agenthot; $env:NODE_ENV = "production"; node --env-file=.env apps/api/src/main.ts
# 窗口 2：后台任务（抓取、模型处理、日报和周汇总）
cd D:\agenthot; $env:NODE_ENV = "production"; node --env-file=.env apps/worker/src/main.ts
# 窗口 3：网页（3000 端口）
cd D:\agenthot\apps\web; $env:NODE_ENV = "production"; node --env-file=../../.env server.ts
```

三个进程都要 `NODE_ENV=production`：不带它就按开发环境运行，不检查生产密钥和管理员密码。打开 `http://127.0.0.1:3000`，后台在 `/admin`；到后台“信源”页确认信源都抓成功了。报 `Blocked private address` 的，是这台电脑的 DNS 把外网域名解析成了内网地址，设 `EGRESS_PROXY_URL` 走代理。

## 6. 用 pm2 常驻、开机自启

确认能跑以后，在三个窗口里按 Ctrl+C 停掉，改用 pm2：

```powershell
npm install -g pm2
cd D:\agenthot
pm2 start deploy/windows/ecosystem.config.cjs
pm2 save
pm2 status          # 三个都是 online
pm2 logs            # 看日志
```

开机自启：`npm install -g pm2-windows-startup`，再执行 `pm2-startup install`，重启电脑后 pm2 会恢复 `pm2 save` 时的进程。

注意：Windows 没有 Linux 的停止信号，`pm2 stop` / `pm2 restart` 会直接结束 worker，正在进行的模型调用结果不明，要等至少半小时自动放行后才重试，不会重复计费。更新代码、重启时尽量挑没人用的时候。

## 7. 让同事访问

在 Windows 防火墙里放行 3000 端口（管理员 PowerShell）：

```powershell
New-NetFirewallRule -DisplayName "AgentHot web" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

只放行 3000（网页）；3001（接口）只给本机的网页用，不要对外开放。

## 更新

```powershell
cd D:\agenthot
git pull
npm ci --no-audit --no-fund
node --env-file=.env scripts/migrate.ts
npm run build -w @aihot/web
pm2 restart all
```

## 备份

框架自带的备份（`docs/deploy.md` 的“备份”）调用 `pg_dump` 和 `tar`，默认不开。Windows 上可以用“任务计划程序”每天跑一次：

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -U agenthot -Fc agenthot -f "D:\backup\agenthot-$(Get-Date -Format yyyy-MM-dd).dump"
```
