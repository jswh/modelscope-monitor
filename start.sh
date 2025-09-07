#!/bin/sh

set -e

# 打印环境变量用于调试
echo "=== Environment Variables ==="
echo "AUTH_USERNAME: '${AUTH_USERNAME:-admin}'"
echo "AUTH_PASSWORD: '${AUTH_PASSWORD:-admin}'"
echo ""

echo ""
echo "=== Final Caddyfile Content ==="
cat /etc/caddy/Caddyfile
echo ""

echo "=== Starting Services ==="
# 启动后端和 Caddy
cd /app/backend && npm start &
caddy run --config /etc/caddy/Caddyfile

# 保持容器运行
wait
