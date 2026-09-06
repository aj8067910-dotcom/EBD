# Multi-stage frontend image (build with Vite, serve with nginx).
# Build context is the repo ROOT (monorepo).
#   docker build -f frontend/Dockerfile -t koinonia-frontend .

# ---- build ---------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Same-origin API/WS behind the reverse proxy: /api is proxied to the backend
# and an empty WS URL makes Socket.IO use the current origin (path /socket.io).
ARG VITE_API_URL=/api
ARG VITE_WS_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci

COPY shared ./shared
COPY frontend ./frontend
RUN npm run build -w shared && npm run build -w frontend

# ---- runtime -------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
