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

CMD ["npm", "start"]