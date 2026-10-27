export const colors = {
  primary: '#0f172a',      // Slate 900
  primaryHover: '#1e293b', // Slate 800
  accent: '#2563eb',       // Blue 600
  accentLight: '#eff6ff',  // Blue 50
  
  background: '#f8fafc',   // Slate 50
  card: '#ffffff',
  surfaceSubtle: '#f1f5f9',// Slate 100
  
  border: '#e2e8f0',       // Slate 200
  borderFocus: '#2563eb',
  
  text: '#0f172a',         // Slate 900
  textMuted: '#64748b',    // Slate 500
  textLight: '#94a3b8',    // Slate 400
  textInverse: '#ffffff',
  
  success: '#10b981',      // Emerald 500
  successLight: '#ecfdf5',
  danger: '#ef4444',       // Red 500
  dangerLight: '#fef2f2',
  warning: '#f59e0b',      // Amber 500
  warningLight: '#fffbeb',
};

export const typography = {
  heading: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textMuted,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.primary,
    marginBottom: 6,
  },
};
