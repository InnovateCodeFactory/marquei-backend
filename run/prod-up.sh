#!/usr/bin/env bash
# Deploy em producao (VPS). Chamado pelo GitHub Actions apos o build.
#
# Variaveis (todas opcionais; sem elas sobe e migra tudo, como antes):
#   SERVICES        servicos a (re)subir, separados por espaco
#   RUN_MIGRATE     true|false: roda `prisma migrate deploy` antes de subir
#   MIGRATOR_TAG    tag da imagem marquei-migrator (default: latest)
set -euo pipefail

cd /var/www/marquei/backend

COMPOSE="docker compose -f docker-compose.prod.yml"
SERVICES="${SERVICES:-api-gateway messaging payment scheduler}"
RUN_MIGRATE="${RUN_MIGRATE:-true}"
export MIGRATOR_TAG="${MIGRATOR_TAG:-latest}"

# Atualiza codigo (compose, .env, etc)
git pull --ff-only

# 1. Migrations ANTES de subir o codigo novo. Se falhar, `set -e` aborta aqui e
#    nenhum container e reiniciado. Migrations precisam ser retrocompativeis
#    (expand/contract): os containers antigos seguem rodando durante o migrate.
if [ "$RUN_MIGRATE" = "true" ]; then
  echo ">> prisma migrate deploy (imagem marquei-migrator:${MIGRATOR_TAG})"
  $COMPOSE --profile migrate pull migrator
  $COMPOSE --profile migrate run --rm migrator
fi

# 2. So os servicos afetados (o resto continua rodando, sem restart)
echo ">> deploy: ${SERVICES}"
# shellcheck disable=SC2086
$COMPOSE pull ${SERVICES}
# shellcheck disable=SC2086
$COMPOSE up -d --no-deps ${SERVICES}

# Limpa imagens sem uso ha mais de 24h
docker image prune -af --filter "until=24h"
