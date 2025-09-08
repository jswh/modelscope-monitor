# ModelScope Usage Monitor

一个简单实用的 ModelScope API 使用监控工具。

## 核心特性

- ✅ 多账户管理
- ✅ 实时使用量监控  
- ✅ 自动数据更新（每5分钟）
- ✅ 简洁的Web仪表板
- ✅ Docker一键部署

## 快速开始

### Docker部署（推荐）

```bash
# 拉取镜像
docker pull ghcr.io/jswh/modelscope-monitor:latest

# 运行容器
docker run -d \
  --name modelscope-monitor \
  -p 80:80 \
  -p 8000:8000 \
  -v $(pwd)/data:/app/backend/data \
  ghcr.io/jswh/modelscope-monitor:latest
```

**自定义端口：**
```bash
docker run -d \
  --name modelscope-monitor \
  -p 43000:80 \
  -p 8000:8000 \
  -v $(pwd)/data:/app/backend/data \
  ghcr.io/jswh/modelscope-monitor:latest
```

**启用密码保护：**
```bash
docker run -d \
  --name modelscope-monitor \
  -p 80:80 \
  -p 8000:8000 \
  -v $(pwd)/data:/app/backend/data \
  -e ENABLE_AUTH=true \
  -e AUTH_USERNAME=myuser \
  -e AUTH_PASSWORD=bcrypt_password \
  ghcr.io/jswh/modelscope-monitor:latest
```
注意：密码必须是bcrypt加密后的字符串，可以使用generate-hash.sh脚本生成。

### 本地开发

```bash
# 安装依赖
npm install
cd backend && npm install
cd ../frontend && npm install

# 启动开发服务器
npm run dev
```

- 前端：http://localhost:3000
- 后端API：http://localhost:8000

## 如何添加账户

1. 登录 [ModelScope](https://modelscope.cn)
2. 打开浏览器开发者工具（F12）
3. 切换到 Network 标签页
4. 点击页面右上角头像，触发身份验证请求
5. 找到 `https://modelscope.cn/api/v1/inference/rate-limit` 这个请求
6. 右键点击该请求 → Copy → Copy as cURL
7. 从cURL命令中提取 Cookie 部分
8. 在Web界面中粘贴Cookie并添加账户

## 许可证

MIT License
