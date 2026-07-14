# IT 运维月报系统服务器部署规范文档

本部署规范文档针对 **IT 运维月报系统**的服务器生产化、容器化部署提供标准指导。运维人员必须严格按照规范进行部署与配置。

## 一、 运行环境与网络规划

### 1. 运行平台要求
* **容器化环境**: Docker 20.10.0+ 或 Kubernetes (k8s) 1.22+
* **原生宿主机环境 (参考)**: Node.js 18.0.0 LTS 或更高版本

### 2. 端口规划
* **容器内监听端口**: `3000` (硬编码固定，受 Nginx 反向代理容器入口接管)
* **宿主机暴露端口**: 外部可映射为任意可用端口，默认为 `3000`，外网最终通过 `80` (HTTP) 或 `443` (HTTPS) 接入反向代理。

---

## 二、 容器化打包与部署

推荐采用 Docker 容器化方案进行一键交付，实现运行环境的强隔离。

### 1. 标准 `Dockerfile` 推荐
运维部门可直接使用如下的多阶段构建 `Dockerfile`。针对部分服务器因缺少 `.dockerignore` 导致本地 `node_modules` 意外覆盖容器、或是 Alpine 的 musl 库缺失引发 `@tailwindcss/oxide` 等 Rust 原生编译器模块抛出 `Cannot find native binding` 错误，**本系统强烈推荐采用 `node:18-slim`（基于 Debian，自带标准 glibc）作为基础镜像**，并配合极速国内镜像源：

```dockerfile
# ==========================================
# 阶段一：依赖安装与前端静态资源编译
# ==========================================
FROM node:18-slim AS builder
WORKDIR /app

COPY package*.json ./

# 提示：删除可能携带宿主机特定平台信息的锁文件，使用具有高兼容性的 npm install
# 另外加入国内专线镜像源，极大提升在大陆服务器上的打包速度
RUN rm -f package-lock.json && npm install --registry=https://registry.npmmirror.com --no-audit --no-fund

COPY . .
# 执行前端 Vite 编译和后端 Server esbuild 打包
RUN npm run build

# ==========================================
# 阶段二：生产运行环境
# ==========================================
FROM node:18-slim
WORKDIR /app

# 仅复制生产依赖和编译输出
COPY package*.json ./
RUN rm -f package-lock.json && npm install --only=production --registry=https://registry.npmmirror.com --no-audit --no-fund

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# 暴露容器内部端口
EXPOSE 3000

# 设定生产环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 默认使用容器内持久化挂载目录
ENV STORAGE_FILE_PATH=/app/data/report_storage.json

# 启动生产服务器
CMD ["npm", "start"]
```

### 2. 标准 `.dockerignore` 推荐
为了避免本地开发机上的 `node_modules` 或 `dist` 被 `COPY . .` 指令复制并覆盖掉容器内通过 `npm install` 干净安装的 Linux 依赖包，**必须在项目根目录下创建 `.dockerignore` 文件**：

```text
node_modules/
dist/
.git/
.gitignore
.env
.env.*
*.log
README.md
IT运维月报系统服务器部署规范文档.md
```

---

### 3. 常见问题排查与核心原因分析

#### 问题 A：`npm ci` 报错（EUSAGE）
```text
npm error code EUSAGE
npm error The `npm ci` command can only install with an existing package-lock.json...
```
* **根本原因**：在 CI/CD 流程中，由于没有同步推送 `package-lock.json`（或通过 Zip 打包忽略了它），导致 Docker 构建上下文内只有 `package.json`，而 `npm ci` 强依赖于锁文件才能工作。
* **解决办法**：用 `rm -f package-lock.json && npm install` 替换 `npm ci`，并采用国内阿里云 `npmmirror` 镜像源加速。

#### 问题 B：Vite 构建时抛出 `Cannot find native binding` 错误
```text
failed to load config from /app/vite.config.ts
error during build:
Error: Cannot find native binding. npm has a bug related to optional dependencies...
    at Object.<anonymous> (/app/node_modules/@tailwindcss/oxide/index.js:573:11)
```
* **根本原因 1：宿主机文件污染（最常见）**
  如果项目没有配置 `.dockerignore`，当执行 `COPY . .` 时，宿主机上已有的 `node_modules`（可能是 Windows、macOS 平台编译的二进制文件）会直接**覆盖**掉容器内部在 `RUN npm install` 阶段安装好的 Linux 版本依赖。导致在运行 `npm run build` 时，Vite 加载了不兼容平台的 native 二进制文件，引发报错。
* **根本原因 2：Alpine 的 musl 与 glibc 不兼容**
  本系统升级到了全新的 **Tailwind CSS v4** 编译引擎。为了实现超高性能的编译速度，它底层采用了由 Rust 编写的编译器模块 `@tailwindcss/oxide`。基于 Alpine 镜像的 Alpine Linux 采用的是精简版 `musl libc`，而大多数 Rust 编写的 npm native 包默认是针对 `glibc` 进行动态链接的。因此即使在 Alpine 内补充了 `libc6-compat`，由于 Alpine 的 npm 版本和可选依赖解析漏洞，仍可能无法正确拉取或运行 musl 版本的 native package。
* **终极解决方法**：
  1. **配置 `.dockerignore`**：务必在根目录写入 `.dockerignore`，彻底隔绝宿主机 `node_modules` 对容器环境的污染。
  2. **更换为 `node:18-slim` 基础镜像**：弃用容易因 musl 链接库报错的 Alpine 镜像，统一更换为更加稳定、自带完整 `glibc` 依赖环境的 **`node:18-slim`**（Debian-based）基础镜像。这样可以让 `@tailwindcss/oxide` 及其他 native-binding 依赖稳定执行，完全消除任何平台不兼容问题。

---

## 三、 数据持久化策略（核心要点）

本系统所有的门店旧改指标、七鱼智能导入参数、多级审核标记和系统账户等信息，均通过本地具有**强写入一致性保障**的 JSON 存储。容器重启后未挂载的数据会发生彻底丢失，因此**必须配置宿主机持久卷挂载**。

### 1. 持久化数据文件
* **容器内路径**: `/app/data/report_storage.json`
* **宿主机持久卷映射路径**: 自定义，例如 `/opt/monthly-report-data/`

### 2. 持久化挂载环境变量配置
在启动容器时，必须传入环境变量 `STORAGE_FILE_PATH` 指向该挂载点：
```bash
STORAGE_FILE_PATH=/app/data/report_storage.json
```

### 3. Docker 标准启动命令
```bash
docker run -d \
  -p 3000:3000 \
  --name ams-monthly-report \
  -v /opt/monthly-report-data:/app/data \
  -e STORAGE_FILE_PATH=/app/data/report_storage.json \
  --restart always \
  it-report-system:latest
```

---

## 四、 域名绑定、反向代理与 SSL (Nginx) 配置

生产环境必须绑定公司域名（建议：`scheduling.公司域名`），并通过反向代理将外部的 80/443 端口请求转发到容器的 3000 端口，且开启 HTTPS 安全访问。

### 1. Nginx 反向代理配置示例
在反向代理服务器的 `/etc/nginx/conf.d/scheduling.conf` 中追加以下配置：

```nginx
# ==================================================
# 1. HTTP 自动重定向至 HTTPS
# ==================================================
server {
    listen 80;
    server_name scheduling.yourcompany.com;
    
    # 强制跳转 HTTPS
    return 301 https://$host$request_uri;
}

# ==================================================
# 2. HTTPS 安全反向代理
# ==================================================
server {
    listen 443 ssl http2;
    server_name scheduling.yourcompany.com;

    # SSL 证书文件配置
    ssl_certificate /etc/nginx/ssl/scheduling.yourcompany.com.crt;
    ssl_certificate_key /etc/nginx/ssl/scheduling.yourcompany.com.key;

    # SSL 安全参数优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 客户端上传缓冲区限制 (调高以支持导入大型 Excel 包)
    client_max_body_size 50M;

    # 请求反向代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        
        # 传递真实客户端 IP，便于服务端出口白名单及安全诊断
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持 (保证协同编辑和后台流式连接顺畅)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 保持连接超时时间
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

---

## 五、 数据自动备份与容灾恢复管理

系统内置了双备份与迁移接口，支持一键热导出和定时异地冷备份。

### 1. 热备份：一键配置快照导出
管理员登录系统后，可前往 **[系统健康与运维]** 菜单页签，点击 **"下载配置快照 JSON"**，一键打包所有月度核心指标。该 JSON 备份文件可在容器搬迁时，直接通过初始化目录覆盖来恢复。

### 2. 宿主机冷备份：定时 Shell 自动归档
运维可在宿主机配置定时脚本，在系统运维面板点击 **"下载备份 Shell 脚本"** 即可获取备份执行模板，在宿主机配置 `crontab` 计划任务，每天凌晨 2 点执行：

```bash
0 2 * * * /bin/bash /opt/monthly-report-data/backup_report_system.sh >/dev/null 2>&1
```

---

## 六、 安全加固与出口白名单推荐

1. **白名单设置**: 千康数据库配置在公网，地址为 `rm-bp10mhz09m8030cq3wo.mysql.rds.aliyuncs.com:13306`。运维应将当前容器所在的云服务器出口 EIP（可从系统运维监控台实时读取）加入到千康数据库和钉钉自建应用的 IP 安全白名单中。
2. **密码安全**: 部署成功后，强烈建议系统管理员立即前往 "账号与权限管理" 模块，重置默认管理员密码，防范爆破风险。
3. **读写权限隔离**: 确保持久卷映射路径（如 `/opt/monthly-report-data/`）仅允许 `docker` 守护进程所属的用户（一般为 `root` 或 `docker` 组）具备读写权限。
