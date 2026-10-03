# Plano de Ação: Lista de Espera para Dias Lotados

## 1. Objetivo

Permitir que um cliente entre numa lista de espera quando um dia está com todos os horários agendados (com um profissional/serviço específico). Quando um horário abrir naquele dia por cancelamento, o sistema oferece a vaga para a fila **em ordem, um de cada vez, com um prazo curto pra cada pessoa confirmar** antes de passar pro próximo. Cliente só pode estar na fila de um mesmo negócio uma vez por dia.

Escopo desta versão: `backend`, `client-app`. O `app` (profissional) fica com escopo mínimo **adiado** — decisão de produto ainda em aberto (ver seção 8).

## 2. Contexto atual

- Disponibilidade de horário é calculada por profissional + serviço/combo + data, cruzando `Appointment` e `ProfessionalTimesBlock` (`professional/appointments/use-cases/get-available-times.use-case.ts` e `client/business/use-cases/get-available-times-for-service-and-professional.use-case.ts`).
- Cancelamento de agendamento já existe nos dois lados: `professional/appointments/use-cases/cancel-appointment.use-case.ts` e `client/customer-appointments/use-cases/cancel-appointment.use-case.ts`, e gera `AppointmentEvent` (`event_type: CANCELED`).
- Já existe um padrão consolidado de job assíncrono com janela de tempo: `ReminderJob` (`businessId`, `appointmentId`, `personId`, `channel`, `due_at_utc`, `status`, `attempts`) processado pelo `apps/scheduler`. A lista de espera replica esse padrão em vez de inventar um novo.
- `apps/scheduler/src/infrastructure/locks/redis-lock.service.ts` já existe e deve ser reaproveitado para qualquer concorrência (ninguém deve implementar lock na mão).
- Notificação multi-canal já é modelada por enums (`ReminderChannel`: `PUSH`, `WHATSAPP`) e por `SendWhatsAppTypeEnum`, além de `InAppNotification` (feed dentro dos apps) com módulo próprio em `client/in-app-notifications`.
- `client-app` **não tem i18n** (strings diretas em PT-BR). `app` **tem i18n** (`src/i18n/`, `i18next`) — qualquer texto novo no `app` precisa entrar nas traduções, no `client-app` não.

## 3. Decisão de produto adotada

Estratégia de oferta de vaga: **sequencial com timeout**, respeitando a ordem de entrada na fila.

1. Vaga abre (cancelamento) → sistema oferece pro 1º da fila compatível.
2. Ele tem uma janela curta (`offer_ttl_minutes`, default 10 min) pra aceitar.
3. Se aceitar → vira agendamento, sai da fila, fim.
4. Se recusar explicitamente ou o prazo expirar → a vaga passa pro 2º, e assim sucessivamente.
5. Quem perdeu a vez por timeout **não sai da fila** — continua aguardando a próxima vaga que abrir naquele dia, na mesma posição de entrada original. Só sai da fila se: aceitar uma vaga, cancelar manualmente, ou o dia em questão passar.

Ver seção 9 para as demais decisões assumidas (janela de tempo, escopo da fila, o que fazer com múltiplas vagas abrindo ao mesmo tempo).

## 4. Fase 1 — Backend: banco de dados

### 4.1. Novos enums (`prisma/schema.prisma`)

- `WaitlistEntryStatus`: `WAITING`, `CONVERTED`, `CANCELED`, `EXPIRED_DAY_PASSED`
- `WaitlistOfferStatus`: `PENDING`, `CONVERTED`, `EXPIRED`, `DECLINED`, `SUPERSEDED`
- `WaitlistEventType`: `JOINED`, `LEFT`, `OFFER_SENT`, `OFFER_EXPIRED`, `OFFER_DECLINED`, `CONVERTED`, `REMOVED_DAY_PASSED`

### 4.2. Modelo `WaitlistEntry`

Uma entrada = um cliente esperando vaga num negócio, numa data.

Campos principais:

- `id`
- `businessId`
- `businessCustomerId`
- `personId`
- `professionalProfileId` — nullable (`null` = qualquer profissional do negócio serve)
- `serviceId` — nullable (`null` = qualquer serviço; se preenchido, só oferece slot que comporte a duração desse serviço)
- `date` (dia, sem horário, no timezone do negócio)
- `status` (default `WAITING`)
- `converted_appointment_id` — nullable, preenchido quando vira agendamento
- timestamps (`created_at` define a posição na fila)

Índices/constraints:

- `@@unique([businessId, personId, date])` — garante "uma vez por dia" (regra literal do pedido).
- `@@index([businessId, professionalProfileId, date, status])` — é a query mais usada (achar a fila de um dia).

### 4.3. Modelo `WaitlistOffer`

Uma oferta = a vaga específica sendo ofertada a uma entrada, com prazo.

Campos principais:

- `id`
- `waitlistEntryId`
- `businessId`, `professionalProfileId`, `serviceId` (denormalizado do momento da oferta, pra auditoria)
- `slot_start_at_utc`, `slot_end_at_utc` (o horário exato que abriu)
- `status` (default `PENDING`)
- `expires_at_utc`
- `notified_at_utc`
- `responded_at_utc` — nullable
- `metadata` (json — motivo do cancelamento que originou a vaga, se fizer sentido)
- timestamps

Índices:

- `@@index([status, expires_at_utc])` — é a query do job de expiração.
- `@@index([waitlistEntryId])`

### 4.4. Modelo `WaitlistEvent`

Espelha o padrão de `AppointmentEvent` — log de auditoria imutável.

Campos: `id`, `waitlistEntryId`, `offerId` (nullable), `event_type`, `by_user_id` (nullable — sistema também gera evento), `reason` (nullable), `created_at`.

### 4.5. Relação com `Business`

Adicionar settings mínimos, no molde de `BusinessReminderSettings`: `is_waitlist_enabled` (default `true`) e `offer_ttl_minutes` (default `10`) — dá pro negócio ajustar o prazo depois, sem precisar decidir isso agora como fixo no código.

## 5. Fase 2 — Backend: entrar/sair da fila

Módulo novo em `apps/api-gateway/src/modules/client/waitlist/` (é o app cliente que entra na fila — o profissional não age aqui nesta fase).

### 5.1. `POST /client/waitlist`

Use-case `join-waitlist.use-case.ts`. Entrada: `business_slug` (ou `businessId`), `professional_profile_id?`, `service_id?`, `date`.

Regras de validação (server-side, nunca confiar no client):

- Negócio existe e está ativo.
- Data não é no passado.
- **Recalcular disponibilidade no servidor** (mesma engine de `get-available-times`) e confirmar que realmente não há horário livre pra combinação pedida — não aceitar entrada na fila se na verdade sobrou vaga.
- Cliente ainda não tem entrada `WAITING` pro mesmo `businessId` + `date` (constraint única cobre isso, mas validar antes pra devolver erro de negócio claro, não erro de banco).
- Criar `WaitlistEntry` + `WaitlistEvent(JOINED)`.

### 5.2. `DELETE /client/waitlist/:id`

Use-case `leave-waitlist.use-case.ts`. Só o dono da entrada pode sair. Marca `CANCELED` + `WaitlistEvent(LEFT)`. Se havia `WaitlistOffer` `PENDING` associada, marca `SUPERSEDED` e dispara avanço imediato pro próximo (não espera expirar).

### 5.3. `GET /client/waitlist/mine?business_slug=...`

Retorna a(s) entrada(s) ativa(s) do cliente logado, com:

- posição calculada dinamicamente: `count(entradas WAITING do mesmo business+date+filtro compatível criadas antes desta) + 1` — **não persistir posição**, ela muda conforme gente entra/sai/converte.
- se houver `WaitlistOffer` `PENDING` pra essa entrada: os dados da oferta (horário, prazo restante).

### 5.4. Critérios de aceite

- Cliente sem vaga disponível consegue entrar na fila; cliente com vaga disponível recebe erro de negócio claro ao tentar (não entra "à toa").
- Segunda tentativa de entrar na fila do mesmo negócio no mesmo dia é bloqueada com mensagem clara, mesmo mudando profissional/serviço no payload.
- Cliente consegue sair da fila a qualquer momento e isso libera a vez imediatamente se ele tinha oferta pendente.
- Posição retornada bate com a contagem real de gente na frente, testado com pelo menos 3 entradas concorrentes.
- Nenhum dos dois use-cases (`join`, `leave`) tem lógica de disponibilidade duplicada escrita do zero — reaproveita o cálculo já existente.

## 6. Fase 3 — Backend: motor de oferta sequencial

### 6.1. Gatilho: vaga abriu

Nos dois use-cases de cancelamento existentes (`professional/appointments/use-cases/cancel-appointment.use-case.ts` e `client/customer-appointments/use-cases/cancel-appointment.use-case.ts`), após confirmar o cancelamento, publicar um evento/job `WaitlistSlotFreed` (via RabbitMQ, mesmo transporte já usado entre `api-gateway` e os demais serviços) com `businessId`, `professionalProfileId`, `serviceId` do agendamento cancelado, `slot_start_at_utc`, `slot_end_at_utc`.

Isso **não deve travar a resposta do cancelamento** — publica o evento e responde; quem processa é o `scheduler`/`messaging`.

### 6.2. Consumidor: gerar a próxima oferta

Novo use-case, ex. `apps/scheduler/src/application/waitlist/use-cases/offer-next-waitlist-entry.use-case.ts`.

Ao processar `WaitlistSlotFreed`:

1. Tomar lock Redis por `businessId + professionalProfileId + date` (reusar `RedisLockService`) — evita duas vagas do mesmo dia processando a fila ao mesmo tempo e ofertando pra gente errada.
2. Buscar `WaitlistEntry` com `status = WAITING`, do negócio/data, compatível (`professionalProfileId` igual ou `null`, `serviceId` igual ou `null`, e se `serviceId` preenchido, duração do serviço cabe no slot liberado), **excluindo quem já tem outra `WaitlistOffer` `PENDING` em aberto agora** (não ofertar duas vagas pra mesma pessoa ao mesmo tempo).
3. Ordenar por `created_at asc` (ordem de entrada = ordem da fila).
4. Se não achar ninguém elegível → não faz nada, vaga fica livre pro fluxo normal de agendamento.
5. Se achar → criar `WaitlistOffer` (`PENDING`, `expires_at_utc = now + offer_ttl_minutes` do `Business`) + `WaitlistEvent(OFFER_SENT)` + disparar notificação (Fase 4).

### 6.3. Bloquear o slot durante a oferta

Enquanto existe `WaitlistOffer` `PENDING` pra um `slot_start_at_utc`/`slot_end_at_utc`, esse horário **não pode** ser oferecido a outro cliente pelo fluxo normal de agendamento nem por outra oferta de fila. Os use-cases de disponibilidade (`get-available-times*`) e de criação de agendamento (`create-appointment*`, nos dois módulos) precisam considerar `WaitlistOffer` `PENDING` não expirada como conflito, do mesmo jeito que já tratam `Appointment` e `ProfessionalTimesBlock`.

Se o cálculo de disponibilidade for unificado num provider compartilhado antes desta feature (não é pré-requisito, mas se acontecer, mais fácil), aplicar o hold lá. Se não, aplicar nos pontos hoje existentes — não deixar nenhum dos dois desatualizado.

### 6.4. Aceitar/recusar oferta

`POST /client/waitlist/offers/:id/accept` — use-case `accept-waitlist-offer.use-case.ts`:

- Em transação: validar que a oferta é do cliente logado, está `PENDING` e não expirou (revalidar `expires_at_utc` no servidor, não confiar em countdown do app).
- Rodar a criação de agendamento reaproveitando o use-case/validações de `create-appointment` já existentes (profissional ativo, serviço, bloqueios).
- Marcar `WaitlistOffer.CONVERTED`, `WaitlistEntry.CONVERTED` (+ `converted_appointment_id`), `WaitlistEvent(CONVERTED)`.

`POST /client/waitlist/offers/:id/decline` — use-case `decline-waitlist-offer.use-case.ts`:

- Marca `WaitlistOffer.DECLINED` + `WaitlistEvent(OFFER_DECLINED)`.
- Publica `WaitlistSlotFreed` de novo pro mesmo slot, pra chamar o próximo da fila imediatamente (não espera o timeout).

### 6.5. Job de expiração e avanço

Novo use-case no `scheduler`, ex. `apps/scheduler/src/application/waitlist/use-cases/expire-waitlist-offers.use-case.ts`, rodando com cron curto (sugestão: a cada 1 minuto — janela de oferta é curta, não dá pra usar a mesma cadência de 30 min do gerador de recorrência) protegido por `RedisLockService`:

1. Buscar `WaitlistOffer` `PENDING` com `expires_at_utc <= now`.
2. Marcar `EXPIRED` + `WaitlistEvent(OFFER_EXPIRED)`.
3. Publicar `WaitlistSlotFreed` de novo pro mesmo slot → aciona 6.2 e chama o próximo da fila.
4. `WaitlistEntry` correspondente **permanece `WAITING`** (ver seção 3 — perder o prazo não tira da fila).

### 6.6. Fim de dia

Job diário (ou reaproveitar cron existente de virada de dia, se houver) marca `WaitlistEntry` `WAITING` cuja `date` já passou como `EXPIRED_DAY_PASSED` + `WaitlistEvent(REMOVED_DAY_PASSED)`. Evita fila "fantasma" acumulando pra sempre.

### 6.7. Critérios de aceite

- Cancelar um agendamento num dia com fila dispara oferta pro 1º da fila em até poucos segundos (assíncrono, mas não minutos).
- Duas vagas abrindo quase ao mesmo tempo no mesmo dia/profissional não ofertam a mesma pessoa duas vezes nem pulam ninguém — validado com teste de concorrência (duas chamadas de cancelamento simultâneas).
- Oferta expira sozinha após `offer_ttl_minutes` e o próximo da fila é notificado automaticamente, sem intervenção manual.
- Quem perde o prazo continua aparecendo na fila (`GET /client/waitlist/mine`) na mesma posição relativa, pronto pra próxima vaga.
- Tentar aceitar uma oferta expirada, de outro cliente, ou já convertida retorna erro claro, nunca cria agendamento duplicado.
- Slot com oferta `PENDING` não aparece disponível pra outro cliente nem é aceito por outro fluxo de agendamento simultâneo (teste de corrida: aceitar oferta e criar agendamento normal no mesmo slot ao mesmo tempo — só um pode vencer).

## 7. Fase 4 — Backend: notificações

### 7.1. Novos tipos de notificação

Adicionar ao padrão existente (`SendWhatsAppTypeEnum` e equivalente de push/in-app):

- `WAITLIST_JOINED_CONFIRMATION` — confirma que entrou na fila (in-app, opcionalmente push).
- `WAITLIST_SLOT_OFFERED` — "abriu uma vaga, você tem N minutos" (push + in-app + WhatsApp, os três — é o evento que mais importa acertar).
- `WAITLIST_OFFER_EXPIRED` — opcional nesta versão; avisa que o prazo passou e ele segue na fila (in-app).

Reaproveitar `InAppNotification`, o transporte de push já usado pelos outros fluxos (mesmo hook `usePushNotification` nos dois apps) e o canal WhatsApp já configurado (`WHATSAPP_API_*`).

### 7.2. Deep link da notificação

A notificação de `WAITLIST_SLOT_OFFERED` precisa abrir direto a tela de oferta no `client-app` (ver Fase 5.3), não só cair na home — usar o mesmo mecanismo de deep link já usado pelas notificações de agendamento existentes.

### 7.3. Critérios de aceite

- Notificação de oferta chega nos 3 canais habilitados do negócio, com o horário exato e o prazo.
- Tocar na notificação (push) abre o app direto na tela de aceitar/recusar a oferta, sem passo intermediário.
- Nenhum dado de outro cliente vaza na notificação (mensagem não expõe fila inteira, só a posição/situação do próprio cliente).

## 8. Fase 5 — `client-app`: interface do cliente

Reaproveitar exclusivamente os componentes de `src/shared/ui/` já existentes — não criar componente novo pra algo que já existe:

- `Chip` — badge de posição na fila ("Você é o 3º da fila").
- `EmptyStates` — estado "nenhuma vaga, mas dia lotado" antes de mostrar o CTA de entrar na fila.
- `BottomSheet` (`@gorhom/bottom-sheet`, já é dependência) — confirmação de entrar na fila e tela de aceitar/recusar oferta com contador regressivo.
- `ConfirmModal` — confirmação de "sair da fila".
- `ToastMessage` — feedback de sucesso/erro nas ações.
- Hook de push já existente (`src/hooks/notifications/push/usePushNotification.tsx`) e o hook de notificação in-app já existente (`src/features/in-app-notifications/useInAppNotifications.tsx`) — a oferta de vaga é só mais um tipo dentro do que já existe, não um sistema paralelo.

### 8.1. Entrar na fila

No fluxo de agendamento (`(tabs)/home/[business_slug]/...`), quando a busca de horários disponíveis voltar vazia pro dia escolhido: mostrar `EmptyStates` com CTA "Entrar na lista de espera" em vez do calendário de horários vazio. Ao confirmar (via `BottomSheet`), chamar `POST /client/waitlist` e mostrar confirmação com `ToastMessage`.

### 8.2. Ver status da fila

Na aba de agendamentos (`(tabs)/appointments.tsx`) ou em seção própria: se o cliente tem entrada `WAITING`, mostrar card com negócio, data, `Chip` de posição. Sem posição fixa/estática — sempre a posição atual vinda da API.

### 8.3. Receber e responder oferta

Nova rota modal, seguindo o padrão de `(modals)/confirm-new-appointment.tsx`: ex. `(modals)/waitlist-offer.tsx`. Mostra horário ofertado, contador regressivo (calculado a partir de `expires_at_utc` do servidor, não um timer local desalinhado), botões aceitar/recusar. Aceitar reaproveita a mesma UI de confirmação de agendamento já existente sempre que possível (não duplicar tela de "agendamento confirmado" — reusar `(modals)/success.tsx`).

### 8.4. Regras rígidas específicas do `client-app`

- **Zero componente novo genérico.** Todo elemento visual reaproveita `src/shared/ui/`; se faltar algo, estender o componente existente, não criar um `WaitlistCard` do zero com estilo próprio.
- Cores, espaçamento e tipografia vêm de `src/shared/theme/` (`colors.ts`, `sizes.ts`) — nunca valor mágico solto.
- Sem i18n neste projeto — texto direto em PT-BR, no tom definido no `AGENTS.md` (simples, sem fricção, sem jargão técnico pro cliente final: "Você é o 3º na fila" e não "Posição da fila: 3").
- Contador regressivo sempre calculado a partir do timestamp do servidor — nunca confiar em relógio do device pra decidir se a oferta ainda vale (a validação real é sempre no backend, o timer no app é só feedback visual).
- Antes de implementar qualquer tela desta fase, carregar as skills `design-taste-frontend` e `redesign-existing-projects` (regra já fixada no `CLAUDE.md` do projeto) — nada de layout genérico, cartão com sombra padrão de biblioteca, ou ícone fora do set já usado (`@expo/vector-icons`) no resto do app.

### 8.5. Critérios de aceite

- Dia lotado mostra CTA de fila; dia com vaga não mostra o CTA em nenhuma hipótese.
- Card de status da fila reflete posição real, sem delay perceptível após alguém sair/entrar (validado com refresh/pull-to-refresh ou revalidação do TanStack Query).
- Notificação de oferta abre a tela de resposta com o horário e o prazo corretos, mesmo com o app fechado.
- Aceitar cria o agendamento e leva pra tela de sucesso já existente; recusar libera a vez visivelmente (status muda pra "aguardando" de novo).
- Nenhuma tela nova quebra o padrão visual — revisão comparando lado a lado com uma tela existente (ex. `(modals)/confirm-new-appointment.tsx`) não deve dar pra apontar "essa aqui parece de outro app".

## 9. Fase 6 — `app` (profissional): adiada, não implementar ainda

Ainda não decidido se/como o profissional interage com a fila. Não entra na ordem de implementação desta versão. Hipóteses levantadas pra decidir depois (nenhuma aprovada):

- Badge/contador de "N na fila de espera" na agenda do dia lotado (somente leitura).
- Endpoint `GET /professional/waitlist?date=...` já dá pra existir no backend sem UI nenhuma — leitura não tem custo de decisão de produto, só não construir tela em cima disso agora.
- Ação do profissional de remover alguém da fila manualmente — **não** implementar sem decisão explícita (mexe com expectativa do cliente).

Quando a decisão vier, esta seção vira uma Fase normal com objetivo/tarefas/critérios de aceite — não expandir escopo aqui até lá.

## 10. Regras rígidas por projeto (resumo — a fonte é o `CLAUDE.md` de cada repo)

**Backend**

- Controller fino, regra de negócio em use-case, DTO + `class-validator` em toda entrada nova.
- Nunca importar de `modules/professional` dentro de `modules/client` nem o contrário — o que é comum sobe pra `libs/shared`.
- Toda concorrência usa `RedisLockService` já existente — não implementar lock/mutex do zero.
- Nenhuma migration roda contra produção sem confirmação explícita do usuário.
- Nenhum log inclui PII do cliente (nome, telefone) nem payload bruto de webhook.

**client-app**

- Reaproveitar `src/shared/ui/`, `src/shared/theme/`, `src/shared/services/` — não recriar padrão que já existe.
- `zod` v4, `FlashList` pra listas, sem i18n (texto direto em PT-BR).
- Nenhum build/submit (`eas build`, `eas submit`, `yarn deploy-prod`) roda sem confirmação explícita.

**app (profissional)**

- Fora de escopo nesta versão — se/quando entrar, segue `NativeWind v2`, i18n obrigatório em `src/i18n/`, reaproveita `src/components/` existente.

## 11. Plano de testes

**Backend**

- Entrar na fila com vaga disponível → rejeitado.
- Entrar na fila duas vezes no mesmo dia (mesmo com profissional/serviço diferente no payload) → rejeitado.
- Cancelamento sem ninguém na fila → nenhum efeito colateral, fluxo atual intacto.
- Cancelamento com 1 pessoa na fila → oferta criada e notificada.
- Cancelamento com N pessoas na fila, 1ª não responde → expira e chama a 2ª, na ordem certa.
- Recusa explícita → chama o próximo imediatamente, sem esperar timeout.
- Aceitar oferta expirada → rejeitado, sem criar agendamento.
- Duas ofertas concorrentes pro mesmo slot (corrida) → só uma vira agendamento.
- Duas vagas abrindo ao mesmo tempo no mesmo dia → cada uma oferta pra alguém diferente, ninguém recebe duas ofertas simultâneas.
- Fim do dia sem conversão → entrada expira sozinha (`EXPIRED_DAY_PASSED`).
- Sair da fila com oferta pendente → libera a vez na hora.

**client-app**

- CTA de fila aparece só quando não há horário algum pro dia/profissional/serviço escolhido.
- Posição exibida bate com a posição real após entrar/sair de outros clientes (mock de múltiplas entradas).
- Notificação com app fechado → abre direto na tela de oferta.
- Contador regressivo não deixa aceitar depois de "zerar" (revalida com o backend, não só trava o botão local).

## 12. Riscos e cuidados

- Fila longa numa data com timeout de 10 min pode levar bastante tempo até esgotar todo mundo — aceitável pra v1, mas documentar como trade-off consciente da escolha "sequencial" (vs. broadcast, que foi descartado).
- Cliente pode ignorar todas as notificações e nunca convergir — normal, mas monitorar taxa de conversão da fila pra saber se o prazo de 10 min está bom ou precisa mudar.
- Bug clássico a evitar: dois processos ofertando a mesma vaga pra duas pessoas ao mesmo tempo — é o motivo de usar lock por `business+professional+date`, não pular essa parte achando "dificilmente vai colidir".
- Não confundir cancelamento que libera vaga de verdade com reagendamento que só move o mesmo cliente pro mesmo dia (não deve gerar oferta se o slot antigo e o novo são compensados dentro do mesmo cancelamento/criação).
- Se o provider de disponibilidade for refatorado por outra iniciativa (ex. o plano de planos/recorrência já documentado em `PLANO_ACAO_PLANOS_CLIENTE_RECORRENCIA.md`), revisar se o hold de `WaitlistOffer` continua sendo respeitado no novo provider.

## 13. Decisões assumidas para v1

- Estratégia de oferta: sequencial com timeout de 10 minutos por padrão (configurável por negócio), não broadcast.
- Quem perde o prazo continua na fila (não é removido), só perde aquela vaga específica.
- Fila é por `businessId + personId + date`, único por dia — não por profissional/serviço (o profissional/serviço vira filtro de compatibilidade da entrada, não chave de unicidade).
- `app` (profissional) fica de fora desta versão — nenhuma tela nova nele até decisão explícita.
- Sem cobrança/prioridade paga na fila — é estritamente ordem de chegada.
- Sem limite de tamanho de fila por dia nesta versão.

## 14. Ordem recomendada de implementação

1. Migrations Prisma (`WaitlistEntry`, `WaitlistOffer`, `WaitlistEvent`, enums, settings no `Business`).
2. Gerar Prisma Client.
3. `join-waitlist` e `leave-waitlist` (Fase 2) + testes.
4. Ajustar `get-available-times*` e `create-appointment*` pra considerar `WaitlistOffer` `PENDING` como conflito (Fase 3.3) antes de ligar o motor — senão a oferta pode colidir com agendamento normal desde o primeiro dia.
5. Evento `WaitlistSlotFreed` disparado no cancelamento (Fase 3.1).
6. `offer-next-waitlist-entry` no scheduler + lock Redis (Fase 3.2).
7. `accept`/`decline` de oferta (Fase 3.4).
8. `expire-waitlist-offers` no scheduler (Fase 3.5) + job de fim de dia (Fase 3.6).
9. Notificações nos 3 canais (Fase 4).
10. Telas do `client-app` (Fase 5).
11. Testes de concorrência ponta a ponta (duas vagas simultâneas, corrida aceitar vs. agendar normal).
12. Homologação com cenário real: profissional cancela um horário de um dia lotado com fila de teste, validar notificação, aceite, expiração e avanço.

## 15. Status da implementacao (2026-09-29) e desvios do plano

Implementado e validado ponta a ponta contra `marquei-dev` (script `scripts/e2e-dev-plans-waitlist.ts`, 21/21 passos) mais testes Jest. **Nada foi aplicado em producao.**

Feito:

- Migrations `20260929130000_waitlist` e `20260929140000_waitlist_combo` (aditivas): `WaitlistEntry`, `WaitlistOffer`, `WaitlistEvent`, enums, `Business.is_waitlist_enabled` e `Business.waitlist_offer_ttl_minutes`.
- `status: CLOSED | FULL | AVAILABLE` nas respostas de `get-available-times*` (cliente e profissional). CTA da fila so com `FULL`. Dia passado ou dia que ja encerrou nunca vira `FULL`.
- Hold do horario ofertado (`WaitlistHoldService`) descontado da disponibilidade e checado em criar/remarcar (cliente e profissional) e na serie recorrente.
- Endpoints `client/waitlist`: `POST /`, `DELETE /:id`, `GET /mine`, `GET /offers/:id`, `POST /offers/:id/accept`, `POST /offers/:id/decline`.
- Motor no scheduler: consumer `scheduler.waitlist.slot_freed_queue` (com DLQ `.dlq`, idempotencia por `message_id`, teto de tentativas), oferta sequencial com lock Redis por negocio+profissional+dia, cron de 1 min para expirar ofertas e virar entradas de dias passados.
- `RedisLockService` movido para `libs/shared` (o caminho antigo re-exporta).
- `client-app`: CTA/status da fila na etapa de horario, card da fila na aba Agendamentos, modal `waitlist-offer` com contador baseado na hora do servidor, deep link do push.

Desvios e limites conhecidos (decisoes a confirmar):

1. **Sem notificacao in-app para o cliente.** `InAppNotification.professionalProfileId` e obrigatorio e nao existe feed in-app de cliente; a oferta chega por **push + WhatsApp** e tambem aparece em `GET /mine` (card na aba Agendamentos). Feed in-app do cliente exige mudanca de schema propria.
2. **Remarcacao nao libera vaga para a fila** (so o cancelamento publica `WaitlistSlotFreed`). Mover o horario de alguem deixa o horario antigo livre, mas hoje nao dispara oferta.
3. **Fila exige `professional_id`** no join (o fluxo de agendamento sempre escolhe profissional). O schema e o motor ja aceitam "qualquer profissional".
4. **Combo suportado** (`serviceComboId` na entrada e na oferta), o plano original so falava em servico.
5. `is_waitlist_enabled` e `waitlist_offer_ttl_minutes` existem no banco, mas ainda nao ha tela/endpoint para o profissional alterar (default: ligado, 10 min).
6. `GET /professional/waitlist` e telas do `app` seguem adiados (secao 9).
7. Janela curta entre o claim do aceite e a criacao do agendamento: se um agendamento normal ocupar o horario nesse intervalo, o aceite falha com erro claro e a oferta volta para `PENDING` (o cron expira e passa a vez).
