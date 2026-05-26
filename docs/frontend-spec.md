# AI Scribe PT-BR — Frontend Specification

> **Versão:** 1.0 | **Autor:** Uma (@ux-design-expert) | **Data:** 2026-04-12
> **Target:** Mobile-First (React Native + Expo SDK 52) | Web Secundário (Next.js 16+)

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-04-12 | 1.0 | Spec inicial — baseada no PRD v0.1 + Arquitetura v1.0 | Uma (@ux-design-expert) |

---

## 1. UX Vision & Design Philosophy

### 1.1 Princípio Central: "A Consulta se Documenta Sozinha"

O médico **não usa o app** — ele **confia no app** para fazer o trabalho. A interface deve:

- **Desaparecer durante a consulta** — tela de gravação é quase vazia intencionalmente
- **Aparecer para confirmar** — ao fim, nota pronta para revisar com 2 toques
- **Nunca interromper** — zero pop-ups, zero notificações intrusivas durante gravação
- **Transmitir segurança** — criptografia visível, LGPD badge, dados no Brasil

### 1.2 Usuário Principal: Dr. João, 38 anos, Clínico Geral

- Atende 20-30 pacientes/dia
- Usa iPhone 13 Pro (uma mão enquanto examina)
- Odeia apps que "atrapalham"
- Quer gastar **menos de 30 segundos** documentando por consulta
- Preocupado com LGPD e confidencialidade do paciente

### 1.3 Princípios de Design

| Princípio | Aplicação |
|-----------|-----------|
| **Ambient First** | Gravação inicia/encerra com 1 toque, roda em background |
| **Máximo 2 toques** | Qualquer ação crítica requer no máximo 2 interações |
| **Feedback imediato** | Todo toque tem resposta visual em < 100ms |
| **Zero vocabulário técnico** | "Iniciar Consulta" não "Start Recording Session" |
| **Confiança visual** | Indicadores de criptografia e status sempre visíveis |

---

## 2. Design Tokens

### 2.1 Color Palette

```typescript
// packages/shared/src/tokens/colors.ts

export const colors = {
  // Primary — Medical Blue (confiança, tecnologia)
  primary: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB', // ← primary default
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Emerald — Sucesso, Gravação Ativa, Saúde
  emerald: {
    50:  '#ECFDF5',
    100: '#D1FAE5',
    400: '#34D399',
    500: '#10B981', // ← active/success
    600: '#059669',
    700: '#047857',
  },

  // Red — Gravação, Alerta
  red: {
    50:  '#FEF2F2',
    400: '#F87171',
    500: '#EF4444', // ← recording indicator
    600: '#DC2626',
  },

  // Amber — Processando, Warning
  amber: {
    50:  '#FFFBEB',
    400: '#FBBF24',
    500: '#F59E0B', // ← processing/warning
    600: '#D97706',
  },

  // Neutral — Backgrounds, Texto
  slate: {
    50:  '#F8FAFC', // ← app background
    100: '#F1F5F9', // ← card background
    200: '#E2E8F0', // ← borders
    300: '#CBD5E1',
    400: '#94A3B8', // ← placeholder text
    500: '#64748B', // ← secondary text
    600: '#475569',
    700: '#334155',
    800: '#1E293B', // ← primary text dark mode bg
    900: '#0F172A', // ← primary text
    950: '#020617', // ← dark mode background
  },

  // Semânticas
  semantic: {
    background:     '#F8FAFC',  // slate.50
    backgroundCard: '#FFFFFF',
    backgroundDark: '#0F172A',  // slate.900
    textPrimary:    '#0F172A',  // slate.900
    textSecondary:  '#64748B',  // slate.500
    textMuted:      '#94A3B8',  // slate.400
    border:         '#E2E8F0',  // slate.200
    borderFocus:    '#2563EB',  // primary.600
    success:        '#10B981',  // emerald.500
    warning:        '#F59E0B',  // amber.500
    error:          '#EF4444',  // red.500
    recording:      '#EF4444',  // red.500
    processing:     '#F59E0B',  // amber.500
  }
} as const;
```

### 2.2 Typography

```typescript
// packages/shared/src/tokens/typography.ts

export const typography = {
  fontFamily: {
    sans:  'Inter',        // Títulos, UI
    mono:  'JetBrains Mono', // Código, timestamps
    // React Native fallback: System (SF Pro / Roboto)
  },

  fontSize: {
    xs:   12,  // Labels, captions
    sm:   14,  // Body small, metadata
    base: 16,  // Body padrão
    lg:   18,  // Body large
    xl:   20,  // Subtítulos
    '2xl': 24, // Títulos de seção
    '3xl': 30, // Títulos de tela
    '4xl': 36, // Timer de gravação
    '5xl': 48, // Display (onboarding)
  },

  fontWeight: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
    extrabold:'800',
  },

  lineHeight: {
    tight:   1.25,
    snug:    1.375,
    normal:  1.5,
    relaxed: 1.625,
  },
} as const;
```

### 2.3 Spacing & Sizing

```typescript
// packages/shared/src/tokens/spacing.ts

export const spacing = {
  // Base 4px grid
  0:   0,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  8:   32,
  10:  40,
  12:  48,
  16:  64,
  20:  80,
  24:  96,

  // Componentes
  component: {
    buttonHeight:     52,  // Botões primários (touch target mínimo)
    buttonHeightSm:   40,
    inputHeight:      52,
    cardPadding:      20,
    screenPadding:    20,
    tabBarHeight:     84,  // iOS safe area
    headerHeight:     56,
    sectionGap:       32,
  },

  // Border radius
  radius: {
    sm:   6,
    md:   12,
    lg:   16,
    xl:   24,
    full: 9999,
  },
} as const;
```

### 2.4 Shadows & Elevation

```typescript
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  recording: {
    // Sombra vermelha pulsante para estado de gravação
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;
```

---

## 3. Component Library (Atomic Design)

### 3.1 ATOMS

#### Button

```typescript
// Variantes
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'recording';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

/*
PRIMARY:   bg-primary-600  text-white        hover:bg-primary-700
SECONDARY: bg-slate-100    text-slate-900    hover:bg-slate-200
GHOST:     bg-transparent  text-primary-600  hover:bg-primary-50
DANGER:    bg-red-500      text-white        hover:bg-red-600
RECORDING: bg-red-500      text-white        pulsing-shadow
*/

// Especificação visual
Button {
  // LG (botão principal de consulta)
  height: 56px
  padding: 0 24px
  borderRadius: 16px
  fontSize: 18px
  fontWeight: 600
  minWidth: 200px

  // Botão "Iniciar Consulta" — tamanho extra para touch fácil
  xl {
    height: 64px
    padding: 0 32px
    fontSize: 20px
    borderRadius: 20px
  }
}
```

#### Badge de Status

```typescript
type StatusBadge = 'recording' | 'uploading' | 'transcribing' | 'generating' | 'ready' | 'done';

/*
RECORDING:   bg-red-50    text-red-600    dot-animate-pulse
UPLOADING:   bg-amber-50  text-amber-700  icon-spinner
TRANSCRIBING:bg-blue-50   text-blue-600   icon-waveform-animate
GENERATING:  bg-purple-50 text-purple-600 icon-sparkles-animate
READY:       bg-emerald-50 text-emerald-700 icon-check
DONE:        bg-slate-100  text-slate-600  icon-check-done
*/
```

#### Avatar Médico

```typescript
// 40x40 circular, iniciais em bg-primary-100 text-primary-700
// Badge de CRM pequeno abaixo (opcional)
```

#### Input Field

```typescript
Input {
  height: 52px
  borderRadius: 12px
  border: 1.5px solid slate-200
  focus: border-primary-600 + ring-2 ring-primary-100
  fontSize: 16px  // Evita zoom automático no iOS
  padding: 0 16px
}
```

#### Timer Display

```typescript
// Componente especial para tela de consulta ativa
TimerDisplay {
  fontSize: 56px       // Grande e legível de relance
  fontFamily: 'mono'   // JetBrains Mono — dígitos fixos
  fontWeight: '700'
  color: white         // Em background escuro
  letterSpacing: 2px
  // Formato: 00:42:17
}
```

---

### 3.2 MOLECULES

#### ConsultaCard

```
┌─────────────────────────────────────────┐
│  🟢 Concluída          há 2 horas       │
│                                         │
│  Maria Silva, 45 anos                   │
│  Clínica Geral                          │
│                                         │
│  "Cefaleia tensional recorrente..."     │
│                                         │
│  [Ver Nota]              [Editar]       │
└─────────────────────────────────────────┘
```

**Especificação:**
- `borderRadius: 16px`
- `padding: 20px`
- `backgroundColor: white`
- `shadow: md`
- Borda esquerda colorida por status (4px): verde=done, âmbar=processing, azul=draft
- Tap em qualquer lugar → abre nota

#### ProcessingStatusCard

```
┌─────────────────────────────────────────┐
│  ⏳ Processando consulta...             │
│                                         │
│  Maria Silva                            │
│  Consultada às 14:30                    │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━ 67%          │
│  Transcrevendo áudio (2/3)              │
└─────────────────────────────────────────┘
```

#### SoapSection

```
┌─────────────────────────────────────────┐
│  S  Subjetivo                     [↗]  │
│─────────────────────────────────────────│
│  Paciente refere cefaleia há 3 dias,   │
│  localizada na região occipital,        │
│  intensidade 6/10...                   │
│                                         │
│  [Toque para editar]                   │
└─────────────────────────────────────────┘
```

#### OnboardingCard

```
┌─────────────────────────────────────────┐
│                                         │
│         [  ÍCONE GRANDE 80px  ]         │
│                                         │
│     Sua consulta, documentada           │
│     automaticamente                     │
│                                         │
│   Grave sua consulta com 1 toque.      │
│   A IA transcreve e gera a nota SOAP   │
│   em português médico.                 │
│                                         │
└─────────────────────────────────────────┘
```

---

### 3.3 ORGANISMS

#### TabBar (Mobile)

```
┌─────────────────────────────────────────────────┐
│   🏠          📋          👥          ⚙️       │
│  Início     Consultas   Pacientes   Config      │
└─────────────────────────────────────────────────┘
```

- `height: 84px` (inclui safe area iOS)
- Background: `white` com `border-top: 1px solid slate-200`
- Ícone ativo: `primary-600` + `label bold`
- Ícone inativo: `slate-400`
- Badge de notificação: `red-500` no canto superior direito

#### RecordingBar (Floating)

Persiste em todas as telas durante gravação ativa:

```
┌─────────────────────────────────────────────────┐
│  🔴 ●  GRAVANDO  │  00:12:34  │  [Encerrar]    │
└─────────────────────────────────────────────────┘
```

- `position: absolute bottom: tabBarHeight + 8px`
- `backgroundColor: slate-900`
- `borderRadius: 16px`
- `marginHorizontal: 16px`
- Texto branco, dot vermelho pulsante
- Tap em qualquer parte → vai para ConsultaAtiva

#### AppHeader

```
┌─────────────────────────────────────────┐
│  ←   Revisão de Nota            [•••]  │
└─────────────────────────────────────────┘
```

---

## 4. Screens Specification

### 4.1 Onboarding Flow (4 telas)

**Tela 1 — Boas-vindas:**
```
┌─────────────────────┐
│                     │
│    [Logo 80px]      │
│                     │
│   AI Scribe BR      │
│  ─────────────────  │
│  Documentação       │
│  clínica com IA     │
│                     │
│  ● ○ ○ ○            │ (progress dots)
│                     │
│  [Começar →]        │
│                     │
│  Já tenho conta     │
└─────────────────────┘
```

**Tela 2 — Como funciona:**
```
┌─────────────────────┐
│  Como funciona      │
│                     │
│  [🎙️ 80px icon]    │
│                     │
│  1 toque para       │
│  iniciar            │
│                     │
│  [Animação loop:    │
│   gravando → nota]  │
│                     │
│  ○ ● ○ ○            │
│  [Próximo →]        │
└─────────────────────┘
```

**Tela 3 — LGPD / Segurança:**
```
┌─────────────────────┐
│  Seus dados,        │
│  protegidos         │
│                     │
│  [🔒 80px icon]     │
│                     │
│  ✓ Dados no Brasil  │
│  ✓ Criptografia     │
│    AES-256          │
│  ✓ Conformidade     │
│    LGPD             │
│  ✓ Você controla    │
│    seus dados       │
│                     │
│  ○ ○ ● ○            │
│  [Próximo →]        │
└─────────────────────┘
```

**Tela 4 — Criar conta:**
```
┌─────────────────────┐
│  Crie sua conta     │
│                     │
│  [Nome completo   ] │
│  [CRM + UF        ] │
│  [Especialidade ▾ ] │
│  [E-mail          ] │
│  [Senha           ] │
│                     │
│  Ao criar conta,    │
│  aceito os Termos   │
│  e a Política LGPD  │
│                     │
│  ○ ○ ○ ●            │
│  [Criar conta]      │
└─────────────────────┘
```

---

### 4.2 Home / Dashboard do Dia

```
┌─────────────────────────────────────────┐
│  Bom dia, Dr. João          [🔔] [👤]  │  ← Header
│─────────────────────────────────────────│
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Hoje, 12 de abril                │  │
│  │  ─────────────────────────────    │  │
│  │  5 consultas     3 notas prontas  │  │
│  │  ●●●●●●●●●●  (barra de progresso) │  │
│  └───────────────────────────────────┘  │
│                                         │  ← Stats Card
│  ┌─────────────────────────────────┐    │
│  │  🟢 Nota pronta                 │    │
│  │  Maria Silva, 45a               │    │
│  │  "Cefaleia tensional..."        │    │
│  │                    [Revisar →]  │    │
│  └─────────────────────────────────┘    │
│                                         │  ← Consulta Cards
│  ┌─────────────────────────────────┐    │
│  │  ⏳ Processando (67%)           │    │
│  │  Carlos Mendes, 62a             │    │
│  │  ▓▓▓▓▓▓▓░░░ Transcrevendo...   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [+ Iniciar nova consulta]              │  ← CTA Principal
│                                         │
│  ─────────────────────────────────────  │
│  🏠  Início   📋  Notas   👥  Pacientes  ⚙️  │  ← Tab Bar
└─────────────────────────────────────────┘
```

**Especificações:**
- Header: `backgroundColor: white`, `paddingHorizontal: 20`, `paddingTop: safeAreaTop`
- Stats Card: `backgroundColor: primary-600`, `borderRadius: 20`, `padding: 20`, texto branco
- Botão "Iniciar nova consulta": `width: 100%`, `height: 56px`, `backgroundColor: primary-600`, `borderRadius: 16px`
- FAB alternativo: botão flutuante `60x60`, `borderRadius: 30`, no canto inferior direito (sobre a tab bar)

---

### 4.3 Consulta Ativa (Tela de Gravação)

**Estado: Gravando**
```
┌─────────────────────────────────────────┐
│                                  [✕]   │  ← só fechar (gravação continua)
│                                         │
│                                         │
│     Maria Silva, 45 anos               │  ← Nome do paciente (grande)
│     Clínica Geral                      │
│                                         │
│                                         │
│         ●  GRAVANDO                    │  ← dot vermelho pulsante
│                                         │
│          00:12:34                       │  ← timer monospace 56px
│                                         │
│                                         │
│     [  ████████████████  ]             │  ← waveform visualizer (expo-av)
│                                         │
│                                         │
│                                         │
│                                         │
│   [⏸ Pausar]    [⏹ Encerrar Consulta]  │  ← botões na base
│                                         │
│   🔒 Criptografado · Dados no Brasil   │  ← badge de segurança (12px)
└─────────────────────────────────────────┘
```

**Especificações:**
- `backgroundColor: #0F172A` (slate-950) — escuro para minimizar distrações
- Timer: `fontSize: 56`, `fontFamily: mono`, `color: white`, `fontWeight: 700`
- Dot pulsante: animação `scale 1.0 → 1.4 → 1.0` com `duration: 1200ms`, `color: red-500`
- Waveform: barras verticais animadas `backgroundColor: primary-400`, amplitude real do áudio
- Botão "Encerrar": `backgroundColor: red-600`, `height: 56px`, `borderRadius: 16px`
- Botão "Pausar": `backgroundColor: slate-700`, `height: 56px`, `borderRadius: 16px`
- Badge segurança: `color: slate-400`, ícone cadeado pequeno

**Estado: Pausada**
```
│         ⏸  PAUSADA                    │  ← âmbar em vez de vermelho
│          00:12:34                       │
│     [Waveform estático]                │
│   [▶ Retomar]   [⏹ Encerrar Consulta] │
```

**Estado: Processando (pós-encerramento)**
```
┌─────────────────────────────────────────┐
│                                         │
│         [Ícone IA animado]             │
│                                         │
│    Processando sua consulta...         │
│                                         │
│    ▓▓▓▓▓▓▓░░░░  Transcrevendo...      │
│         Etapa 1 de 2                   │
│                                         │
│    Você pode fechar esta tela.         │
│    Vamos notificar quando estiver      │
│    pronto.                             │
│                                         │
│    [Acompanhar progresso →]            │
│    [Ir para o início]                  │
└─────────────────────────────────────────┘
```

---

### 4.4 Revisão de Nota (SOAP)

```
┌─────────────────────────────────────────┐
│  ←  Nota Clínica              [Salvar] │  ← Header com save
│─────────────────────────────────────────│
│  Maria Silva, 45 anos                  │
│  12 abr 2026 · 14h30 · 42min          │  ← metadata
│─────────────────────────────────────────│
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ S  Subjetivo              [✎]  │   │  ← accordion expandível
│  │─────────────────────────────────│   │
│  │ Paciente refere cefaleia há 3   │   │
│  │ dias, localizada na região      │   │
│  │ occipital, intensidade 6/10.    │   │
│  │ Nega febre, náuseas...          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ O  Objetivo               [✎]  │   │
│  │─────────────────────────────────│   │
│  │ PA: 130/85 mmHg                 │   │
│  │ FC: 72 bpm · FR: 16 irpm       │   │
│  │ Neurológico: sem déficits...    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ A  Avaliação              [✎]  │   │
│  │─────────────────────────────────│   │
│  │ CID: G43.1 — Enxaqueca com     │   │
│  │ aura (?). Cefaleia tensional    │   │
│  │ recorrente (G44.2)              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ P  Plano                  [✎]  │   │
│  │─────────────────────────────────│   │
│  │ 1. Ibuprofeno 600mg se dor     │   │
│  │ 2. Amitriptilina 25mg/noite    │   │
│  │ 3. Retorno em 30 dias...        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ──────── CIDs Sugeridos ────────────  │
│  [G43.1] [G44.2] [+ ver mais]         │  ← chips de CID
│─────────────────────────────────────────│
│  [✓ Aprovar e salvar]   [⬇ Exportar]  │  ← ações finais
└─────────────────────────────────────────┘
```

**Especificações:**
- Cada seção SOAP: card com `borderLeft: 4px` colorida
  - S (Subjetivo): `#2563EB` (azul)
  - O (Objetivo): `#7C3AED` (violeta)
  - A (Avaliação): `#D97706` (âmbar)
  - P (Plano): `#059669` (verde)
- Edição inline: toque no `[✎]` → campo de texto expande in-place
- Chips CID: `backgroundColor: blue-50`, `borderRadius: 6px`, `padding: 4px 8px`
- Botão "Aprovar": `backgroundColor: emerald-500`, full-width, `height: 56px`

---

### 4.5 Histórico de Paciente

```
┌─────────────────────────────────────────┐
│  ←  Maria Silva                [+] [⋮] │
│─────────────────────────────────────────│
│  [Avatar] Maria Silva                   │
│           45 anos · F                   │
│           Última consulta: 12 abr       │
│─────────────────────────────────────────│
│  [ 🔍 Buscar nas consultas... ]        │
│─────────────────────────────────────────│
│  ABRIL 2026                            │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🟢 12 abr · 14h30 · 42min      │   │
│  │ Cefaleia tensional              │   │
│  │ G43.1 · G44.2                   │   │
│  │                    [Abrir →]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🟢 28 mar · 09h15 · 25min      │   │
│  │ Revisão hipertensão             │   │
│  │ I10 · Z87.39                    │   │
│  │                    [Abrir →]   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

### 4.6 Configurações / Integrações

```
┌─────────────────────────────────────────┐
│  Configurações                          │
│─────────────────────────────────────────│
│                                         │
│  [Avatar] Dr. João Oliveira             │
│           CRM 12345-SP                 │
│           Clínica Geral                 │
│─────────────────────────────────────────│
│  PERFIL                                │
│  → Dados do médico                     │
│  → Especialidade e templates           │
│  → Assinatura digital (ICP-Brasil)     │
│─────────────────────────────────────────│
│  INTEGRAÇÕES                           │
│  → MV Saúde                [Conectar] │
│  → Tasy / Philips          [Conectar] │
│  → WhatsApp (Evolution)    [Ativo ✓]  │
│─────────────────────────────────────────│
│  SEGURANÇA                             │
│  → Autenticação em 2 fatores  [On ●]  │
│  → Exportar meus dados               │
│  → Política de privacidade           │
│─────────────────────────────────────────│
│  CONTA                                 │
│  → Plano: Basic (R$ 149/mês)          │
│  → Fazer upgrade                       │
│  → Sair                               │
└─────────────────────────────────────────┘
```

---

## 5. Interaction Patterns & Micro-animations

### 5.1 Animações Chave

| Elemento | Animação | Duração | Easing |
|---------|----------|---------|--------|
| Dot gravação | `scale: 1.0 → 1.4 → 1.0` loop | 1200ms | `easeInOut` |
| Waveform bars | `scaleY: 0.2 → 1.0` random | 150ms | `linear` |
| Card entrada | `translateY: 20 → 0 + opacity: 0 → 1` | 300ms | `easeOut` |
| Processing bar | Fill progressivo | variável | `linear` |
| Status badge | `scale: 0.8 → 1.0` | 200ms | `spring` |
| Tab switch | `opacity: 0 → 1` | 200ms | `easeIn` |
| SOAP section expand | `height: 0 → auto` | 250ms | `easeOut` |
| Botão press | `scale: 1.0 → 0.96 → 1.0` | 100ms | `spring` |

### 5.2 Haptics (Mobile)

| Ação | Haptic |
|------|--------|
| Iniciar gravação | `impactMedium` |
| Encerrar gravação | `notificationSuccess` |
| Aprovar nota | `notificationSuccess` |
| Erro/falha | `notificationError` |
| Toque em botão | `impactLight` |

### 5.3 Gestos

| Gesto | Ação |
|-------|------|
| Swipe right na nota | Voltar |
| Pull-to-refresh na Home | Atualizar status |
| Swipe esquerdo no ConsultaCard | Ações rápidas (exportar, deletar) |
| Long press no botão Encerrar | Confirmar encerramento (previne toque acidental) |

---

## 6. Dark Mode

Todas as telas suportam dark mode via `useColorScheme()`:

```typescript
const theme = {
  light: {
    background: '#F8FAFC',      // slate.50
    backgroundCard: '#FFFFFF',
    text: '#0F172A',            // slate.900
    textSecondary: '#64748B',   // slate.500
    border: '#E2E8F0',          // slate.200
    tabBar: '#FFFFFF',
  },
  dark: {
    background: '#020617',      // slate.950
    backgroundCard: '#0F172A',  // slate.900
    text: '#F8FAFC',            // slate.50
    textSecondary: '#94A3B8',   // slate.400
    border: '#1E293B',          // slate.800
    tabBar: '#0F172A',
  }
};
```

**Nota:** Tela de ConsultaAtiva é sempre escura (independente do modo) para minimizar distrações.

---

## 7. Accessibility (WCAG AA)

### 7.1 Requisitos Mínimos

| Requisito | Implementação |
|-----------|--------------|
| Contraste texto | 4.5:1 mínimo (WCAG AA) |
| Touch targets | Mínimo 44x44px (Apple HIG) |
| Fonte ajustável | Respeitar `fontScale` do sistema |
| Screen reader | `accessibilityLabel` em todos os elementos interativos |
| Foco visível | `focusRing` visível em modo acessibilidade |
| Sem animação reduzida | Respeitar `reduceMotion` do sistema |

### 7.2 Labels de Acessibilidade

```typescript
// Exemplos de accessibilityLabel
<Button accessibilityLabel="Iniciar consulta com Maria Silva" />
<StatusBadge accessibilityLabel="Status: gravando há 12 minutos e 34 segundos" />
<TimerDisplay accessibilityLabel="Tempo de gravação: doze minutos e trinta e quatro segundos" />
```

---

## 8. Design Tokens — Arquivo de Exportação

```css
/* packages/shared/src/tokens/tokens.css */
:root {
  /* Colors */
  --color-primary-600: #2563EB;
  --color-primary-50: #EFF6FF;
  --color-emerald-500: #10B981;
  --color-red-500: #EF4444;
  --color-amber-500: #F59E0B;
  --color-slate-50: #F8FAFC;
  --color-slate-100: #F1F5F9;
  --color-slate-200: #E2E8F0;
  --color-slate-400: #94A3B8;
  --color-slate-500: #64748B;
  --color-slate-900: #0F172A;
  --color-slate-950: #020617;

  /* Spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 30px;
  --font-size-4xl: 36px;
  --font-size-timer: 56px;
}
```

```javascript
// packages/shared/src/tokens/tailwind-tokens.js
// Para uso no Next.js (web)
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EFF6FF',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        recording: '#EF4444',
        processing: '#F59E0B',
        success: '#10B981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
    }
  }
}
```

---

## 9. Navigation Architecture (Mobile)

```
AppNavigator
├── AuthStack (não autenticado)
│   ├── Onboarding (4 telas — swipe horizontal)
│   ├── Login
│   └── Register
│
└── MainTabs (autenticado)
    ├── Tab: Home
    │   └── HomeScreen
    │       └── ConsultaAtivaScreen (modal fullscreen)
    │           └── ProcessingScreen
    │
    ├── Tab: Notas / Consultas
    │   ├── ConsultasListScreen
    │   └── NoteReviewScreen (push)
    │
    ├── Tab: Pacientes
    │   ├── PacientesListScreen
    │   └── PacienteHistoricoScreen (push)
    │
    └── Tab: Config
        └── ConfigScreen
            ├── PerfilScreen (push)
            └── IntegracoesScreen (push)
```

**Transições:**
- `MainTabs → ConsultaAtiva`: modal `slide from bottom` (fullscreen)
- `Notas → NoteReview`: push `slide from right`
- `Pacientes → Histórico`: push `slide from right`
- `RecordingBar → ConsultaAtiva`: modal (se já aberta, apenas foca)

---

## 10. Error States & Empty States

### 10.1 Empty State — Home sem consultas

```
┌─────────────────────────────────────────┐
│                                         │
│           [🩺 80px icon]               │
│                                         │
│       Nenhuma consulta hoje             │
│                                         │
│    Inicie uma nova consulta para       │
│    começar a documentar.               │
│                                         │
│    [+ Iniciar primeira consulta]        │
└─────────────────────────────────────────┘
```

### 10.2 Error State — Sem conexão

```
┌─────────────────────────────────────────┐
│  [⚠️ banner topo]  Sem conexão          │
│  Gravação local ativa · Sync ao         │
│  reconectar                 [✕]        │
└─────────────────────────────────────────┘
```

Banner: `backgroundColor: amber-50`, `border: amber-300`, `color: amber-800`

### 10.3 Error State — Upload falhou

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐   │
│  │ ⚠️ Aguardando conexão           │   │
│  │  Carlos Mendes                  │   │
│  │  Áudio salvo localmente         │   │
│  │  Enviando quando conectar...    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

Card com `borderLeft: 4px amber-500`

---

## 11. Implementation Notes para @dev

### 11.1 Pacotes a instalar

```bash
# Design System Base
expo install expo-av                        # Áudio
expo install expo-haptics                   # Haptics
expo install expo-secure-store             # JWT storage
expo install expo-status-bar               # Status bar

# UI
npx expo install @expo/vector-icons        # Ícones
# Ou: react-native-vector-icons

# Animações
expo install react-native-reanimated       # Animações fluidas
expo install react-native-gesture-handler  # Gestos

# Tipografia
expo install expo-font                     # Carregar Inter + JetBrains Mono
expo install @expo-google-fonts/inter

# Navegação (já incluso no Expo Router)
# Expo Router v4 já incluso no SDK 52

# Utilities
npm install zustand                        # State management
npm install date-fns                       # Formatação de datas
```

### 11.2 Estrutura de Temas

```typescript
// packages/shared/src/theme/index.ts
export { colors } from './tokens/colors';
export { typography } from './tokens/typography';
export { spacing } from './tokens/spacing';
export { shadows } from './tokens/shadows';

// Hook para tema atual
export function useTheme() {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}
```

### 11.3 Componente Base — Styled Component Pattern

```typescript
// apps/mobile/src/components/ui/Button.tsx
import { Pressable, Text, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel: string; // OBRIGATÓRIO — acessibilidade
}
```

### 11.4 Prioridade de Implementação

Ordem sugerida para @dev (Story 2.1 focus):

1. **Design Tokens** — `packages/shared/src/tokens/` (foundation de tudo)
2. **Button** atom com variantes primary + danger
3. **TimerDisplay** atom
4. **StatusBadge** atom  
5. **ConsultaAtivaScreen** (tela de gravação — Story 2.1)
6. **HomeScreen** com botão Iniciar + RecordingBar flutuante
7. **ProcessingStatusCard** molecule
8. **NoteReviewScreen** (SOAP) — Story 2.3
9. **Onboarding Flow** — E1

---

— Uma, desenhando com empatia 💝
