import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../../../core/services/staff.service';
import { Department, Staff } from '../../../core/models';
import { InitialsPipe, DateFormatPipe, CurrencyFormatPipe } from '../../../shared/pipes/pipes';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { StaffFormComponent } from '../form/staff-form.component';
import { DepartmentService } from '../../../core/services/department.service';
import { forkJoin } from 'rxjs';

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

    <div class="staff-overview-grid">
      <div class="stat-card stat-info">
        <span class="stat-label">Total Staff</span>
        <span class="stat-value">{{ totalStaff }}</span>
        <span class="material-icons stat-icon">groups</span>
      </div>
      <div class="stat-card stat-success">
        <span class="stat-label">Active</span>
        <span class="stat-value">{{ activeCount }}</span>
        <span class="material-icons stat-icon">verified_user</span>
      </div>
      <div class="stat-card stat-warning">
        <span class="stat-label">Inactive</span>
        <span class="stat-value">{{ inactiveCount }}</span>
        <span class="material-icons stat-icon">hourglass_bottom</span>
      </div>
      <div class="stat-card stat-danger">
        <span class="stat-label">Deleted</span>
        <span class="stat-value">{{ deletedCount }}</span>
        <span class="material-icons stat-icon">person_off</span>
      </div>
    </div>

    <div class="filter-panel staff-filter-panel">
      <div class="search-input-wrapper">
        <span class="material-icons search-icon">search</span>
        <input
          type="text"
          [ngModel]="search"
          (ngModelChange)="onSearchChange($event)"
          placeholder="Search by name or email"
        >
      </div>

      <div class="form-group filter-field">
        <label>Department</label>
        <select class="form-control" [(ngModel)]="departmentFilter" (ngModelChange)="applyFilters()">
          <option value="">All Departments</option>
          @for (department of departments; track department._id) {
            <option [value]="department._id">{{ department.name }}</option>
          }
        </select>
      </div>

      <div class="form-group filter-field">
        <label>Status</label>
        <select class="form-control" [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      <div class="filter-actions">
        <button class="btn btn-secondary" type="button" (click)="resetFilters()">Reset</button>
      </div>
    </div>

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
        <div class="staff-mobile-list">
          @for (s of staffList; track s._id) {
            <article class="staff-mobile-card">
              <div class="staff-mobile-top">
                <div class="flex items-center gap-12" style="min-width:0">
                  <div class="avatar avatar-lg">
                    @if (s.user.avatar) {
                      <img [src]="s.user.avatar" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">
                    } @else {
                      <span class="material-icons avatar-fallback-icon">account_circle</span>
                    }
                  </div>
                  <div class="staff-mobile-copy">
                    <a class="staff-name-cell" [routerLink]="['/staff', s._id]">
                      <div class="fw-semibold">{{ s.user.name }}</div>
                    </a>
                    <div class="text-muted staff-mobile-email">{{ s.user.email }}</div>
                    <div class="text-muted">{{ s.employeeCode || 'No code assigned' }}</div>
                  </div>
                </div>

                @if (s.deletedAt) {
                  <span class="badge badge-danger">Deleted</span>
                } @else {
                  <div class="status-select">
                    <button class="btn btn-ghost btn-sm status-trigger" type="button" (click)="toggleStatusMenu(s._id)">
                      <span class="badge" [class.badge-success]="s.isActive" [class.badge-muted]="!s.isActive">
                        {{ s.isActive ? 'Active' : 'Inactive' }}
                      </span>
                      <span class="material-icons status-caret">keyboard_arrow_down</span>
                    </button>
                    @if (statusMenuOpenId === s._id) {
                      <div class="status-menu">
                        <button class="status-menu-item" [class.active]="s.isActive" (click)="updateStaffStatus(s, true)">
                          <span>Active</span>
                          @if (s.isActive) { <span class="material-icons">check</span> }
                        </button>
                        <button class="status-menu-item" [class.active]="!s.isActive" (click)="updateStaffStatus(s, false)">
                          <span>Inactive</span>
                          @if (!s.isActive) { <span class="material-icons">check</span> }
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="staff-mobile-meta">
                <div class="mobile-meta-item">
                  <span class="mobile-meta-label">Department</span>
                  <strong>{{ s.department?.name || '—' }}</strong>
                </div>
                <div class="mobile-meta-item">
                  <span class="mobile-meta-label">Position</span>
                  <strong>{{ s.position || '—' }}</strong>
                </div>
                <div class="mobile-meta-item">
                  <span class="mobile-meta-label">Daily Salary</span>
                  <strong>{{ s.dailySalary | currencyFormat }}</strong>
                </div>
                <div class="mobile-meta-item">
                  <span class="mobile-meta-label">Join Date</span>
                  <strong>{{ s.joinDate | dateFormat }}</strong>
                </div>
              </div>

              <div class="staff-mobile-actions">
                <a class="btn btn-secondary btn-sm" [routerLink]="['/staff', s._id]">
                  <span class="material-icons" style="font-size:16px">visibility</span>
                  Open
                </a>
                <button *hasPermission="'staff:update'" class="btn btn-ghost btn-sm" (click)="openEditModal(s._id)">
                  <span class="material-icons" style="font-size:16px">edit</span>
                  Edit
                </button>
                @if (s.deletedAt) {
                  <button *hasPermission="'staff:update'" class="btn btn-success btn-sm" (click)="restore(s._id)">
                    <span class="material-icons" style="font-size:16px">restore</span>
                    Restore
                  </button>
                } @else {
                  <button *hasPermission="'staff:delete'" class="btn btn-danger btn-sm" (click)="openDelete(s)">
                    <span class="material-icons" style="font-size:16px">delete</span>
                    Delete
                  </button>
                }
              </div>
            </article>
          }
        </div>

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
                          <span class="material-icons avatar-fallback-icon">account_circle</span>
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
                    } @else {
                      <div class="status-select">
                        <button class="btn btn-ghost btn-sm status-trigger" type="button" (click)="toggleStatusMenu(s._id)">
                          <span class="badge" [class.badge-success]="s.isActive" [class.badge-muted]="!s.isActive">
                            {{ s.isActive ? 'Active' : 'Inactive' }}
                          </span>
                          <span class="material-icons status-caret">keyboard_arrow_down</span>
                        </button>
                        @if (statusMenuOpenId === s._id) {
                          <div class="status-menu">
                            <button class="status-menu-item" [class.active]="s.isActive" (click)="updateStaffStatus(s, true)">
                              <span>Active</span>
                              @if (s.isActive) { <span class="material-icons">check</span> }
                            </button>
                            <button class="status-menu-item" [class.active]="!s.isActive" (click)="updateStaffStatus(s, false)">
                              <span>Inactive</span>
                              @if (!s.isActive) { <span class="material-icons">check</span> }
                            </button>
                          </div>
                        }
                      </div>
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
      <div class="modal-backdrop form-backdrop staff-modal-backdrop" (click)="closeModal()">
        <div class="modal modal-form-wide staff-modal" (click)="$event.stopPropagation()">
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

    .staff-modal {
      margin: 0;
    }

    .staff-name-cell {
      display: block;
      min-width: 0;
      color: inherit;
    }

    .staff-name-cell .fw-semibold {
      cursor: pointer;
    }

    .data-table-wrapper {
      max-height: min(68vh, 760px);
      overflow: auto;
    }

    .staff-overview-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 16px;
    }

    .staff-filter-panel {
      margin-bottom: 16px;
      grid-template-columns: minmax(0, 1.6fr) repeat(2, minmax(180px, 1fr)) auto;
    }

    .filter-field {
      margin-bottom: 0;
    }

    .filter-actions {
      display: flex;
      align-items: end;
      min-height: 100%;
    }

    .staff-mobile-list {
      display: none;
      padding: 16px;
      gap: 12px;
      flex-direction: column;
      max-height: min(62vh, 720px);
      overflow: auto;
    }

    .staff-mobile-card {
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 16px;
      background:
        linear-gradient(145deg, rgba(31, 143, 255, 0.08), transparent 42%),
        var(--bg-elevated);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .staff-mobile-top,
    .staff-mobile-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .staff-mobile-copy {
      min-width: 0;
    }

    .staff-mobile-email {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .staff-mobile-meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .mobile-meta-item {
      padding: 12px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .mobile-meta-item strong {
      overflow-wrap: anywhere;
    }

    .mobile-meta-label {
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    @media (max-width: 1100px) {
      .staff-overview-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .staff-filter-panel {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 860px) {
      .staff-mobile-list {
        display: flex;
      }

      .data-table-wrapper {
        display: none;
      }
    }

    @media (max-width: 640px) {
      .staff-overview-grid,
      .staff-filter-panel,
      .staff-mobile-meta {
        grid-template-columns: 1fr;
      }

      .bulk-bar {
        width: calc(100% - 24px);
        left: 12px;
        right: 12px;
        transform: none;
        justify-content: center;
        flex-wrap: wrap;
      }
    }
  `]
})
export class StaffListComponent implements OnInit {
  private readonly staffService = inject(StaffService);
  private readonly departmentService = inject(DepartmentService);
  private readonly router = inject(Router);

  loading = true;
  staffList: Staff[] = [];
  departments: Department[] = [];
  totalStaff = 0;
  page = 1;
  limit = 10;
  sort = '-createdAt';
  search = '';
  departmentFilter = '';
  statusFilter = '';
  selected = new Set<string>();
  confirmOpen = false;
  deleteTarget: Staff | null = null;
  statusMenuOpenId: string | null = null;
  modalOpen = false;
  modalMode: 'create' | 'edit' | null = null;
  activeStaffId: string | null = null;
  activeCount = 0;
  inactiveCount = 0;
  deletedCount = 0;

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
    this.loadInitialData();
  }

  loadInitialData(): void {
    forkJoin({
      departments: this.departmentService.getAll(),
      staff: this.staffService.getAll(this.buildQuery()),
    }).subscribe({
      next: ({ departments, staff }) => {
        this.departments = departments.data ?? [];
        this.applyStaffResponse(staff);
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadStaff(): void {
    this.loading = true;
    const query = this.buildQuery();

    this.staffService.getAll(query).subscribe({
      next: (res) => this.applyStaffResponse(res),
      error: () => { this.loading = false; }
    });
  }

  private buildQuery(): Record<string, string | number | boolean> {
    const query: Record<string, string | number | boolean> = {
      page: this.page,
      limit: this.limit,
      sort: this.sort,
    };

    if (this.search.trim()) query['search'] = this.search.trim();
    if (this.departmentFilter) query['department'] = this.departmentFilter;
    if (this.statusFilter === 'active') query['isActive'] = true;
    if (this.statusFilter === 'inactive') query['isActive'] = false;
    if (this.statusFilter === 'deleted') query['sort'] = this.sort;

    return query;
  }

  private applyStaffResponse(res: { data: Staff[]; pagination?: { total?: number; totalDocuments?: number; totalResults?: number } }): void {
    this.staffList = Array.isArray(res.data)
      ? (this.statusFilter === 'deleted' ? res.data.filter(staff => !!staff.deletedAt || !!staff.isDeleted) : res.data)
      : [];
    this.totalStaff = res.pagination?.total ?? res.pagination?.totalDocuments ?? res.pagination?.totalResults ?? this.staffList.length;
    this.activeCount = this.staffList.filter(staff => staff.isActive && !staff.deletedAt && !staff.isDeleted).length;
    this.inactiveCount = this.staffList.filter(staff => !staff.isActive && !staff.deletedAt && !staff.isDeleted).length;
    this.deletedCount = this.staffList.filter(staff => !!staff.deletedAt || !!staff.isDeleted).length;
    this.loading = false;
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

  onSearchChange(value: string): void {
    this.search = value;
    this.applyFilters();
  }

  applyFilters(): void {
    this.page = 1;
    this.loadStaff();
  }

  resetFilters(): void {
    this.search = '';
    this.departmentFilter = '';
    this.statusFilter = '';
    this.page = 1;
    this.loadStaff();
  }

  toggleStatusMenu(id: string): void {
    this.statusMenuOpenId = this.statusMenuOpenId === id ? null : id;
  }

  updateStaffStatus(staff: Staff, isActive: boolean): void {
    if (staff.isActive === isActive) {
      this.statusMenuOpenId = null;
      return;
    }

    this.staffService.update(staff._id, { isActive }).subscribe({
      next: (res) => {
        this.staffList = this.staffList.map(item => item._id === staff._id ? res.data : item);
        this.statusMenuOpenId = null;
      },
      error: () => {
        this.statusMenuOpenId = null;
      }
    });
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
    if (ids.length === 0) return;
    forkJoin(ids.map(id => this.staffService.delete(id))).subscribe(() => {
      this.selected.clear();
      this.loadStaff();
    });
  }

  restore(id: string): void {
    this.staffService.restore(id).subscribe(() => this.loadStaff());
  }
}
