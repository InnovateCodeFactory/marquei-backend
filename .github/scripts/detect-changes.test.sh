#!/usr/bin/env bash
# Testes do detect-changes.sh. Uso: bash .github/scripts/detect-changes.test.sh
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$HERE/detect-changes.sh"
PASS=0; FAIL=0

run() { # $1 = arquivos alterados (separados por \n) ; extras via env
  local files; files="$(mktemp)"; printf '%b' "$1" > "$files"
  CHANGED_FILES_FILE="$files" bash "$SCRIPT" 2>/dev/null
  rm -f "$files"
}
get() { echo "$1" | grep "^$2=" | head -1 | cut -d= -f2-; }
check() { # nome, esperado, obtido
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ok   $1"; else FAIL=$((FAIL+1)); echo "  FAIL $1"; echo "       esperado: $2"; echo "       obtido:   $3"; fi
}

echo "so um app mudou"
out="$(run 'apps/messaging/src/main.ts\n')"
check "deploy so messaging"  "messaging" "$(get "$out" deploy_services)"
check "matrix so messaging"  '{"include":[{"name":"messaging","port":3001}]}' "$(get "$out" build_matrix)"
check "migrator nao rebuilda" "false" "$(get "$out" migrator_build)"
check "migrate roda (deploy real)" "true" "$(get "$out" run_migrate)"

echo "dois apps"
out="$(run 'apps/payment/a.ts\napps/scheduler/b.ts\n')"
check "deploy payment+scheduler" "payment scheduler" "$(get "$out" deploy_services)"

echo "libs compartilhadas afetam todos"
out="$(run 'libs/shared/src/utils/index.ts\n')"
check "deploy todos" "api-gateway messaging payment scheduler" "$(get "$out" deploy_services)"
check "migrator nao rebuilda" "false" "$(get "$out" migrator_build)"

echo "prisma afeta todos e rebuilda o migrator"
out="$(run 'prisma/migrations/20260929120000_x/migration.sql\n')"
check "deploy todos" "api-gateway messaging payment scheduler" "$(get "$out" deploy_services)"
check "migrator rebuilda" "true" "$(get "$out" migrator_build)"
check "migrate roda" "true" "$(get "$out" run_migrate)"

echo "dependencias e configs"
for f in package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.build.json nest-cli.json .npmrc Dockerfile .dockerignore .github/workflows/deploy.yml .github/scripts/detect-changes.sh; do
  out="$(run "$f\n")"
  check "$f => todos" "api-gateway messaging payment scheduler" "$(get "$out" deploy_services)"
done

echo "compose/run: redeploy de todos SEM rebuild"
out="$(run 'docker-compose.prod.yml\n')"
check "deploy todos" "api-gateway messaging payment scheduler" "$(get "$out" deploy_services)"
check "sem build" "false" "$(get "$out" build_any)"
check "matrix vazia" '{"include":[]}' "$(get "$out" build_matrix)"

echo "so documentacao: nada roda"
out="$(run 'README.md\nCLAUDE.md\nPLANO_ACAO_LISTA_ESPERA.md\n')"
check "sem deploy" "false" "$(get "$out" deploy_any)"
check "sem build" "false" "$(get "$out" build_any)"
check "sem migrate" "false" "$(get "$out" run_migrate)"

echo "app + shared: sem duplicar"
out="$(run 'apps/api-gateway/x.ts\nlibs/shared/y.ts\n')"
check "deploy todos uma vez cada" "api-gateway messaging payment scheduler" "$(get "$out" deploy_services)"

echo "nome parecido nao confunde (apps/payment-x nao e payment)"
out="$(run 'apps/payment-legacy/x.ts\n')"
check "nao aciona payment" "" "$(get "$out" deploy_services)"

echo "fail-safe"
out="$(BEFORE=0000000000000000000000000000000000000000 AFTER=HEAD bash "$SCRIPT" 2>/dev/null)"
check "primeiro push => todos" "api-gateway messaging payment scheduler" "$(get "$out" deploy_services)"
check "primeiro push => migrator" "true" "$(get "$out" migrator_build)"
out="$(BEFORE=1111111111111111111111111111111111111111 AFTER=HEAD bash "$SCRIPT" 2>/dev/null)"
check "sha desconhecido => todos" "api-gateway messaging payment scheduler" "$(get "$out" deploy_services)"
out="$(FORCE_ALL=true CHANGED_FILES_FILE=/dev/null bash "$SCRIPT" 2>/dev/null)"
check "FORCE_ALL => todos" "api-gateway messaging payment scheduler" "$(get "$out" deploy_services)"

echo "git diff real entre dois commits"
tmp="$(mktemp -d)"; ( cd "$tmp" && git init -q && git config user.email t@t && git config user.name t \
  && mkdir -p apps/messaging apps/payment && echo 1 > apps/messaging/a.ts && echo 1 > apps/payment/b.ts && git add -A && git commit -qm base \
  && echo 2 > apps/messaging/a.ts && git commit -qam change )
out="$(cd "$tmp" && BEFORE="$(git rev-parse HEAD~1)" AFTER="$(git rev-parse HEAD)" bash "$SCRIPT" 2>/dev/null)"
check "diff real => so messaging" "messaging" "$(get "$out" deploy_services)"
rm -rf "$tmp"

echo; echo "passou: $PASS | falhou: $FAIL"
[ "$FAIL" -eq 0 ]
