export const NIGHT_PALETTE = {
  bg: '#0B0B10',
  surface: '#121218',
  surfaceHover: '#1A1A22',
  border: '#1C1C26',
  borderStrong: '#2C2C3A',

  text: '#E0D8C8',
  textMuted: '#B0A898',
  textDim: '#585868',
  textGhost: '#383848',

  wolfRed: '#BF1E1E',
  wolfRedDim: '#180808',
  wolfRedBorder: '#261010',

  cubAmber: '#C87800',
  cubAmberDim: '#181000',
  cubAmberBg: '#141006',

  vampurple: '#7B3FBF',
  vampurpleDim: '#120820',

  villageBlue: '#2D6EA8',
  villageBlueDim: '#081428',

  seerGold: '#D4A820',
  seerGoldDim: '#181200',

  sleepOpacity: 0.38,
  doneOpacity: 0.72,
} as const;

export const NIGHT_TYPE = {
  phase: { fontSize: 11, letterSpacing: 3, color: NIGHT_PALETTE.textDim },
  title: { fontSize: 27, fontWeight: '500', letterSpacing: 5 },
  subtitle: { fontSize: 17, fontWeight: '500' },
  body: { fontSize: 13 },
  label: { fontSize: 11 },
  badge: { fontSize: 11, fontWeight: '500' },
} as const;
