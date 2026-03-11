// Design tokens — matches the web app exactly
export const Colors = {
  navy: '#112A46',
  teal: '#00A3E0',
  blue: '#1183d4',
  green: '#059669',
  red: '#DC2626',
  amber: '#D97706',
  white: '#FFFFFF',
  background: '#f9fafb',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  // Status
  statusConfirmed: '#059669',
  statusPending: '#D97706',
  statusDenied: '#DC2626',
  statusCancelled: '#6B7280',
};

export const Radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://reservationboss.io').replace(/\/$/, '');
