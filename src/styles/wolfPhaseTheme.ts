// src/styles/wolfPhaseTheme.ts
export const WolfTheme = {
  bg: {
    app:       '#0B0B10',
    card:      '#121218',
    elevated:  '#181820',
    wolfCub:   '#181000',
    revenge:   '#160000',
  },
  border: {
    default:   '#1C1C26',
    wolf:      '#BF1E1E',
    wolfCub:   '#C87800',
    revenge:   '#8A1010',
    vote:      '#2E1818',
  },
  text: {
    primary:   '#E0D8C8',
    secondary: '#B8B0A0',
    muted:     '#484858',
    ghost:     '#383848',
    wolf:      '#D0A8A8',
    wolfCub:   '#D8C060',
    revenge:   '#C08080',
    amber:     '#C87800',
  },
  accent: {
    wolf:      '#BF1E1E',
    wolfCub:   '#C87800',
    confirm:   '#4A8A4A',
  },
  opacity: {
    wolfFangAsleep: 0.38,   // Nanh Sói khi không đủ điều kiện thức
    disabledBtn:    0.35,
  },
} as const;

export const TAP_TARGET = 44;
