# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Stage 2: Run
FROM node:24-alpine
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/sql ./sql
COPY --from=builder /usr/src/app/package.json ./package.json

EXPOSE 8000

CMD [ "node", "dist/index.js" ]
