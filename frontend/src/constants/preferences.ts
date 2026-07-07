export type Theme =
  | 'light'
  | 'dark'
  | 'catppuccin-latte'
  | 'catppuccin-frappe'
  | 'catppuccin-macchiato'
  | 'catppuccin-mocha'
  | 'dracula'
  | 'nord'
  | 'solarized-light'
  | 'solarized-dark'
  | 'one-dark-pro'
  | 'github-light'
  | 'github-dark'
  | 'gruvbox-dark'
  | 'gruvbox-light'
  | 'tokyo-night'
  | 'monokai'
  | 'ayu-dark'
  | 'ayu-light'
  | 'everforest-dark'
  | 'everforest-light'
  | 'kanagawa'
  | 'rose-pine'
  | 'rose-pine-dawn';

export type NumberLocale = 'en-US' | 'de-DE';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type FirstDayOfWeek = 0 | 1;

export const PREFERENCES_KEY = 'midas-preferences';

export interface Preferences {
  numberLocale: NumberLocale;
  dateFormat: DateFormat;
  firstDayOfWeek: FirstDayOfWeek;
  showMoney: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  numberLocale: 'en-US',
  dateFormat: 'MM/DD/YYYY',
  firstDayOfWeek: 0,
  showMoney: true,
};

export interface ThemeOption {
  value: Theme;
  label: string;
  mode: 'light' | 'dark';
}

export const DARK_THEMES: Theme[] = [
  'dark',
  'catppuccin-frappe',
  'catppuccin-macchiato',
  'catppuccin-mocha',
  'dracula',
  'nord',
  'solarized-dark',
  'one-dark-pro',
  'github-dark',
  'gruvbox-dark',
  'tokyo-night',
  'monokai',
  'ayu-dark',
  'everforest-dark',
  'kanagawa',
  'rose-pine',
];

export const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', mode: 'light' },
  { value: 'dark', label: 'Dark', mode: 'dark' },
  { value: 'catppuccin-latte', label: 'Catppuccin Latte', mode: 'light' },
  { value: 'catppuccin-frappe', label: 'Catppuccin Frappé', mode: 'dark' },
  { value: 'catppuccin-macchiato', label: 'Catppuccin Macchiato', mode: 'dark' },
  { value: 'catppuccin-mocha', label: 'Catppuccin Mocha', mode: 'dark' },
  { value: 'dracula', label: 'Dracula', mode: 'dark' },
  { value: 'nord', label: 'Nord', mode: 'dark' },
  { value: 'solarized-light', label: 'Solarized Light', mode: 'light' },
  { value: 'solarized-dark', label: 'Solarized Dark', mode: 'dark' },
  { value: 'one-dark-pro', label: 'One Dark Pro', mode: 'dark' },
  { value: 'github-light', label: 'GitHub Light', mode: 'light' },
  { value: 'github-dark', label: 'GitHub Dark', mode: 'dark' },
  { value: 'gruvbox-dark', label: 'Gruvbox Dark', mode: 'dark' },
  { value: 'gruvbox-light', label: 'Gruvbox Light', mode: 'light' },
  { value: 'tokyo-night', label: 'Tokyo Night', mode: 'dark' },
  { value: 'monokai', label: 'Monokai', mode: 'dark' },
  { value: 'ayu-dark', label: 'Ayu Dark', mode: 'dark' },
  { value: 'ayu-light', label: 'Ayu Light', mode: 'light' },
  { value: 'everforest-dark', label: 'Everforest Dark', mode: 'dark' },
  { value: 'everforest-light', label: 'Everforest Light', mode: 'light' },
  { value: 'kanagawa', label: 'Kanagawa', mode: 'dark' },
  { value: 'rose-pine', label: 'Rose Pine', mode: 'dark' },
  { value: 'rose-pine-dawn', label: 'Rose Pine Dawn', mode: 'light' },
];

export interface ThemeColors {
  surface: string;
  surfaceSecondary: string;
  background: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  danger: string;
}

export const THEME_COLORS: Record<Theme, ThemeColors> = {
  light: {
    surface: '#f4f4f5',
    surfaceSecondary: '#ffffff',
    background: '#e4e4e7',
    text: '#18181b',
    textMuted: '#71717a',
    border: '#e4e4e7',
    success: '#16a34a',
    danger: '#dc2626',
  },
  dark: {
    surface: '#09090b',
    surfaceSecondary: '#18181b',
    background: '#27272a',
    text: '#fafafa',
    textMuted: '#a1a1aa',
    border: '#27272a',
    success: '#22c55e',
    danger: '#ef4444',
  },
  'catppuccin-latte': {
    surface: '#eff1f5',
    surfaceSecondary: '#e6e9ef',
    background: '#dce0e8',
    text: '#4c4f69',
    textMuted: '#6c6f85',
    border: '#ccd0da',
    success: '#40a02b',
    danger: '#d20f39',
  },
  'catppuccin-frappe': {
    surface: '#303446',
    surfaceSecondary: '#292c3c',
    background: '#232634',
    text: '#c6d0f5',
    textMuted: '#a5adce',
    border: '#414559',
    success: '#a6d189',
    danger: '#e78284',
  },
  'catppuccin-macchiato': {
    surface: '#24273a',
    surfaceSecondary: '#1e2030',
    background: '#181926',
    text: '#cad3f5',
    textMuted: '#a5adcb',
    border: '#363a4f',
    success: '#a6da95',
    danger: '#ed8796',
  },
  'catppuccin-mocha': {
    surface: '#1e1e2e',
    surfaceSecondary: '#181825',
    background: '#11111b',
    text: '#cdd6f4',
    textMuted: '#a6adc8',
    border: '#313244',
    success: '#a6e3a1',
    danger: '#f38ba8',
  },
  dracula: {
    surface: '#282a36',
    surfaceSecondary: '#44475a',
    background: '#21222c',
    text: '#f8f8f2',
    textMuted: '#6272a4',
    border: '#44475a',
    success: '#50fa7b',
    danger: '#ff5555',
  },
  nord: {
    surface: '#2e3440',
    surfaceSecondary: '#3b4252',
    background: '#434c5e',
    text: '#eceff4',
    textMuted: '#81a1c1',
    border: '#4c566a',
    success: '#a3be8c',
    danger: '#bf616a',
  },
  'solarized-light': {
    surface: '#fdf6e3',
    surfaceSecondary: '#eee8d5',
    background: '#eee8d5',
    text: '#657b83',
    textMuted: '#93a1a1',
    border: '#d5cfa4',
    success: '#859900',
    danger: '#dc322f',
  },
  'solarized-dark': {
    surface: '#002b36',
    surfaceSecondary: '#073642',
    background: '#073642',
    text: '#839496',
    textMuted: '#586e75',
    border: '#073642',
    success: '#859900',
    danger: '#dc322f',
  },
  'one-dark-pro': {
    surface: '#282c34',
    surfaceSecondary: '#21252b',
    background: '#181a1f',
    text: '#abb2bf',
    textMuted: '#5c6370',
    border: '#3e4452',
    success: '#98c379',
    danger: '#e06c75',
  },
  'github-light': {
    surface: '#ffffff',
    surfaceSecondary: '#f6f8fa',
    background: '#e8ecf0',
    text: '#1f2328',
    textMuted: '#656d76',
    border: '#d0d7de',
    success: '#1a7f37',
    danger: '#cf222e',
  },
  'github-dark': {
    surface: '#0d1117',
    surfaceSecondary: '#161b22',
    background: '#21262d',
    text: '#e6edf3',
    textMuted: '#8b949e',
    border: '#30363d',
    success: '#3fb950',
    danger: '#f85149',
  },
  'gruvbox-dark': {
    surface: '#282828',
    surfaceSecondary: '#3c3836',
    background: '#1d2021',
    text: '#ebdbb2',
    textMuted: '#a89984',
    border: '#504945',
    success: '#b8bb26',
    danger: '#fb4934',
  },
  'gruvbox-light': {
    surface: '#fbf1c7',
    surfaceSecondary: '#f2e5bc',
    background: '#ebdbb2',
    text: '#3c3836',
    textMuted: '#7c6f64',
    border: '#d5c4a1',
    success: '#98971a',
    danger: '#cc241d',
  },
  'tokyo-night': {
    surface: '#1a1b26',
    surfaceSecondary: '#16161e',
    background: '#13141c',
    text: '#c0caf5',
    textMuted: '#565f89',
    border: '#292e42',
    success: '#9ece6a',
    danger: '#f7768e',
  },
  monokai: {
    surface: '#272822',
    surfaceSecondary: '#1e1f1c',
    background: '#1a1b15',
    text: '#f8f8f2',
    textMuted: '#75715e',
    border: '#3e3d32',
    success: '#a6e22e',
    danger: '#f92672',
  },
  'ayu-dark': {
    surface: '#0b0e14',
    surfaceSecondary: '#11151c',
    background: '#0a0d13',
    text: '#bfbdb6',
    textMuted: '#5c6773',
    border: '#1c2128',
    success: '#7fd962',
    danger: '#f07178',
  },
  'ayu-light': {
    surface: '#fafafa',
    surfaceSecondary: '#f3f4f5',
    background: '#ededed',
    text: '#5c6166',
    textMuted: '#8a9199',
    border: '#e0e0e0',
    success: '#6cbf43',
    danger: '#e65050',
  },
  'everforest-dark': {
    surface: '#2d353b',
    surfaceSecondary: '#232a2e',
    background: '#1e2326',
    text: '#d3c6aa',
    textMuted: '#859289',
    border: '#475258',
    success: '#a7c080',
    danger: '#e67e80',
  },
  'everforest-light': {
    surface: '#fdf6e3',
    surfaceSecondary: '#f3ead3',
    background: '#e8dfc0',
    text: '#5c6a72',
    textMuted: '#939f91',
    border: '#d8d3ba',
    success: '#8da101',
    danger: '#f85552',
  },
  kanagawa: {
    surface: '#1f1f28',
    surfaceSecondary: '#16161d',
    background: '#13131a',
    text: '#dcd7ba',
    textMuted: '#727169',
    border: '#2a2a37',
    success: '#76946a',
    danger: '#c34043',
  },
  'rose-pine': {
    surface: '#191724',
    surfaceSecondary: '#1f1d2e',
    background: '#131220',
    text: '#e0def4',
    textMuted: '#6e6a86',
    border: '#26233a',
    success: '#9ccfd8',
    danger: '#eb6f92',
  },
  'rose-pine-dawn': {
    surface: '#faf4ed',
    surfaceSecondary: '#fffaf3',
    background: '#f2e9de',
    text: '#575279',
    textMuted: '#9893a5',
    border: '#dfdad9',
    success: '#56949f',
    danger: '#b4637a',
  },
};

export const NUMBER_LOCALE_OPTIONS: { value: NumberLocale; label: string; example: string }[] = [
  { value: 'en-US', label: 'US', example: '1,000.00' },
  { value: 'de-DE', label: 'EU', example: '1.000,00' },
];

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

export const FIRST_DAY_OPTIONS: { value: FirstDayOfWeek; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
];
