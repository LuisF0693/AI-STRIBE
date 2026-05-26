# Source Tree — AI Scribe PT-BR

> Shard do `docs/architecture.md` — Seção 12

## Estrutura do Monorepo (Turborepo)

```
ai-scribe-pt-br/
├── .github/
│   └── workflows/
│       ├── ci.yaml
│       ├── deploy-web.yaml
│       └── deploy-api.yaml
├── apps/
│   ├── mobile/                     # React Native + Expo SDK 52
│   │   ├── app/                    # Expo Router (file-based routing)
│   │   │   ├── (auth)/
│   │   │   │   ├── login.tsx
│   │   │   │   └── register.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx       # Home / Dashboard do dia
│   │   │   │   ├── historico.tsx   # Histórico de pacientes
│   │   │   │   └── configuracoes.tsx
│   │   │   ├── consulta/
│   │   │   │   ├── ativa.tsx       # Gravação ativa
│   │   │   │   └── revisao/[id].tsx # Revisão da nota SOAP
│   │   │   └── _layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                 # Button, Text, Card, Input
│   │   │   ├── consulta/           # ConsultaCard, TimerDisplay, StatusBadge
│   │   │   └── nota/               # SoapEditor, CidSugestao
│   │   ├── hooks/
│   │   │   ├── useAudioRecorder.ts
│   │   │   ├── useConsultaStatus.ts # Realtime subscription
│   │   │   └── useAuth.ts
│   │   ├── services/
│   │   │   ├── api.ts              # HTTP client configurado
│   │   │   ├── audio.service.ts    # AudioRecorderService + compressão
│   │   │   └── consulta.service.ts
│   │   ├── stores/
│   │   │   ├── auth.store.ts       # Zustand: sessão médico
│   │   │   └── consulta.store.ts   # Zustand: consulta ativa
│   │   ├── utils/
│   │   │   ├── supabase.ts
│   │   │   └── formatting.ts
│   │   ├── ios/                    # Config nativa iOS
│   │   ├── android/                # Config nativa Android
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── web/                        # Next.js 16+ App Router
│       ├── app/
│       │   ├── (auth)/
│       │   ├── dashboard/
│       │   └── nota/[id]/
│       ├── components/
│       ├── lib/
│       │   └── supabase.ts
│       └── package.json
│
├── packages/
│   ├── api/                        # Fastify 5 + TypeScript
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── consultas.routes.ts
│   │   │   │   ├── audio.routes.ts
│   │   │   │   ├── transcricoes.routes.ts
│   │   │   │   ├── notas.routes.ts
│   │   │   │   ├── pacientes.routes.ts
│   │   │   │   └── health.routes.ts
│   │   │   ├── services/
│   │   │   │   ├── audio.service.ts
│   │   │   │   ├── consulta.service.ts
│   │   │   │   ├── nota.service.ts
│   │   │   │   └── notification.service.ts
│   │   │   ├── repositories/
│   │   │   │   ├── consulta.repository.ts
│   │   │   │   ├── transcricao.repository.ts
│   │   │   │   └── nota.repository.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   └── rate-limit.middleware.ts
│   │   │   ├── plugins/
│   │   │   │   ├── supabase.plugin.ts
│   │   │   │   └── bullmq.plugin.ts
│   │   │   └── server.ts
│   │   └── package.json
│   │
│   ├── ai-core/                    # Workers BullMQ + OpenAI
│   │   ├── src/
│   │   │   ├── workers/
│   │   │   │   ├── transcription.worker.ts  # Whisper
│   │   │   │   └── note-generation.worker.ts # GPT-4o
│   │   │   ├── recording/
│   │   │   │   └── audio-recorder.service.ts # (mobile-side logic)
│   │   │   ├── prompts/
│   │   │   │   ├── soap-note.prompt.ts
│   │   │   │   └── especialidades/           # Prompts por especialidade
│   │   │   └── utils/
│   │   │       ├── audio-chunker.ts
│   │   │       └── cost-tracker.ts
│   │   └── package.json
│   │
│   └── shared/                     # Types, schemas, constants
│       ├── src/
│       │   ├── types/
│       │   │   ├── medico.ts
│       │   │   ├── consulta.ts
│       │   │   ├── transcricao.ts
│       │   │   └── nota.ts
│       │   ├── schemas/            # Zod schemas compartilhados
│       │   └── constants/
│       └── package.json
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_create_medicos.sql
│   │   ├── 002_create_pacientes.sql
│   │   ├── 003_create_consultas.sql
│   │   ├── 004_create_transcricoes.sql
│   │   ├── 005_create_notas.sql
│   │   └── 006_create_templates.sql
│   └── seed.sql
│
├── docs/
│   ├── prd.md
│   ├── architecture.md
│   ├── architecture/
│   │   ├── pilha-tecnologica.md
│   │   ├── arvore-de-origem.md     # Este arquivo
│   │   └── padroes-de-codigo.md
│   └── stories/
│
├── .env.example
├── turbo.json
├── package.json
└── README.md
```
