// ============================================
// OASIS - Theme configuration and theme constants
// Aligning with high-contrast, adaptive 2026 aesthetics
// ============================================

export interface ThemeConfig {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
}

export const LIGHT_THEME: ThemeConfig = {
  primary: '#00C2A0',
  secondary: '#1E40AF',
  background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
  surface: 'rgba(255, 255, 255, 0.85)',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  border: 'rgba(0, 194, 160, 0.2)',
};

export const DARK_THEME: ThemeConfig = {
  primary: '#00E5C0', // More vibrant in dark mode for accessibility and high contrast
  secondary: '#3B82F6',
  background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
  surface: 'rgba(30, 41, 59, 0.85)',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: 'rgba(0, 229, 192, 0.3)',
};

/**
 * Returns dynamic contrast values depending on time of day.
 * Helps prevent eye strain in twilight hours.
 */
export function getAdaptiveContrast(hour: number = new Date().getHours()): { contrast: string; brightness: string } {
  if (hour >= 20 || hour < 6) {
    // Night: slightly lower brightness, higher contrast
    return { contrast: '105%', brightness: '90%' };
  } else if (hour >= 12 && hour < 15) {
    // Noon: full brightness and strong contrast to avoid glare
    return { contrast: '110%', brightness: '100%' };
  }
  return { contrast: '100%', brightness: '100%' };
}
