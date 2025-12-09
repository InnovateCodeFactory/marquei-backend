#!/usr/bin/env bash
set -e

cd /var/www/marquei/backend

# Atualiza código (compose, .env, etc)
git pull

# Puxa imagens mais recentes do GHCR
docker compose -f docker-compose.prod.yml pull

# Sobe containers usando as novas imagens
docker compose -f docker-compose.prod.yml up -d --remove-orphans