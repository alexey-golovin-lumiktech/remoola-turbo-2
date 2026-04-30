export const THEME = {
  LIGHT: `LIGHT`,
  DARK: `DARK`,
  SYSTEM: `SYSTEM`,
} as const;
export type TTheme = (typeof THEME)[keyof typeof THEME];

export const THEMES = [THEME.LIGHT, THEME.DARK, THEME.SYSTEM] as const;
