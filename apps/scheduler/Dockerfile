# ========================
# Etapa 1: deps
# ========================
FROM node:20-alpine AS deps

ARG APP_NAME
ARG APP_PORT

WORKDIR /app

COPY pnpm-lock.yaml package.json .npmrc ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm fetch

# ========================
# Etapa 2: builder
# ========================
FROM node:20-alpine AS builder

ARG APP_NAME
ARG APP_PORT

WORKDIR /app

COPY . .
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Copia .env global para dentro da imagem
COPY .env /app/.env

# Copia a pasta prisma da raiz para dentro da pasta do app
RUN mkdir -p /app/apps/${APP_NAME}/prisma
COPY prisma /app/apps/${APP_NAME}/prisma

# Gera Prisma Client do app específico
WORKDIR /app/apps/${APP_NAME}
RUN pnpm prisma generate

# Build da aplicação
WORKDIR /app
RUN pnpm exec nest build ${APP_NAME}

# ========================
# Etapa 3: runner
# ========================
FROM node:20-alpine AS runner

ARG APP_NAME
ARG APP_PORT

WORKDIR /app

COPY --from=builder /app/dist/apps/${APP_NAME} ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.env .env

ENV NODE_ENV=production
ENV PORT=${APP_PORT}

CMD ["node", "dist/main"]