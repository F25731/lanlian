FROM node:18-alpine

WORKDIR /app

# 复制package.json
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制源代码
COPY src ./src

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "src/app.js"]
