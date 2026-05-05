import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { IconComponent } from './shared/components/icon.component';
import { AuthService } from './core/services/auth.service';

interface ToastMessage {
  id: number;
  type: string;
  message: string;
  key: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, IconComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly toasts = signal<ToastMessage[]>([]);
  private nextId = 0;
  private readonly recentToastTimes = new Map<string, number>();
  private readonly toastTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

  ngOnInit(): void {
    window.addEventListener('app:toast', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      this.addToast(detail.type, detail.message);
    });

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.auth.storeRedirectUrl(event.urlAfterRedirects);
    });
  }

  addToast(type: string, message: string): void {
    const key = `${type}:${message}`;
    const now = Date.now();
    const lastShown = this.recentToastTimes.get(key) ?? 0;
    if (now - lastShown < 2500) {
      return;
    }

    this.recentToastTimes.set(key, now);
    const id = ++this.nextId;
    this.toasts.update((items) => {
      const nextItems = [...items, { id, type, message, key }];
      return nextItems.slice(-4);
    });

    const timeoutId = setTimeout(() => this.removeToast(id), 4500);
    this.toastTimeouts.set(id, timeoutId);
  }

  removeToast(id: number): void {
    const timeoutId = this.toastTimeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.toastTimeouts.delete(id);
    }
    this.toasts.update((items) => items.filter((toast) => toast.id !== id));
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };
    return icons[type] ?? 'notifications';
  }
}
