import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Staff } from '../../../core/models';
import { StaffService } from '../../../core/services/staff.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { CurrencyFormatPipe, DateFormatPipe, InitialsPipe } from '../../../shared/pipes/pipes';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { StaffFormComponent } from '../form/staff-form.component';

@Component({
  selector: 'app-staff-workspace',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterOutlet,
    HasPermissionDirective,
    InitialsPipe,
    DateFormatPipe,
    CurrencyFormatPipe,
    ConfirmDialogComponent,
    StaffFormComponent,
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
              <span class="material-icons avatar-fallback-icon">account_circle</span>
            }
          </div>

          <div class="staff-hero-copy">
            <div class="hero-meta">
              <span class="badge badge-info">{{ staff.employeeCode || 'Staff Profile' }}</span>
              @if (staff.deletedAt || staff.isDeleted) {
                <span class="badge badge-danger">Deleted</span>
              } @else {
                <div class="status-select">
                  <button class="btn btn-ghost btn-sm status-trigger" type="button" (click)="statusMenuOpen = !statusMenuOpen">
                    <span class="badge" [class.badge-success]="staff.isActive" [class.badge-muted]="!staff.isActive">
                      {{ staff.isActive ? 'Active' : 'Inactive' }}
                    </span>
                    <span class="material-icons status-caret">keyboard_arrow_down</span>
                  </button>
                  @if (statusMenuOpen) {
                    <div class="status-menu">
                      <button class="status-menu-item" [class.active]="staff.isActive" (click)="updateStaffStatus(true)">
                        <span>Active</span>
                        @if (staff.isActive) { <span class="material-icons">check</span> }
                      </button>
                      <button class="status-menu-item" [class.active]="!staff.isActive" (click)="updateStaffStatus(false)">
                        <span>Inactive</span>
                        @if (!staff.isActive) { <span class="material-icons">check</span> }
                      </button>
                    </div>
                  }
                </div>
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

      <section class="workspace-body">
        <router-outlet />
      </section>
    }

    @if (editModalOpen && staff) {
      <div class="modal-backdrop form-backdrop staff-edit-backdrop" (click)="closeEditModal()">
        <div class="modal modal-form-wide staff-edit-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">Edit Staff</div>
              <div class="text-secondary mt-4" style="font-size:13px">
                Update employment details without leaving this workspace.
              </div>
            </div>
            <button class="btn btn-ghost btn-icon" (click)="closeEditModal()">
              <span class="material-icons">close</span>
            </button>
          </div>

          <app-staff-form
            [embedded]="true"
            [staffId]="staff._id"
            (saved)="handleUpdated($event)"
            (cancelled)="closeEditModal()"
          />
        </div>
      </div>
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

    .workspace-body {
      min-height: 0;
      max-height: calc(100vh - 280px);
      overflow: auto;
      padding-right: 4px;
    }

    .staff-edit-modal {
      margin: 0;
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

      .workspace-body {
        max-height: none;
        overflow: visible;
        padding-right: 0;
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
  editModalOpen = false;
  statusMenuOpen = false;

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
        if (typeof window !== 'undefined') {
          localStorage.setItem('lastStaffWorkspaceId', response.data._id);
        }
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
    this.editModalOpen = true;
  }

  closeEditModal(): void {
    this.editModalOpen = false;
  }

  handleUpdated(staff: Staff): void {
    this.staff = staff;
    this.editModalOpen = false;
    this.loadStaff();
  }

  updateStaffStatus(isActive: boolean): void {
    if (!this.staff || this.staff.isActive === isActive) {
      this.statusMenuOpen = false;
      return;
    }

    this.staffService.update(this.staff._id, { isActive }).subscribe({
      next: (response) => {
        this.staff = response.data;
        this.statusMenuOpen = false;
      },
      error: () => {
        this.statusMenuOpen = false;
      }
    });
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
