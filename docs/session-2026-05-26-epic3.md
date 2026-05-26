# Sessão 2026-05-26 — Epic 3 Completo

> **Projeto:** AI Scribe PT-BR
> **Repositório:** https://github.com/LuisF0693/AI-STRIBE
> **Branch:** `master`
> **Agentes ativos:** Orion (Orchestrator), Morgan (PM), River (SM), Pax (PO), Dex (Dev), Quinn (QA), Gage (DevOps)

---

## O Que Foi Feito Hoje

### Pipeline AIOX Executado

O ciclo completo do Story Development Cycle foi rodado para as 3 stories do Epic 3:

```
@pm (epic) → @sm (stories) → @po (validate) → @dev (implement) → @qa (gate) → @devops (push)
```

---

## Epic 3 — Review & Approval Flow ✅ Done

**Objetivo:** Interface de revisão + edição inline + aprovação + PDF com assinatura digital ICP-Brasil. Completa o MVP mínimo (E1 + E2 + **E3**).

---

### Story 3.1 — SOAP Note Review Screen ✅ Done

**O que foi entregue:**

| Arquivo | Descrição |
|---|---|
| `apps/mobile/app/consulta/revisao/[id].tsx` | Tela de revisão mobile com skeleton loader, Realtime subscription, section-viewed tracking |
| `apps/mobile/components/nota/SoapEditor.tsx` | Componente editor (4 seções SOAP, badge "editado", chips CID removíveis, WCAG AA) |
| `apps/mobile/hooks/useSoapDraft.ts` | Auto-save AsyncStorage com debounce 5s, rastreamento de campos editados, offline |
| `apps/mobile/components/nota/__tests__/SoapEditor.test.tsx` | 7 testes unitários |
| `apps/mobile/hooks/__tests__/useSoapDraft.test.ts` | 7 testes unitários |
| `apps/mobile/e2e/revisao-nota.spec.ts` | 6 cenários E2E Playwright (AC 1,2,4,5,6,7) |
| `apps/web/app/nota/[id]/page.tsx` | Tela web Next.js — layout 2 colunas (S+O / A+P), Tailwind |
| `apps/web/hooks/useSoapDraftWeb.ts` | Auto-save localStorage web |
| `apps/web/lib/supabase.ts` | Cliente Supabase SSR para web |
| `packages/api/src/routes/notas.routes.ts` | `GET /api/v1/notas/consulta/:consultaId` |

**QA Gate:** CONCERNS — 2 HIGH (tech debt), 2 MEDIUM corrigidos in-loco.

**Fixes aplicados pelo QA:**
- Stale closure em `updateSoapField` — corrigido com `useRef` + forma funcional de `setEditedFields`
- `createSupabaseClient()` por render na web page — corrigido com `useMemo`

---

### Story 3.2 — Note Approval & Persistence ✅ Done

**O que foi entregue:**

| Arquivo | Descrição |
|---|---|
| `supabase/migrations/007_nota_approval.sql` | Colunas `approved_by`, `approved_at`, `pdf_status` na tabela `notas` |
| `packages/api/src/services/nota.service.ts` | State machine `validateStatusTransition()` + `saveNotaDraft()` + `aprovarNota()` com idempotência |
| `packages/api/src/routes/notas.routes.ts` | `PATCH /api/v1/notas/:id` (salvar rascunho) + `POST /api/v1/notas/:id/aprovar` |
| `packages/shared/src/types/nota.ts` | `PdfStatus`, `approved_by`, `approved_at`, `pdf_status` adicionados |
| `apps/mobile/services/nota.service.ts` | API client mobile: `salvarRascunho()` + `aprovar()` |
| `apps/mobile/stores/nota.store.ts` | Zustand store com `updateStatus()` |
| `apps/mobile/app/consulta/aprovar/[id].tsx` | Tela de confirmação → loading → redirect PDF |
| `packages/api/src/services/__tests__/nota.service.test.ts` | 10 testes unitários (state machine + aprovação + idempotência) |

**QA Gate:** CONCERNS — 1 HIGH (tech debt race condition), 2 MEDIUM + 1 LOW corrigidos in-loco.

**Fixes aplicados pelo QA:**
- `'use client'` (diretiva Next.js) removido de arquivo React Native
- `useEffect` importado mas não utilizado removido
- `buildSupabaseMock()` dead code removido dos testes

---

### Story 3.3 — PDF Export & Digital Signature ✅ Done

**O que foi entregue:**

| Arquivo | Descrição |
|---|---|
| `supabase/migrations/008_nota_pdf.sql` | Colunas `pdf_url`, `pdf_signed` + extensão CHECK de `pdf_status` para `ready_unsigned` |
| `packages/api/src/config/app.config.ts` | Config centralizado — secrets Certisign e Supabase nunca via `process.env` direto |
| `packages/api/src/integrations/certisign/certisign.client.ts` | Cliente Certisign ICP-Brasil com circuit breaker manual (threshold 3, reset 30s) |
| `packages/api/src/services/pdf.service.ts` | `generatePdfBuffer()`, `generateAndStorePdf()`, `getSignedPdfUrl()` (TTL 24h) |
| `packages/ai-core/src/pdf/pdf-generation.worker.ts` | BullMQ worker concorrência 3, retry exponencial 30s/2min/10min, idempotência |
| `packages/api/src/queues/config.ts` | Fila `pdf-generation` adicionada (QUEUE_NAMES + QUEUE_CONFIG) |
| `packages/api/src/queues/queues.ts` | `pdfGenerationQueue` exportada |
| `packages/api/src/routes/notas.routes.ts` | `POST /exportar-pdf` (202), `GET /pdf-url`, `GET /consultas/:id/pdf-status` |
| `apps/mobile/app/consulta/pdf/[id].tsx` | Tela polling 3s, badge ICP-Brasil, aviso `ready_unsigned`, Linking.openURL |
| `packages/api/src/integrations/certisign/__tests__/certisign.client.test.ts` | 5 testes circuit breaker |

**QA Gate:** CONCERNS — 1 HIGH (tech debt pdfkit), 2 MEDIUM corrigidos in-loco.

**Fixes aplicados pelo QA:**
- Migration 008 estendida com `ready_unsigned` no CHECK constraint (worker falharia silenciosamente no DB)
- `PdfStatus` importado de `@aiscribe/shared` em vez de redefinido localmente na tela mobile

---

## Commits do Epic 3 (6 commits)

```
9170476  fix: QA Story 3.3 — CHECK constraint + shared PdfStatus import
d9933b8  feat: Story 3.3 — PDF Export & Digital Signature (Epic 3)
c363cfb  fix: QA Story 3.2 — 'use client' RN, imports, dead code
1ec919c  feat: Story 3.2 — Note Approval & Persistence (Epic 3)
6e64691  feat: Story 3.1 — SOAP Note Review Screen (Epic 3)
```

**Total Epic 3:** 30 arquivos, +3.786 linhas de código/testes

---

## Estado Atual do Projeto

### Progresso dos Epics

| Epic | Status | Stories Done |
|---|---|---|
| **E1 — Foundation & Auth** | ⚠️ Não iniciado | 0/? |
| **E2 — Core AI Scribe** | ✅ Done | 5/5 |
| **E3 — Review & Approval Flow** | ✅ Done | 3/3 |
| **E4 — Templates & Especialidades** | 🔜 Backlog | 0/? |
| **E5 — Integrações & Follow-up** | 🔜 Backlog | 0/? |
| **E6 — Agendamento & Operações** | 🔜 Backlog | 0/? |
| **E7 — Growth & Monetização** | 🔜 Backlog | 0/? |

> **Nota crítica:** E2 e E3 foram implementados antes de E1. O MVP funciona em código, mas sem a camada de autenticação e infraestrutura de E1, não pode ser deployado em produção.

---

## Tech Debt Acumulado (priorizado)

### 🔴 CRÍTICO — bloqueia produção

| # | Issue | Origem | Arquivo |
|---|---|---|---|
| TD-01 | **Auth middleware ausente** — todos os endpoints sem JWT/RLS | E1 não implementado | `packages/api/src/routes/*.routes.ts` |
| TD-02 | **Server.ts não existe** — API Fastify sem ponto de entrada | E1 não implementado | `packages/api/src/server.ts` |
| TD-03 | **`pdfkit` não instalado** — `generatePdfBuffer()` gera texto, não PDF real | Story 3.3 | `packages/api/src/services/pdf.service.ts` |
| TD-04 | **Bucket `notas-pdf` não criado** no Supabase Storage | Story 3.3 | Via CLI/dashboard Supabase |

### 🟡 ALTO — funcional mas inseguro

| # | Issue | Origem | Arquivo |
|---|---|---|---|
| TD-05 | **AsyncStorage PII plaintext** — notas SOAP (dados paciente) sem criptografia | Story 3.1 | `apps/mobile/hooks/useSoapDraft.ts` |
| TD-06 | **Race condition TOCTOU** em `aprovarNota()` — duas chamadas concorrentes podem duplicar aprovação | Story 3.2 | `packages/api/src/services/nota.service.ts` |

### 🟢 MÉDIO — melhoria de qualidade

| # | Issue | Arquivo |
|---|---|---|
| TD-07 | `MEDICO_ID_PLACEHOLDER` hardcoded na tela de aprovação | `apps/mobile/app/consulta/aprovar/[id].tsx:23` |
| TD-08 | Testes de segurança cross-médico pendentes (RLS) | Aguarda TD-01 |
| TD-09 | Testes E2E Playwright da Story 3.3 pendentes (requer sandbox Certisign) | `apps/mobile/e2e/` |
| TD-10 | `notas.routes.ts` importa `zod` mas `zod` pode não estar no package.json da API | `packages/api/package.json` |

---

## O Que Fazer Depois

### 🔴 Prioridade 1 — Epic 1 (Foundation & Auth) — BLOQUEANTE

**Sem E1, o produto não vai a produção.** E1 precisa ser implementado antes de qualquer deploy.

**O que E1 precisa entregar:**

```
packages/api/src/server.ts              ← ponto de entrada Fastify (registrar routes)
packages/api/src/middleware/auth.ts     ← JWT middleware via Supabase Auth
supabase/migrations/001_create_users.sql
supabase/migrations/002_create_medicos.sql
apps/mobile/app/(auth)/login.tsx        ← tela de login
apps/mobile/app/(auth)/onboarding.tsx  ← fluxo onboarding 4 telas
apps/mobile/stores/auth.store.ts        ← Zustand store de autenticação
packages/api/src/config/supabase.ts    ← cliente admin separado do anon
CI/CD                                   ← GitHub Actions → Vercel + EAS Build
```

**Desbloqueios que E1 resolve:**
- TD-01, TD-02: auth middleware e server.ts
- TD-07: `medico_id` virá do JWT, não placeholder
- TD-08: testes de segurança cross-médico executáveis

### 🟡 Prioridade 2 — Fixes de Tech Debt Urgentes (paralelo ao E1)

```bash
# TD-03: instalar pdfkit
npm add pdfkit @types/pdfkit --workspace=@aiscribe/api

# TD-04: criar bucket Supabase Storage (via CLI)
supabase storage create notas-pdf --region sa-east-1 --private

# TD-05: migrar AsyncStorage para expo-secure-store
# apps/mobile/hooks/useSoapDraft.ts — encriptar antes de persistir

# TD-06: fix race condition em aprovarNota()
# Usar UPDATE ... WHERE status = 'draft' RETURNING * (atômico, sem SELECT prévio)
```

### 🟢 Prioridade 3 — Epic 4 (Templates & Especialidades)

**Depois de E1 em produção**, o próximo passo de produto é E4:

| Feature | FR do PRD |
|---|---|
| Templates de nota por especialidade (cardiologia, pediatria, etc.) | FR6 |
| Histórico de pacientes com notas anteriores | — |
| Sugestão de CID-10 melhorada (além das geradas pelo pipeline) | FR9 |
| Dashboard do médico (visão do dia em cards) | Core Screen 1 |

### 🔵 Prioridade 4 — Epic 5 (Integrações & Follow-up)

| Feature | FR do PRD |
|---|---|
| Integração MV Saúde via FHIR R4 | FR4 |
| Integração Tasy/Philips via FHIR R4 | FR4 |
| Notificações pós-consulta WhatsApp (Evolution API) | FR7 |
| Notificações SMS (Twilio) | FR7 |

### 🔵 Prioridade 5 — Epics 6 e 7

- **E6:** Agendamento inteligente, confirmações automáticas, painel financeiro
- **E7:** Planos de assinatura, onboarding self-service, métricas, referral

---

## Variáveis de Ambiente Necessárias para Produção

```env
# Supabase (já configurado parcialmente)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Certisign ICP-Brasil (gerenciado pelo @devops no Railway)
CERTISIGN_API_KEY=
CERTISIGN_CERT_ID=
CERTISIGN_BASE_URL=https://api.certisign.com.br/api/v1  # produção

# Redis (BullMQ)
REDIS_URL=

# OpenAI (Epic 2 — já em uso)
OPENAI_API_KEY=

# Mobile
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=
```

---

## Endpoints Implementados (referência completa)

| Método | Path | Story | Descrição |
|---|---|---|---|
| `GET` | `/api/v1/consultas/:id/status` | 2.5 | Status do pipeline (transcrição + nota) |
| `POST` | `/api/v1/consultas` | 2.5 | Criar nova consulta |
| `GET` | `/api/v1/notas/consulta/:consultaId` | 3.1 | Carregar nota SOAP completa |
| `PATCH` | `/api/v1/notas/:id` | 3.2 | Salvar rascunho editado (sem alterar status) |
| `POST` | `/api/v1/notas/:id/aprovar` | 3.2 | Aprovar nota (draft → approved) |
| `POST` | `/api/v1/notas/:id/exportar-pdf` | 3.3 | Enfileirar geração de PDF (202 Accepted) |
| `GET` | `/api/v1/notas/:id/pdf-url` | 3.3 | Signed URL 24h para download |
| `GET` | `/api/v1/consultas/:id/pdf-status` | 3.3 | Polling do status de geração |

---

## Filas BullMQ (referência)

| Fila | Worker | Concorrência | Retry |
|---|---|---|---|
| `audio-upload` | AudioUploadWorker | 10 | 3x exponencial 5s |
| `transcription` | TranscriptionWorker (Whisper) | 5 | 3x exponencial 10s |
| `note-generation` | NoteGenerationWorker (GPT-4o) | 10 | 2x exponencial 5s |
| `pdf-generation` | PdfGenerationWorker (Certisign) | 3 | 3x exponencial 30s |

---

## Banco de Dados — Migrations Aplicadas

| Migration | Story | Descrição |
|---|---|---|
| 001 | E1 | `create_users` (pendente E1) |
| 002 | E1 | `create_medicos` (pendente E1) |
| 003 | 2.x | `create_consultas` |
| 004 | 2.x | `create_transcricoes` |
| 005 | 2.3 | `create_notas` + `create_notas_versoes` + RLS + triggers |
| 006 | 2.x | (verificar — pode existir) |
| 007 | 3.2 | `nota_approval` — `approved_by`, `approved_at`, `pdf_status` |
| 008 | 3.3 | `nota_pdf` — `pdf_url`, `pdf_signed`, estende CHECK `pdf_status` |

---

*Documento gerado ao fim da sessão de 2026-05-26 — Epic 3 completo e publicado no GitHub.*
