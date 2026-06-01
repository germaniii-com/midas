export interface CurrencyOption {
  value: string;
  label: string;
}

export const currencies: CurrencyOption[] = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'MXN', label: 'MXN - Mexican Peso' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'PHP', label: 'PHP - Philippine Peso' },
  { value: 'ARS', label: 'ARS - Argentine Peso' },
  { value: 'COP', label: 'COP - Colombian Peso' },
  { value: 'BRL', label: 'BRL - Brazilian Real' },
  { value: 'CLP', label: 'CLP - Chilean Peso' },
];
