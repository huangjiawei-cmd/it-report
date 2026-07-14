# IT 运维月报系统服务器部署规范文档

本部署规范文档针对 **IT 运维月报系统**的上服务器生产化、容器化部署提供标准指导。运维人员必须严格按照此标准进行环境初始化、持久卷挂载、反向代理与安全加固配置。

---

## 一、 部署架构与基本运行环境

本系统采用高效的 **Node.js (Express) + React (Vite) + ESM 前后端一体化全栈容器架构**。

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
运维部门可直接使用如下的多阶段构建 `Dockerfile`。针对部分服务器因 `.dockerignore` 过滤或传输不全导致缺少 `package-lock.json` 而引发的 `npm ci` 报错（EUSAGE 错误），本配置默认采用兼容性更强、且支持中国内网镜像源加速的 `npm install` 指令：

```dockerfile
# ==========================================
# 阶段一：依赖安装与前端静态资源编译
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app

# 核心突破：Tailwind CSS v4 底层采用 Rust (oxide) 编写，Alpine 容器中必须安装 libc6-compat 兼容库
# 否则在运行 Vite 编译时会由于缺少 glibc 动态链接库而抛出 "Cannot find native binding" 错误！
RUN apk add --no-cache libc6-compat

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
FROM node:18-alpine
WORKDIR /app

# 为生产阶段同样注入 64位 C 运行时兼容层，确保运行时若有原生二进制能顺利运行
RUN apk add --no-cache libc6-compat

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

### 2. 常见问题排查：`npm ci` 失败（EUSAGE 报错）的根本原因与解决方法

如果运维在执行原本的 `npm ci` 时出现如下报错：
```text
npm error code EUSAGE
npm error The `npm ci` command can only install with an existing package-lock.json...
```

**原因分析：**
1. **未同步提交 `package-lock.json`**：在部分 DevOps 环境中，由于设置了 `.dockerignore` 或是在 Git 传输、Zip 压缩包传输中漏掉了 `package-lock.json`，导致 Docker 构建上下文（Build Context）中只有 `package.json`。
2. **版本兼容性问题**：如果宿主机与 Docker 内 Alpine 镜像（Node 18）所携带的 `npm` 版本跨度较大，可能导致 `package-lock.json` 内部的 `lockfileVersion` 声明无法被识别。

**三种完美解决手段：**
* **方案 A（最推荐，简单可靠）**：直接使用我们上方推荐的最新 Dockerfile，将 `RUN npm ci` 更改为 **`RUN npm install --registry=https://registry.npmmirror.com --no-audit --no-fund`**。这不仅解决了缺少 lockfile 的问题，还能利用阿里云淘宝源进行高达 10 倍的极速安装，规避了由于 npmjs.org 官方源在内网超时导致构建卡住的难题。
* **方案 B（检查构建上下文）**：检查构建目录下是否存在 `package-lock.json`。如果存在，请确认当前目录下没有 `.dockerignore` 意外排除了该文件，或在打包命令中显式加入该文件。
* **方案 C（全新生成）**：若锁文件损坏，可在本地重新运行 `npm install`，提交最新生成的 `package-lock.json` 至 Git 仓库中。

### 3. 常见问题排查：Vite 构建时抛出 `Cannot find native binding` 报错的终极解决方法

如果运维在执行 `RUN npm run build` 阶段时出现如下报错：
```text
failed to load config from /app/vite.config.ts
error during build:
Error: Cannot find native binding. npm has a bug related to optional dependencies...
    at Object.<anonymous> (/app/node_modules/@tailwindcss/oxide/index.js:573:11)
```

**原因分析：**
1. **Alpine 缺失 C 运行时依赖**：本系统升级到了先进的 **Tailwind CSS v4** 编译引擎。为了在编译时提供极速响应，Vite 和 Tailwind 依赖由 Rust 编写的原生二进制编译器模块（即 `@tailwindcss/oxide`）。在基于 Alpine Linux 的精简容器（如 `node:18-alpine`）中，默认缺少 `glibc` 动态运行库（Alpine 默认采用精简的 `musl` 库）。如果直接调用这些 native 文件，就会抛出找不到原生绑定的错误。
2. **跨平台 Lockfile 锁死冲突**：在 Windows 或 macOS 开发机上生成的 `package-lock.json` 被复制到 Docker Linux Alpine 容器中时，其锁定的可选依赖（`optionalDependencies`）指向了原本的开发平台架构。而 `npm` 存在由于跨平台缓存没有在 Alpine 中下载对应平台的二进制原生依赖文件的已知 Bug。

**完美的解决方法：**
* **双重保障（最省心，本方案已完美集成在上方最新 Dockerfile 中）**：
  1. **安装兼容层**：在 Docker 阶段一的开头加上 **`RUN apk add --no-cache libc6-compat`**，为容器注入 Linux 64位 C/C++ 动态链接库兼容能力（可兼容多数 native binary 模块）。
  2. **解除跨平台依赖死锁**：在构建时先运行 **`rm -f package-lock.json`** 将本地携带开发平台缓存的锁文件清理掉，然后再执行全新 `npm install --registry=https://registry.npmmirror.com`。这样能让 npm 在 Alpine 容器内自适应拉取专门适配 Alpine Linux 的原生 `@tailwindcss/oxide` 等原生依赖包，彻底解决该报错！

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
