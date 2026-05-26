# Epic 3 — Review & Approval Flow

> **Criado por:** Morgan (@pm) | **Data:** 2026-05-25 | **Status:** Draft

---

## Epic Goal

Entregar a interface de revisão, edição inline e aprovação da nota SOAP gerada pela IA, finalizando o fluxo com exportação de PDF clínico com assinatura digital ICP-Brasil — completando o MVP mínimo (E1 + E2 + **E3**) e tornando o produto utilizável em ambiente clínico real.

---

## Existing System Context

- **Sistema atual:** Epic 2 (Core AI Scribe) entregou pipeline completo de gravação → transcrição Whisper PT-BR → geração de nota SOAP via GPT-4o → fila BullMQ com status (stories 2.1–2.5, todas Done)
- **Stack relevante:** React Native + Expo (mobile), Next.js 16+ (web), Fastify (API), Supabase PostgreSQL sa-east-1, Redis/BullMQ
- **Ponto de integração:** `GET /api/consultas/:id/status` retorna estado do pipeline; a nota SOAP gerada está persistida no banco após Story 2.3
- **Padrões existentes:** Todos os endpoints seguem Fastify + TypeScript; dados de paciente criptografados AES-256; autenticação via Supabase Auth

---

## Enhancement Details

**O que está sendo adicionado:**
- Tela de revisão da nota SOAP com edição inline por seção (S, O, A, P)
- Fluxo de aprovação da nota com um toque e persistência final no banco
- Geração de PDF clínico com assinatura digital ICP-Brasil (Certisign API)

**Como integra ao sistema existente:**
- Consome a nota SOAP já gerada e persistida pelo pipeline do Epic 2
- Adiciona endpoints de PATCH/PUT para edição e aprovação de notas
- PDF gerado no backend e armazenado no Supabase Storage (bucket privado, sa-east-1)

**Critérios de sucesso:**
- Médico consegue revisar, editar e aprovar uma nota SOAP em menos de 60 segundos
- PDF com assinatura digital gerado e disponível para download em < 10 segundos após aprovação
- Zero regressões nos endpoints do Epic 2

---

## Stories

### Story 3.1 — SOAP Note Review Screen

**Descrição:** Tela mobile-first (React Native) e web (Next.js) que exibe a nota SOAP gerada pela IA com edição inline por seção (Subjetivo, Objetivo, Avaliação, Plano). O médico pode corrigir qualquer seção antes de aprovar.

**Acceptance Criteria (rascunho):**
- Exibir nota SOAP dividida em 4 seções editáveis (S, O, A, P)
- Edição inline com auto-save de rascunho a cada 5s (não confirma até aprovação)
- Indicador visual de seções modificadas vs. geradas por IA
- Botão "Aprovar Nota" habilitado somente após médico visualizar todas as seções
- Funciona offline: edições salvas localmente e sincronizadas ao reconectar (NFR4)

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: ["code-review", "accessibility-review", "e2e-test"]
```

**Quality Gates:**
- Pre-Commit: ESLint + TypeScript check + acessibilidade WCAG AA
- Pre-PR: Revisão de padrões de componentes React Native + Next.js

**Agentes envolvidos:** @dev (implementação), @architect (validação de padrões UI), @ux-design-expert (referência ao frontend-spec.md — tela "Revisão de Nota")

---

### Story 3.2 — Note Approval & Persistence

**Descrição:** Backend Fastify que processa a aprovação da nota editada pelo médico — persiste versão final no Supabase, cria histórico de versões (draft → approved) e registra quem aprovou e quando.

**Acceptance Criteria (rascunho):**
- `PATCH /api/consultas/:id/nota` — salva edições de rascunho (não finaliza)
- `POST /api/consultas/:id/nota/aprovar` — finaliza nota (status: approved), cria snapshot imutável
- Campo `approved_by` (medico_id) + `approved_at` (timestamp) obrigatórios na aprovação
- Histórico de versões: todas as edições intermediárias preservadas (auditoria LGPD)
- Idempotência: chamar aprovação duas vezes não duplica nem rejeita — retorna o estado atual
- RLS: médico só aprova notas de suas próprias consultas

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: ["code-review", "rls-validation", "api-contract-test"]
```

**Quality Gates:**
- Pre-Commit: RLS policy validation, schema migration safety
- Pre-PR: API contract validation, backward compatibility com Story 2.3

**Agentes envolvidos:** @dev (implementação), @architect (RLS + contrato de API), @data-engineer (schema de versionamento se necessário)

---

### Story 3.3 — PDF Export & Digital Signature

**Descrição:** Geração de PDF clínico formatado a partir da nota aprovada, com assinatura digital ICP-Brasil via Certisign API, e armazenamento no Supabase Storage com URL de download temporária (signed URL).

**Acceptance Criteria (rascunho):**
- `POST /api/consultas/:id/nota/exportar-pdf` — dispara geração assíncrona via BullMQ
- PDF gerado com: dados do médico (CRM, nome), dados da consulta (data, duração), nota SOAP formatada, rodapé legal
- Assinatura digital ICP-Brasil integrada via Certisign API — certificado armazenado com segurança (nunca em log)
- PDF armazenado no Supabase Storage (bucket privado, sa-east-1) com signed URL de 24h para download
- Status de geração acessível via `GET /api/consultas/:id/pdf-status` (pending → processing → ready | failed)
- Geração concluída em < 10s para 90% dos casos (P90)

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: ["code-review", "security-scan", "integration-test"]
```

**Quality Gates:**
- Pre-Commit: Scan de segredos (Certisign credentials não podem estar em código), validação de signed URLs
- Pre-PR: Revisão de integração com API externa, plano de rollback se Certisign indisponível
- Pre-Deployment: Teste de integração real com sandbox Certisign

**Agentes envolvidos:** @dev (implementação), @architect (segurança de integração externa + fallback strategy), @devops (gestão de secrets Certisign no Railway)

---

## Compatibility Requirements

- [ ] Endpoints do Epic 2 (`/api/consultas/:id/status`, pipeline BullMQ) permanecem inalterados
- [ ] Schema do banco: novas colunas/tabelas apenas aditivas (sem ALTER de colunas existentes)
- [ ] UI mobile: novos componentes seguem o design system existente (cores, tipografia, espaçamento)
- [ ] Dados de paciente continuam criptografados AES-256 em trânsito e em repouso (NFR5)

---

## Risk Mitigation

**Risco principal:** Integração com Certisign API (serviço externo) pode ter instabilidade ou mudanças de contrato.

**Mitigação:**
- Implementar circuit breaker: se Certisign falhar, PDF é gerado sem assinatura digital e marcado como "pendente de assinatura"
- Sandbox Certisign para todos os testes até pré-produção
- Variáveis de ambiente no Railway — credenciais nunca no código

**Plano de rollback:**
- Story 3.1 e 3.2 são independentes de APIs externas — rollback individual se necessário
- Story 3.3: desabilitar feature flag de assinatura digital, PDF simples como fallback

**Estratégia de qualidade proativa:**
- CodeRabbit em modo light no dev phase (CRITICAL + HIGH auto-fix, max 2 iterações)
- CodeRabbit em modo full no QA gate (pré-PR)
- @architect valida contratos de API de todas as 3 stories antes do merge

---

## Validation Checklist

**Scope:**
- [x] Epic pode ser completado em 1–3 stories (exatamente 3)
- [x] Nenhuma mudança arquitetural maior — integração com stack existente
- [x] Enhancement segue padrões existentes (Fastify, Supabase, BullMQ)
- [x] Complexidade de integração é gerenciável (1 API externa: Certisign)

**Risk:**
- [x] Risco ao sistema existente é baixo — stories 3.1 e 3.2 são puramente aditivas
- [x] Story 3.3 tem plano de rollback (circuit breaker + feature flag)
- [x] Abordagem de testes cobre funcionalidade existente (sem regressão nos endpoints do Epic 2)
- [x] Time tem conhecimento suficiente dos pontos de integração (pipeline BullMQ já implementado em 2.5)

**Completeness:**
- [x] Goal do epic é claro e atingível dentro do MVP
- [x] Stories são adequadamente escopadas (1 tela, 1 fluxo de backend, 1 integração externa)
- [x] Critérios de sucesso são mensuráveis (< 60s revisão, < 10s PDF)
- [x] Dependência mapeada: Epic 2 (todas as stories Done) é pré-requisito

---

## Definition of Done

- [ ] Story 3.1: Médico consegue revisar e editar a nota SOAP no mobile e na web
- [ ] Story 3.2: Aprovação persiste nota final com auditoria completa no banco
- [ ] Story 3.3: PDF com assinatura digital gerado e disponível via signed URL
- [ ] Funcionalidade do Epic 2 verificada sem regressões
- [ ] Testes E2E (Playwright) cobrindo o fluxo completo: nota gerada → revisão → aprovação → PDF
- [ ] Documentação de API atualizada (endpoints novos documentados)

---

## Codebase Intelligence

> Code intelligence provider não disponível — seção gerada com base em análise manual do repositório.

| Referência | Detalhe |
|-----------|---------|
| Nota SOAP gerada | `packages/ai-core` → persistida via Story 2.3 |
| Fila assíncrona | `BullMQ` via Story 2.5 — reutilizar para geração de PDF (Story 3.3) |
| Autenticação | Supabase Auth — reutilizar middleware existente |
| Storage | Supabase Storage (sa-east-1) — bucket privado já configurado |
| Ponto de entrada de status | `GET /api/consultas/:id/status` — estender para incluir status do PDF |

---

## Story Manager Handoff

> Para @sm (Max): desenvolver stories detalhadas para este epic brownfield.

**Contexto do sistema existente:**
- Stack: React Native + Expo (mobile), Next.js 16+ (web), Fastify + TypeScript (API), Supabase PostgreSQL sa-east-1
- Pipeline de AI completo entregue no Epic 2 (stories 2.1–2.5 Done) — nota SOAP já persiste no banco após consulta
- Padrões a seguir: Supabase Auth middleware, BullMQ para jobs assíncronos, RLS em todas as tabelas de paciente

**Pontos de integração críticos:**
- Story 3.1 consome a nota SOAP existente do banco (endpoint a definir, provavelmente `GET /api/consultas/:id/nota`)
- Story 3.2 adiciona PATCH + POST de aprovação sobre o recurso de nota
- Story 3.3 reutiliza a fila BullMQ do Epic 2 para geração assíncrona de PDF

**Requisitos de compatibilidade críticos:**
- Nenhuma alteração em endpoints existentes do Epic 2
- Schema aditivo apenas (sem breaking changes no banco)
- Credenciais Certisign gerenciadas via Railway env vars — nunca hardcoded

**O epic deve manter a integridade do sistema enquanto entrega:** Interface de revisão + aprovação + exportação PDF, completando o MVP lançável (E1 + E2 + E3).

---

*— Morgan, planejando o futuro 📊*
