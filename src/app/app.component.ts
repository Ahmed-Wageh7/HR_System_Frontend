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
    const id = ++this.nextId;
    this.toasts.update((items) => [...items, { id, type, message }]);
    setTimeout(() => this.removeToast(id), 4000);
  }

  removeToast(id: number): void {
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
