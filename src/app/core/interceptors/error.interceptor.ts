import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, finalize } from 'rxjs';
import { UiService } from '../services/ui.service';

// Global error handler
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) showToast('error', translateMessage('Session expired. Please log in again.', 'انتهت الجلسة، برجاء تسجيل الدخول مرة أخرى.'));
      else if (err.status === 403) showToast('error', translateMessage('Access denied', 'ليس لديك صلاحية للوصول.'));
      else if (err.status === 404) showToast('error', translateMessage('Resource not found', 'العنصر غير موجود.'));
      else if (err.status === 422) {
        const msg = err.error?.message || translateMessage('Validation error', 'بيانات غير صحيحة.');
        showToast('error', msg);
      }
      else if (err.status === 429) showToast('warning', translateMessage('Too many requests. Please wait.', 'طلبات كثيرة جدًا. برجاء المحاولة بعد قليل.'));
      else if (err.status >= 500) showToast('error', translateMessage('Server error. Try again later.', 'حدث خطأ في الخادم. حاول مرة أخرى لاحقًا.'));
      else if (err.status === 0) showToast('error', translateMessage('Network error. Check your connection.', 'هناك مشكلة في الاتصال بالإنترنت.'));
      return throwError(() => err);
    })
  );
};

// Global loading indicator
export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const ui = inject(UiService);
  ui.showLoader();
  return next(req).pipe(
    finalize(() => ui.hideLoader())
  );
};

// Simple toast function (uses native approach without injection)
function showToast(type: 'error' | 'warning' | 'success', message: string): void {
  window.dispatchEvent(new CustomEvent('app:toast', {
    detail: { type, message }
  }));
}

function translateMessage(english: string, arabic: string): string {
  return document.documentElement.lang.startsWith('ar') ? arabic : english;
}
