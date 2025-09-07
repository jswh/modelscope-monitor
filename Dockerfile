# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app

# 只复制必要的文件
COPY package*.json ./
RUN npm install

COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY frontend/vite.config.js ./frontend/
COPY frontend/index.html ./frontend/

WORKDIR /app/backend
RUN npm install

WORKDIR /app/frontend  
RUN npm install && npm run build

# 最终镜像
FROM caddy:alpine

# 安装必要的工具
RUN apk add --no-cache curl

# 从构建阶段复制文件
COPY --from=builder /app/backend /app/backend
COPY --from=builder /app/frontend/dist /var/www/html

# 单独复制 Caddyfile（不需要从 builder 阶段）
COPY Caddyfile /etc/caddy/Caddyfile

# 创建数据目录
RUN mkdir -p /app/backend/data

# 暴露端口
EXPOSE 80

# 启动 Caddy 和后端服务
CMD ["sh", "-c", "cd /app/backend && npm start & caddy run --config /etc/caddy/Caddyfile"]