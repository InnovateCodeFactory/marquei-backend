# syntax=docker/dockerfile:1.7
#
# Dockerfile unico dos 4 apps (api-gateway, messaging, payment, scheduler) e do migrator.
#   docker build --build-arg APP_NAME=api-gateway --build-arg APP_PORT=3000 -t marquei-api-gateway .
#   docker build --target migrator -t marquei-migrator .
#
# Node 22: o pnpm 11 (packageManager do package.json) exige Node >= 22.13.

ARG NODE_VERSION=22

# ---------------------------------------------------------------------
# base: Node + pnpm fixado pelo campo `packageManager` do package.json
# ---------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    npm_config_store_dir=/pnpm/store \
    CI=true
RUN corepack enable
WORKDIR /app

# ---------------------------------------------------------------------
# deps: so os manifests entram aqui, entao esta camada (a mais lenta)
# so e refeita quando as dependencias mudam, nao a cada mudanca de codigo.
# O store do pnpm fica num cache mount do BuildKit.
# ---------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# ---------------------------------------------------------------------
# builder: gera o Prisma Client, compila o app e remove devDependencies
# ---------------------------------------------------------------------
FROM deps AS builder
ARG APP_NAME
COPY . .
RUN pnpm exec prisma generate \
 && pnpm exec nest build ${APP_NAME} \
 && pnpm prune --prod --ignore-scripts

# O `prune --prod` mantem prisma (CLI), @prisma/engines e typescript por serem
# peers do @prisma/client, mas em runtime so o Client e o query engine gerado
# em .prisma/client sao usados. Remove ~90 MB e depois prova, ainda no build,
# que o entrypoint existe e que o engine do Prisma continua carregando.
RUN rm -rf node_modules/.pnpm/prisma@* node_modules/.pnpm/typescript@* node_modules/.pnpm/@prisma+engines@* \
 && node docker/smoke.js dist/apps/${APP_NAME}/apps/${APP_NAME}/src/main.js

# ---------------------------------------------------------------------
# migrator: aplica `prisma migrate deploy` (so schema + migrations + CLI
# do Prisma, sem o codigo dos apps). Fica ANTES do runner de proposito: sem
# --target o Docker usa o ULTIMO estagio, que precisa continuar sendo o runner.
# A versao do CLI acompanha o @prisma/client do package.json.
# ---------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS migrator
ARG PRISMA_VERSION=6.8.2
RUN apk add --no-cache openssl \
 && npm install --global --no-audit --no-fund prisma@${PRISMA_VERSION} \
 && npm cache clean --force \
 && rm -rf /root/.npm /tmp/*
WORKDIR /app
COPY prisma ./prisma
USER node
CMD ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"]

# ---------------------------------------------------------------------
# runner (default): so dist + node_modules de producao, usuario nao-root.
# Prisma no musl/alpine precisa de openssl em runtime.
# ---------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ARG APP_NAME
ARG APP_PORT=3000
# O build inclui libs/ (@app/shared), entao o tsc usa a raiz do repo como
# rootDir: o entrypoint NAO e dist/main.js, e sim <dist>/apps/<app>/src/main.js.
ENV NODE_ENV=production \
    PORT=${APP_PORT} \
    APP_MAIN=dist/apps/${APP_NAME}/src/main.js

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist/apps/${APP_NAME} ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node
EXPOSE ${APP_PORT}
# `exec` para o node ser o PID 1 do sh e receber SIGTERM
CMD ["sh", "-c", "exec node \"$APP_MAIN\""]
