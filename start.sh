#!/bin/sh

set -e

# 打印环境变量用于调试
echo "=== Environment Variables ==="
echo "ENABLE_AUTH: '${ENABLE_AUTH:-false}'"
echo "AUTH_USERNAME: '${AUTH_USERNAME:-admin}'"
echo "AUTH_PASSWORD: '${AUTH_PASSWORD:-admin}'"
echo ""

# 如果启用认证，替换 Caddyfile 中的密码
if [ "$ENABLE_AUTH" = "true" ]; then
    echo "=== Generating Caddyfile with authentication ==="
    
    # 创建临时 Caddyfile
    sed "s/allowenv ENABLE_AUTH/allowenv ${ENABLE_AUTH}/g" /etc/caddy/Caddyfile.template | \
    sed "s/username AUTH_USERNAME/username ${AUTH_USERNAME}/g" | \
    sed "s/password AUTH_PASSWORD/password ${AUTH_PASSWORD}/g" > /etc/caddy/Caddyfile
    
    echo "Caddyfile updated with basic authentication"
else
    echo "=== Using default Caddyfile (no authentication) ==="
    # 使用默认的 Caddyfile（无认证）
    cp /etc/caddy/Caddyfile.template /etc/caddy/Caddyfile
fi

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
