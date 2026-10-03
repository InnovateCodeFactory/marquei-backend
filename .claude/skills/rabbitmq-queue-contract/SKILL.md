---
name: rabbitmq-queue-contract
description: Use ao criar ou modificar qualquer fila/exchange RabbitMQ (producer via RmqService, consumer via @RabbitSubscribe, RPC) entre os apps deste monorepo (api-gateway, messaging, payment, scheduler) — define a convenção obrigatória de DLQ, idempotência e retry.
---

# Contrato de fila RabbitMQ

Este repo já tem `RmqService` (`libs/shared/src/modules/rmq/rmq.service.ts`, `publishToQueue`/`requestFromQueue`) e consumers via `@RabbitSubscribe` (`@golevelup/nestjs-rabbitmq`) espalhados pelos 4 apps — mas **hoje nenhuma fila configura DLQ, idempotência real ou classificação de erro**. Isso é dívida técnica real, não teoria. Toda fila **nova** ou **alterada** a partir de agora segue a convenção abaixo (baseada num incidente real de outro projeto do mesmo grupo, migração Uazapi WhatsApp — mensagem perdida silenciosamente por falta exatamente dessas três coisas).

## DLQ obrigatória

- Todo `@RabbitSubscribe` novo/alterado declara `queueOptions: { deadLetterExchange, deadLetterRoutingKey }` — nunca opcional, mesmo que a fila pareça "baixo risco".
- Mensagem que esgota tentativas vai pra `.dlq` correspondente, nunca é descartada silenciamente (o `catch` genérico com `this.logger.error(error)` sem re-throw, já presente em alguns handlers deste repo, **não conta** como tratamento — a mensagem é ack'd e perdida do mesmo jeito).

## Idempotência real

- Usar `messageId` (AMQP nativo) ou um campo `message_id: randomUUID()` explícito no payload/DTO publicado via `RmqService.publishToQueue`.
- **Nunca** usar hash de conteúdo como chave de idempotência — duas mensagens com mesmo conteúdo podem ser intencionalmente distintas (ex.: dois lembretes de agendamento iguais em datas diferentes).

## Classificação de erro obrigatória

Todo handler `@RabbitSubscribe` classifica falha em pelo menos:

- `retryable_technical` (timeout, 5xx do Google Calendar/WhatsApp/Stripe) → retry com backoff exponencial.
- `retry_later` (429/rate-limit) → retry com backoff mais longo.
- `provider_operational_failure` (401/config inválida do provider externo) → não drena a fila nem falha a mensagem repetidamente; loga uma vez e usa circuit-breaker (ex.: chave Redis com TTL).
- `non_retryable` (400/validação) → vai direto pra DLQ.
- `unknown` → nunca fica pendente pra sempre nem é re-tentado silenciosamente infinitas vezes; teto de tentativas explícito.

## IDs

- Nunca usar `??` pra decidir entre ID interno de um provider externo (Stripe, RevenueCat, Google Calendar, WhatsApp) e ID de domínio (ex.: `stripeSubscriptionId` vs `planId`, `googleEventId` vs `appointmentId`). Mapear explicitamente os dois campos.

## Publicação (producer)

`RmqService.publishToQueue` hoje engole erro de publish com `console.error` e segue em frente — quem chama não sabe se a mensagem realmente saiu. Ao tocar num producer, não assumir que "publicou" significa "chegou"; se a ação subsequente depende da mensagem ter sido entregue, tratar a falha de publish explicitamente no call site, não confiar no service engolir silenciosamente.
