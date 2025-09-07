FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

FROM caddy:alpine

# 安装 Node.js 和 curl
RUN apk add --no-cache nodejs npm curl

# 复制前端构建结果
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# 复制后端代码
COPY --from=backend-builder /app/backend /app/backend

# 复制根目录的 package.json（用于启动脚本）
COPY package*.json /app/

# 复制 Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# 创建数据目录
RUN mkdir -p /app/backend/data && \
    chown -R node:node /app

# 切换到 app 目录
WORKDIR /app

# 暴露端口
EXPOSE 80

# 启动脚本
CMD ["sh", "-c", "cd /app/backend && npm start & caddy run --config /etc/caddy/Caddyfile"]