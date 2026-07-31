# Build context is the repository ROOT (see docker-compose.yml).
# Installs the @midas/core and backend workspaces only (skips root devDeps like electron).

FROM node:20-alpine AS builder
WORKDIR /app
ENV PYTHON=/usr/bin/python3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY core/package.json ./core/package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY desktop/package.json ./desktop/package.json
RUN npm install --include-workspace-root=false --workspace=@midas/core --workspace=backend

COPY core ./core
COPY backend ./backend
RUN npm run build --workspace=@midas/core && npm run build --workspace=backend

FROM node:20-alpine AS dev
WORKDIR /app
ENV PYTHON=/usr/bin/python3
RUN apk add --no-cache python3 make g++
RUN mkdir -p /data && chown -R 1000:1000 /data

COPY package.json package-lock.json ./
COPY core/package.json ./core/package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY desktop/package.json ./desktop/package.json
RUN npm install --include-workspace-root=false --workspace=@midas/core --workspace=backend \
    && npm install --no-save --package-lock=false sharp@0.34.5 \
    && rm -rf ./core/node_modules ./backend/node_modules

COPY core ./core
COPY backend ./backend
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/drizzle ./backend/drizzle
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app/backend
EXPOSE 5000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "dev"]

FROM node:20-alpine AS prod
WORKDIR /app
RUN mkdir -p /data && chown -R 1000:1000 /data
ENV NODE_ENV=production
ENV PYTHON=/usr/bin/python3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY core/package.json ./core/package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY desktop/package.json ./desktop/package.json
RUN npm install --omit=dev --include-workspace-root=false --workspace=@midas/core --workspace=backend \
    && npm install --no-save --package-lock=false sharp@0.34.5 \
    && rm -rf ./core/node_modules ./backend/node_modules

# Only core's package manifest + built output are needed at runtime.
COPY --from=builder /app/core/package.json ./core/package.json
COPY --from=builder /app/core/dist ./core/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/drizzle ./backend/drizzle
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app/backend
EXPOSE 5000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]
