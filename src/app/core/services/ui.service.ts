import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly mobileBreakpoint = 768;
  private readonly tabletBreakpoint = 1024;
  readonly isMobile = signal(typeof window !== 'undefined' ? window.innerWidth <= this.mobileBreakpoint : false);
  readonly isTablet = signal(typeof window !== 'undefined' ? window.innerWidth > this.mobileBreakpoint && window.innerWidth <= this.tabletBreakpoint : false);
  readonly sidebarOpen = signal(!this.isMobile());
  readonly sidebarExpanded = signal(true);
  readonly theme = signal<'light' | 'dark'>(this.getInitialTheme());
  readonly globalLoading = signal(false);
  readonly loadingCount = signal(0);

  constructor() {
    effect(() => {
      const t = this.theme();
      if (typeof window === 'undefined') return;

      localStorage.setItem('theme', t);
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.style.colorScheme = t;
    });
  }

  private getInitialTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';

    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;

    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  syncViewport(): void {
    const width = window.innerWidth;
    const mobile = width <= this.mobileBreakpoint;
    const tablet = width > this.mobileBreakpoint && width <= this.tabletBreakpoint;
    const wasMobile = this.isMobile();

    this.isMobile.set(mobile);
    this.isTablet.set(tablet);

    if (!mobile) {
      this.sidebarOpen.set(true);
      if (!tablet) this.sidebarExpanded.set(true);
      return;
    }

    if (!wasMobile) {
      this.sidebarOpen.set(false);
    }
  }

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.sidebarOpen.update(v => !v);
      return;
    }

    this.sidebarExpanded.update(v => !v);
  }

  openSidebar(): void {
    if (this.isMobile()) {
      this.sidebarOpen.set(true);
      return;
    }

    this.sidebarExpanded.set(true);
  }

  closeSidebar(): void {
    if (this.isMobile()) {
      this.sidebarOpen.set(false);
      return;
    }

    this.sidebarExpanded.set(false);
  }

  toggleTheme(): void {
    this.theme.update(t => t === 'dark' ? 'light' : 'dark');
  }

  showLoader(): void {
    this.loadingCount.update(c => c + 1);
    this.globalLoading.set(true);
  }

  hideLoader(): void {
    this.loadingCount.update(c => Math.max(0, c - 1));
    if (this.loadingCount() === 0) this.globalLoading.set(false);
  }
}
