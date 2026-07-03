FROM node:20-alpine AS builder
WORKDIR /app
ENV PYTHON=/usr/bin/python3
RUN apk add --no-cache python3 py3-pip make g++
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS dev
WORKDIR /app
ENV PYTHON=/usr/bin/python3
RUN apk add --no-cache python3 py3-pip make g++
RUN mkdir -p /data && chown -R 1000:1000 /data
COPY package.json ./
RUN npm install
COPY . .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 5000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "dev"]

FROM node:20-alpine AS prod
WORKDIR /app
RUN mkdir -p /data && chown -R 1000:1000 /data
ENV NODE_ENV=production
ENV PYTHON=/usr/bin/python3
RUN apk add --no-cache python3 py3-pip make g++
COPY package.json ./
RUN npm install --omit=dev && npm rebuild && apk del python3 py3-pip make g++
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 5000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]
