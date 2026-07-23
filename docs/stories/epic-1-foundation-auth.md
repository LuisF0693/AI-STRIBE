# Epic 1 — Foundation & Auth

> **Criado por:** Morgan (@pm) | **Data:** 2026-07-22 | **Status:** Draft

---

## Epic Goal

Fundar a camada de infraestrutura e autenticação que sustenta todo o produto — ponto de entrada Fastify, cliente Supabase admin/anon separados, CI/CD, schema de identidade (`users` + `medicos`), middleware JWT e políticas RLS — e **retroaplicar** essa camada aos endpoints já entregues nos Epics 2 e 3. Sem o Epic 1 o MVP existe em código mas **não pode ir a produção**: nenhum endpoint é autenticado, `auth.uid()` das políticas RLS nunca resolve, e o `medico_id` é fornecido pelo cliente (falha de segurança). Este epic desbloqueia o deploy e resolve os débitos críticos TD-01, TD-02, TD-07 e TD-08.

---

## Existing System Context

- **Sistema atual:** Epics 2 (Core AI Scribe, stories 2.1–2.5) e 3 (Review & Approval, stories 3.1–3.3) estão 100% Done — pipeline gravação → transcrição Whisper PT-BR → nota SOAP GPT-4o → revisão → aprovação → PDF assinado ICP-Brasil já funciona em código.
- **Stack relevante:** React Native + Expo (mobile), Next.js 16+ (web), Fastify + TypeScript (API), Supabase PostgreSQL sa-east-1, Redis/BullMQ, Supabase Storage (bucket privado BR).
- **Estado da infraestrutura (verificado no código):**
  - `packages/api/src/index.ts` é apenas um **barrel de exports** — **não existe `server.ts`** que instancie o Fastify, registre plugins e as rotas (`health.routes.ts`, `consultas.routes.ts`, `notas.routes.ts`). Sem entrypoint a API não sobe (TD-02).
  - `packages/api/src/config/supabase.ts` exporta **somente o cliente anon** (comentário no arquivo proíbe `supabaseAdmin` no mobile). **Não existe cliente admin (`service_role`)** separado, embora os workers e comentários das migrations (003, linha 102) já o assumam.
  - **Migrations 001/002 não existem** — o diretório `supabase/migrations/` tem apenas 003–008. Porém as RLS de 003 (`consultas`) e 005 (`notas`) **já dependem** de uma tabela `medicos(id, user_id)` filtrada por `auth.uid()` e de `consultas.medico_id`. O contrato dessas tabelas está, portanto, implicitamente definido pelo código já entregue.
  - Nenhuma rota aplica middleware de auth. `notas.routes.ts` recebe `medico_id` **do body da requisição** (cliente-supplied) nos endpoints `/aprovar` e `/exportar-pdf` (TD-01, TD-07).
  - Mobile: **não existe grupo `(auth)`** nem `stores/auth.store.ts`. A tela `apps/mobile/app/consulta/aprovar/[id].tsx:22` usa `MEDICO_ID_PLACEHOLDER = 'medico-autenticado'` (TD-07).
- **Padrões existentes a seguir:** Fastify + TypeScript, Zod para validação de body, Zustand para estado mobile, RLS por `medicos.user_id = auth.uid()`, config centralizado via `app.config.ts` (secrets nunca em `process.env` direto), Supabase Auth como provedor de identidade.

---

## Enhancement Details

**O que está sendo adicionado:**
- Ponto de entrada Fastify (`server.ts`) que registra plugins de segurança e todas as rotas existentes.
- Cliente Supabase `admin` (service_role) separado do `anon`, para contextos de backend/worker.
- CI/CD via GitHub Actions (lint + typecheck + test em PR; deploy web→Vercel, mobile→EAS Build).
- Schema de identidade: migrations `001_create_users` e `002_create_medicos` (o contrato já exigido pelas RLS de 003–008).
- Middleware JWT (`auth.ts`) que valida o token Supabase e injeta `request.user` (`user_id` + `medico_id`).
- Fluxo mobile de login + onboarding (4 telas) + `auth.store.ts` (Zustand).
- Retrofit de autenticação nas rotas dos Epics 2/3, trocando `medico_id` do body pelo derivado do JWT.

**Como integra ao sistema existente:**
- `server.ts` registra `health.routes.ts`, `consultas.routes.ts` e `notas.routes.ts` **sem alterar suas assinaturas de path** — apenas adiciona o `preHandler` de auth.
- As migrations 001/002 são **pré-requisito de ordenação** das migrations 003–008 já escritas: aplicadas antes, satisfazem as FKs (`consultas.medico_id → medicos.id`) e as RLS (`medicos.user_id = auth.uid()`).
- O middleware injeta `medico_id` a partir do JWT; as rotas passam a lê-lo de `request.user` em vez do body.
- O mobile passa a obter `medico_id` do `auth.store`, eliminando o placeholder.

**Critérios de sucesso:**
- A API sobe via `server.ts` e responde `GET /health` com todas as rotas registradas.
- Nenhum endpoint de dados de paciente responde sem JWT válido (401 sem token).
- Um médico autenticado só acessa/aprova consultas e notas próprias — teste cross-médico RLS **falha** o acesso indevido (TD-08 executável e verde).
- Onboarding (instalação → primeira nota) completável em < 10 min para 90% dos usuários (NFR6).
- Zero regressão funcional nos fluxos dos Epics 2 e 3.

---

## Stories

### Story 1.1 — API Foundation & CI/CD

**Descrição:** Criar o ponto de entrada Fastify (`server.ts`) que instancia o servidor, registra plugins de segurança (CORS, helmet, error handler) e todas as rotas existentes, e adicionar o cliente Supabase `admin` (service_role) separado do `anon`. Estabelecer o pipeline de CI/CD no GitHub Actions. Resolve TD-02.

**Acceptance Criteria (rascunho):**
- `packages/api/src/server.ts` instancia o Fastify, registra `healthRoutes`, `consultasRoutes` e `notasRoutes`, e expõe `app.listen()` com host/porta vindos de `app.config.ts` (sem `process.env` direto — NFR de config já vigente).
- Plugins registrados: CORS restrito às origens do app, helmet/headers de segurança, handler global de erros no formato `{ error: { code, message } }` já usado pelas rotas.
- `packages/api/src/config/supabase.ts` passa a exportar **`supabaseAdmin`** (service_role, sem persistência de sessão) além do `anon` existente — admin usado apenas em contexto de backend/worker, nunca exposto ao mobile (comentário de coding standard preservado).
- `GET /health` responde 200 com status das dependências (DB/Redis) sem exigir autenticação (rota pública).
- Workflow GitHub Actions em PR: `npm run lint`, `npm run typecheck`, `npm test` em todos os workspaces do Turborepo.
- Workflow de deploy: web → Vercel, mobile → EAS Build, disparado em merge para `master` (Technical Assumptions: CI/CD GitHub Actions → Vercel + EAS).
- Variáveis de ambiente de produção documentadas (`SUPABASE_SERVICE_ROLE_KEY`, etc.) — secrets geridos pelo @devops, nunca hardcoded.

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: ["code-review", "security-scan", "ci-pipeline-validation"]
```

**Quality Gates:**
- Pre-Commit: ESLint + TypeScript check, scan de segredos (service_role_key nunca em código)
- Pre-PR: Revisão de registro de rotas (nenhuma rota existente omitida), validação do workflow CI

**Agentes envolvidos:** @dev (implementação), @architect (arquitetura do entrypoint + separação admin/anon), @devops (secrets e pipeline GitHub Actions → Vercel/EAS — EXCLUSIVO)

---

### Story 1.2 — Auth Schema & JWT Middleware

**Descrição:** Criar as migrations de identidade (`001_create_users`, `002_create_medicos`) que satisfazem o contrato já assumido pelas RLS dos Epics 2/3, e o middleware JWT (`auth.ts`) que valida o token Supabase Auth e injeta `request.user` com `user_id` e `medico_id`. Estabelece a base de RLS e habilita TD-08.

**Acceptance Criteria (rascunho):**
- `supabase/migrations/001_create_users.sql` cria a tabela de perfil `public.users` (id referenciando `auth.users`, email, role, `lgpd_consent_at`) complementando o Supabase Auth — nunca substituindo `auth.users`. Metadados de consentimento LGPD registrados (NFR1).
- `supabase/migrations/002_create_medicos.sql` cria `medicos(id, user_id → auth.users, crm, nome, especialidade, created_at, updated_at)` — exatamente o contrato exigido por `consultas.medico_id` (003) e pelas RLS `medicos.user_id = auth.uid()` (003/005). Migration é ordenada **antes** de 003.
- RLS habilitada em `users` e `medicos`: médico lê/edita apenas o próprio registro (`user_id = auth.uid()`).
- `packages/api/src/middleware/auth.ts` é um `preHandler` Fastify que: extrai `Bearer <token>`, valida via Supabase Auth, resolve o `medico_id` correspondente e injeta `request.user = { user_id, medico_id }`; responde **401** sem token ou token inválido, **403** se o usuário não tiver `medico` associado.
- Dados sensíveis nunca logados (token, service_role); erros de auth retornam mensagem genérica (NFR5).
- Testes unitários: token ausente → 401, token inválido → 401, token válido sem médico → 403, token válido → injeta `request.user`.

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: ["code-review", "rls-validation", "security-scan"]
```

**Quality Gates:**
- Pre-Commit: RLS policy validation, migration safety (ordenação 001/002 antes de 003), scan de segredos
- Pre-PR: Revisão do contrato de `request.user`, validação de que o schema satisfaz as FKs/RLS de 003–008

**Agentes envolvidos:** @dev (implementação), @architect (contrato do middleware + segurança JWT), @data-engineer (DDL de `users`/`medicos` + RLS, ordenação de migrations)

---

### Story 1.3 — Mobile Onboarding & Login

**Descrição:** Implementar o fluxo de autenticação no mobile: telas de login e onboarding (4 telas, conforme Core Screen 7 do PRD) e o store Zustand de autenticação (`auth.store.ts`) que gerencia sessão, perfil do médico e persistência. Suporta o alvo de onboarding < 10 min (NFR6).

**Acceptance Criteria (rascunho):**
- `apps/mobile/app/(auth)/login.tsx` — tela de login via Supabase Auth (email/senha), com tratamento de erro e loading; redireciona ao dashboard em sucesso.
- `apps/mobile/app/(auth)/onboarding.tsx` — fluxo de 4 telas (boas-vindas → permissões de microfone → cadastro CRM/especialidade → primeira consulta), navegável e pulável após conclusão. Onboarding desenhado para < 10 min até a primeira nota (NFR6).
- `apps/mobile/stores/auth.store.ts` (Zustand) — estado `session`, `medico` (id, nome, crm), ações `signIn`, `signOut`, `restoreSession`; sessão persistida com `autoRefreshToken` (reusa o cliente `supabase` anon existente).
- Suporte a MFA do Supabase Auth (enrollment opcional na primeira sessão) — Technical Assumptions "Supabase Auth + MFA". [AUTO-DECISION] MFA modelado como opcional/enrollment, não obrigatório no MVP → reduz atrito de onboarding (NFR6) sem violar o requisito de stack (reason: PRD lista MFA na stack mas não como FR/NFR bloqueante; onboarding <10min é NFR explícito).
- Rotas autenticadas redirecionam para `(auth)/login` quando não há sessão válida (guard no `_layout`).
- Acessibilidade WCAG AA nas telas de auth (contraste, leitores de tela) — consistente com o design system existente.
- Token da sessão exposto ao API client para envio como `Bearer` (habilita o consumo pelas rotas retrofitadas em 1.4).

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: ["code-review", "accessibility-review", "e2e-test"]
```

**Quality Gates:**
- Pre-Commit: ESLint + TypeScript check, acessibilidade WCAG AA
- Pre-PR: Revisão de padrões Expo Router (grupo `(auth)`, guards) + padrões de store Zustand existentes

**Agentes envolvidos:** @dev (implementação), @architect (validação de padrões de estado/roteamento), @ux-design-expert (fluxo de onboarding — Core Screen 7 "Onboarding Flow (4 telas)")

---

### Story 1.4 — Auth Retrofit on Epic 2/3 Endpoints

**Descrição:** Aplicar o middleware de auth (Story 1.2) a todas as rotas de dados dos Epics 2 e 3, substituir o `medico_id` fornecido pelo body por aquele derivado do JWT (`request.user.medico_id`), remover o `MEDICO_ID_PLACEHOLDER` do mobile, e adicionar testes de isolamento cross-médico via RLS. Resolve TD-01, TD-07 e valida TD-08. **Story de maior risco do epic** — altera comportamento de endpoints já Done.

**Acceptance Criteria (rascunho):**
- Middleware `auth.ts` registrado como `preHandler` em `consultas.routes.ts` e `notas.routes.ts`; todos os endpoints de dados retornam **401** sem JWT válido. `/health` permanece público.
- Nos endpoints `POST /notas/:id/aprovar` e `POST /notas/:id/exportar-pdf`, o `medico_id` passa a vir de `request.user.medico_id` — **o campo `medico_id` do body é ignorado/removido** (elimina a falha de segurança cliente-supplied). O schema Zod é atualizado de acordo.
- As queries que hoje usam o cliente `anon` compartilhado passam a operar sob a identidade do usuário para que `auth.uid()` resolva e a RLS seja efetivamente aplicada (client por-requisição com o JWT do usuário), OU usam `supabaseAdmin` com filtro explícito por `medico_id` — **decisão arquitetural documentada por @architect** na story. [AUTO-DECISION] recomendação: client por-requisição com JWT do usuário para que a RLS seja a fonte de verdade da autorização, evitando filtros manuais espalhados (reason: RLS já implementada em 003/005 assume `auth.uid()`; confiar nela reduz superfície de erro).
- `apps/mobile/app/consulta/aprovar/[id].tsx` — remover `MEDICO_ID_PLACEHOLDER` (linha 22); `medico_id` deixa de ser enviado pelo client (derivado do JWT no backend). A tela obtém a sessão do `auth.store`.
- API client mobile injeta o `Bearer <token>` do `auth.store` em todas as chamadas.
- Testes de segurança cross-médico (TD-08): médico A não consegue ler/editar/aprovar/exportar consultas e notas do médico B (403/404 via RLS) — cenários automatizados.
- Zero regressão nos fluxos dos Epics 2/3 para um usuário autenticado (paths e contratos de resposta inalterados exceto pela remoção do `medico_id` do body).

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: ["code-review", "rls-validation", "api-contract-test", "regression-test"]
```

**Quality Gates:**
- Pre-Commit: RLS validation, verificação de que nenhum path existente mudou, scan de `medico_id` residual no body
- Pre-PR: API contract test (backward compat com E2/E3), testes de regressão dos fluxos de aprovação/PDF
- Pre-Deployment: Suite de segurança cross-médico verde

**Agentes envolvidos:** @dev (implementação), @architect (decisão RLS-vs-admin + contrato), @qa (testes de regressão e segurança), @data-engineer (validação das RLS sob identidade real)

---

## Compatibility Requirements

- [ ] Paths dos endpoints dos Epics 2/3 (`/api/v1/consultas/*`, `/api/v1/notas/*`, `/pdf-status`) permanecem inalterados — apenas ganham `preHandler` de auth.
- [ ] Schema do banco: migrations 001/002 são **aditivas e ordenadas antes** de 003 — não alteram tabelas existentes.
- [ ] Contratos de resposta preservados; única mudança de contrato de request é a **remoção** do `medico_id` do body (agora vem do JWT).
- [ ] Cliente `anon` existente (`config/supabase.ts`) mantido; `supabaseAdmin` adicionado sem expor ao mobile (coding standard preservado).
- [ ] Dados de paciente continuam criptografados AES-256 e nunca logados (NFR5); dados em servidores BR sa-east-1 (NFR1).

---

## Risk Mitigation

**Risco principal:** A Story 1.4 (retrofit) altera o comportamento de endpoints **já Done e testados** dos Epics 2/3 — risco de regressão funcional e de quebra do fluxo de aprovação/PDF em produção.

**Mitigação:**
- Retrofit isolado na última story, após auth backend (1.2) e mobile (1.3) estarem validados.
- Suite de regressão E2E dos fluxos de aprovação e PDF antes do merge.
- Testes de segurança cross-médico (TD-08) como gate obrigatório de pré-deployment.
- Decisão RLS-vs-admin documentada por @architect antes da implementação, evitando autorização inconsistente.

**Risco secundário:** As migrations 003–008 foram escritas assumindo 001/002 — se aplicadas fora de ordem em um banco real, as FKs e RLS falham.

**Mitigação:**
- 001/002 numeradas para rodar antes de 003; validar ordenação em migration dry-run no CI.
- Ambiente de staging Supabase para validar a cadeia completa 001→008 antes de produção.

**Plano de rollback:**
- Stories 1.1, 1.2 e 1.3 são aditivas — rollback individual sem afetar E2/E3.
- Story 1.4: reverter o `preHandler` de auth e restaurar leitura do `medico_id` do body reativa o comportamento anterior (inseguro, mas funcional) enquanto se corrige.

**Estratégia de qualidade proativa:**
- CodeRabbit modo light no dev (CRITICAL + HIGH auto-fix, máx 2 iterações).
- CodeRabbit modo full no QA gate (pré-PR).
- @architect valida contrato de `request.user` e a decisão RLS-vs-admin antes de qualquer merge da 1.4.

---

## Validation Checklist

**Scope:**
- [x] Epic escopado em 4 stories (infra → auth backend → auth mobile → retrofit)
- [x] Nenhuma reescrita dos Epics 2/3 — apenas fundação + aplicação de auth sobre o existente
- [x] Enhancement segue padrões existentes (Fastify, Zod, Zustand, RLS por `auth.uid()`)
- [x] Complexidade de integração gerenciável (1 provedor de identidade: Supabase Auth)

**Risk:**
- [x] Risco concentrado e isolado na Story 1.4 (retrofit), executada por último com gate de regressão
- [x] Ordenação de migrations 001/002 antes de 003 mitigada via CI dry-run
- [x] Abordagem de testes cobre regressão dos Epics 2/3 e isolamento cross-médico
- [x] Time conhece os pontos de integração (RLS e contrato de `medicos` já visíveis em 003/005)

**Completeness:**
- [x] Goal do epic é claro e desbloqueia o deploy do MVP
- [x] Stories adequadamente escopadas (1 infra, 1 auth backend, 1 auth mobile, 1 retrofit)
- [x] Critérios de sucesso mensuráveis (401 sem token, RLS cross-médico verde, onboarding <10min)
- [x] Dependência mapeada: nenhuma story-prévia; E2/E3 já Done são o alvo do retrofit

---

## Definition of Done

- [ ] Story 1.1: API sobe via `server.ts` com todas as rotas registradas; `supabaseAdmin` disponível; CI/CD verde em PR e deploy
- [ ] Story 1.2: Migrations 001/002 aplicadas antes de 003; middleware JWT injeta `request.user`; RLS de identidade ativa
- [ ] Story 1.3: Login + onboarding (4 telas) + `auth.store` funcionando; sessão persistida; onboarding <10min validável
- [ ] Story 1.4: Todos os endpoints de dados exigem JWT; `medico_id` vem do JWT; `MEDICO_ID_PLACEHOLDER` removido
- [ ] TD-01, TD-02, TD-07 resolvidos; TD-08 (testes cross-médico) executável e verde
- [ ] Funcionalidade dos Epics 2/3 verificada sem regressões (fluxo completo com usuário autenticado)
- [ ] Documentação de API atualizada (auth obrigatória, contrato de `request.user`, remoção de `medico_id` do body)

---

## Codebase Intelligence

> Code intelligence provider não disponível — seção gerada com base em análise manual do repositório (arquivos lidos: `index.ts`, `config/supabase.ts`, `notas.routes.ts`, `aprovar/[id].tsx`, migrations 003/005).

| Referência | Detalhe |
|-----------|---------|
| Entrypoint ausente | `packages/api/src/index.ts` é barrel de exports — `server.ts` a criar (Story 1.1, TD-02) |
| Cliente Supabase | `packages/api/src/config/supabase.ts` só exporta `anon` — adicionar `supabaseAdmin` (Story 1.1) |
| Config centralizado | `packages/api/src/config/app.config.ts` (Story 3.3) — reutilizar para env/secrets |
| Contrato de identidade | RLS em `003_create_consultas.sql` e `005_create_notas.sql` já assumem `medicos(id, user_id)` e `auth.uid()` — define o DDL de 001/002 (Story 1.2) |
| Falha de segurança | `notas.routes.ts` lê `medico_id` do body em `/aprovar` e `/exportar-pdf` — trocar por JWT (Story 1.4, TD-07) |
| Placeholder mobile | `apps/mobile/app/consulta/aprovar/[id].tsx:22` `MEDICO_ID_PLACEHOLDER` — remover (Story 1.4, TD-07) |
| Padrão de estado mobile | `apps/mobile/stores/nota.store.ts` (Zustand) — espelhar em `auth.store.ts` (Story 1.3) |
| Roteamento mobile | Expo Router; criar grupo `(auth)` ao lado de `app/consulta/` e `app/(tabs)/` (Story 1.3) |

---

## Story Manager Handoff

> Para @sm (River): desenvolver as stories detalhadas deste epic brownfield.

**Contexto do sistema existente:**
- Stack: React Native + Expo (mobile), Next.js 16+ (web), Fastify + TypeScript (API), Supabase PostgreSQL sa-east-1, Redis/BullMQ.
- Epics 2 e 3 estão Done, porém **sem camada de auth** — a API sequer possui `server.ts`. Este epic funda a infraestrutura e a retroaplica.
- Padrões a seguir: Fastify + Zod, config via `app.config.ts` (nunca `process.env` direto), Zustand no mobile, RLS por `medicos.user_id = auth.uid()`, Supabase Auth como identidade.

**Pontos de integração críticos:**
- Story 1.1 registra as rotas existentes em `server.ts` sem alterar paths, e adiciona `supabaseAdmin`.
- Story 1.2 cria `users`/`medicos` satisfazendo o contrato já exigido pelas RLS de 003–008 (ordenação de migration é obrigatória).
- Story 1.3 provê `auth.store` e o `Bearer` token consumido pela Story 1.4.
- Story 1.4 aplica `preHandler` de auth e troca `medico_id` do body pelo do JWT — decisão RLS-vs-admin deve ser resolvida por @architect antes da implementação.

**Requisitos de compatibilidade críticos:**
- Nenhuma alteração de path nos endpoints dos Epics 2/3.
- Migrations 001/002 aditivas e ordenadas antes de 003.
- Única mudança de contrato de request permitida: remoção do `medico_id` do body.
- Credenciais (service_role, Supabase) via env/secrets geridos por @devops — nunca hardcoded.

**O epic deve manter a integridade do sistema enquanto entrega:** a fundação de infraestrutura + autenticação que torna o MVP (E1 + E2 + E3) **deployável em produção** com isolamento de dados por médico garantido por RLS.

---

## Gaps & Inferências (para @po / @architect)

> Itens observados no código que extrapolam o escopo estrito de E1 mas impactam o deploy — registrados para decisão, **não** inventados como requisito:

- **`pacientes` sem migration:** `003_create_consultas.sql:13` referencia `pacientes(id)`, mas não existe `migration create_pacientes`. Fora do escopo de E1 (identidade do médico), mas **bloqueia** a cadeia de migrations em banco real. Recomendo endereçar em fix de tech-debt paralelo ou na Story 1.2 se @architect decidir incluir.
- **Migration 006 ausente:** a sessão lista "006 (verificar)" mas o diretório pula de 005 para 007. Confirmar se há gap intencional antes do deploy.
- **`001_create_users` como perfil, não substituto de `auth.users`:** o Supabase Auth já provê `auth.users`; modelei 001 como tabela de perfil complementar (role + consentimento LGPD). @data-engineer deve confirmar essa interpretação na Story 1.2.

---

*— Morgan, planejando o futuro 📊*
