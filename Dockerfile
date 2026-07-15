# ==========================================
# 阶段一：依赖安装与前端静态资源编译
# ==========================================
FROM node:18-slim AS builder
WORKDIR /app

# 复制依赖声明文件
COPY package*.json ./

# 核心解决手段：
# 1. 删除携带开发机平台缓存的 lockfile，防止 npm 锁定错误的架构依赖
# 2. 清理 npm 缓存并从高兼容的阿里云源进行全新安装，确保拉取正确的 Linux 原生 native 二进制包
RUN rm -f package-lock.json \
    && npm cache clean --force \
    && npm install --registry=https://registry.npmmirror.com --no-audit --no-fund

# 复制所有项目源文件
COPY . .

# 执行前端 Vite 编译和后端 Server esbuild 打包
RUN npm run build

# ==========================================
# 阶段二：生产运行环境
# ==========================================
FROM node:18-slim
WORKDIR /app

# 仅复制生产依赖描述并拉取生产依赖
COPY package*.json ./
RUN rm -f package-lock.json \
    && npm install --only=production --registry=https://registry.npmmirror.com --no-audit --no-fund

# 从阶段一复制编译后的静态资源和后端可执行服务
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
