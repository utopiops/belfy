FROM node:21 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV PORT=3000
EXPOSE $PORT
CMD ["node", "app.js"]
