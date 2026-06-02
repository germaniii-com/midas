import { addToast } from '@heroui/toast';

export function toastSuccess(description: string) {
  addToast({
    title: 'Success',
    description,
    color: 'success',
    timeout: 3000,
  });
}

export function toastError(description: string) {
  addToast({
    title: 'Error',
    description,
    color: 'danger',
    timeout: 5000,
  });
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
