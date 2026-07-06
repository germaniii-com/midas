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
  | 'github-dark';

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
];

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
