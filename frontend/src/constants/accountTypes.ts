export interface AccountTypeOption {
  value: string;
  label: string;
}

export const accountTypes: AccountTypeOption[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' },
];

export const typeLabels: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  'credit-card': 'Credit Card',
  cash: 'Cash',
  investment: 'Investment',
  loan: 'Loan',
  other: 'Other',
};
