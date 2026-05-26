# AI Scribe PT-BR — Product Requirements Document (PRD)

> **Versão:** 0.1 | **Status:** Draft | **Autor:** Morgan (PM) | **Data:** 2026-04-10

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-04-10 | 0.1 | Versão inicial — baseada em pesquisa de mercado Atlas | Morgan (PM) |

---

## Goals

- Reduzir em **50%+ o tempo** que médicos brasileiros gastam com documentação clínica (PEP/prontuário)
- Oferecer **transcrição e sumarização automática de consultas** em português brasileiro com terminologia médica nativa
- Democratizar o acesso à IA clínica para **médicos independentes e pequenas clínicas** (hoje ignorados pelas soluções enterprise)
- Garantir **conformidade total com LGPD**, eliminando a barreira regulatória que impede adoção de ferramentas estrangeiras
- Integrar com os principais **PEPs brasileiros** (MV, Tasy, Philips) resolvendo o gap que players globais não endereçam
- Entregar uma experiência **mobile-first**, com setup zero e curva de aprendizado mínima

---

## Background Context

O mercado global de AI Scribe movimentou **US$ 600 milhões em 2025** — crescimento de 2,4x em 1 ano — porém essa categoria praticamente **não existe no Brasil**. Líderes globais como Nuance DAX (Microsoft), Abridge e Ambience Healthcare foram construídos para o ecossistema americano: integração nativa com Epic EHR, modelos treinados em inglês e estrutura regulatória do FDA. Nada disso se aplica ao Brasil.

No cenário nacional, apenas **17% dos médicos** utilizam IA no cotidiano clínico, mas **62,5% dos hospitais privados** já adotam alguma forma de automação. O gap está exatamente no médico individual e nas clínicas de pequeno/médio porte — segmento que representa a maioria da força médica brasileira e que hoje não tem solução acessível, em português, integrada aos sistemas locais.

---

## Requirements

### Functional Requirements

- **FR1:** Transcrição de consultas em tempo real com reconhecimento de voz otimizado para português brasileiro e terminologia clínica (CID-10, TUSS, nomenclaturas CFM)
- **FR2:** Geração automática de nota clínica estruturada (SOAP ou formato livre) ao fim de cada consulta
- **FR3:** Revisão, edição e aprovação da nota gerada pelo médico antes de salvar no prontuário
- **FR4:** Integração com PEPs/HIS brasileiros (MV Saúde, Tasy/Philips) via API ou exportação HL7 FHIR
- **FR5:** Aplicativo mobile (iOS e Android) como interface primária, sem necessidade de equipamento adicional
- **FR6:** Templates de nota customizáveis por especialidade (clínica geral, cardiologia, pediatria, ginecologia, etc.)
- **FR7:** Envio automático de lembretes e instruções pós-consulta ao paciente via WhatsApp ou SMS
- **FR8:** Módulo de agendamento inteligente com confirmação automática e gestão de lista de espera
- **FR9:** Sugestões de CID-10 e hipóteses diagnósticas baseadas no conteúdo da consulta (Clinical Decision Support leve)
- **FR10:** Exportação de nota clínica em PDF com assinatura digital compatível com CFM

### Non-Functional Requirements

- **NFR1:** Todos os dados de pacientes armazenados em servidores no Brasil — conformidade com LGPD (Lei 13.709/2018) e resoluções CFM
- **NFR2:** Latência de transcrição em tempo real não superior a 2 segundos entre fala e texto exibido
- **NFR3:** Precisão de reconhecimento de voz em português médico igual ou superior a 92%
- **NFR4:** Aplicativo mobile com modo offline básico (captura de áudio local) + sincronização ao reconectar
- **NFR5:** Criptografia end-to-end (AES-256) para gravações de áudio e dados de pacientes em trânsito e em repouso
- **NFR6:** Tempo de onboarding (instalação → primeira nota gerada) inferior a 10 minutos para 90% dos usuários
- **NFR7:** Disponibilidade mínima de 99,5% com janelas de manutenção fora do horário comercial
- **NFR8:** Custo por médico não superior a R$ 250/mês no plano base

---

## User Interface Design Goals

### Overall UX Vision
Experiência **invisível e confiável** — o médico não sente que está usando tecnologia, mas que a consulta "se documenta sozinha". Interface existe para confirmar, não interromper. Design minimalista, máximo de 2 toques para qualquer ação crítica.

### Key Interaction Paradigms
- **Ambient first:** gravação inicia com um toque, roda em background
- **Review & approve:** ao fim da consulta, nota gerada em tela cheia para revisão inline
- **Voice commands opcionais:** pausar/retomar sem tocar na tela
- **Card-based dashboard:** visão do dia em cards

### Core Screens
1. Home / Dashboard do Dia
2. Consulta Ativa (gravação)
3. Revisão de Nota (SOAP editável)
4. Histórico de Paciente
5. Templates de Especialidade
6. Configurações / Integrações
7. Onboarding Flow (4 telas)

### Accessibility
WCAG AA — contraste alto, fonte configurável, suporte a leitores de tela.

### Target Platforms
**Mobile-First (iOS + Android)** como primário. Web Responsive como secundário. Sem desktop nativo no MVP.

---

## Technical Assumptions

### Repository Structure
**Monorepo** (Turborepo):
- `apps/mobile` — React Native + Expo
- `apps/web` — Next.js 16+ App Router
- `packages/api` — Node.js + Fastify + TypeScript
- `packages/ai-core` — Motor de transcrição e NLP
- `packages/shared` — Types, utils, componentes compartilhados

### Service Architecture
Monolith modular para MVP:

| Camada | Tecnologia |
|--------|-----------|
| Mobile | React Native + Expo |
| Web | Next.js 16+ + TypeScript + Tailwind |
| Backend API | Node.js + Fastify + TypeScript |
| Banco de Dados | PostgreSQL via Supabase (sa-east-1) |
| AI / Transcrição | OpenAI Whisper (fine-tuned PT-BR) + GPT-4o |
| Fila | BullMQ + Redis |
| Storage | Supabase Storage (bucket privado, região BR) |
| Auth | Supabase Auth + MFA |
| Notificações | Twilio (SMS) + Evolution API (WhatsApp Business) |
| Assinatura Digital | ICP-Brasil / Certisign API |

### Testing Requirements
Unit + Integration como baseline + E2E (Playwright) para fluxos críticos. CI automatizado no GitHub Actions.

### Additional Technical Assumptions
- Fine-tuning do Whisper com corpus médico PT-BR é pré-requisito para NFR3
- Supabase na região São Paulo (sa-east-1) para LGPD
- FHIR R4 como padrão de interoperabilidade para integração com PEPs
- CI/CD: GitHub Actions → Vercel (web) + EAS Build (mobile)

---

## Epic List

| # | Epic | Objetivo | MVP? |
|---|------|----------|------|
| **E1** | Foundation & Auth | Monorepo, CI/CD, autenticação médico, onboarding e infraestrutura Supabase BR | ✅ |
| **E2** | Core AI Scribe | Gravação de consulta, transcrição Whisper PT-BR e geração de nota SOAP com GPT-4o | ✅ |
| **E3** | Review & Approval Flow | Interface de revisão, edição inline, aprovação e exportação PDF com assinatura digital | ✅ |
| **E4** | Templates & Especialidades | Templates customizáveis por especialidade, sugestão de CID-10, histórico de pacientes | — |
| **E5** | Integrações & Follow-up | Integração PEPs brasileiros (MV/Tasy via FHIR), notificações pós-consulta WhatsApp/SMS | — |
| **E6** | Agendamento & Operações | Módulo de agenda inteligente, confirmações automáticas, painel financeiro básico | — |
| **E7** | Growth & Monetização | Planos de assinatura, onboarding self-service, métricas de uso, programa de referral | — |

> **MVP mínimo para lançamento:** E1 + E2 + E3

---

## Next Steps

### Para @po (Product Owner)
Validar priorização dos Epics, definir valor de negócio por Epic e confirmar sequência de entrega com foco em ROI e time-to-market.

### Para @architect (Aria)
Com base nos requisitos técnicos e stack definida acima, criar documento de arquitetura detalhada — especialmente para o módulo de AI Core (Whisper fine-tuning, pipeline de processamento de áudio, integração FHIR).

### Para @ux-design-expert (Uma)
Com base nas Core Screens e UX Vision definidas, criar wireframes e protótipo navegável do fluxo principal: Onboarding → Consulta Ativa → Revisão de Nota.
