#!/usr/bin/env bash
# Descobre quais apps precisam de build/deploy a partir dos arquivos alterados
# entre dois commits. Mesma ideia do pipeline seletivo do gestao (.ci), adaptada
# ao GitHub Actions: cada app so e afetado pelo proprio diretorio + um conjunto
# de paths COMPARTILHADOS. Na duvida builda tudo (fail-safe, nunca fail-open).
#
# Entradas (env):
#   BEFORE     sha anterior do push (github.event.before)
#   AFTER      sha atual (github.sha)
#   FORCE_ALL  "true" forca build+deploy de tudo (workflow_dispatch)
#   CHANGED_FILES_FILE  (so testes) arquivo com a lista de paths, ignora o git diff
#
# Saidas (em $GITHUB_OUTPUT, ou stdout se a variavel nao existir):
#   build_matrix     JSON {"include":[{"name","port"}...]} dos apps a buildar
#   build_any        true/false
#   deploy_services  nomes separados por espaco dos servicos a (re)subir
#   deploy_any       true/false
#   migrator_build   true/false (rebuild da imagem do migrator)
#   run_migrate      true/false (rodar `prisma migrate deploy` neste deploy)
set -euo pipefail

APPS=("api-gateway:3000" "messaging:3001" "payment:3002" "scheduler:3003")

# Mudou algo aqui => a IMAGEM dos 4 apps muda (build + deploy de todos).
# Path de app individual (apps/<app>/) nunca entra nesta lista.
BUILD_SHARED_REGEX='^(libs/|prisma/|package\.json$|pnpm-lock\.yaml$|pnpm-workspace\.yaml$|tsconfig(\.build)?\.json$|nest-cli\.json$|\.npmrc$|Dockerfile$|\.dockerignore$|\.github/workflows/deploy\.yml$|\.github/scripts/)'

# Mudou algo aqui => a IMAGEM nao muda, mas o jeito de subir muda (redeploy de todos).
DEPLOY_SHARED_REGEX='^(docker-compose\.prod\.yml$|run/prod-)'

# Migrator: schema/migrations, versao do Prisma, Dockerfile ou o proprio pipeline.
MIGRATOR_REGEX='^(prisma/|package\.json$|pnpm-lock\.yaml$|Dockerfile$|\.github/workflows/deploy\.yml$|\.github/scripts/)'

emit() {
  if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "$1=$2" >> "$GITHUB_OUTPUT"; else echo "$1=$2"; fi
}

ZERO="0000000000000000000000000000000000000000"
BEFORE="${BEFORE:-}"
AFTER="${AFTER:-HEAD}"
FORCE_ALL="${FORCE_ALL:-false}"

CHANGED=""
ALL=false

if [ "$FORCE_ALL" = "true" ]; then
  ALL=true
  echo "FORCE_ALL=true: build e deploy de todos os apps." >&2
elif [ -n "${CHANGED_FILES_FILE:-}" ]; then
  CHANGED="$(cat "$CHANGED_FILES_FILE")"
elif [ -z "$BEFORE" ] || [ "$BEFORE" = "$ZERO" ] || ! git cat-file -e "${BEFORE}^{commit}" 2>/dev/null; then
  # primeiro push da branch, force-push ou historico fora do clone
  ALL=true
  echo "Sem commit anterior valido (${BEFORE:-vazio}): build e deploy de todos os apps." >&2
else
  CHANGED="$(git diff --name-only "$BEFORE" "$AFTER")" || { ALL=true; echo "git diff falhou: tudo." >&2; }
fi

matches() { printf '%s\n' "$CHANGED" | grep -Eq "$1"; }

BUILD_SERVICES=()
DEPLOY_SERVICES=()
BUILD_SHARED_HIT=false
DEPLOY_SHARED_HIT=false
MIGRATOR_HIT=false

if [ "$ALL" = "true" ]; then
  BUILD_SHARED_HIT=true
  MIGRATOR_HIT=true
else
  matches "$BUILD_SHARED_REGEX" && BUILD_SHARED_HIT=true || true
  matches "$DEPLOY_SHARED_REGEX" && DEPLOY_SHARED_HIT=true || true
  matches "$MIGRATOR_REGEX" && MIGRATOR_HIT=true || true
fi

MATRIX_ITEMS=()
for entry in "${APPS[@]}"; do
  name="${entry%%:*}"
  port="${entry##*:}"
  own_changed=false
  if [ "$ALL" != "true" ] && matches "^apps/${name}/"; then own_changed=true; fi

  if [ "$ALL" = "true" ] || [ "$BUILD_SHARED_HIT" = "true" ] || [ "$own_changed" = "true" ]; then
    MATRIX_ITEMS+=("{\"name\":\"${name}\",\"port\":${port}}")
    BUILD_SERVICES+=("$name")
    DEPLOY_SERVICES+=("$name")
  elif [ "$DEPLOY_SHARED_HIT" = "true" ]; then
    DEPLOY_SERVICES+=("$name")
  fi
done

join() { local IFS="$1"; shift; echo "$*"; }

build_any=false;  [ "${#BUILD_SERVICES[@]}" -gt 0 ] && build_any=true
deploy_any=false; [ "${#DEPLOY_SERVICES[@]}" -gt 0 ] && deploy_any=true

# `migrate deploy` e idempotente e barato: roda em todo deploy real e sempre que
# o schema/migrations mudaram, para prod nunca ficar atras das migrations.
run_migrate=false
if [ "$deploy_any" = "true" ] || [ "$MIGRATOR_HIT" = "true" ]; then run_migrate=true; fi

# Se vai rodar migrate e a imagem nao foi reconstruida neste push, usa a :latest
# ja publicada. O primeiro rollout muda Dockerfile/pipeline, entao reconstroi.
migrator_build=false
if [ "$MIGRATOR_HIT" = "true" ]; then migrator_build=true; fi

if [ "${#MATRIX_ITEMS[@]}" -gt 0 ]; then
  emit build_matrix "{\"include\":[$(join , "${MATRIX_ITEMS[@]}")]}"
else
  emit build_matrix '{"include":[]}'
fi
emit build_any "$build_any"
emit deploy_services "$(join ' ' "${DEPLOY_SERVICES[@]:-}")"
emit deploy_any "$deploy_any"
emit migrator_build "$migrator_build"
emit run_migrate "$run_migrate"

{
  echo "Arquivos alterados:"; printf '%s\n' "$CHANGED" | sed 's/^/  /'
  echo "Build:  ${BUILD_SERVICES[*]:-nenhum}"
  echo "Deploy: ${DEPLOY_SERVICES[*]:-nenhum}"
  echo "Migrator rebuild: $migrator_build | migrate deploy: $run_migrate"
} >&2
