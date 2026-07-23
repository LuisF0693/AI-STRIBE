# Sessão 2026-07-22 — Epic 1 Criado + Saga de Fix do Deploy Vercel

> **Projeto:** AI Scribe PT-BR
> **Repositório:** https://github.com/LuisF0693/AI-STRIBE
> **Deploy Web:** https://ai-stribe.vercel.app
> **Branch:** `master`
> **Agentes ativos:** Orion (Orchestrator), Morgan (PM), Aria (Architect), Dex (Dev), Gage (DevOps)

---

## Contexto de entrada

Sessão retomada após ~2 meses parada (último commit anterior: `14bdd11`, 2026-05-26, fim do Epic 3). Objetivo do usuário: entender o estado do projeto e dar prosseguimento.

---

## O que foi feito hoje

### 1. Epic 1 — Foundation & Auth criado (Draft)

`@pm` (Morgan) formalizou `docs/stories/epic-1-foundation-auth.md` com 4 stories:

| Story | Objetivo | Resolve |
|---|---|---|
| 1.1 | API Foundation & CI/CD — `server.ts` Fastify + `supabaseAdmin` + GitHub Actions/Vercel/EAS | TD-02 |
| 1.2 | Auth Schema & JWT Middleware — migrations `users`/`medicos` + `auth.ts` + RLS base | habilita TD-08 |
| 1.3 | Mobile Onboarding & Login — telas `(auth)` 4-telas + `auth.store` Zustand | NFR6 |
| 1.4 | Auth Retrofit — aplica middleware às rotas E2/E3, `medico_id` do JWT (não mais placeholder) | TD-01/TD-07 |

**Status:** ainda em Draft. Falta @po validar (`*validate-story-draft`) e @sm quebrar em stories formais `.story.md` antes do @dev implementar de verdade.

Gaps sinalizados pelo @pm (sem decidir sozinho, para @po/@architect resolverem):
- Tabela `pacientes` referenciada em migration 003 mas nunca migrada
- Migration `006` ausente na sequência

### 2. Incidente: deploy Vercel quebrado — descoberto e corrigido em 3 camadas

O usuário reportou erro de build. Investigação revelou **três problemas empilhados**, corrigidos em sequência:

#### Camada 1 — ERESOLVE em `apps/mobile` (commit `bac84a3`)

`react-native-screens: "^4.0.0"` havia driftado pra `4.25.2`, que exige `react-native >=0.82.0`, incompatível com `react-native@0.76.0` (Expo SDK 52) pinado no projeto. Como é monorepo npm workspaces, o `npm install` na raiz (usado pela Vercel) resolve todos os workspaces juntos — inclusive o mobile, que nem é usado no deploy web.

**Fix:** pin `react-native-screens@~4.4.0` (versão correta confirmada via `bundledNativeModules.json` do Expo SDK 52) + fix de conflito secundário em `react-test-renderer` (pin `18.3.1`) + **primeiro `package-lock.json` já commitado no repo** (não existia lockfile algum antes).

#### Camada 2 — `apps/web` nunca foi scaffoldado de verdade (commits `45cb4f0` + `3ba71c5`)

Descoberta: `apps/web` só tinha 3 arquivos soltos da Story 3.1 (`app/nota/[id]/page.tsx`, `hooks/useSoapDraftWeb.ts`, `lib/supabase.ts`) — sem `package.json`, `next.config`, `tsconfig.json`, sem `next` como dependência em lugar nenhum do repo. Mesmo corrigindo o ERESOLVE, o build continuaria falhando por falta de projeto.

Descoberta adicional: **o monorepo inteiro não tinha nenhum `tsconfig.json` nem ESLint real** — os scripts `typecheck`/`lint` eram stubs via `turbo run`, e o `turbo` (resolvido em 2.10.6) estava quebrado por falta do campo `packageManager` (Corepack). Ou seja, os quality gates dos Epics 2/3 que registraram "TypeScript check"/"ESLint" como aplicados provavelmente nunca rodaram de verdade.

`@architect` (Aria) produziu um ADR completo (`docs/architecture/scaffold-web-e-config-monorepo.md`) definindo: scaffold Next.js 16 + Tailwind v4 pro `apps/web`, estratégia de `tsconfig.base.json` + por-workspace, ESLint flat config por-workspace (fase 1: só web), fix do `turbo` via `packageManager: "npm@11.7.0"` + `engines.node: ">=20.9.0"`, e mapeamento do risco de React 19 (web) coexistindo com React 18 (mobile) no mesmo `npm install`.

`@dev` (Dex) implementou o ADR à risca. Resultado: `apps/web` builda limpo localmente. **Efeito colateral esperado:** typecheck real agora roda e revela dívida técnica pré-existente em `packages/ai-core`, `packages/api` e `apps/mobile` (deps faltando como `openai`/`bullmq`, `any` implícito) — não bloqueia o web, mas ficou registrado como tech debt novo pra tratar depois. Jest do mobile também está quebrado (falta `jest.setup.ts` nunca commitado, pré-existente).

#### Camada 3 — Lockfile sem binários nativos Linux (commit `4dc0062`)

Depois de configurar `Root Directory = apps/web` na Vercel (resolveu a Vercel tentar buildar o monorepo inteiro), surgiu: `Cannot find module '../lightningcss.linux-x64-gnu.node'`.

**Causa:** o `package-lock.json` foi gerado numa máquina Windows. Ele lista as variantes de plataforma de `lightningcss`/`@tailwindcss/oxide` (dependências nativas do Tailwind v4) em `optionalDependencies`, mas só tem **entrada real resolvida** (`resolved`+`integrity`) pra variante `win32-x64-msvc`. As variantes Linux nunca foram materializadas no lockfile, então o `npm install` da Vercel (Linux) não sabia de onde baixar o binário.

**Fix:** as flags `npm install --os=linux --cpu=x64 --libc=glibc` (feature real do npm 9+, pensada exatamente pra esse cenário) não funcionaram no npm 11.7 local — o npm se recusou a materializar nós de plataforma estrangeira via CLI. @dev descobriu que `@next/swc-linux-x64-gnu` já existia no lockfile Windows com `resolved`+`integrity` (prova de que o npm preserva opcionais estrangeiros quando têm integrity), e replicou esse padrão manualmente: buscou os metadados reais via `npm view` no registro npm e inseriu 4 entradas Linux no lockfile (`lightningcss` em 2 posições, `@tailwindcss/oxide`, `@unrs/resolver-binding`), sem remover nenhuma entrada Windows.

**Sinalizado, não corrigido:** `@img/sharp` tem o mesmo padrão (só entrada Windows) — não bloqueia hoje porque a Vercel usa o sharp dela própria pra otimização de imagem, mas fica de olho.

---

## Estado ao final da sessão

### Commits pushed hoje (todos em `origin/master`)

```
bac84a3  fix: pin react-native-screens ~4.4.0 e react-test-renderer 18.3.1 (ERESOLVE)
45cb4f0  feat: scaffold apps/web (Next.js 16) + tsconfig/eslint/turbo config
3ba71c5  docs: Epic 1 (Foundation & Auth) e ADR de scaffold do apps/web
8434305  chore: trigger Vercel redeploy
4dc0062  fix(deps): add Linux x64 native binary entries to lockfile
```

### Configuração manual aplicada pelo usuário na Vercel

- ✅ Root Directory → `apps/web`
- ✅ Node.js Version → 20.x/22.x (a confirmar qual exatamente foi selecionada)
- ⏳ Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — pedidas, status de preenchimento não confirmado nesta sessão

### Deploy — status no fim da sessão

**Ainda não testado.** O fix da Camada 3 (`4dc0062`) foi pushed mas o usuário decidiu testar o redeploy só amanhã. Progressão observada dos erros (cada um mais longe que o anterior, confirmando que estamos convergindo):
1. ERESOLVE no `npm install` (~8s de build) → corrigido
2. Build de todo o monorepo, falha no `@aiscribe/api` (~5s de build turbo) → corrigido (Root Directory)
3. `next build` do `apps/web` chega a rodar e falha no CSS/lightningcss (~5s de `next build`, depois de `npm install` de 36s bem-sucedido) → corrigido nesta sessão, **não testado ainda**

---

## Para amanhã — próximos passos

### Imediato — validar o deploy

1. Disparar novo deploy na Vercel (o push de `4dc0062` já devia ter auto-disparado um; se não, redeploy manual do commit `4dc0062`, **não** de um commit antigo).
2. Se der outro erro, mandar o log completo (do início ao `Error:` final) — o padrão desta sessão foi: cada camada de erro só aparece depois de resolver a anterior, então é bem possível que apareça mais 1-2 obstáculos antes do deploy realmente ficar verde (ex.: as env vars do Supabase, se não estiverem configuradas, vão quebrar em runtime, não em build).
3. Confirmar as env vars `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` na Vercel, se ainda não confirmado.

### Depois do deploy validado — tech debt revelado hoje

Formalizar como tech debt (provavelmente com `@qa` revisitando os gates antigos dos Epics 2/3):
- `packages/ai-core`/`packages/api` falham typecheck real (deps faltando: `openai`, `bullmq`; `any` implícito; erros de `noUncheckedIndexedAccess`)
- Jest do `apps/mobile` quebrado (`jest.setup.ts` referenciado mas nunca commitado)
- 1 erro de lint real em `apps/mobile`... **não**, em `apps/web/hooks/useSoapDraftWeb.ts` (`react-hooks/set-state-in-effect`), pré-existente da Story 3.1
- ESLint ainda não configurado em `apps/mobile`/`packages/*` (Fase 2 do ADR, deliberadamente adiada)
- `@img/sharp` com o mesmo padrão de lockfile só-Windows (baixo risco, mas registrar)
- `tsconfig.build.json` do `packages/api` não existe — `noEmit: true` deixa o typecheck correto mas o script `build` real (`tsc` com emit) não funciona; não bloqueia porque o deploy do `api` é planejado pro Railway via `tsx`, não Vercel

### Depois disso — retomar Epic 1

`@po` valida o epic (`*validate-story-draft`) → `@sm` quebra em stories formais → ciclo normal SDC (`@dev` implementa → `@qa` gate → `@devops` push). Prioridade continua sendo Epic 1 (Foundation & Auth) — é o bloqueio real pra produção (sem auth/RLS, o produto não pode ir ao ar de verdade, mesmo com o deploy funcionando).

---

*Documento gerado ao fim da sessão de 2026-07-22.*
