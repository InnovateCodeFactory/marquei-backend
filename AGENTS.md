# AGENTS.md — Marquei Backend (NestJS)

Este projeto representa o **backend do Marquei**, responsável por funcionalidades essenciais como autenticação, cadastro de profissionais e clientes, agenda/agendamentos, notificações e integrações.

O backend deve ser **seguro, previsível, performático e fácil de evoluir**, seguindo princípios de **Clean Architecture** e boas práticas do **NestJS**.

Este arquivo define regras obrigatórias para qualquer agente automático (Codex, IA ou automações) que realize alterações neste repositório.

---

## 🎯 Objetivo do Agente

Toda alteração no backend DEVE:

- Ser de **nível profissional e pronta para produção**
- Priorizar **segurança**, **robustez**, **performance** e **observabilidade**
- Seguir princípios de **Clean Architecture** (baixo acoplamento, alta coesão)
- Manter **contratos de API estáveis** e mudanças bem justificadas
- Evitar soluções rápidas, improvisadas ou frágeis

---

## 🧱 Arquitetura (Clean Architecture — Obrigatório)

O código deve respeitar separação clara entre camadas:

- **Domain**: regras de negócio puras (sem NestJS/ORM/HTTP)
- **Application / Use Cases**: orquestra fluxos e regras
- **Infrastructure**: banco, cache, filas, integrações externas
- **Interface / Presentation**: controllers, DTOs, validação de entrada

### Regras

- Controllers **não** contêm lógica de negócio
- Use cases **não** dependem de NestJS/ORM
- Infra **não** vaza para Domain/Application
- Dependências apontam sempre para dentro (Domain/Application)

---

## 🔐 Segurança (Obrigatório)

O agente DEVE:

- Validar entrada com **DTOs + class-validator** (sem confiar no cliente)
- Aplicar **autenticação** e **autorização** corretamente (Guards)
- Proteger endpoints sensíveis (agenda, dados de clientes, pagamentos, etc.)
- Tratar PII com cuidado e **nunca logar dados sensíveis** (tokens, senhas, documentos)
- Garantir políticas de CORS e headers seguros quando aplicável
- Considerar rate limiting para rotas críticas (login, OTP, webhooks, etc.)

### Exigências

- Senhas sempre com hash forte (ex.: bcrypt/argon2)
- Tokens e segredos somente via variáveis de ambiente
- Erros retornados sem vazar detalhes internos (stack, SQL, secrets)

---

## ⚙️ Performance e Escalabilidade

Toda implementação deve considerar:

- Queries otimizadas e paginadas (evitar N+1 e full scans)
- Índices coerentes com filtros e ordenações mais usadas
- Cache quando apropriado (ex.: leitura de agenda, configurações)
- Processamento assíncrono para tarefas pesadas (fila/cron)
- Evitar bloquear event loop (I/O e loops pesados)

### Proibido

- Endpoints sem paginação que retornam listas grandes
- Loops com I/O síncrono ou processamento pesado no request thread
- Consultas sem necessidade trazendo campos excessivos

---

## ✅ Consistência de API (Contratos)

- Rotas e formatos de resposta devem ser consistentes
- Padronizar errors (código, mensagem e detalhes)
- Versionar mudanças breaking quando necessário
- Evitar mudanças de contrato sem documentação/justificativa

---

## 🧩 NestJS — Padrões Esperados

Usar corretamente recursos do NestJS:

- **Modules**: organização por domínio/feature
- **Providers**: DI clara e testável
- **Guards**: auth/authz
- **Pipes**: validação e transformação
- **Interceptors**: logs, métricas, response mapping
- **Exception Filters**: padronização de erros

Evitar:

- Lógica de negócio em `Controller`
- “Service” genérico virando “Deus” (God Service)
- Código duplicado em múltiplos módulos

---

## 🧪 Testabilidade

Sempre que possível:

- Use cases testáveis com mocks (sem banco real)
- Infra isolada por interfaces (repositories/adapters)
- Cobrir fluxos críticos (agendamentos, permissões, autenticação)
- Garantir que validações e regras de negócio tenham testes

---

## 🧾 Observabilidade e Logs

O agente DEVE:

- Registrar eventos relevantes (login, agendamento criado/cancelado, etc.)
- Não logar PII/tokens
- Preferir logs estruturados (níveis: debug/info/warn/error)
- Garantir rastreabilidade de requests (request-id/correlation-id quando aplicável)

---

## 🚫 O que NÃO fazer

O agente **NUNCA** deve:

- Colocar lógica de negócio em controllers
- Acessar banco diretamente fora da camada de infra
- Introduzir dependências desnecessárias
- Quebrar contratos de API sem justificativa e ajuste completo
- Ignorar edge cases (conflitos de horário, timezone, concorrência)
- Alterar regras críticas sem atualizar testes/validações

---

## 🧭 Regra de Ouro

> **O backend do Marquei deve ser seguro, previsível e escalável.**

Qualquer mudança deve tornar o sistema:

- mais robusto,
- mais performático,
- mais seguro,
- e mais fácil de evoluir.

Se a alteração não melhora claramente o produto, ela não deve ser aplicada.

---
