import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, IconComponent],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  features = [
    { icon: 'people', text: 'Unified people records, permissions, and structure' },
    { icon: 'payments', text: 'Fast payroll workflows with reliable approvals' },
    { icon: 'schedule', text: 'Live attendance visibility across every team' },
    { icon: 'beach_access', text: 'Leave requests and policy tracking in one place' },
  ];
}
