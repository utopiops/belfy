FROM node:14.19.0-slim
# FROM node:12.19.0

RUN curl --compressed -o- -L https://yarnpkg.com/install.sh | bash

WORKDIR /usr/src/app

COPY package*.json ./

RUN yarn install

COPY . .

CMD ["node", "./bin/www"]
