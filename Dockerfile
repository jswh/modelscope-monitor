FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

WORKDIR /app/backend
RUN npm install

WORKDIR /app/frontend
RUN npm install && npm run build

WORKDIR /app

EXPOSE 3000 8000

# 使用脚本同时启动前后端服务
CMD ["sh", "-c", "cd frontend && npm run preview & cd ../backend && npm start"]