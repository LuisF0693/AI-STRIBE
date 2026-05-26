/**
 * AI Scribe PT-BR — Design Tokens
 * Single source of truth para cores, tipografia e espaçamento.
 * Use: import { colors, typography, spacing } from '@aiscribe/shared/tokens'
 *
 * Gerado por: Uma (@ux-design-expert) — 2026-04-12
 */

// ─────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────
export const colors = {
  primary: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB', // default
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  emerald: {
    50:  '#ECFDF5',
    100: '#D1FAE5',
    400: '#34D399',
    500: '#10B981', // success / active
    600: '#059669',
    700: '#047857',
  },
  red: {
    50:  '#FEF2F2',
    100: '#FEE2E2',
    400: '#F87171',
    500: '#EF4444', // recording
    600: '#DC2626',
  },
  amber: {
    50:  '#FFFBEB',
    100: '#FEF3C7',
    400: '#FBBF24',
    500: '#F59E0B', // processing / warning
    600: '#D97706',
  },
  violet: {
    50:  '#F5F3FF',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
  },
  slate: {
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Semânticas
  semantic: {
    // Light mode
    light: {
      background:         '#F8FAFC',
      backgroundCard:     '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      text:               '#0F172A',
      textSecondary:      '#64748B',
      textMuted:          '#94A3B8',
      textInverse:        '#FFFFFF',
      border:             '#E2E8F0',
      borderFocus:        '#2563EB',
      tabBar:             '#FFFFFF',
    },
    // Dark mode
    dark: {
      background:         '#020617',
      backgroundCard:     '#0F172A',
      backgroundElevated: '#1E293B',
      text:               '#F8FAFC',
      textSecondary:      '#94A3B8',
      textMuted:          '#64748B',
      textInverse:        '#0F172A',
      border:             '#1E293B',
      borderFocus:        '#3B82F6',
      tabBar:             '#0F172A',
    },
    // Status (invariantes)
    status: {
      recording:    '#EF4444',
      processing:   '#F59E0B',
      success:      '#10B981',
      error:        '#EF4444',
      warning:      '#F59E0B',
      info:         '#2563EB',
    },
    // SOAP section colors
    soap: {
      subjetivo:  '#2563EB', // blue
      objetivo:   '#7C3AED', // violet
      avaliacao:  '#D97706', // amber
      plano:      '#059669', // green
    },
  },
} as const;

// ─────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────
export const typography = {
  fontFamily: {
    sans: 'Inter',
    mono: 'JetBrainsMono',
    // React Native system fallbacks
    sansSystem:  'System',
    monoSystem:  'Courier',
  },
  fontSize: {
    xs:    12,
    sm:    14,
    base:  16,
    lg:    18,
    xl:    20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    timer: 56, // TimerDisplay especial
    '5xl': 48,
    '6xl': 60,
  },
  fontWeight: {
    regular:   '400' as const,
    medium:    '500' as const,
    semibold:  '600' as const,
    bold:      '700' as const,
    extrabold: '800' as const,
  },
  lineHeight: {
    tight:   1.25,
    snug:    1.375,
    normal:  1.5,
    relaxed: 1.625,
  },
  letterSpacing: {
    tight:  -0.5,
    normal:  0,
    wide:    0.5,
    timer:   2, // para o timer monospace
  },
} as const;

// ─────────────────────────────────────────────
// SPACING (Base 4px grid)
// ─────────────────────────────────────────────
export const spacing = {
  0:   0,
  0.5: 2,
  1:   4,
  1.5: 6,
  2:   8,
  2.5: 10,
  3:   12,
  3.5: 14,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  9:   36,
  10:  40,
  12:  48,
  14:  56,
  16:  64,
  20:  80,
  24:  96,

  component: {
    // Touch targets
    buttonHeightXl:   64,
    buttonHeightLg:   56,
    buttonHeightMd:   48,
    buttonHeightSm:   40,
    // Inputs
    inputHeight:      52,
    // Layout
    screenPaddingH:   20,
    screenPaddingV:   24,
    cardPadding:      20,
    sectionGap:       32,
    // Navigation
    tabBarHeight:     84,  // inclui safe area iOS
    headerHeight:     56,
    recordingBarH:    52,
    // FAB
    fabSize:          60,
  },

  radius: {
    none:  0,
    sm:    6,
    md:    12,
    lg:    16,
    xl:    20,
    '2xl': 24,
    full:  9999,
  },
} as const;

// ─────────────────────────────────────────────
// SHADOWS
// ─────────────────────────────────────────────
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
  recording: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  primary: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// ─────────────────────────────────────────────
// ANIMATION
// ─────────────────────────────────────────────
export const animation = {
  duration: {
    instant:  50,
    fast:    100,
    normal:  200,
    slow:    300,
    slower:  500,
    pulse:  1200, // recording dot pulse
  },
  spring: {
    // Reanimated spring config
    default: {
      damping: 15,
      stiffness: 150,
    },
    bouncy: {
      damping: 10,
      stiffness: 200,
    },
    snappy: {
      damping: 20,
      stiffness: 300,
    },
  },
} as const;

// ─────────────────────────────────────────────
// COMBINED THEME
// ─────────────────────────────────────────────
export const theme = {
  colors,
  typography,
  spacing,
  shadows,
  animation,
} as const;

export type Theme = typeof theme;
export type ColorScheme = 'light' | 'dark';
