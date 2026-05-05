import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../../../core/services/staff.service';
import { Staff } from '../../../core/models';
import { InitialsPipe, DateFormatPipe, CurrencyFormatPipe } from '../../../shared/pipes/pipes';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { StaffFormComponent } from '../form/staff-form.component';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, InitialsPipe, DateFormatPipe, CurrencyFormatPipe, ConfirmDialogComponent, HasPermissionDirective, StaffFormComponent],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Staff Management</div>
        <div class="page-subtitle">{{ totalStaff }} total employees</div>
      </div>
      <div class="page-actions">
        <button *hasPermission="'staff:create'" class="btn btn-primary" (click)="openCreateModal()">
          <span class="material-icons" style="font-size:18px">person_add</span>
          Add Staff
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="card" style="padding:0">
      @if (loading) {
        <div style="padding:20px">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="flex gap-12 mb-12 items-center">
              <div class="skeleton" style="width:36px;height:36px;border-radius:50%"></div>
              <div style="flex:1">
                <div class="skeleton skeleton-text" style="width:40%"></div>
                <div class="skeleton skeleton-text" style="width:25%"></div>
              </div>
              <div class="skeleton skeleton-text" style="width:80px"></div>
              <div class="skeleton skeleton-text" style="width:80px"></div>
            </div>
          }
        </div>
      } @else if (staffList.length === 0) {
        <div class="empty-state">
          <span class="material-icons empty-icon">people_outline</span>
          <div class="empty-title">No staff found</div>
          <div class="empty-desc">Try adjusting your filters or add a new staff member</div>
        </div>
      } @else {
        <div class="data-table-wrapper" style="border:none">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:36px"><input type="checkbox" (change)="toggleAll($event)"></th>
                <th class="sortable" (click)="setSort('name')">
                  Name <span class="material-icons" style="font-size:14px;vertical-align:middle">{{ sortIcon('name') }}</span>
                </th>
                <th>Department</th>
                <th>Position</th>
                <th class="sortable" (click)="setSort('dailySalary')">
                  Daily Salary <span class="material-icons" style="font-size:14px;vertical-align:middle">{{ sortIcon('dailySalary') }}</span>
                </th>
                <th>Join Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (s of staffList; track s._id) {
                <tr>
                  <td><input type="checkbox" [checked]="selected.has(s._id)" (change)="toggleSelect(s._id)"></td>
                  <td>
                    <div class="flex items-center gap-8">
                      <div class="avatar avatar-sm">
                        @if (s.user.avatar) {
                          <img [src]="s.user.avatar" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">
                        } @else {
                          {{ s.user.name | initials }}
                        }
                      </div>
                      <a class="staff-name-cell" [routerLink]="['/staff', s._id]">
                        <div class="fw-semibold" style="font-size:13px">{{ s.user.name }}</div>
                        <div class="text-muted" style="font-size:11px">{{ s.user.email }}</div>
                      </a>
                    </div>
                  </td>
                  <td>{{ s.department?.name || '—' }}</td>
                  <td>{{ s.position || '—' }}</td>
                  <td>{{ s.dailySalary | currencyFormat }}</td>
                  <td>{{ s.joinDate | dateFormat }}</td>
                  <td>
                    @if (s.deletedAt) {
                      <span class="badge badge-danger">Deleted</span>
                    } @else if (s.isActive) {
                      <span class="badge badge-success">Active</span>
                    } @else {
                      <span class="badge badge-muted">Inactive</span>
                    }
                  </td>
                  <td>
                    <div class="flex gap-8">
                      <a class="btn btn-ghost btn-sm btn-icon" title="View" [routerLink]="['/staff', s._id]">
                        <span class="material-icons" style="font-size:16px">visibility</span>
                      </a>
                      <button *hasPermission="'staff:update'" class="btn btn-ghost btn-sm btn-icon" title="Edit" (click)="openEditModal(s._id)">
                        <span class="material-icons" style="font-size:16px">edit</span>
                      </button>
                      @if (s.deletedAt) {
                        <button *hasPermission="'staff:update'" class="btn btn-success btn-sm btn-icon" title="Restore" (click)="restore(s._id)">
                          <span class="material-icons" style="font-size:16px">restore</span>
                        </button>
                      } @else {
                        <button *hasPermission="'staff:delete'" class="btn btn-danger btn-sm btn-icon" title="Delete" (click)="openDelete(s)">
                          <span class="material-icons" style="font-size:16px">delete</span>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (totalPages > 1) {
        <div style="padding:12px 16px;border-top:1px solid var(--border)">
          <div class="pagination">
            <div class="page-controls">
              <button class="page-btn" [disabled]="page === 1" (click)="setPage(page - 1)">
                <span class="material-icons" style="font-size:16px">chevron_left</span>
              </button>
              @for (p of pageNumbers; track p) {
                <button class="page-btn" [class.active]="p === page" (click)="setPage(p)">{{ p }}</button>
              }
              <button class="page-btn" [disabled]="page >= totalPages" (click)="setPage(page + 1)">
                <span class="material-icons" style="font-size:16px">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
        }
      }
    </div>

    <!-- Bulk Actions -->
    @if (selected.size > 0) {
      <div class="bulk-bar">
        <span>{{ selected.size }} selected</span>
        <button class="btn btn-danger btn-sm" (click)="bulkDelete()">
          <span class="material-icons" style="font-size:16px">delete</span>
          Delete Selected
        </button>
        <button class="btn btn-ghost btn-sm" (click)="selected.clear()">Clear</button>
      </div>
    }

    <app-confirm-dialog
      [open]="confirmOpen"
      title="Delete Staff Member"
      [message]="'Remove ' + (deleteTarget?.user?.name || '') + ' from the system?'"
      confirmText="Delete"
      confirmColor="danger"
      (confirmed)="confirmDelete()"
      (cancelled)="confirmOpen = false"
    />

    @if (modalOpen) {
      <div class="modal-backdrop staff-modal-backdrop" (click)="closeModal()">
        <div class="modal staff-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">{{ modalTitle }}</div>
            <button class="btn btn-ghost btn-icon" (click)="closeModal()">
              <span class="material-icons" style="font-size:18px">close</span>
            </button>
          </div>

          @if (modalMode === 'create') {
            <app-staff-form [embedded]="true" (saved)="handleCreated($event)" (cancelled)="closeModal()" />
          } @else if (modalMode === 'edit' && activeStaffId) {
            <app-staff-form [embedded]="true" [staffId]="activeStaffId" (saved)="handleUpdated($event)" (cancelled)="closeModal()" />
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .bulk-bar {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: var(--bg-card); border: 1px solid var(--border-strong);
      border-radius: 24px; padding: 10px 20px;
      display: flex; align-items: center; gap: 12px;
      box-shadow: var(--shadow-lg); font-size: 13px; font-weight: 600;
      z-index: 100;
    }

    .staff-modal-backdrop {
      align-items: flex-start;
      overflow-y: auto;
    }

    .staff-modal {
      width: min(100%, 860px);
      max-width: 860px;
      max-height: 86vh;
      margin: 24px 0;
    }

    .staff-name-cell {
      display: block;
      min-width: 0;
      color: inherit;
    }

    .staff-name-cell .fw-semibold {
      cursor: pointer;
    }
  `]
})
export class StaffListComponent implements OnInit {
  private readonly staffService = inject(StaffService);
  private readonly router = inject(Router);

  loading = true;
  staffList: Staff[] = [];
  totalStaff = 0;
  page = 1;
  limit = 10;
  sort = '-createdAt';
  selected = new Set<string>();
  confirmOpen = false;
  deleteTarget: Staff | null = null;
  modalOpen = false;
  modalMode: 'create' | 'edit' | null = null;
  activeStaffId: string | null = null;

  get totalPages(): number { return Math.ceil(this.totalStaff / this.limit); }
  get pageNumbers(): number[] {
    const start = Math.max(1, this.page - 2);
    const end = Math.min(this.totalPages, this.page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  sortField = '-createdAt';
  sortDir = -1;

  get modalTitle(): string {
    switch (this.modalMode) {
      case 'create': return 'Add Staff Member';
      case 'edit': return 'Edit Staff Member';
      default: return '';
    }
  }

  ngOnInit(): void {
    this.loadStaff();
  }

  loadStaff(): void {
    this.loading = true;
    const query: Record<string, unknown> = { page: this.page, limit: this.limit, sort: this.sort };

    this.staffService.getAll(query as Record<string, string | number | boolean>).subscribe({
      next: (res) => {
        this.staffList = res.data;
        this.totalStaff = res.pagination?.total ?? res.pagination?.totalDocuments ?? res.data.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setSort(field: string): void {
    this.sort = this.sort === field ? `-${field}` : field;
    this.loadStaff();
  }

  sortIcon(field: string): string {
    if (this.sort === field) return 'arrow_upward';
    if (this.sort === `-${field}`) return 'arrow_downward';
    return 'unfold_more';
  }

  setPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loadStaff();
  }

  toggleAll(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) this.staffList.forEach(s => this.selected.add(s._id));
    else this.selected.clear();
  }

  toggleSelect(id: string): void {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
  }

  openDelete(s: Staff): void {
    this.deleteTarget = s;
    this.confirmOpen = true;
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.activeStaffId = null;
    this.modalOpen = true;
  }

  openEditModal(id: string): void {
    this.modalMode = 'edit';
    this.activeStaffId = id;
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.modalMode = null;
    this.activeStaffId = null;
  }

  handleCreated(staff: Staff): void {
    this.closeModal();
    this.loadStaff();
    this.router.navigate(['/staff', staff._id]);
  }

  handleUpdated(staff: Staff): void {
    this.closeModal();
    this.loadStaff();
    this.router.navigate(['/staff', staff._id]);
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.staffService.delete(this.deleteTarget._id).subscribe(() => {
      this.confirmOpen = false;
      this.loadStaff();
    });
  }

  bulkDelete(): void {
    const ids = Array.from(this.selected);
    Promise.all(ids.map(id => this.staffService.delete(id).toPromise()))
      .then(() => { this.selected.clear(); this.loadStaff(); });
  }

  restore(id: string): void {
    this.staffService.restore(id).subscribe(() => this.loadStaff());
  }
}
