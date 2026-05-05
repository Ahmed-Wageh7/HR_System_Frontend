export type AppToastType = 'success' | 'error' | 'warning' | 'info';

export function showAppToast(type: AppToastType, message: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('app:toast', {
      detail: { type, message },
    }),
  );
}
