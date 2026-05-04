import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const ICON_MAP: Record<string, string> = {
  account_balance: 'account_balance',
  account_circle: 'account_circle',
  add: 'add',
  admin_panel_settings: 'admin_panel_settings',
  arrow_back: 'arrow_back',
  beach_access: 'beach_access',
  check: 'check',
  check_circle: 'check_circle',
  chevron_left: 'chevron_left',
  chevron_right: 'chevron_right',
  clear: 'clear',
  close: 'close',
  confirmation_number: 'confirmation_number',
  corporate_fare: 'corporate_fare',
  dark_mode: 'dark_mode',
  dashboard: 'dashboard',
  delete: 'delete',
  edit: 'edit',
  error: 'error',
  error_outline: 'error_outline',
  fingerprint: 'fingerprint',
  history: 'history',
  home: 'home',
  info: 'info',
  light_mode: 'light_mode',
  login: 'login',
  logout: 'logout',
  manage_accounts: 'manage_accounts',
  mark_email_read: 'mark_email_read',
  menu: 'menu',
  menu_open: 'menu_open',
  notifications: 'notifications',
  payments: 'payments',
  pending: 'pending',
  people: 'people',
  people_outline: 'people_outline',
  person_add: 'person_add',
  person_off: 'person_off',
  refresh: 'refresh',
  restore: 'restore',
  save: 'save',
  schedule: 'schedule',
  search: 'search',
  send: 'send',
  tune: 'tune',
  upload: 'upload',
  visibility: 'visibility',
  visibility_off: 'visibility_off',
  warning: 'warning',
  work: 'work',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<span class="material-icons" [class.spin]="spin()" [class]="extraClass()" [style.fontSize]="size()" aria-hidden="true">{{ glyph() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input<string | null>(null);
  readonly spin = input(false);
  readonly extraClass = input('');

  readonly glyph = computed(() => ICON_MAP[this.name()] ?? 'help');
}
