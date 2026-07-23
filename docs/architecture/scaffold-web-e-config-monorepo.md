# ADR — Scaffold do `apps/web` e Configuração do Monorepo (tsconfig / ESLint / Turbo)

> **Autor:** @architect (Aria) · **Data:** 2026-07-22 · **Status:** Proposto (aguarda implementação @dev)
> **Escopo:** Decisão de arquitetura. NÃO contém implementação — é o blueprint para o @dev criar os arquivos.
> **Fontes:** `docs/prd.md` (Technical Assumptions), `docs/architecture/pilha-tecnologica.md`, `docs/architecture/padroes-de-codigo.md`, imports reais dos 3 arquivos existentes em `apps/web`, `package.json` de todos os workspaces. Nada aqui é inventado fora dessas fontes (Article IV).

---

## 0. Fatos verificados (não re-investigar)

| Fato | Valor confirmado |
|------|------------------|
| npm local | `11.7.0` |
| Node local | `v25.4.0` |
| `package-lock.json` | existe na raiz |
| `turbo.json` | existe, já usa schema 2.x (`tasks`), outputs já incluem `.next/**` |
| `.npmrc` / `vercel.json` | **não existem** |
| tsconfig/eslint em qualquer workspace | **nenhum existe** (typecheck/lint são stubs) |
| `apps/web/lib/supabase.ts` importa | `@supabase/ssr` → `createBrowserClient` (**não** `@supabase/supabase-js` direto) |
| `apps/web/hooks/useSoapDraftWeb.ts` importa | `react`, `@aiscribe/shared` (types `SoapJson`, `CidSugestao`) |
| `apps/web/app/nota/[id]/page.tsx` importa | `react`, `next/navigation`, `@aiscribe/shared`, arquivos locais via caminho relativo |
| `@aiscribe/shared` | exporta **TS cru** (`main: ./src/index.ts`, `exports` apontam para `.ts`) — consumidores precisam transpilar |
| Mobile fixa | `react@18.3.1`, `react-native@0.76.0` (RN 0.76 exige React 18.3.1) |

**Requisitos externos confirmados por pesquisa (2026-07):**
- **Next.js 16** exige **Node ≥ 20.9.0** (Node 18 removido), **React 19.2**, **TypeScript ≥ 5.1**, `moduleResolution: "bundler"`.
- **Tailwind v4** usa `@tailwindcss/postcss` + `postcss.config.mjs` + `@import "tailwindcss";` no `globals.css` (sem `tailwind.config.js` obrigatório, sem diretivas `@tailwind`).
- **Next 16 removeu `next lint`** — lint agora é via ESLint CLI direto (`eslint .`), com `eslint-config-next` em flat config.

---

## 1. Scaffold do `apps/web` (Next.js 16 + App Router + TS + Tailwind v4)

### 1.1 `[AUTO-DECISION]` — Decisões de bandeira

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Diretório `src/` | **NÃO usar `src/`** | Os 3 arquivos já vivem em `app/`, `hooks/`, `lib/` na raiz do workspace. Adotar `src/` obrigaria mover arquivos e reescrever imports sem ganho. Mantém-se `app/ hooks/ lib/` na raiz. |
| Versão Next | `next@^16` (resolve 16.1.x) | PRD pede "16+". |
| React | `react@^19.2` + `react-dom@^19.2` | **Requisito rígido** do Next 16. Isolado do mobile (ver §5). |
| Router | App Router | Já em uso (arquivo em `app/nota/[id]/page.tsx`). |
| TanStack Query 5.x | **NÃO instalar agora (defer)** | Documentado em `pilha-tecnologica.md` como state web, mas **nenhum** dos 3 arquivos o importa. Instalar sem uso aumenta superfície de `npm install` (risco ERESOLVE) sem benefício. @dev adiciona na 1ª story que precisar. Marcado para revisão @po. |
| Supabase | `@supabase/ssr` + `@supabase/supabase-js` | `ssr` é o que o código usa; `supabase-js` é peer dep do `ssr` — fixar na **mesma versão do resto (`^2.43.0`)** para hoisting único. |

### 1.2 Arquivos a criar em `apps/web/`

```
apps/web/
├── package.json            (NOVO — ver §1.3)
├── tsconfig.json           (NOVO — ver §2.2)
├── next.config.mjs         (NOVO — ver §1.4)
├── postcss.config.mjs      (NOVO — ver §1.5)
├── eslint.config.mjs       (NOVO — ver §3)
├── next-env.d.ts           (GERADO pelo `next dev`/`next build` — não commitar conteúdo manual; adicionar ao .gitignore ou deixar Next criar)
├── app/
│   ├── layout.tsx          (NOVO — root layout obrigatório; ver §1.6)
│   ├── globals.css         (NOVO — `@import "tailwindcss";`)
│   └── nota/[id]/page.tsx  (JÁ EXISTE — ver §1.7 para ajuste opcional de imports)
├── hooks/
│   └── useSoapDraftWeb.ts  (JÁ EXISTE — sem mudança)
└── lib/
    └── supabase.ts         (JÁ EXISTE — sem mudança)
```

### 1.3 `apps/web/package.json`

```json
{
  "name": "@aiscribe/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@aiscribe/shared": "*",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.43.0",
    "next": "^16",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "^16",
    "postcss": "^8",
    "tailwindcss": "^4",
    "typescript": "^5.4.0"
  }
}
```

> **Nota de versão @dev:** `@supabase/ssr` — rodar `npm install @supabase/ssr@latest` e **pinar o que resolver** (o `^0.5.0` é piso conhecido; se o registro já estiver em `0.6.x`, use-o). O importante é que `@supabase/supabase-js` fique em `^2.43.0` para casar com `mobile`/`api`/`ai-core` e hoistar uma única cópia.

### 1.4 `apps/web/next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // @aiscribe/shared é publicado como TS cru (main: ./src/index.ts).
  // Sem isto o build do Next falha ao importar tipos/código do workspace.
  transpilePackages: ['@aiscribe/shared'],
  reactStrictMode: true,
};

export default nextConfig;
```

> **CRÍTICO:** `transpilePackages: ['@aiscribe/shared']` é obrigatório — é a causa raiz nº1 de build quebrado em monorepo Next quando o pacote interno não é pré-buildado.

### 1.5 `apps/web/postcss.config.mjs` (Tailwind v4)

```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

### 1.6 `apps/web/app/layout.tsx` e `apps/web/app/globals.css`

`app/layout.tsx` (root layout é **obrigatório** no App Router — sua ausência é motivo de build fail):

```tsx
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'AI Scribe',
  description: 'Revisão de notas clínicas',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

`app/globals.css`:

```css
@import "tailwindcss";
```

> As classes Tailwind já usadas no `page.tsx` (`bg-slate-950`, `grid-cols-2`, `lg:grid-cols-2`, etc.) funcionam out-of-the-box no Tailwind v4 sem `tailwind.config.js`. Se no futuro precisar de tokens custom, criar `@theme` no `globals.css` (v4 é CSS-first).

### 1.7 Integração dos 3 arquivos existentes

- **`lib/supabase.ts` e `hooks/useSoapDraftWeb.ts`**: nenhuma mudança necessária. Funcionam como estão.
- **`app/nota/[id]/page.tsx`**: funciona como está (imports relativos). **Opcional/recomendado** (Article VI — Absolute Imports, severidade SHOULD): trocar
  `'../../../lib/supabase'` → `'@/lib/supabase'` e `'../../../hooks/useSoapDraftWeb'` → `'@/hooks/useSoapDraftWeb'`, habilitado pelo `paths` do tsconfig (§2.2). Não bloqueia; é higiene.
- **Variáveis de ambiente**: `lib/supabase.ts` lê `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. @dev deve garantir que estão no `.env.example` e nas env vars do projeto Vercel. (Observação: `padroes-de-codigo.md` pede acesso a env via objeto de config; o arquivo atual usa `process.env` direto — dívida menor, não bloquear scaffold.)

---

## 2. Estratégia de `tsconfig.json` no monorepo

### 2.1 Princípio

Um **`tsconfig.base.json` na raiz** com apenas as opções **universais** (rigor de tipos, interop, target). Cada workspace tem seu `tsconfig.json` que faz `extends` e define `module`/`moduleResolution`/`jsx`/`paths` conforme seu ambiente — porque os ambientes são genuinamente diferentes (bundler web vs Expo/RN vs Node lib) e forçar uma resolução única quebraria algum deles.

**Exceção deliberada:** `apps/mobile` **não** estende nosso base — estende `expo/tsconfig.base`, que já é afinado para React Native (Metro resolver, JSX RN, libs corretas). Sobrescrever isso com nosso base introduziria bugs sutis de resolução. Aceitamos essa divergência controlada.

### 2.2 Arquivos

**`tsconfig.base.json` (raiz — NOVO):**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "declaration": false,
    "target": "ES2022"
  }
}
```

**`apps/web/tsconfig.json` (NOVO):**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**`apps/mobile/tsconfig.json` (NOVO):**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

**`packages/shared/tsconfig.json`, `packages/ai-core/tsconfig.json` (NOVOS — libs TS puras, só typecheck):**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["ES2022"],
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

**`packages/api/tsconfig.json` (NOVO — Node/Fastify):**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node"],
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

> **Dívida técnica sinalizada (não bloqueia web):** o script `build` do `@aiscribe/api` é `tsc` (emite). Com `noEmit: true` acima, `typecheck` fica correto mas `build` não emitirá. Como `api` consome `@aiscribe/shared` como TS cru, um `build` real via `tsc` exige **project references** ou um `tsconfig.build.json` dedicado (`noEmit:false`, `outDir:dist`, `composite`). Isso é uma story separada — o deploy do `api` é no Railway (via `tsx`), não bloqueia o Vercel/web. @dev: criar `tsconfig.build.json` só quando o build emitido for necessário.

> **Sobre `paths`/absolute imports (Article VI):** cada workspace define `@/*` → `./*`. Imports **entre workspaces** continuam via nome de pacote (`@aiscribe/shared`) — já resolvidos pelo npm workspaces, não precisam de `paths`.

---

## 3. Estratégia de ESLint

### 3.1 `[AUTO-DECISION]` — Flat config, **por workspace**, com base compartilhada relativa

Motivo: os ambientes exigem plugins/regras incompatíveis entre si (Next browser + RSC vs React Native vs Node). Um único `eslint.config.mjs` na raiz misturaria regras de Next em código RN e vice-versa. Flat config permite um arquivo base compartilhado importado por cada workspace — sem criar um pacote npm dedicado (evita over-engineering para o estágio atual).

### 3.2 Arquivos

**`eslint.config.base.mjs` (raiz — NOVO):** regras TS comuns a todos.

```javascript
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.expo/**'] },
  ...tseslint.configs.recommended,
);
```
Dep na raiz: `typescript-eslint@^8`, `eslint@^9`.

**`apps/web/eslint.config.mjs` (NOVO):**

```javascript
import next from 'eslint-config-next';
import base from '../../eslint.config.base.mjs';

export default [...base, ...next()];
```
> @dev: `eslint-config-next` v16 exporta flat config. Se a API exata divergir (ex.: default export objeto vs função), ajustar conforme o README da versão instalada — o padrão é `next/core-web-vitals` + `next/typescript`.

**`apps/mobile/eslint.config.mjs` (NOVO — recomendado, não bloqueia web):**

```javascript
import expo from 'eslint-config-expo/flat.js';
import base from '../../eslint.config.base.mjs';

export default [...base, ...expo];
```
Dep: `eslint-config-expo`. (Substitui o atual `eslint . --ext .ts,.tsx` que hoje não tem config.)

**`packages/*/eslint.config.mjs` (NOVOS — recomendado):**

```javascript
import base from '../../eslint.config.base.mjs';
export default base;
```

### 3.3 Rollout faseado

- **Fase 1 (junto com o scaffold web):** criar `eslint.config.base.mjs` + `apps/web/eslint.config.mjs`. Desbloqueia lint real no web.
- **Fase 2 (story de higiene separada):** adicionar `eslint.config.mjs` em mobile e packages. Fazer isto na mesma PR do scaffold provavelmente gera dezenas de erros pré-existentes (código escrito sem lint real) — melhor isolar para não travar o web. Sinalizado para @po/@sm priorizarem.

---

## 4. Fix do `turbo` (Corepack)

### 4.1 `[AUTO-DECISION]` — Adicionar `"packageManager"` ao `package.json` raiz

**Decisão:** adicionar `"packageManager": "npm@11.7.0"` (versão exata do npm local já em uso) ao `package.json` da raiz. **Não** pinar turbo para versão antiga.

**Justificativa / trade-off:**
- Turbo 2.10.x precisa detectar o package manager do workspace; sem o campo `packageManager` (e com Corepack no Node 25), ele aborta antes de rodar qualquer task. Adicionar o campo é a correção **canônica e documentada** pela Turborepo, não um workaround.
- Pinar turbo para versão anterior seria uma regressão que apenas adia o problema (versões novas continuarão exigindo detecção) e conflita com `pilha-tecnologica.md` que documenta "Turborepo 2.x".
- **Impacto Vercel:** a Vercel respeita `packageManager` e ativa Corepack automaticamente para instalar exatamente `npm@11.7.0`. Isso torna o build **determinístico** (mesma versão local e CI) — desejável. Risco: se a Vercel tiver dificuldade com Corepack+npm, o fallback é remover o campo e deixar a Vercel usar o npm default dela; mas o padrão atual da Vercel suporta isto.

### 4.2 `package.json` raiz — mudanças exatas

```jsonc
{
  "name": "ai-scribe-pt-br",
  "private": true,
  "packageManager": "npm@11.7.0",          // ADICIONAR
  "scripts": { /* inalterado */ },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "workspaces": ["apps/*", "packages/*"],
  "engines": {
    "node": ">=20.9.0"                       // ALTERAR de >=18.0.0 (Next 16 exige 20.9+)
  }
}
```

> **`engines.node`**: subir para `>=20.9.0` — Next 16 removeu suporte a Node 18. Local (25.4.0) e Vercel (configurar Node 22.x no projeto) atendem. @devops: garantir Node 20.x/22.x no projeto Vercel (não 18).

> **`turbo.json`**: nenhuma mudança obrigatória — já é schema 2.x e `outputs` já contemplam `.next/**`. Melhoria opcional: remover `"dependsOn": ["^build"]` de `typecheck`, pois nenhum workspace tem etapa de `build` pré-requisito para type-check (pacotes são consumidos como TS cru). Deixar como está também funciona (turbo ignora scripts `build` ausentes).

### 4.3 Deploy Vercel — nota para @devops (fora do escopo @dev, mas relevante)

- Definir **Root Directory = `apps/web`** no projeto Vercel (framework preset Next.js). A Vercel detecta o Turborepo e roda o install na raiz do monorepo, resolvendo `@aiscribe/shared` via workspaces + `transpilePackages`.
- Alternativa (Root Directory = raiz): build command `turbo run build --filter=@aiscribe/web`. Preferir a primeira (mais simples, não builda mobile).
- Configurar env vars `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` na Vercel.
- O commit local `bac84a3` (fix ERESOLVE) precisa de push (@devops) antes que qualquer deploy funcione.

---

## 5. Riscos de compatibilidade entre workspaces

### 5.1 RISCO PRINCIPAL — React 19 (web) vs React 18.3.1 (mobile) no mesmo `npm install`

`apps/web` exige `react@^19.2` (Next 16); `apps/mobile` exige `react@18.3.1` (RN 0.76). Como `npm install` resolve todos os workspaces juntos, há **duas versões de React** na árvore.

**Análise:** o npm workspaces (npm 7+) lida com isso **nesteando** a versão minoritária — cada workspace declara sua versão exata; o npm hoista uma e coloca a outra em `apps/<x>/node_modules/react`. Isto é **suportado e funciona**, PORQUE web e mobile nunca compartilham runtime (build/deploy separados: Vercel vs EAS). O React não é uma peer dep cruzada entre eles.

**Onde pode falhar (ERESOLVE):** peer deps transitivas — o incidente de `bac84a3` foi exatamente isso (`react-native-screens`/`react-test-renderer` puxando faixas de React conflitantes). Introduzir React 19 pode reacender ERESOLVE se algum pacote **do web** exigir uma faixa que colida com a resolução hoistada.

**Mitigação (ordem de preferência):**
1. `@dev` roda `npm install` na raiz **após** criar o `apps/web/package.json` e observa a saída. Se instalar limpo → nada a fazer.
2. Se der ERESOLVE, **não** usar `--force`. Preferir `--legacy-peer-deps` apenas para diagnosticar, e então corrigir com `overrides` **cirúrgico e escopado** — nunca um override global de `react` (quebraria mobile). Ex.: override só do pacote transitivo ofensor.
3. Manter `react`/`react-dom` do web na **mesma minor** (`^19.2`) que o Next 16 espera, evitando divergência react/react-dom.

### 5.2 RISCO SECUNDÁRIO — `@supabase/supabase-js` duplicado

`@supabase/ssr` (web) tem `@supabase/supabase-js` como peer. Mobile/api/ai-core usam `@supabase/supabase-js@^2.43.0`. **Mitigação:** fixar o web também em `^2.43.0` (feito no §1.3) → npm hoista uma única cópia, sem conflito.

### 5.3 RISCO BAIXO — versão de `typescript` e `@types/react`

Todos os workspaces usam `typescript@^5.4.0` (compatível com Next 16 que exige ≥5.1) — sem conflito. `@types/react`: mobile usa `~18.3.0`, web usará `^19`. São nesteados por workspace, sem colisão (types não têm runtime).

### 5.4 Checklist de verificação pós-implementação (para @dev / @qa)

- [ ] `npm install` na raiz completa **sem ERESOLVE**.
- [ ] `npm run typecheck` executa `tsc --noEmit` **de verdade** em todos os workspaces (não mais stub) e passa.
- [ ] `npm run lint` roda ESLint real no web sem erro de config.
- [ ] `npm run build --workspace @aiscribe/web` (ou `turbo run build --filter=@aiscribe/web`) gera `.next/` com sucesso.
- [ ] `apps/mobile` continua com `jest`/`typecheck` verdes (sem regressão de React 18).
- [ ] Nenhuma cópia de `react@19` vaza para `apps/mobile/node_modules` e vice-versa.

---

## 6. Resumo de entregáveis para @dev

**Arquivos NOVOS:** `tsconfig.base.json`, `eslint.config.base.mjs` (raiz); `apps/web/{package.json, tsconfig.json, next.config.mjs, postcss.config.mjs, eslint.config.mjs, app/layout.tsx, app/globals.css}`; `apps/{mobile}/tsconfig.json`; `packages/{shared,ai-core,api}/tsconfig.json`. Fase 2: eslint configs de mobile/packages.
**Arquivos EDITADOS:** `package.json` raiz (add `packageManager`, bump `engines.node`); opcional `apps/web/app/nota/[id]/page.tsx` (imports absolutos).
**NÃO tocar sem story própria:** `tsconfig.build.json` do api; instalação de TanStack Query; rollout ESLint fase 2.
</content>
</invoke>
