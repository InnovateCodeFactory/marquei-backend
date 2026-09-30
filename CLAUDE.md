@AGENTS.md

# CLAUDE.md — Marquei Backend (NestJS)

> ⚠️ **Produção com clientes reais, dados reais, pagamento real (Stripe).** Este backend serve os apps `app` (profissional) e `client-app` (cliente final) hoje em produção. Qualquer regressão de API quebra os dois apps ao mesmo tempo. Migração de banco malfeita é irreversível em produção. Trate tudo aqui como produção-first.

As regras obrigatórias de arquitetura/segurança/performance estão em [AGENTS.md](AGENTS.md) (importado acima) — leia antes de qualquer mudança. Este arquivo cobre stack, comandos, estrutura real do monorepo e regras rígidas adicionais.

## Stack

- **NestJS** (monorepo Nest, `nest-cli.json`) + **TypeScript**
- **Prisma** + **PostgreSQL** (extensão **PostGIS** — busca geográfica de profissionais) — `prisma/schema.prisma`
- **Redis** (cache/sessão) · **RabbitMQ** (mensageria entre serviços)
- **Stripe** (pagamentos/assinaturas) · **RevenueCat** (bridge com IAP dos apps)
- **Cloudflare R2** / **MinIO** (storage de arquivos, S3-compatible)
- **JWT** (access + refresh, secrets separados pra `InnovateConnect`/admin)
- Integrações: Google Calendar, WhatsApp API, e-mail (SMTP), Mapbox

## Arquitetura: 4 apps + 1 lib compartilhada

```
apps/
  api-gateway/   # API HTTP principal — porta 3000, é onde vive quase tudo
  messaging/     # serviço de mensageria — porta 3001
  payment/       # serviço de pagamento — porta 3002
  scheduler/     # jobs/agendamento — porta 3003
libs/
  shared/        # @app/shared — DTOs, guards, services, enums, value-objects
                  # compartilhados entre os 4 apps
```

Um único `Dockerfile` na raiz builda qualquer app (`--build-arg APP_NAME`) e o `migrator`. O workflow `.github/workflows/deploy.yml` (só `main`) detecta quais apps mudaram (`.github/scripts/detect-changes.sh`, testes em `detect-changes.test.sh`), builda e deploya só esses e roda `prisma migrate deploy` antes de subir os containers (nunca em `develop`).

### `api-gateway` — os dois módulos dedicados

Dentro de `apps/api-gateway/src/modules/`:

- **`professional/`** → **módulo dedicado ao app `app`** (profissional). Contém `auth`, `business`, `appointments`, `analytics`, `app-updates`, `business-category`, etc. — cada feature em sua própria pasta com `*.controller.ts` + `*.module.ts` + `use-cases/*.use-case.ts` + `dto/`.
- **`client/`** → **módulo dedicado ao app `client-app`** (cliente final). Contém `auth`, `business`, `customer-appointments`, `customer-plans`, `favorites`, `profile`, `onboarding`, `in-app-notifications`, `business-rating`.
- **`innovate-connect/`** → painel administrativo interno (Codex/automação usa auth própria, `INNOVATE_CONNECT_*`).
- **`webhooks/`** → webhooks externos (Stripe etc.).
- **`professional/plans/`** → planos/assinatura do profissional.

**Regra de fronteira: código de `professional/` nunca importa de `client/` e vice-versa.** Se algo é comum aos dois, sobe pra `libs/shared` — não criar dependência cruzada entre os módulos dos dois apps.

### Padrão de feature (Clean Architecture, use-case based)

```
modules/<professional|client>/<feature>/
  <feature>.controller.ts   # fino: recebe DTO, chama use-case, devolve resposta padronizada
  <feature>.module.ts
  dto/                       # class-validator
  use-cases/
    <ação>.use-case.ts        # 1 use-case = 1 ação de negócio, testável isolado
    index.ts
```

Controller nunca contém regra de negócio — só orquestra DTO → use-case → resposta.

## Comandos

```bash
pnpm start:dev          # nest start --watch (api-gateway por padrão via nest-cli)
pnpm build                # nest build
pnpm lint                  # eslint --fix
pnpm format                  # prettier --write
pnpm db:push                   # prisma db push (⚠️ ver seção Banco de dados abaixo)
pnpm prisma:generate             # prisma generate
pnpm stripe:listen                 # stripe CLI, forward webhook local
docker compose up                    # sobe rabbitmq + redis locais (docker-compose.yaml)
```

Testes: Jest (`testRegex: *.spec.ts`, roots em `apps/` e `libs/`), com `"maxWorkers": 2` na config (mesmo padrão dos projetos do `gestao`, pra não travar a máquina). Rodar teste focado no módulo tocado (`pnpm exec jest <caminho>`), não a suíte inteira, a menos que a mudança seja cross-cutting. Toda feature nova leva spec junto.

## Banco de dados — regras rígidas

- **Nunca rodar `prisma db push`, `prisma migrate deploy`, ou qualquer comando que altere schema contra o banco de produção sem confirmação explícita do usuário.** `DATABASE_URL`/`SHADOW_DATABASE_URL` no `.env` podem apontar pra produção — sempre confirmar qual ambiente antes de migrar.
- Toda mudança de schema (`prisma/schema.prisma`) precisa de migration correspondente, nunca só `db push` direto em produção.
- Modelos como `Appointment`, `AppointmentEvent`, `RecurringAppointmentSeries`, `CustomerPlanSubscription`, `Payment` são financeiros/operacionais sensíveis — mudança neles exige atenção extra a concorrência (conflito de horário) e consistência.

## Deploy — regras rígidas

- Push em `main` dispara build+deploy real dos 4 serviços (GHCR) via `.github/workflows/deploy.yml`. **Nunca dar push/merge em `main` nem rodar `pnpm deploy-prod` sem confirmação explícita do usuário.**
- **Nunca rodar `eas build`/`eas submit` (apps `app` e `client-app`) sem confirmação explícita do usuário.** Ações de produção irreversíveis, junto com `prisma db push`, `prisma migrate deploy` e push/merge em `main`.
- Fluxo normal de trabalho é em `develop`; `main` é produção.

## Regras rígidas gerais (além do AGENTS.md)

**Sempre:**
- Validar entrada com DTO + `class-validator` em todo endpoint novo.
- Aplicar `AuthGuard`/guards corretos — endpoint sem guard explícito herda o `APP_GUARD` global (`AuthGuard`), então rota pública precisa do decorator `@isPublic` (`libs/shared/src/decorators/isPublic.decorator.ts`), não a ausência de guard.
- Paginar qualquer listagem que possa crescer (agendamentos, clientes, avaliações).
- Logar eventos de negócio relevantes sem PII/token/senha.

**Nunca:**
- Nunca logar `JWT_SECRET`, `STRIPE_SECRET_KEY`, senha, token, ou payload bruto de webhook com dado de pagamento.
- Nunca acessar Prisma direto de controller — sempre via camada de infra/repository usada pelos use-cases.
- Nunca introduzir lógica de negócio em `*.controller.ts`.
- Nunca misturar dependência entre `modules/professional` e `modules/client`.
- Nunca alterar contrato de resposta de endpoint existente sem checar os dois apps consumidores (`app` e `client-app`) — eles quebram junto.

## Skills e agents deste projeto

| Skill/agent | Quando carregar |
|---|---|
| `marquei-backend` (skill) | Sempre — mapa rápido de navegação deste repo |
| `prisma-schema-safety` (skill) | Antes de editar `prisma/schema.prisma` ou rodar `prisma format`/`migrate dev` — evita reformatação de whitespace poluindo o diff |
| `rabbitmq-queue-contract` (skill) | Criar/alterar producer (`RmqService`) ou consumer (`@RabbitSubscribe`) entre os 4 apps — DLQ, idempotência e classificação de erro obrigatórias |
| `queue-boundary-reviewer` (agent) | Revisar qualquer diff que mexa em fila RabbitMQ antes do merge |
| `security-reviewer` (agent) | Revisar diff de auth, guard, webhook (Stripe/RevenueCat), ou rota que acesse recurso de outro `businessId`/`customerId` |
| `test-writer` (agent) | Gerar teste real (Jest) pra use-case/endpoint com cobertura fraca |

## Ferramentas configuradas neste repo

- **cocoindex-code** — índice semântico local do código (`.cocoindex_code/`, já gerado, cobre `apps/` + `libs/`). Refaça com `cocoindex-code index` após mudanças grandes.
- **graphify** — grafo de conhecimento do repo (útil aqui pra mapear dependência entre os 4 apps e os módulos `professional`/`client`). Ainda não construído. Para gerar: `/graphify .` na raiz do projeto. Depois, consultar com `/graphify query "<pergunta>"` antes de explorar manualmente.
- **Skill local**: [`.claude/skills/marquei-backend/SKILL.md`](.claude/skills/marquei-backend/SKILL.md) — mapa rápido deste projeto.
