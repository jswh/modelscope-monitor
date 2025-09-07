#!/bin/bash

# 生成 Caddy bcrypt 哈希密码的脚本
# 用法: ./generate-hash.sh "yourpassword"

if [ -z "$1" ]; then
    echo "Usage: $0 \"yourpassword\""
    echo "Example: $0 \"mypassword123\""
    exit 1
fi

PASSWORD="$1"

echo "Generating bcrypt hash for password: $PASSWORD"
echo ""

# 使用 docker 生成哈希（确保使用与 Caddy 相同的算法）
HASH=$(docker run --rm caddy:alpine caddy hash-password --plaintext "$PASSWORD")

echo "Generated bcrypt hash:"
echo "$HASH"
echo ""
echo "使用方法:"
echo "docker run -p 43000:80 \\"
echo "  -e ENABLE_AUTH=true \\"
echo "  -e AUTH_USERNAME=your-username \\"
echo "  -e AUTH_PASSWORD=\\\"$HASH\\\" \\"
echo "  --name modelscope-monitor \\"
echo "  -v \$(pwd)/data:/app/backend/data \\"
echo "  ghcr.io/jswh/modelscope-monitor:latest"