---
name: marquei-backend
description: Mapa rápido do backend NestJS do Marquei — os 4 apps, os módulos professional/client dedicados a cada app mobile, padrão de feature (controller/module/use-cases/dto) e comandos. Use sempre que for navegar, editar ou explicar código deste repo.
---

# Marquei Backend — NestJS monorepo

4 apps + 1 lib compartilhada. Serve os dois apps mobile (`app` = profissional, `client-app` = cliente final) a partir do mesmo `api-gateway`. Ver regras obrigatórias em [`AGENTS.md`](../../AGENTS.md) e regras técnicas completas em [`CLAUDE.md`](../../CLAUDE.md) — este arquivo é só o mapa rápido de navegação.

## Os 4 apps

| App | Porta | O que é |
|---|---|---|
| `api-gateway` | 3000 | API HTTP principal — quase tudo mora aqui |
| `messaging` | 3001 | mensageria |
| `payment` | 3002 | pagamentos |
| `scheduler` | 3003 | jobs/agendamento |

## Dentro do `api-gateway`: qual módulo é de quem

- `modules/professional/` → **repo `app`** (profissional). Feature nova pro app do profissional entra aqui.
- `modules/client/` → **repo `client-app`** (cliente final). Feature nova pro app do cliente entra aqui.
- `modules/innovate-connect/` → painel admin interno.
- `modules/webhooks/` → webhooks externos (Stripe etc.).
- **Nunca importar de `professional/` dentro de `client/` nem o contrário.** Código comum sobe pra `libs/shared`.

## Padrão de feature (sempre)

```
modules/<professional|client>/<feature>/
  <feature>.controller.ts   # fino — DTO in, use-case, response out
  <feature>.module.ts
  dto/
  use-cases/<ação>.use-case.ts
```

Ao criar feature nova, replicar essa estrutura — não inventar variação.

## Comandos

```bash
pnpm start:dev   # pnpm build   # pnpm lint   # pnpm format
pnpm prisma:generate
pnpm db:push          # ⚠️ nunca contra produção sem confirmação explícita
docker compose up      # rabbitmq + redis locais
```

## Antes de editar

1. `cocoindex-code` já está indexado (`.cocoindex_code/`, cobre `apps/` + `libs/`) — prefira consultar o índice a varrer arquivo por arquivo.
2. Se `graphify-out/graph.json` existir, trate pergunta de arquitetura/dependência entre módulos como query do graphify primeiro (`/graphify query "<pergunta>"`). Se não existir, gerar com `/graphify .`.
3. Rota pública precisa do decorator `@isPublic` — ausência de guard não é o padrão aqui, o guard global é `AuthGuard`.

## Não fazer (resumo — ver CLAUDE.md pra lista completa)

- Não rodar `prisma db push`/migração contra produção sem confirmação explícita.
- Não dar push/merge em `main` nem rodar `pnpm deploy-prod` sem confirmação explícita — dispara deploy real dos 4 serviços.
- Não colocar lógica de negócio em controller.
- Não criar dependência cruzada entre `modules/professional` e `modules/client`.

## Skills e agents específicos deste repo

| Skill/agent | Quando usar |
|---|---|
| `prisma-schema-safety` (skill) | Antes de editar `prisma/schema.prisma` ou rodar `prisma format`/`migrate dev` |
| `rabbitmq-queue-contract` (skill) | Criar/alterar producer (`RmqService`) ou consumer (`@RabbitSubscribe`) — DLQ, idempotência, classificação de erro ainda não são seguidas hoje neste repo, mas são obrigatórias daqui pra frente |
| `queue-boundary-reviewer` (agent) | Revisar diff que mexe em fila RabbitMQ, antes do merge |
| `security-reviewer` (agent) | Revisar diff de auth, guard, webhook (Stripe/RevenueCat), ou qualquer rota que acesse recurso de outro `businessId`/`customerId` |
| `test-writer` (agent) | Gerar teste real (Jest) pra use-case/endpoint com cobertura fraca |
