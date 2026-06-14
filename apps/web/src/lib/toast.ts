import { toast, type ExternalToast } from 'sonner';

const baseOptions: ExternalToast = {
  duration: 3000,
};

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function showSuccessToast(message: string) {
  return toast.success(message, baseOptions);
}

export function showErrorToast(error: unknown, fallback = 'Unable to complete request. Please try again.') {
  return toast.error(getErrorMessage(error, fallback), { duration: 5000 });
}

export function showInfoToast(message: string) {
  return toast.info(message, baseOptions);
}

export function showWarningToast(message: string) {
  return toast.warning(message, { duration: 4000 });
}

export function showLoadingToast(message: string) {
  return toast.loading(message);
}

export function dismissToast(id?: string | number) {
  toast.dismiss(id);
}
