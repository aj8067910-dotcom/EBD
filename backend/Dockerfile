# Multi-stage backend image. Build context is the repo ROOT (monorepo).
#   docker build -f backend/Dockerfile -t koinonia-backend .

# ---- build ---------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install workspace deps from the lockfile (all package.json manifests first).
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci

COPY shared ./shared
COPY backend ./backend

# Production uses PostgreSQL: switch the Prisma provider before generating the
# client (the schema stores JSON as text and enums as strings, so it is portable
# between SQLite and Postgres).
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' backend/prisma/schema.prisma \
 && npm run build -w shared \
 && npm run prisma:generate -w backend \
 && npm run build -w backend

# ---- runtime -------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
# openssl for Prisma; fontconfig + DejaVu so sharp/librsvg can rasterize the
# daily-reading art text (Alpine ships with no fonts → text renders as tofu).
RUN apk add --no-cache openssl fontconfig ttf-dejavu && fc-cache -f
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/shared/package.json ./shared/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/package.json ./backend/package.json

WORKDIR /app/backend
EXPOSE 3333

# Apply the schema to the database (idempotent) then start the server.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/server.js"]
