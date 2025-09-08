FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# 复制 package 文件
COPY backend/package*.json ./

# 安装依赖，构建原生模块
RUN npm install

# 复制源代码
COPY backend/ ./

FROM caddy:alpine

# 安装 Node.js 和 curl
RUN apk add --no-cache nodejs npm curl

# 复制前端构建结果
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# 复制后端源代码（不是 node_modules）
COPY --from=backend-builder /app/backend/src /app/backend/src
COPY --from=backend-builder /app/backend/migrations /app/backend/migrations
COPY --from=backend-builder /app/backend/package*.json /app/backend/

# 复制根目录的 package.json（用于启动脚本）
COPY package*.json /app/

# 复制 Caddyfile 模板
COPY Caddyfile /etc/caddy/Caddyfile

# 复制启动脚本
COPY start.sh /app/start.sh

# 在 Alpine 中重新安装后端依赖（构建原生模块）
WORKDIR /app/backend
RUN npm install

# 创建数据目录
RUN mkdir -p /app/backend/data

# 切换到 app 目录
WORKDIR /app

# 暴露端口
EXPOSE 80

# 启动脚本
CMD ["/app/start.sh"]
