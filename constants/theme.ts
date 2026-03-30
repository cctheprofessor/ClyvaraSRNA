export const Colors = {
  primary: '#EB4797',
  primaryLight: '#F597C4',
  primaryDark: '#D63678',

  secondary: '#4E7CB2',
  secondaryLight: '#ADCAF0',
  secondaryDark: '#20359A',

  accent: '#34A853',
  accentLight: '#D4F0DC',
  success: '#34A853',
  successLight: '#D4F0DC',
  warning: '#FBBC05',
  warningLight: '#FEF3CD',
  error: '#EB4335',
  errorLight: '#FCDCDA',

  white: '#FFFFFF',
  background: '#FFFFFF',
  backgroundSecondary: '#F9F9F9',
  backgroundTertiary: '#E8EEF3',

  text: {
    primary: '#000000',
    secondary: '#333333',
    tertiary: '#64748b',
    light: '#FFFFFF',
    disabled: '#9CA3AF',
  },

  border: {
    light: '#E8EEF3',
    medium: '#D9D9D9',
    dark: '#CBD5E1',
  },

  overlay: 'rgba(0, 0, 0, 0.5)',

  info: '#4E7CB2',
  surface: '#F9F9F9',
  textSecondary: '#333333',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 43,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 29,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
};
