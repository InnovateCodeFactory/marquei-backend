---
name: prisma-schema-safety
description: Use antes de editar prisma/schema.prisma ou rodar prisma format/migrate dev — evita que reformatação de whitespace em models não relacionados polua o diff e colida com trabalho concorrente de outro time.
---

# Prisma schema safety

**Regra permanente**: nunca rode `prisma format` no schema inteiro antes de commitar uma mudança pontual. Ele reformata TODOS os models (indentação, alinhamento de colunas), não só os que você tocou — já causou colisão real com trabalho concorrente de outro time em models não relacionados (`Promotion`/`Coupon`/`Redemption`, no projeto de origem desta skill).

## Antes de editar

1. `git diff prisma/schema.prisma` precisa estar limpo antes de começar.
2. Adicione seus models/enums/campos novos manualmente, sem rodar formatter no arquivo inteiro.

## Depois de editar, antes de commitar

1. `git diff prisma/schema.prisma` — confira que só as linhas que você pretendia mudar aparecem.
2. Se `prisma format` rodou (via `postinstall`, IDE, ou comando manual) e introduziu reformatação em models que você não tocou: extraia só seu bloco novo (`git show HEAD:prisma/schema.prisma` + splice manual) e reinsira no arquivo original pré-format.
3. Rode `prisma migrate dev --name <nome>` só depois do diff estar limpo.
4. Nunca rode `prisma migrate reset` ou `db push --force-reset` sem confirmação explícita — dados reais podem estar no banco local compartilhado, e o `DATABASE_URL`/`SHADOW_DATABASE_URL` deste repo podem apontar pra produção (ver seção "Banco de dados — regras rígidas" em `CLAUDE.md`).
