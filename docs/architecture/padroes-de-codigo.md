# Coding Standards — AI Scribe PT-BR

> Shard do `docs/architecture.md` — Seções 17 e 18

## Regras Críticas

- **Type Sharing:** Sempre defina interfaces em `packages/shared/src/types/` e importe de lá — nunca redefina tipos localmente
- **API Calls:** Nunca use `fetch`/`axios` direto nos componentes — use sempre a service layer (`services/*.service.ts`)
- **Environment Variables:** Acesse via objeto de configuração — nunca `process.env.VAR` direto no código de negócio
- **Error Handling:** Toda rota Fastify usa `ApiError` padronizado — nunca `throw` sem catch estruturado
- **RLS Always:** Nunca use `supabaseAdmin` no cliente mobile — sempre o client com JWT do usuário
- **Audio Idempotência:** Nome do arquivo no Storage = SHA-256 do conteúdo — garante retry sem duplicação
- **Status Machine:** `consultas.status` só avança via `updateConsultaStatus()` — nunca UPDATE direto sem validação de transição

## Naming Conventions

| Elemento | Frontend | Backend | Exemplo |
|---------|----------|---------|---------|
| Componentes | PascalCase | — | `ConsultaAtiva.tsx` |
| Hooks | camelCase + `use` | — | `useConsultaStatus.ts` |
| API Routes | — | kebab-case | `/api/v1/audio/upload-url` |
| DB Tables | — | snake_case | `consultas`, `transcricoes` |
| Services | camelCase | camelCase | `audioService`, `notaService` |
| Workers | PascalCase | PascalCase | `TranscriptionWorker` |
| Env Vars | SCREAMING_SNAKE | SCREAMING_SNAKE | `OPENAI_API_KEY` |

## Error Response Format

```typescript
interface ApiError {
  error: {
    code: string;           // Ex: 'UPLOAD_FAILED', 'TRANSCRIPTION_TIMEOUT'
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
  };
}
```

## Códigos de Erro Padrão

| Code | HTTP | Situação |
|------|------|----------|
| `UNAUTHORIZED` | 401 | Token ausente ou inválido |
| `FORBIDDEN` | 403 | RLS bloqueou acesso |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `VALIDATION_ERROR` | 400 | Input inválido (Zod) |
| `UPLOAD_FAILED` | 500 | Falha no upload de áudio |
| `TRANSCRIPTION_TIMEOUT` | 500 | Whisper demorou mais de 90s |
| `NOTE_GENERATION_FAILED` | 500 | GPT-4o retornou erro |
| `QUEUE_FULL` | 503 | BullMQ acima do limite |
