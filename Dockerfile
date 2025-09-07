# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

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

# 复制 Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# 创建数据目录
RUN mkdir -p /app/backend/data

# 暴露端口
EXPOSE 80 443

# 启动 Caddy 和后端服务
CMD ["sh", "-c", "cd /app/backend && npm start & caddy run --config /etc/caddy/Caddyfile"]