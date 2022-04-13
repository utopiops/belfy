FROM node:14.17.6-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install -g typescript

RUN npm install -g ts-node

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3018

CMD ["node", "dist/index.js"]
