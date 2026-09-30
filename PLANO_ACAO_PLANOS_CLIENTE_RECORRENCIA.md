# Plano de Acao: Planos de Cliente e Agendamento Recorrente

## 1. Objetivo

Implementar no Marquei uma funcionalidade completa de planos de servico para clientes, permitindo casos como:

- Cliente paga R$120,00 por mes.
- Cliente tem direito a 4 cortes no ciclo.
- Cliente pode deixar horarios recorrentes reservados automaticamente.
- Financeiro do profissional registra a venda do plano, e nao cada corte pelo preco avulso de R$35,00.

Esta funcionalidade deve ser separada da assinatura do Marquei Pro, que hoje existe em `BusinessSubscription` e representa o plano pago pelo profissional para usar a plataforma.

## 2. Contexto Atual

O backend ja possui dois dominios claros:

- `apps/api-gateway/src/modules/professional`: modulo usado pelo app profissional (`app`).
- `apps/api-gateway/src/modules/client`: modulo usado pelo app de clientes (`client-app`).

O fluxo atual de agendamento funciona assim:

- Cliente cria agendamento em `client/customer-appointments/create-appointment`.
- Profissional cria agendamento em `professional/appointments/create-appointment`.
- Ambos validam profissional, servico ou combo, disponibilidade, bloqueios e conflitos.
- O scheduler fecha agendamentos vencidos em `apps/scheduler/src/application/appointments/use-cases/close-due-appointments.use-case.ts`.
- Ao fechar um agendamento, o scheduler cria uma `ProfessionalStatement` com o valor do servico ou combo.

Problema atual:

- O cliente que ja pagou um plano continua agendando como se fosse avulso.
- O financeiro registra cada atendimento com o preco cheio do servico.
- O cliente precisa lembrar manualmente de agendar toda semana.
- Nao existe controle de creditos, ciclo, limite semanal ou recorrencia.

## 3. Benchmark

Referencias analisadas:

- Fresha: memberships podem ser compradas a vista ou de forma recorrente, com controle de status e deducao de sessoes em agendamentos.
  - https://www.fresha.com/help-center/knowledge-base/packages-memberships-and-gift-cards/71-create-memberships
  - https://www.fresha.com/help-center/knowledge-base/packages-memberships-and-gift-cards/80-manage-active-memberships
- Acuity Scheduling: permite agendamentos recorrentes, escolha de frequencia e limite de ocorrencias. Tambem trabalha com pacotes, codigos e assinaturas com creditos.
  - https://help.acuityscheduling.com/hc/en-us/articles/16676870087565-Offering-recurring-appointments-in-Acuity-Scheduling
  - https://help.acuityscheduling.com/hc/en-us/articles/28615820183309-Creating-subscriptions
- Square Appointments: pacotes sao series pre-pagas de servicos, usadas para abater o valor de atendimentos.
  - https://squareup.com/help/us/en/article/8268-create-and-manage-packages-with-square-appointments
- Vagaro: trabalha com memberships, packages e repeating appointments, incluindo edicao/cancelamento de uma ocorrencia ou da serie.
  - https://support.vagaro.com/hc/en-us/articles/360010798053-Schedule-Repeating-Appointments
  - https://support.vagaro.com/hc/en-us/articles/360000157854-Create-a-Membership

Diretrizes extraidas do benchmark:

- Separar template do plano da assinatura vendida ao cliente.
- Deduzir creditos no atendimento coberto por plano.
- Permitir recorrencia como serie, mas persistir ocorrencias reais na agenda.
- Exibir conflitos antes de confirmar uma serie.
- Permitir cancelar uma ocorrencia ou a serie inteira.
- Registrar receita do plano separada dos atendimentos avulsos.

## 4. Fase 1: Banco de Dados e Dominio

### 4.1. Criar novos enums Prisma

Adicionar enums ao `prisma/schema.prisma`:

- `CustomerServicePlanStatus`
  - `ACTIVE`
  - `INACTIVE`
  - `ARCHIVED`
- `CustomerServicePlanCycleType`
  - `CALENDAR_MONTH`
  - `ROLLING_FROM_START`
- `CustomerPlanSubscriptionStatus`
  - `ACTIVE`
  - `PAUSED`
  - `CANCELED`
  - `EXPIRED`
- `AppointmentPlanRedemptionStatus`
  - `RESERVED`
  - `CONSUMED`
  - `REFUNDED`
- `RecurringAppointmentSeriesStatus`
  - `ACTIVE`
  - `PAUSED`
  - `CANCELED`
  - `COMPLETED`
- `RecurringAppointmentFrequency`
  - `WEEKLY`
  - `BIWEEKLY`
  - `MONTHLY`
- `RecurringAppointmentOccurrenceStatus`
  - `CREATED`
  - `SKIPPED_CONFLICT`
  - `SKIPPED_NO_CREDIT`
  - `SKIPPED_OUT_OF_CYCLE`
  - `CANCELED`

### 4.2. Criar modelo `CustomerServicePlan`

Representa o template do plano criado pelo negocio.

Campos principais:

- `id`
- `businessId`
- `name`
- `description`
- `price_in_cents`
- `cycle_type`
- `cycle_interval_months`
- `credits_per_cycle`
- `max_uses_per_week`
- `allow_multiple_uses_same_week`
- `min_days_between_uses`
- `max_future_bookings`
- `booking_window_days`
- `allow_client_recurring_booking`
- `allow_client_single_booking`
- `status`
- `created_by_user_id`
- `updated_by_user_id`
- timestamps

Defaults recomendados:

- `cycle_type`: `ROLLING_FROM_START`
- `cycle_interval_months`: `1`
- `credits_per_cycle`: obrigatorio
- `max_uses_per_week`: `1`
- `allow_multiple_uses_same_week`: `false`
- `min_days_between_uses`: `0`
- `max_future_bookings`: igual a `credits_per_cycle`
- `booking_window_days`: `31`
- `allow_client_recurring_booking`: `true`
- `allow_client_single_booking`: `true`
- `status`: `ACTIVE`

### 4.3. Criar vinculos de servicos/combos incluidos

Criar tabelas:

- `CustomerServicePlanService`
  - `planId`
  - `serviceId`
  - unique `[planId, serviceId]`
- `CustomerServicePlanCombo`
  - `planId`
  - `serviceComboId`
  - unique `[planId, serviceComboId]`

Um plano deve incluir ao menos um servico ou um combo.

### 4.4. Criar modelo `CustomerPlanSubscription`

Representa o plano vendido ou atribuido a um cliente.

Campos principais:

- `id`
- `businessId`
- `businessCustomerId`
- `personId`
- `planId`
- `status`
- `started_at`
- `current_cycle_start`
- `current_cycle_end`
- `price_in_cents_snapshot`
- `credits_per_cycle_snapshot`
- `rules_snapshot`
- `sold_by_user_id`
- `revenue_professional_profile_id`
- timestamps

Observacao:

- `revenue_professional_profile_id` e necessario porque `ProfessionalStatement` hoje exige `professionalProfileId`.
- No v1, o profissional escolhe quem recebe a receita do plano no momento da venda/renovacao.

### 4.5. Criar modelo `CustomerServicePlanCycle`

Representa cada ciclo de creditos da assinatura.

Campos principais:

- `id`
- `subscriptionId`
- `cycle_start`
- `cycle_end`
- `credits_granted`
- `credits_reserved`
- `credits_consumed`
- `credits_refunded`
- timestamps

Regras:

- Creditos disponiveis = `credits_granted - credits_reserved - credits_consumed + credits_refunded`, ajustando para evitar dupla contagem.
- Reservas devem ser feitas em transacao para evitar consumo duplicado.

### 4.6. Criar modelo `AppointmentPlanRedemption`

Vincula um agendamento ao plano usado.

Campos principais:

- `id`
- `appointmentId`
- `subscriptionId`
- `cycleId`
- `status`
- `reserved_at`
- `consumed_at`
- `refunded_at`
- `metadata`

Indices:

- unique em `appointmentId`, para evitar mais de um plano por agendamento.
- index em `subscriptionId`
- index em `cycleId`
- index em `status`

### 4.7. Criar modelos de recorrencia

`RecurringAppointmentSeries`:

- `id`
- `businessId`
- `businessCustomerId`
- `personId`
- `professionalProfileId`
- `serviceId`
- `serviceComboId`
- `planSubscriptionId`
- `status`
- `frequency`
- `weekday`
- `day_of_month`
- `time`
- `timezone`
- `starts_at`
- `ends_at`
- `max_occurrences`
- `created_by_user_id`
- `created_by_user_type`
- timestamps

`RecurringAppointmentOccurrence`:

- `id`
- `seriesId`
- `appointmentId`
- `scheduled_start_at_utc`
- `status`
- `reason`
- timestamps

## 5. Fase 2: Backend NestJS

### 5.1. Criar modulo compartilhado de disponibilidade

Extrair a regra comum de disponibilidade para um provider reutilizavel, por exemplo:

`apps/api-gateway/src/shared/appointments/appointment-availability.service.ts`

Responsabilidades:

- Validar negocio.
- Validar profissional ativo.
- Validar servico ou combo.
- Validar se profissional executa servico/combo.
- Calcular duracao.
- Validar horario de funcionamento.
- Validar conflitos com `Appointment`.
- Validar conflitos com `ProfessionalTimesBlock`.
- Retornar slots disponiveis e/ou validar um slot exato.

Substituir gradualmente duplicacoes em:

- `client/business/use-cases/get-available-times-for-service-and-professional.use-case.ts`
- `professional/appointments/use-cases/get-available-times.use-case.ts`
- `client/customer-appointments/use-cases/create-appointment.use-case.ts`
- `professional/appointments/use-cases/create-appointment.use-case.ts`

### 5.2. Criar modulo profissional de planos

Novo modulo:

`apps/api-gateway/src/modules/professional/customer-service-plans`

Endpoints:

- `POST /professional/customer-service-plans`
- `GET /professional/customer-service-plans`
- `GET /professional/customer-service-plans/:id`
- `PATCH /professional/customer-service-plans/:id`
- `POST /professional/customer-service-plans/:id/archive`

Validacoes:

- Usuario precisa ter `current_selected_business_id`.
- Plano pertence ao negocio selecionado.
- Servicos/combos incluidos pertencem ao negocio.
- `credits_per_cycle` deve ser maior que zero.
- `max_future_bookings` nao pode ser maior que `credits_per_cycle`, a menos que seja explicitamente permitido no futuro.

### 5.3. Criar modulo profissional de assinaturas de plano do cliente

Novo modulo:

`apps/api-gateway/src/modules/professional/customer-plan-subscriptions`

Endpoints:

- `POST /professional/customer-plan-subscriptions`
- `GET /professional/customer-plan-subscriptions`
- `GET /professional/customer-plan-subscriptions/:id`
- `POST /professional/customer-plan-subscriptions/:id/renew`
- `POST /professional/customer-plan-subscriptions/:id/pause`
- `POST /professional/customer-plan-subscriptions/:id/resume`
- `POST /professional/customer-plan-subscriptions/:id/cancel`
- `POST /professional/customer-plan-subscriptions/:id/restore-credit`

Criacao/venda:

- Validar cliente do negocio.
- Validar plano ativo.
- Criar `CustomerPlanSubscription`.
- Criar primeiro `CustomerServicePlanCycle`.
- Criar `ProfessionalStatement` do tipo `INCOME` com valor do plano.
- A descricao deve indicar que a receita veio de plano, por exemplo: `Plano mensal Corte - Cliente João`.

Renovacao:

- Criar novo ciclo.
- Registrar nova receita no financeiro.
- Manter historico dos ciclos anteriores.

Pausa:

- Impede criacao de novas reservas.
- Nao deve cancelar automaticamente agendamentos ja criados no v1.

Cancelamento:

- Impede novas reservas.
- Series recorrentes vinculadas devem ser pausadas ou canceladas conforme payload.

### 5.4. Criar APIs de planos no modulo cliente

Novo modulo:

`apps/api-gateway/src/modules/client/customer-plans`

Endpoints:

- `GET /client/customer-plans?business_slug=...`
- `GET /client/customer-plans/:id`

Retorno deve incluir:

- plano ativo;
- servicos/combos incluidos;
- ciclo atual;
- creditos concedidos;
- creditos usados;
- creditos reservados;
- creditos disponiveis;
- vencimento;
- flags de recorrencia;
- limites de agendamento futuro.

### 5.5. Integrar plano na criacao de agendamento

Alterar DTOs:

- `CreateCustomerAppointmentDto`
- `CreateAppointmentDto`

Adicionar campo opcional:

- `plan_subscription_id?: string`

Fluxo quando `plan_subscription_id` vier preenchido:

- Validar que o plano pertence ao mesmo negocio.
- Validar que o cliente e o titular do plano.
- Validar que o servico/combo esta incluido no plano.
- Validar status `ACTIVE`.
- Validar ciclo atual.
- Validar limite por ciclo.
- Validar limite semanal.
- Validar regra de multiplos usos na mesma semana.
- Validar `min_days_between_uses`.
- Reservar credito em transacao.
- Criar `AppointmentPlanRedemption` com status `RESERVED`.

Fluxo quando `plan_subscription_id` nao vier:

- Manter comportamento atual de agendamento avulso.

### 5.6. Criar preview de recorrencia

Endpoints:

- `POST /professional/recurring-appointment-series/preview`
- `POST /client/recurring-appointment-series/preview`

Entrada:

- cliente;
- profissional;
- servico ou combo;
- plano opcional;
- data inicial;
- horario;
- frequencia;
- quantidade ou data final.

Saida:

- lista de ocorrencias;
- status por ocorrencia: disponivel, conflito, sem credito, fora do ciclo;
- total que sera criado;
- creditos necessarios;
- creditos disponiveis;
- mensagens de bloqueio.

Regra:

- Preview nao persiste nada.
- Deve usar o mesmo provider de disponibilidade.

### 5.7. Criar serie recorrente

Endpoints:

- `POST /professional/recurring-appointment-series`
- `PATCH /professional/recurring-appointment-series/:id`
- `POST /professional/recurring-appointment-series/:id/cancel`
- `POST /client/recurring-appointment-series`

No v1:

- Cliente pode criar serie somente se `allow_client_recurring_booking` estiver ativo.
- Cliente pode cancelar/reagendar ocorrencia individual.
- Profissional pode cancelar ocorrencia ou serie inteira.
- Profissional pode criar serie para qualquer cliente ativo do negocio.

Ao criar serie:

- Rodar preview novamente dentro da transacao/logica final.
- Criar `RecurringAppointmentSeries`.
- Criar agendamentos reais para as ocorrencias permitidas ate o limite configurado.
- Criar `RecurringAppointmentOccurrence` para criadas e puladas.
- Criar `AppointmentPlanRedemption` para cada agendamento coberto por plano.

## 6. Fase 3: Scheduler e Financeiro

### 6.1. Ajustar fechamento automatico de agendamentos

Arquivo atual:

`apps/scheduler/src/application/appointments/use-cases/close-due-appointments.use-case.ts`

Nova regra:

- Se o agendamento nao tiver `AppointmentPlanRedemption`, manter comportamento atual.
- Se tiver redemption `RESERVED`:
  - marcar appointment como `COMPLETED`;
  - marcar redemption como `CONSUMED`;
  - atualizar contadores do ciclo;
  - nao criar `ProfessionalStatement` do valor avulso do servico/combo.

Isso resolve o erro financeiro do exemplo:

- Venda do plano: entra R$120,00 uma vez.
- Cada corte do plano: consome credito, mas nao adiciona R$35,00 no financeiro.

### 6.2. Criar gerador de proximas ocorrencias

Novo use case no scheduler:

`GenerateRecurringAppointmentsUseCase`

Responsabilidades:

- Rodar periodicamente com Redis lock.
- Buscar series `ACTIVE`.
- Garantir que existam ocorrencias reais ate o horizonte configurado.
- Criar novas ocorrencias quando virar ciclo novo ou quando ainda houver janela futura.
- Registrar conflitos como `SKIPPED_CONFLICT`.
- Registrar falta de credito como `SKIPPED_NO_CREDIT`.

Default:

- Rodar a cada 30 minutos em producao.
- Criar ocorrencias ate `booking_window_days` e `max_future_bookings`.

### 6.3. Notificacoes

Reutilizar filas existentes de push/WhatsApp/email.

Eventos recomendados:

- plano vendido;
- plano renovado;
- credito acabando;
- serie criada;
- ocorrencia recorrente criada;
- ocorrencia recorrente pulada por conflito;
- plano pausado/cancelado.

No v1, priorizar:

- serie criada;
- ocorrencia pulada por conflito;
- credito insuficiente para proximas recorrencias.

## 7. Fase 4: App Profissional (`app`)

### 7.1. Catalogo de planos

Adicionar entrada em catalogo/perfil proximo a servicos e combos:

- Listar planos.
- Criar plano.
- Editar plano.
- Arquivar plano.

Formulario de plano:

- nome;
- descricao;
- preco;
- servicos/combos incluidos;
- creditos por ciclo;
- tipo de ciclo;
- limite semanal;
- permitir mais de um uso na mesma semana;
- dias minimos entre usos;
- limite de agendamentos futuros;
- janela de agendamento;
- permitir cliente agendar sozinho;
- permitir cliente criar recorrencia.

### 7.2. Detalhes do cliente

Tela atual:

`app/src/app/(tabs)/clients/[id].tsx`

Adicionar card "Planos":

- plano ativo;
- creditos usados;
- creditos disponiveis;
- ciclo atual;
- vencimento;
- acoes de vender, renovar, pausar, cancelar e restaurar credito.

### 7.3. Novo agendamento profissional

Fluxo atual:

`app/src/app/(tabs)/new-appointment/schedule.tsx`

Adicionar:

- apos selecionar cliente e servico/combo, consultar planos elegiveis;
- mostrar toggle "Usar plano do cliente";
- se usar plano, mostrar creditos disponiveis e regras;
- adicionar opcao "Repetir automaticamente";
- abrir preview da recorrencia antes de confirmar.

### 7.4. Agenda

Na listagem e detalhes de agendamento:

- badge "Plano";
- badge "Recorrente";
- informacao de consumo de credito;
- acao para cancelar somente este horario;
- acao para cancelar serie inteira quando o usuario for profissional.

## 8. Fase 5: App Cliente (`client-app`)

### 8.1. Meus planos

Adicionar secao:

- em perfil; e/ou
- na tela do negocio, quando houver plano ativo naquele negocio.

Mostrar:

- nome do plano;
- negocio;
- ciclo atual;
- creditos disponiveis;
- vencimento;
- servicos inclusos.

### 8.2. Fluxo de agendamento

Fluxo atual:

`client-app/src/app/(tabs)/home/[business_slug]/appointment.tsx`

Adicionar:

- se o servico/combo escolhido estiver incluso em plano ativo, mostrar opcao "Agendar com plano";
- exibir creditos disponiveis;
- se o plano permitir, mostrar opcao "Repetir automaticamente";
- abrir preview da recorrencia antes de confirmar.

Confirmacao atual:

`client-app/src/app/(modals)/confirm-new-appointment.tsx`

Adicionar:

- resumo de plano usado;
- creditos que serao reservados;
- lista de datas recorrentes, se houver;
- alerta para conflitos/ocorrencias ignoradas.

### 8.3. Lista de agendamentos

Adicionar:

- badge "Plano";
- badge "Recorrente";
- indicacao de ocorrencia individual;
- permitir cancelar/reagendar ocorrencia individual.

No v1, cliente nao gerencia a serie inteira se ela foi criada pelo profissional.

## 9. Regras de Negocio Padrao

### 9.1. Uso de creditos

- Criar agendamento com plano reserva credito.
- Completar agendamento consome credito.
- Cancelamento antes do inicio restaura credito por padrao.
- Cancelamento apos inicio nao restaura credito por padrao.
- No-show deve consumir credito, quando essa classificacao existir.

### 9.2. Limite semanal

Padrao:

- cliente nao pode usar duas vezes na mesma semana;
- semana considerada de segunda a domingo no timezone do negocio;
- regra configuravel por plano.

### 9.3. Agendamento futuro

Padrao:

- cliente pode deixar agendado ate `max_future_bookings`;
- o limite tambem respeita creditos disponiveis e `booking_window_days`.

### 9.4. Recorrencia

Padrao:

- frequencia semanal;
- mesmo profissional;
- mesmo servico/combo;
- mesmo horario;
- recorrencia nao fura disponibilidade;
- conflitos sao pulados e registrados.

### 9.5. Financeiro

- Plano vendido gera receita.
- Atendimento coberto por plano nao gera nova receita avulsa.
- Atendimento avulso continua gerando receita atual.
- Relatorios devem conseguir diferenciar receita de plano e receita avulsa.

## 10. Plano de Testes

### 10.1. Backend

Testar:

- criar plano valido;
- rejeitar plano sem servico/combo;
- vender plano para cliente;
- renovar plano;
- pausar/cancelar plano;
- agendar com plano ativo;
- rejeitar agendamento sem credito;
- rejeitar agendamento fora dos servicos inclusos;
- rejeitar dois usos na mesma semana quando bloqueado;
- permitir dois usos na mesma semana quando configurado;
- cancelar antes do horario e restaurar credito;
- completar agendamento e consumir credito;
- garantir que agendamento com plano nao cria receita avulsa;
- criar preview de recorrencia com sucesso;
- preview com conflito;
- preview sem credito;
- criar serie recorrente;
- cancelar ocorrencia individual;
- cancelar serie.

### 10.2. Concorrencia

Testar:

- duas requisicoes simultaneas tentando reservar o ultimo credito;
- dois processos do scheduler fechando agendamentos ao mesmo tempo;
- gerador de recorrencia com Redis lock.

### 10.3. Apps

Testar no `app`:

- criacao/edicao de plano;
- venda de plano no detalhe do cliente;
- agendamento usando plano;
- preview de recorrencia;
- badges na agenda;
- extrato com receita correta.

Testar no `client-app`:

- visualizacao de plano ativo;
- agendamento usando credito;
- tentativa sem credito;
- recorrencia com datas livres;
- recorrencia com conflitos;
- cancelamento/reagendamento de ocorrencia.

## 11. Ordem Recomendada de Implementacao

1. Criar migrations Prisma e enums.
2. Gerar Prisma Client.
3. Criar services de dominio para planos e creditos.
4. Extrair provider de disponibilidade.
5. Criar CRUD profissional de templates de plano.
6. Criar venda/renovacao de plano para cliente.
7. Integrar `plan_subscription_id` na criacao de agendamento profissional.
8. Ajustar scheduler para consumir creditos e nao duplicar receita.
9. Criar endpoints de consulta do cliente.
10. Integrar `plan_subscription_id` na criacao de agendamento do cliente.
11. Criar preview de recorrencia.
12. Criar serie recorrente e gerador no scheduler.
13. Implementar telas do `app`.
14. Implementar telas do `client-app`.
15. Rodar testes, revisar financeiro e validar fluxo completo em ambiente de homologacao.

## 12. Riscos e Cuidados

- Nao confundir plano do cliente com `BusinessSubscription`.
- Evitar dupla receita no financeiro.
- Evitar dupla reserva do mesmo credito em concorrencia.
- Nao criar recorrencia que ignore bloqueios ou conflitos.
- Preservar comportamento atual de agendamentos avulsos.
- Garantir que cancelamento/reagendamento mantenha consistencia de creditos.
- Registrar auditoria suficiente para suporte investigar divergencias.

## 13. Decisoes Assumidas para V1

- Nao havera pagamento online do plano no v1.
- O profissional registra venda/renovacao manualmente.
- A receita do plano sera atribuida a um profissional escolhido na venda.
- Plano pertence a um unico negocio.
- Plano pode incluir servicos e combos.
- Recorrencia cria agendamentos reais para bloquear agenda e ativar lembretes.
- Cliente pode cancelar/reagendar ocorrencias individuais.
- Profissional gerencia a serie inteira.
- **Assinatura NAO e auto-renovavel e a renovacao NAO re-agenda** (ver secao 14).

## 14. Renovacao manual, lembretes e visibilidade da assinatura (decisao de produto, 2026-09-29)

Decisao do dono do produto (que e usuario do proprio sistema): o cliente lembra sozinho de pagar e de agendar; o profissional nao fica cobrando. O sistema so precisa deixar isso obvio e avisar na hora certa.

### 14.1. Regras

- A assinatura **nao renova sozinha** e o app deve dizer isso de forma explicita ("Este plano nao renova automaticamente").
- `POST /professional/customer-plan-subscriptions/:id/renew` continua so criando novo ciclo + receita. **Nao** recria `RecurringAppointmentSeries`. Nenhum re-agendamento automatico.
- A cada fim de ciclo, o **proprio cliente** (no `client-app`) cria de novo a serie/agendamentos do novo ciclo, escolhendo os dias que quiser, usando o fluxo de recorrencia que ja existe.
- O cliente paga o profissional por fora; o profissional registra a renovacao no `app` (v1 sem pagamento online, ver secao 13).
- Nenhuma renovacao/cobranca automatica em nenhum canal.

### 14.2. Lembretes (reaproveitar `ReminderJob` + pipeline push/WhatsApp/in-app de `BusinessReminderType`)

Novos valores no enum `BusinessReminderType`:

- `PLAN_LAST_APPOINTMENT`: disparado quando o agendamento e o ultimo coberto pelos creditos do ciclo (`credits_reserved + credits_consumed >= credits_granted` no momento em que o agendamento e criado/confirmado). Texto: "Esse e o ultimo agendamento do seu plano. Para continuar, renove com o profissional e crie uma nova serie."
- `PLAN_CYCLE_ENDING`: disparado N dias antes de `current_cycle_end` (default 3) quando ainda ha creditos ou nao ha serie criada para o proximo ciclo. Texto deixa claro que o plano nao renova sozinho.

### 14.3. Dados expostos pela API (cliente e profissional)

Adicionar ao retorno de assinatura (`GET /client/customer-plans` e `GET /professional/customer-plan-subscriptions`):

- `auto_renews: false` (constante, explicita no contrato)
- `next_payment_estimate`: `current_cycle_end + 1ms` (estimativa de quando deve pagar de novo)
- `days_until_cycle_end`
- `credits_remaining`: creditos ainda nao usados nem reservados
- `credits_scheduled`: reservados (agendados e ainda nao realizados)
- `credits_used`: consumidos
- `is_last_credit`: `credits_remaining + credits_scheduled === 1` ou proximo agendamento e o ultimo
- `cycle_ended`: `now > current_cycle_end`
- `appointments`: lista do ciclo atual, ordenada por data, cada item com `sequence` ("3 de 4"), `start_at`, `status`, `is_next` (proximo a acontecer) e `redemption_status`

Nomes exatos podem variar na implementacao; o que nao pode faltar e cada informacao acima estar disponivel sem o app ter que calcular nada.

### 14.4. `client-app`: tela "Meus Planos" (`src/app/(tabs)/profile/customer-plans.tsx`)

Precisa responder de relance, sem o cliente ter que pensar:

- em qual agendamento estou: "Agendamento 3 de 4" com barra/segmentos de progresso;
- quantos ainda tenho e quais datas (linha do tempo dos agendamentos do ciclo, o proximo destacado);
- quando devo pagar de novo (estimativa: "Renova em 12 dias, por volta de 20/10") e aviso fixo "Nao renova automaticamente";
- estado de alerta quando `is_last_credit` ou `cycle_ended`: card de destaque "Ultimo agendamento do plano" / "Seu plano terminou" com CTA "Agendar novo ciclo" (leva ao fluxo de agendamento com plano + repetir);
- reaproveitar `src/shared/ui/`, `src/shared/theme/`, sem i18n, usar as skills de design obrigatorias.

### 14.5. `app` (profissional)

- Nova listagem "Assinaturas ativas" (em `src/app/(tabs)/profile/registrations/customer-plans/`, ao lado do catalogo de planos): todos os clientes com assinatura ativa do negocio, cada linha com nome do cliente, plano, "N de M usados", proxima data de pagamento estimada, badge de alerta (ultimo credito / ciclo acabando / vencido).
- Filtros/ordenacao: vencendo em breve (default), sem creditos, ciclo vencido, por nome.
- Detalhe da assinatura: mesmas informacoes que o cliente ve (agendamentos do ciclo, creditos, vencimento) + acoes existentes (renovar, pausar, cancelar, restaurar credito).
- `CustomerPlansCard.tsx` (detalhe do cliente) passa a mostrar as mesmas informacoes resumidas.
- Backend: `GET /professional/customer-plan-subscriptions` ganha paginacao (hoje `take: 200` fixo), filtro `status` e ordenacao por `current_cycle_end`.
- i18n obrigatorio no `app`.

### 14.6. Criterios de aceite

- Renovar uma assinatura com serie ativa **nao** cria nenhum agendamento novo.
- Ao criar o ultimo agendamento coberto pelo ciclo, o cliente recebe `PLAN_LAST_APPOINTMENT` (idempotente: nao envia duas vezes pro mesmo ciclo).
- Cliente abre "Meus Planos" e ve, sem calcular: posicao atual (X de N), datas restantes, data estimada do proximo pagamento e o aviso de que nao renova sozinho.
- Profissional ve todas as assinaturas ativas, ordenadas por vencimento, com as mesmas informacoes por cliente.

## 15. Status da implementacao das secoes 14 e 3 (2026-09-29)

Implementado e validado contra `marquei-dev` (script `scripts/e2e-dev-plans-waitlist.ts` + Jest). **Migrations ainda nao aplicadas em producao** (`20260429120000_customer_service_plans_recurring`, `20260929120000_plan_reminders`, `20260929130000_waitlist`, `20260929140000_waitlist_combo`).

- **Bug corrigido:** `credits_refunded` era somado duas vezes em "creditos disponiveis" (cancelar devolvia 2 creditos). Agora `disponiveis = granted - reserved - consumed`; `refunded` e so contador de auditoria. Regra unica em `libs/shared/src/utils/customer-plan-summary.ts`, coberta por teste.
- `renew` continua so criando ciclo + receita, sem recriar serie (teste garante).
- Novos valores de `BusinessReminderType`: `PLAN_LAST_APPOINTMENT` (job criado quando a reserva esgota os creditos, apontando pro ultimo agendamento cronologico do ciclo; revalidado no envio) e `PLAN_CYCLE_ENDING` (gerado 3 dias antes do fim do ciclo). Reusam `ReminderJob` (colunas novas `type`, `customerPlanSubscriptionId`, `cycleId`; `appointmentId` agora opcional) e as filas de push/WhatsApp. Unico por assinatura/ciclo/tipo/canal. Ficam fora de `BUSINESS_REMINDER_TYPES` (nao aparecem na tela de notificacoes do profissional ainda; usam defaults).
- API de assinatura (cliente e profissional) devolve `auto_renews: false`, `alert`, `cycle_ended`, `days_until_cycle_end`, `next_payment_estimate`, `credits_*`, `is_last_credit`, `current_sequence` e `appointments[]` (com `sequence`/`is_next`). `GET /professional/customer-plan-subscriptions` ganhou `status`, `sort=cycle_end`, `page`, `limit` (contrato antigo de array preservado).
- `client-app`: "Meus Planos" redesenhado (posicao "Agendamento X de N", segmentos por credito, proximo pagamento estimado, aviso fixo de nao renovacao, cartao de alerta com CTA "Agendar proximo ciclo").
- `app`: tela "Assinaturas ativas" (`registrations/customer-plans/subscriptions`) com filtros (vencendo, sem agendamentos, vencidas, todas), ordenada por vencimento, e o cartao do detalhe do cliente com as mesmas informacoes. i18n em `pt` e `en` (demais idiomas caem no fallback `pt`).
- Nao feito: endpoint `restore-credit` (previsto na secao 5.3, nao existe); nao verificado nesta rodada: preview de recorrencia (secao 5.6) e telas de recorrencia do `app`; deteccao de "ciclo vencido -> EXPIRED" automatica (a assinatura continua `ACTIVE` com `cycle_ended: true`).
