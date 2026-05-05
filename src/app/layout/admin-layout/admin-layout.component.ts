import { ChangeDetectionStrategy, Component, HostListener, computed, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { AvatarViewService } from '../../core/services/avatar-view.service';
import { UiService } from '../../core/services/ui.service';
import { SocketService } from '../../core/services/socket.service';
import { InitialsPipe } from '../../shared/pipes/pipes';
import { TimeAgoPipe } from '../../shared/pipes/pipes';
import { IconComponent } from '../../shared/components/icon.component';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  permission?: string;
  adminOnly?: boolean;
}

interface NestedNavItem {
  label: string;
  route: string | null;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, InitialsPipe, TimeAgoPipe, IconComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly avatarView = inject(AvatarViewService);
  readonly ui = inject(UiService);
  readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  readonly currentUser = computed(() => this.auth.currentUser());
  readonly currentUserName = computed(() => this.currentUser()?.name ?? '');
  readonly currentUserEmail = computed(() => this.currentUser()?.email ?? '');
  notifOpen = false;
 
  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Staff', icon: 'people', route: '/staff' },
    { label: 'Attendance', icon: 'schedule', route: '/attendance' },
    { label: 'Salary', icon: 'payments', route: '/salary' },
    { label: 'Leaves', icon: 'beach_access', route: '/leaves' },
    { label: 'Departments', icon: 'corporate_fare', route: '/departments' },
    { label: 'Roles', icon: 'admin_panel_settings', route: '/roles' },
    { label: 'Audit Logs', icon: 'history', route: '/audit-logs' },
    { label: 'Tickets', icon: 'confirmation_number', route: '/tickets' },
    { label: 'Profile', icon: 'manage_accounts', route: '/profile' },
  ];

  get isStaffRoute(): boolean {
    return this.router.url.split('?')[0].startsWith('/staff');
  }

  get activeStaffWorkspaceId(): string | null {
    return this.getSidebarStaffId();
  }

  get showStaffSubnav(): boolean {
    return this.isStaffRoute;
  }

  get staffSubnav(): NestedNavItem[] {
    const activeStaffId = this.activeStaffWorkspaceId;
    const staffBase = activeStaffId ? `/staff/${activeStaffId}` : null;
    return [
      { label: 'Staff Info', route: staffBase ? `${staffBase}/profile` : null },
      { label: 'Attendance', route: staffBase ? `${staffBase}/attendance` : null },
      { label: 'Salary', route: staffBase ? `${staffBase}/salary` : null },
      { label: 'Deductions', route: staffBase ? `${staffBase}/deductions` : null },
      { label: 'Documents', route: staffBase ? `${staffBase}/documents` : null },
    ];
  }

  private getSidebarStaffId(): string | null {
    const url = this.router.url.split('?')[0];
    const parts = url.split('/').filter(Boolean);
    if (parts[0] === 'staff' && parts[1] && parts[1] !== 'new' && parts[2] !== 'edit') {
      return parts[1];
    }

    if (typeof window === 'undefined') {
      return null;
    }

    return localStorage.getItem('lastStaffWorkspaceId');
  }

  ngOnInit(): void {
    this.ui.syncViewport();
    const token = this.auth.getAccessToken();
    if (token) this.socket.connect(token);
  }

  logout(): void {
    this.auth.logout().subscribe({
      error: (err) => {
        const message = err?.error?.message || 'Logout failed. Please try again.';
        window.dispatchEvent(new CustomEvent('app:toast', {
          detail: { type: 'error', message }
        }));
      }
    });
  }

  toggleNotif(): void {
    this.notifOpen = !this.notifOpen;
  }

  onNotifClick(n: { _id: string; link?: string }): void {
    this.socket.markRead(n._id);
    this.notifOpen = false;
    if (n.link) this.router.navigateByUrl(n.link);
  }

  handleNavClick(): void {
    if (this.ui.isMobile()) {
      this.ui.closeSidebar();
    }
  }

  handleNavItemClick(event: MouseEvent): void {
    if (this.ui.isTablet() && !this.ui.sidebarExpanded()) {
      event.preventDefault();
      this.ui.toggleSidebar();
      return;
    }

    this.handleNavClick();
  }

  isNestedNavItemActive(route: string | null): boolean {
    if (!route) {
      return false;
    }

    return this.router.url.split('?')[0] === route;
  }

  getCurrentSection(): string {
    const url = this.router.url.split('?')[0];
    const parts = url.split('/').filter(Boolean);
    if (parts[0]) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).replace(/-/g, ' ');
    return 'Dashboard';
  }

  getCurrentUserAvatarStyle(): Record<string, string> {
    return this.avatarView.toStyle(this.avatarView.get(this.currentUser()?._id));
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.notif-wrapper')) this.notifOpen = false;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.ui.syncViewport();
  }
}
