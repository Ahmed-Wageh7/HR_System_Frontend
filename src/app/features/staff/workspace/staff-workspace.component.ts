import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Staff } from '../../../core/models';
import { StaffService } from '../../../core/services/staff.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { CurrencyFormatPipe, DateFormatPipe, InitialsPipe } from '../../../shared/pipes/pipes';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';

@Component({
  selector: 'app-staff-workspace',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    HasPermissionDirective,
    InitialsPipe,
    DateFormatPipe,
    CurrencyFormatPipe,
    ConfirmDialogComponent,
  ],
  template: `
    @if (loading) {
      <div class="card workspace-loading">
        <div class="spinner" style="width:32px;height:32px"></div>
      </div>
    } @else if (!staff) {
      <div class="empty-state">
        <span class="material-icons empty-icon">person_off</span>
        <div class="empty-title">Staff not found</div>
        <a routerLink="/staff" class="btn btn-secondary mt-16">Back to Staff</a>
      </div>
    } @else {
      <div class="staff-hero card">
        <div class="staff-hero-main">
          <a routerLink="/staff" class="btn btn-ghost btn-icon" aria-label="Back to staff list">
            <span class="material-icons">arrow_back</span>
          </a>

          <div class="avatar avatar-xl staff-avatar">
            @if (staff.user.avatar) {
              <img [src]="staff.user.avatar" alt="" class="staff-avatar-image">
            } @else {
              {{ staff.user.name | initials }}
            }
          </div>

          <div class="staff-hero-copy">
            <div class="hero-meta">
              <span class="badge badge-info">{{ staff.employeeCode || 'Staff Profile' }}</span>
              @if (staff.deletedAt || staff.isDeleted) {
                <span class="badge badge-danger">Deleted</span>
              } @else if (staff.isActive) {
                <span class="badge badge-success">Active</span>
              } @else {
                <span class="badge badge-muted">Inactive</span>
              }
            </div>

            <div class="page-title">{{ staff.user.name }}</div>
            <div class="page-subtitle">
              {{ staff.position || 'No position assigned' }} • {{ staff.department?.name || 'No department' }}
            </div>

            <div class="hero-stats">
              <div class="hero-stat">
                <span class="hero-stat-label">Email</span>
                <span>{{ staff.user.email }}</span>
              </div>
              <div class="hero-stat">
                <span class="hero-stat-label">Daily Salary</span>
                <span>{{ staff.dailySalary | currencyFormat }}</span>
              </div>
              <div class="hero-stat">
                <span class="hero-stat-label">Join Date</span>
                <span>{{ staff.joinDate | dateFormat }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="staff-hero-actions">
          <button *hasPermission="'staff:update'" class="btn btn-secondary" (click)="editStaff()">
            <span class="material-icons" style="font-size:16px">edit</span>
            Edit Staff
          </button>

          @if (staff.deletedAt || staff.isDeleted) {
            <button *hasPermission="'staff:update'" class="btn btn-success" (click)="restoreStaff()">
              <span class="material-icons" style="font-size:16px">restore</span>
              Restore
            </button>
          } @else {
            <button *hasPermission="'staff:delete'" class="btn btn-danger" (click)="confirmDeleteOpen = true">
              <span class="material-icons" style="font-size:16px">delete</span>
              Delete
            </button>
          }
        </div>
      </div>

      <div class="staff-section-nav">
        @for (link of links; track link.path) {
          <a
            class="section-pill"
            [routerLink]="link.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <span class="material-icons" style="font-size:18px">{{ link.icon }}</span>
            <span>{{ link.label }}</span>
          </a>
        }
      </div>

      <router-outlet />
    }

    <app-confirm-dialog
      [open]="confirmDeleteOpen"
      title="Delete Staff Member"
      [message]="'Soft delete ' + (staff?.user?.name || 'this staff member') + '?'"
      confirmText="Delete"
      confirmColor="danger"
      (confirmed)="deleteStaff()"
      (cancelled)="confirmDeleteOpen = false"
    />
  `,
  styles: [`
    .workspace-loading {
      min-height: 260px;
      display: grid;
      place-items: center;
    }

    .staff-hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      padding: 28px;
      background:
        linear-gradient(135deg, rgba(31, 143, 255, 0.14), transparent 42%),
        linear-gradient(220deg, rgba(255, 106, 26, 0.14), transparent 36%),
        var(--bg-card);
    }

    .staff-hero-main {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      min-width: 0;
      flex: 1;
    }

    .staff-avatar {
      width: 68px;
      height: 68px;
      flex-shrink: 0;
      font-size: 22px;
      box-shadow: 0 18px 32px rgba(31, 143, 255, 0.16);
    }

    .staff-avatar-image {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .staff-hero-copy {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .hero-meta,
    .staff-hero-actions,
    .hero-stats {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .hero-stats {
      margin-top: 4px;
    }

    .hero-stat {
      min-width: 140px;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.02);
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 13px;
    }

    .hero-stat-label {
      color: var(--text-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .staff-section-nav {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding: 14px 0 4px;
      margin-bottom: 16px;
    }

    .section-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 16px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-secondary);
      white-space: nowrap;
      transition: var(--transition);
      box-shadow: var(--shadow-sm);
    }

    .section-pill:hover {
      color: var(--text-primary);
      border-color: var(--border-strong);
      transform: translateY(-1px);
    }

    .section-pill.active {
      color: var(--accent-contrast);
      background: linear-gradient(135deg, var(--accent), var(--accent-hover));
      border-color: transparent;
    }

    @media (max-width: 900px) {
      .staff-hero {
        flex-direction: column;
      }

      .staff-hero-main {
        width: 100%;
      }

      .staff-hero-actions {
        width: 100%;
      }
    }

    @media (max-width: 640px) {
      .staff-hero {
        padding: 20px;
      }

      .staff-hero-main {
        flex-wrap: wrap;
      }

      .hero-stat {
        flex: 1 1 100%;
      }

      .staff-hero-actions .btn {
        flex: 1 1 100%;
        justify-content: center;
      }
    }
  `],
})
export class StaffWorkspaceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly staffService = inject(StaffService);

  loading = true;
  staff: Staff | null = null;
  confirmDeleteOpen = false;

  readonly links = [
    { path: 'profile', label: 'Staff', icon: 'badge' },
    { path: 'attendance', label: 'Attendance', icon: 'fact_check' },
    { path: 'salary', label: 'Salary', icon: 'payments' },
    { path: 'deductions', label: 'Deductions', icon: 'receipt_long' },
    { path: 'documents', label: 'Documents', icon: 'folder_open' },
  ];

  ngOnInit(): void {
    this.loadStaff();
  }

  loadStaff(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.staffService.getById(id).subscribe({
      next: (response) => {
        this.staff = response.data;
        this.loading = false;
      },
      error: () => {
        this.staff = null;
        this.loading = false;
      },
    });
  }

  editStaff(): void {
    if (!this.staff) return;
    this.router.navigate(['/staff', this.staff._id, 'edit']);
  }

  deleteStaff(): void {
    if (!this.staff) return;
    this.staffService.delete(this.staff._id).subscribe(() => {
      this.confirmDeleteOpen = false;
      this.router.navigate(['/staff']);
    });
  }

  restoreStaff(): void {
    if (!this.staff) return;
    this.staffService.restore(this.staff._id).subscribe(() => this.loadStaff());
  }
}
