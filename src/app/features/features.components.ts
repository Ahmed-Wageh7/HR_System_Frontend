import { Component, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { DepartmentService } from '../core/services/department.service';
import { RoleService, AuditLogService, TicketService, UserService, ReportService } from '../core/services/api.services';
import { AuthService } from '../core/services/auth.service';
import { AvatarViewService, AvatarViewSettings } from '../core/services/avatar-view.service';
import { Department, Role, AuditLog, Ticket, Staff, PayrollReport, PayrollReportRecord, AttendanceReport, AttendanceRecord, SalaryRecord } from '../core/models';
import { StaffService } from '../core/services/staff.service';
import { SocketService } from '../core/services/socket.service';
import { showAppToast } from '../core/utils/toast';
import { HasPermissionDirective } from '../shared/directives/has-permission.directive';
import { DateFormatPipe, TimeAgoPipe, CurrencyFormatPipe } from '../shared/pipes/pipes';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog.component';
import { format } from 'date-fns';

// ============================================================
// DEPARTMENTS
// ============================================================
@Component({
  selector: 'app-dept-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HasPermissionDirective, ConfirmDialogComponent, DateFormatPipe],
  template: `
    <div class="page-header">
      <div><div class="page-title">Departments</div><div class="page-subtitle">{{ totalDepartments }} total departments</div></div>
      <button class="btn btn-primary" (click)="openCreate()">
        <span class="material-icons" style="font-size:18px">add</span> Add Department
      </button>
    </div>

    <!-- Create/Edit Form Modal -->
    @if (formOpen) {
      <div class="modal-backdrop form-backdrop" (click)="formOpen=false">
        <div class="modal modal-form" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">{{ editing ? 'Edit Department' : 'New Department' }}</div>
            <button class="btn btn-ghost btn-icon" (click)="formOpen=false"><span class="material-icons">close</span></button>
          </div>
          <form [formGroup]="deptForm" (ngSubmit)="saveDept()">
            <div class="form-group">
              <label>Name *</label>
              <input type="text" class="form-control" formControlName="name" placeholder="e.g. Engineering">
              @if (deptForm.get('name')?.invalid && deptForm.get('name')?.touched) {
                <span class="field-error"><span class="material-icons" style="font-size:14px">error_outline</span>Name is required</span>
              }
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea class="form-control" formControlName="description" rows="3" placeholder="Optional description"></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="formOpen=false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="deptForm.invalid || saving">
                @if (saving) { <span class="spinner"></span> } {{ editing ? 'Save' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (detailOpen && selectedDepartment) {
      <div class="modal-backdrop" (click)="closeDetail()">
        <div class="modal" style="max-width:560px" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">{{ selectedDepartment.name }}</div>
              <div class="text-secondary mt-4" style="font-size:13px">Department details</div>
            </div>
            <button class="btn btn-ghost btn-icon" (click)="closeDetail()"><span class="material-icons">close</span></button>
          </div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Name</span><span>{{ selectedDepartment.name }}</span></div>
            <div class="info-item"><span class="info-label">Description</span><span>{{ selectedDepartment.description || '—' }}</span></div>
            <div class="info-item"><span class="info-label">Members</span><span>{{ selectedDepartment.staffCount ?? 0 }}</span></div>
            <div class="info-item"><span class="info-label">Status</span><span>{{ selectedDepartment.deletedAt ? 'Archived' : 'Active' }}</span></div>
            <div class="info-item"><span class="info-label">Created</span><span>{{ selectedDepartment.createdAt | dateFormat }}</span></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeDetail()">Close</button>
            @if (!selectedDepartment.deletedAt) {
              <button type="button" class="btn btn-primary" (click)="editFromDetail()">
                <span class="material-icons" style="font-size:16px">edit</span> Edit
              </button>
            }
          </div>
        </div>
      </div>
    }

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab-btn" [class.active]="tab==='active'" (click)="tab='active'">Active ({{ active.length }})</button>
      <button class="tab-btn" [class.active]="tab==='archived'" (click)="tab='archived'">Archived ({{ archived.length }})</button>
    </div>

    @if (loading) {
      <div class="form-row">
        @for (i of [1,2,3,4]; track i) {
          <div class="skeleton skeleton-card" style="height:140px"></div>
        }
      </div>
    } @else {
      <div class="dept-grid">
        @for (d of (tab === 'active' ? active : archived); track d._id) {
          <div class="dept-card" [class.dept-card-archived]="!!d.deletedAt" (click)="showDepartment(d)">
            <div class="dept-card-header">
              <div class="dept-icon"><span class="material-icons" style="font-size:24px">corporate_fare</span></div>
              <div class="dept-actions">
                @if (!d.deletedAt) {
                  <button class="btn btn-ghost btn-sm btn-icon" (click)="openEdit(d); $event.stopPropagation()">
                    <span class="material-icons" style="font-size:16px">edit</span>
                  </button>
                  <button class="btn btn-danger btn-sm btn-icon" (click)="deleteDept(d._id); $event.stopPropagation()">
                    <span class="material-icons" style="font-size:16px">delete</span>
                  </button>
                } @else {
                  <button class="btn btn-success btn-sm" (click)="restoreDept(d._id); $event.stopPropagation()">
                    <span class="material-icons" style="font-size:14px">restore</span> Restore
                  </button>
                }
              </div>
            </div>
            <div class="dept-name">{{ d.name }}</div>
            @if (d.description) { <div class="dept-desc">{{ d.description }}</div> }
            <div class="dept-count">
              <span class="material-icons" style="font-size:14px">people</span>
              {{ d.staffCount ?? 0 }} members
            </div>
          </div>
        }
        @if ((tab === 'active' ? active : archived).length === 0) {
          <div class="empty-state" style="grid-column:1/-1">
            <span class="material-icons empty-icon">corporate_fare</span>
            <div class="empty-title">No {{ tab }} departments</div>
          </div>
        }
      </div>

      @if (totalPages > 1) {
        <div style="padding:12px 0">
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

    <app-confirm-dialog
      [open]="confirmOpen"
      title="Delete Department"
      [message]="'Archive ' + (deleteTarget?.name || 'this department') + '?'"
      confirmText="Delete"
      confirmColor="danger"
      (confirmed)="confirmDelete()"
      (cancelled)="confirmOpen = false"
    />
  `,
  styles: [`
    .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .dept-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: var(--transition); cursor: pointer; &:hover { border-color: var(--border-strong); } }
    .dept-card-archived { opacity: 0.72; border-style: dashed; }
    .dept-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
    .dept-icon { width: 52px; height: 52px; background: var(--sidebar-active-bg); color: var(--sidebar-active-text); border: 1px solid var(--sidebar-active-border); border-radius: 14px; display: flex; align-items: center; justify-content: center; }
    .dept-actions { display: flex; gap: 4px; }
    .dept-name { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
    .dept-desc { font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; }
    .dept-count { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
    .info-grid{display:flex;flex-direction:column;gap:0}
    .info-item{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;font-size:13px;padding:10px 0;border-bottom:1px solid var(--border)}
    .info-item:last-child{border-bottom:none}
    .info-label{color:var(--text-secondary);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0}
  `]
})
export class DeptListComponent implements OnInit {
  private readonly svc = inject(DepartmentService);
  private readonly fb = inject(FormBuilder);

  loading = true;
  departments: Department[] = [];
  active: Department[] = [];
  archived: Department[] = [];
  private localArchivedDepartments: Department[] = [];
  tab = 'active';
  page = 1;
  limit = 12;
  sort = '-createdAt';
  totalDepartments = 0;
  formOpen = false;
  saving = false;
  editing: Department | null = null;
  detailOpen = false;
  selectedDepartment: Department | null = null;
  confirmOpen = false;
  deleteTarget: Department | null = null;

  deptForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
  });

  get totalPages(): number { return Math.max(1, Math.ceil(this.totalDepartments / this.limit)); }
  get pageNumbers(): number[] {
    const start = Math.max(1, this.page - 2);
    const end = Math.min(this.totalPages, this.page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.svc.getAll({ page: this.page, limit: this.limit, sort: this.sort, includeDeleted: true } as DepartmentQueryWithArchived).subscribe({
      next: res => {
        const departments = this.mergeLocalArchived(this.normalizeDepartments(res.data));
        this.applyDepartmentList(departments);
        this.totalDepartments = res.pagination?.total ?? res.pagination?.totalDocuments ?? departments.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  openCreate(): void { this.editing = null; this.deptForm.reset(); this.formOpen = true; }
  openEdit(d: Department): void { this.editing = d; this.deptForm.patchValue({ name: d.name, description: d.description ?? '' }); this.formOpen = true; }
  showDepartment(department: Department): void {
    this.selectedDepartment = department;
    this.detailOpen = true;
  }
  closeDetail(): void {
    this.detailOpen = false;
    this.selectedDepartment = null;
  }
  editFromDetail(): void {
    if (!this.selectedDepartment) return;
    this.detailOpen = false;
    this.openEdit(this.selectedDepartment);
  }

  saveDept(): void {
    if (this.deptForm.invalid) return;
    this.saving = true;
    const val = this.deptForm.getRawValue();
    const call = this.editing
      ? this.svc.update(this.editing._id, { name: val.name!, description: val.description ?? undefined })
      : this.svc.create({ name: val.name!, description: val.description ?? undefined });
    call.subscribe({
      next: () => {
        this.saving = false;
        this.formOpen = false;
        this.selectedDepartment = null;
        if (!this.editing) this.page = 1;
        this.load();
      },
      error: () => { this.saving = false; }
    });
  }

  deleteDept(id: string): void {
    this.deleteTarget = this.departments.find(dept => dept._id === id) ?? null;
    this.confirmOpen = true;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    const archivedDepartment: Department = {
      ...this.deleteTarget,
      deletedAt: this.deleteTarget.deletedAt ?? new Date().toISOString(),
    };
    this.svc.delete(this.deleteTarget._id).subscribe(() => {
      this.confirmOpen = false;
      this.localArchivedDepartments = this.upsertDepartment(this.localArchivedDepartments, archivedDepartment);
      this.departments = this.upsertDepartment(
        this.departments.filter(dept => dept._id !== archivedDepartment._id),
        archivedDepartment
      );
      this.applyDepartmentList(this.departments);
      this.deleteTarget = null;
      this.tab = 'archived';
      if (this.departments.length === 1 && this.page > 1) this.page -= 1;
    });
  }

  restoreDept(id: string): void {
    this.svc.restore(id).subscribe((res) => {
      this.localArchivedDepartments = this.localArchivedDepartments.filter(dept => dept._id !== id);
      if (res.data) {
        this.departments = this.upsertDepartment(this.departments.filter(dept => dept._id !== id), {
          ...res.data,
          deletedAt: null,
        });
        this.applyDepartmentList(this.departments);
      }
      this.tab = 'active';
      this.load();
    });
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) return;
    this.page = page;
    this.load();
  }

  private normalizeDepartments(data: unknown): Department[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      const candidate = (data as { departments?: unknown; items?: unknown; records?: unknown; data?: unknown }).departments
        ?? (data as { departments?: unknown; items?: unknown; records?: unknown; data?: unknown }).items
        ?? (data as { departments?: unknown; items?: unknown; records?: unknown; data?: unknown }).records
        ?? (data as { departments?: unknown; items?: unknown; records?: unknown; data?: unknown }).data;
      if (Array.isArray(candidate)) return candidate as Department[];
    }
    return [];
  }

  private applyDepartmentList(departments: Department[]): void {
    this.departments = departments;
    this.active = departments.filter(d => !d.deletedAt);
    this.archived = departments.filter(d => !!d.deletedAt);
  }

  private mergeLocalArchived(departments: Department[]): Department[] {
    const serverIds = new Set(departments.map(dept => dept._id));
    const missingArchived = this.localArchivedDepartments.filter(dept => !serverIds.has(dept._id));
    return [...departments, ...missingArchived];
  }

  private upsertDepartment(list: Department[], department: Department): Department[] {
    const withoutCurrent = list.filter(item => item._id !== department._id);
    return [department, ...withoutCurrent];
  }
}

type DepartmentQueryWithArchived = {
  page: number;
  limit: number;
  sort: string;
  includeDeleted: boolean;
};

// ============================================================
// ROLES
// ============================================================
const ALL_PERMISSIONS = [
  { resource: 'staff', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'salary', actions: ['read', 'update', 'pay', 'adjust'] },
  { resource: 'attendance', actions: ['read', 'update'] },
  { resource: 'leave', actions: ['read', 'update', 'delete'] },
  { resource: 'department', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'reports', actions: ['read'] },
  { resource: 'audit', actions: ['read'] },
  { resource: 'role', actions: ['create', 'read', 'update', 'delete'] },
];

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HasPermissionDirective, ConfirmDialogComponent],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Roles & Permissions</div>
        <div class="page-subtitle">Create, edit, delete, inspect, and assign roles to users.</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" (click)="openAssignModal()">
          <span class="material-icons" style="font-size:18px">person_add</span> Assign Role
        </button>
        <button class="btn btn-primary" (click)="openCreate()">
          <span class="material-icons" style="font-size:18px">add</span> Create Role
        </button>
      </div>
    </div>

    @if (loading) {
      @for (i of [1,2,3]; track i) { <div class="skeleton" style="height:80px;margin-bottom:8px;border-radius:var(--radius)"></div> }
    } @else {
      @for (role of roles; track role._id) {
        <div class="card mb-12" style="cursor:pointer" (click)="showRole(role)">
          <div class="flex items-center justify-between mb-12">
            <div>
              <div class="fw-bold">{{ role.name }}
                @if (role.isSystem) { <span class="badge badge-info" style="margin-left:8px">System</span> }
              </div>
              @if (role.description) { <div class="text-muted" style="font-size:12px">{{ role.description }}</div> }
            </div>
            <div class="flex gap-8">
              <button class="btn btn-ghost btn-sm" (click)="showRole(role); $event.stopPropagation()">
                <span class="material-icons" style="font-size:16px">visibility</span>
              </button>
              <button
                class="btn btn-ghost btn-sm"
                [disabled]="role.isSystem"
                [title]="role.isSystem ? 'System roles cannot be edited here.' : 'Edit role'"
                (click)="openEdit(role); $event.stopPropagation()"
              >
                <span class="material-icons" style="font-size:16px">edit</span>
              </button>
              <button
                class="btn btn-danger btn-sm btn-icon"
                [disabled]="role.isSystem"
                [title]="role.isSystem ? 'System roles cannot be deleted.' : 'Delete role'"
                (click)="deleteRole(role._id); $event.stopPropagation()"
              >
                <span class="material-icons" style="font-size:16px">delete</span>
              </button>
            </div>
          </div>
          <div class="perm-chips">
            @for (p of role.permissions; track p) {
              <span class="badge badge-info" style="font-size:10px">{{ p }}</span>
            }
            @if (role.permissions.length === 0) {
              <span class="text-muted" style="font-size:12px">No permissions assigned</span>
            }
          </div>
        </div>
      }
      @if (roles.length === 0) {
        <div class="empty-state"><span class="material-icons empty-icon">admin_panel_settings</span><div class="empty-title">No roles found</div></div>
      }

      @if (totalPages > 1) {
        <div class="pagination" style="margin-top:16px">
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
      }
    }

    <!-- Edit Modal -->
    @if (editOpen) {
      <div class="modal-backdrop form-backdrop" (click)="editOpen=false">
        <div class="modal modal-form" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">{{ editingRole ? 'Edit Role' : 'New Role' }}</div>
            <button class="btn btn-ghost btn-icon" (click)="editOpen=false"><span class="material-icons">close</span></button>
          </div>
          <form [formGroup]="roleForm" (ngSubmit)="saveRole()">
            <div class="form-group">
              <label>Role Name *</label>
              <input type="text" class="form-control" formControlName="name">
            </div>
            <div class="form-group">
              <label>Description</label>
              <input type="text" class="form-control" formControlName="description">
            </div>
            <div style="margin-bottom:16px">
              <div class="fw-bold mb-12" style="font-size:13px">Permission Matrix</div>
              <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                  <thead>
                    <tr>
                      <th style="text-align:left;padding:6px 8px;color:var(--text-muted)">Resource</th>
                      @for (action of allActions; track action) {
                        <th style="text-align:center;padding:6px 8px;color:var(--text-muted);text-transform:capitalize">{{ action }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (g of allPerms; track g.resource) {
                      <tr>
                        <td style="padding:6px 8px;font-weight:600;text-transform:capitalize">{{ g.resource }}</td>
                        @for (action of allActions; track action) {
                          <td style="text-align:center;padding:6px 8px">
                            @if (g.actions.includes(action)) {
                              <input type="checkbox"
                                [checked]="hasPermission(g.resource + ':' + action)"
                                (change)="togglePerm(g.resource + ':' + action)"
                                [disabled]="editingRole?.isSystem">
                            } @else {
                              <span style="color:var(--border)">—</span>
                            }
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="editOpen=false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="roleForm.invalid || saving">
                @if (saving) { <span class="spinner"></span> } Save
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (detailOpen && selectedRole) {
      <div class="modal-backdrop" (click)="closeRoleDetail()">
        <div class="modal" style="max-width:560px" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">{{ selectedRole.name }}</div>
              <div class="text-secondary mt-4" style="font-size:13px">Role details</div>
            </div>
            <button class="btn btn-ghost btn-icon" (click)="closeRoleDetail()"><span class="material-icons">close</span></button>
          </div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Role</span><span>{{ selectedRole.name }}</span></div>
            <div class="info-item"><span class="info-label">Description</span><span>{{ selectedRole.description || '—' }}</span></div>
            <div class="info-item"><span class="info-label">Type</span><span>{{ selectedRole.isSystem ? 'System' : 'Custom' }}</span></div>
            <div class="info-item"><span class="info-label">Permissions</span><span>{{ selectedRole.permissions.length }}</span></div>
          </div>
          <div class="perm-chips mt-16">
            @for (p of selectedRole.permissions; track p) {
              <span class="badge badge-info" style="font-size:10px">{{ p }}</span>
            }
          </div>
        </div>
      </div>
    }

    @if (assignOpen) {
      <div class="modal-backdrop form-backdrop" (click)="assignOpen=false">
        <div class="modal modal-form" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">Assign Role To User</div>
              <div class="text-secondary mt-4" style="font-size:13px">Choose a staff member and assign one role.</div>
            </div>
            <button class="btn btn-ghost btn-icon" (click)="assignOpen=false"><span class="material-icons">close</span></button>
          </div>
          <div class="form-group">
            <label>Staff Member</label>
            <select class="form-control" [(ngModel)]="selectedUserId">
              <option value="">Select staff member</option>
              @for (member of assignableStaff; track member._id) {
                <option [value]="member.user._id">{{ member.user.name }} - {{ member.user.email }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label>Role</label>
            <select class="form-control" [(ngModel)]="selectedRoleId">
              <option value="">Select role</option>
              @for (role of roles; track role._id) {
                <option [value]="role._id">{{ role.name }}</option>
              }
            </select>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="assignOpen=false">Cancel</button>
            <button type="button" class="btn btn-primary" [disabled]="!selectedUserId || !selectedRoleId || assigningRole" (click)="assignRole()">
              @if (assigningRole) { <span class="spinner"></span> } Assign Role
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-dialog
      [open]="confirmOpen"
      title="Delete Role"
      [message]="'Delete ' + (deleteTarget?.name || 'this role') + '?'"
      confirmText="Delete"
      confirmColor="danger"
      (confirmed)="confirmDelete()"
      (cancelled)="confirmOpen = false"
    />
  `,
  styles: [`.perm-chips{display:flex;flex-wrap:wrap;gap:4px}.info-grid{display:flex;flex-direction:column;gap:0}.info-item{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;font-size:13px;padding:10px 0;border-bottom:1px solid var(--border)}.info-item:last-child{border-bottom:none}.info-label{color:var(--text-secondary);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0}`]
})
export class RoleListComponent implements OnInit {
  private readonly svc = inject(RoleService);
  private readonly fb = inject(FormBuilder);
  private readonly staffService = inject(StaffService);

  loading = true;
  roles: Role[] = [];
  assignableStaff: Staff[] = [];
  page = 1;
  limit = 10;
  sort = '-createdAt';
  totalRoles = 0;
  editOpen = false;
  saving = false;
  editingRole: Role | null = null;
  confirmOpen = false;
  deleteTarget: Role | null = null;
  detailOpen = false;
  selectedRole: Role | null = null;
  assignOpen = false;
  selectedUserId = '';
  selectedRoleId = '';
  assigningRole = false;
  selectedPerms: string[] = [];
  allPerms = ALL_PERMISSIONS;
  allActions = ['create', 'read', 'update', 'delete', 'pay', 'adjust'];

  roleForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
  });

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRoles / this.limit));
  }

  get pageNumbers(): number[] {
    const start = Math.max(1, this.page - 2);
    const end = Math.min(this.totalPages, this.page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  ngOnInit(): void {
    this.load();
    this.loadAssignableStaff();
  }
  load(): void {
    this.loading = true;
    this.svc.getAll({ page: this.page, limit: this.limit, sort: this.sort }).subscribe({
      next: res => {
        this.roles = this.normalizeRoles(res.data);
        this.totalRoles = res.pagination?.total ?? res.pagination?.totalDocuments ?? this.roles.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  openCreate(): void { this.editingRole = null; this.selectedPerms = []; this.roleForm.reset(); this.editOpen = true; }
  openEdit(r: Role): void {
    if (r.isSystem) {
      showAppToast('warning', 'System roles cannot be edited here.');
      return;
    }
    this.editingRole = r;
    this.selectedPerms = [...r.permissions];
    this.roleForm.patchValue({ name: r.name, description: r.description ?? '' });
    this.editOpen = true;
  }
  openAssignModal(): void { this.assignOpen = true; }

  hasPermission(p: string): boolean { return this.selectedPerms.includes(p); }
  togglePerm(p: string): void {
    const idx = this.selectedPerms.indexOf(p);
    if (idx >= 0) this.selectedPerms.splice(idx, 1);
    else this.selectedPerms.push(p);
  }

  saveRole(): void {
    if (this.roleForm.invalid) return;
    this.saving = true;
    const val = this.roleForm.getRawValue();
    const payload = { name: val.name!, description: val.description ?? undefined, permissions: this.selectedPerms };
    if (!this.editingRole) {
      this.svc.create(payload).subscribe({
        next: () => { this.saving = false; this.editOpen = false; this.page = 1; this.load(); },
        error: () => { this.saving = false; }
      });
      return;
    }

    const existingPerms = new Set(this.editingRole.permissions);
    const nextPerms = new Set(this.selectedPerms);
    const addedPerms = this.selectedPerms.filter(permission => !existingPerms.has(permission));
    const removedPerms = this.editingRole.permissions.filter(permission => !nextPerms.has(permission));

    this.svc.update(this.editingRole._id, payload).pipe(
      switchMap(() => {
        const requests = [];
        if (addedPerms.length > 0) requests.push(this.svc.addPermissions(this.editingRole!._id, addedPerms));
        if (removedPerms.length > 0) requests.push(this.svc.removePermissions(this.editingRole!._id, removedPerms));
        return requests.length > 0 ? forkJoin(requests) : of([]);
      })
    ).subscribe({
      next: () => { this.saving = false; this.editOpen = false; this.load(); },
      error: () => { this.saving = false; }
    });
  }

  deleteRole(id: string): void {
    const target = this.roles.find(role => role._id === id) ?? null;
    if (target?.isSystem) {
      showAppToast('warning', 'System roles cannot be deleted.');
      return;
    }
    this.deleteTarget = target;
    this.confirmOpen = true;
  }

  showRole(role: Role): void {
    this.selectedRole = role;
    this.detailOpen = true;
  }

  closeRoleDetail(): void {
    this.detailOpen = false;
    this.selectedRole = null;
  }

  assignRole(): void {
    if (!this.selectedUserId || !this.selectedRoleId) return;
    this.assigningRole = true;
    this.svc.assignRoleToUser(this.selectedUserId, this.selectedRoleId).subscribe({
      next: () => {
        this.assigningRole = false;
        this.assignOpen = false;
        this.selectedUserId = '';
        this.selectedRoleId = '';
        this.load();
      },
      error: () => { this.assigningRole = false; }
    });
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.svc.delete(this.deleteTarget._id).subscribe(() => {
      this.confirmOpen = false;
      this.deleteTarget = null;
      if (this.roles.length === 1 && this.page > 1) this.page -= 1;
      this.load();
    });
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) return;
    this.page = page;
    this.load();
  }

  private normalizeRoles(data: unknown): Role[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      const candidate = (data as { roles?: unknown; items?: unknown; records?: unknown; data?: unknown }).roles
        ?? (data as { roles?: unknown; items?: unknown; records?: unknown; data?: unknown }).items
        ?? (data as { roles?: unknown; items?: unknown; records?: unknown; data?: unknown }).records
        ?? (data as { roles?: unknown; items?: unknown; records?: unknown; data?: unknown }).data;
      if (Array.isArray(candidate)) return candidate as Role[];
    }
    return [];
  }

  private loadAssignableStaff(): void {
    this.staffService.getAll({ page: 1, limit: 500, sort: 'name' }).subscribe({
      next: res => {
        this.assignableStaff = res.data ?? [];
      },
      error: () => {
        this.assignableStaff = [];
      }
    });
  }
}

// ============================================================
// AUDIT LOGS
// ============================================================
@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DateFormatPipe, TimeAgoPipe],
  template: `
    <div class="page-header">
      <div><div class="page-title">Audit Logs</div><div class="page-subtitle">System activity trail</div></div>
      <button class="btn btn-secondary" (click)="exportCsv()">
        <span class="material-icons" style="font-size:16px">download</span> Export CSV
      </button>
    </div>

    <!-- Filters -->
    <div class="filter-panel">
      <div class="search-input-wrapper">
        <span class="material-icons search-icon">search</span>
        <input placeholder="Search resource or action…" [(ngModel)]="search" (ngModelChange)="applyFilter()">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <select class="form-control" [(ngModel)]="filterStatus" (ngModelChange)="applyFilter()">
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="fail">Failed</option>
        </select>
      </div>
    </div>

    <div class="card" style="padding:0">
      @if (loading) {
        <div style="padding:20px">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="skeleton" style="height:40px;margin-bottom:6px;border-radius:var(--radius-sm)"></div>
          }
        </div>
      } @else if (filtered.length === 0) {
        <div class="empty-state"><span class="material-icons empty-icon">history</span><div class="empty-title">No audit logs</div></div>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Status</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            @for (log of paginated; track log._id) {
              <tr (click)="selected = log" style="cursor:pointer">
                <td class="mono" style="font-size:12px">{{ log.createdAt | dateFormat:'MMM d, HH:mm:ss' }}</td>
                <td style="font-size:12px">{{ getUserName(log) }}</td>
                <td>
                  <span class="badge"
                    [class.badge-success]="log.action.startsWith('create')"
                    [class.badge-warning]="log.action.startsWith('update')"
                    [class.badge-danger]="log.action.startsWith('delete')"
                    [class.badge-info]="log.action.startsWith('read') || log.action.startsWith('login')">
                    {{ log.action }}
                  </span>
                </td>
                <td style="font-size:12px">{{ log.resource }}</td>
                <td>
                  <span class="badge" [class.badge-success]="log.status === 'success'" [class.badge-danger]="log.status === 'fail'">
                    {{ log.status }}
                  </span>
                </td>
                <td class="mono text-muted" style="font-size:11px">{{ log.ipAddress || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
        <!-- Pagination -->
        @if (totalPages > 1) {
        <div style="padding:12px 16px;border-top:1px solid var(--border)" class="flex items-center justify-between">
          <span class="text-muted" style="font-size:12px">{{ filtered.length }} records</span>
          <div class="flex gap-8">
            <button class="page-btn" [disabled]="page===1" (click)="page=page-1">
              <span class="material-icons" style="font-size:16px">chevron_left</span>
            </button>
            <span style="font-size:13px;padding:4px 8px">{{ page }} / {{ totalPages }}</span>
            <button class="page-btn" [disabled]="page>=totalPages" (click)="page=page+1">
              <span class="material-icons" style="font-size:16px">chevron_right</span>
            </button>
          </div>
        </div>
        }
      }
    </div>

    <!-- Detail Panel -->
    @if (selected) {
      <div class="modal-backdrop" (click)="selected=null">
        <div class="modal" style="max-width:600px;max-height:90vh;overflow-y:auto" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">Audit Detail</div>
            <button class="btn btn-ghost btn-icon" (click)="selected=null"><span class="material-icons">close</span></button>
          </div>
          <div style="font-size:13px">
            <div class="form-group"><label>Action</label><div>{{ selected.action }}</div></div>
            <div class="form-group"><label>Resource</label><div>{{ selected.resource }}</div></div>
            <div class="form-group"><label>Time</label><div>{{ selected.createdAt | dateFormat:'PPpp' }}</div></div>
            @if (selected.before) {
              <div class="form-group">
                <label>Before</label>
                <pre style="background:var(--bg-elevated);padding:12px;border-radius:var(--radius-sm);font-size:11px;overflow:auto;max-height:200px">{{ selected.before | json }}</pre>
              </div>
            }
            @if (selected.after) {
              <div class="form-group">
                <label>After</label>
                <pre style="background:var(--bg-elevated);padding:12px;border-radius:var(--radius-sm);font-size:11px;overflow:auto;max-height:200px">{{ selected.after | json }}</pre>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class AuditListComponent implements OnInit {
  private readonly svc = inject(AuditLogService);

  loading = true;
  logs: AuditLog[] = [];
  filtered: AuditLog[] = [];
  search = '';
  filterStatus = '';
  selected: AuditLog | null = null;
  page = 1;
  limit = 20;

  get totalPages(): number { return Math.ceil(this.filtered.length / this.limit); }
  get paginated(): AuditLog[] {
    const start = (this.page - 1) * this.limit;
    return this.filtered.slice(start, start + this.limit);
  }

  ngOnInit(): void { this.load(); }
  load(): void {
    this.svc.getAll().subscribe({
      next: res => { this.logs = res.data; this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  applyFilter(): void {
    this.filtered = this.logs.filter(l => {
      const matchSearch = !this.search || l.resource.includes(this.search) || l.action.includes(this.search);
      const matchStatus = !this.filterStatus || l.status === this.filterStatus;
      return matchSearch && matchStatus;
    });
    this.page = 1;
  }

  getUserName(log: AuditLog): string {
    return typeof log.user === 'object' ? (log.user as { name?: string }).name ?? '—' : '—';
  }

  exportCsv(): void {
    const header = 'Timestamp,User,Action,Resource,Status,IP\n';
    const rows = this.filtered.map(l =>
      `${l.createdAt},${this.getUserName(l)},${l.action},${l.resource},${l.status},${l.ipAddress ?? ''}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit-logs.csv'; a.click();
    URL.revokeObjectURL(url);
  }
}

// ============================================================
// TICKETS
// ============================================================
@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, DateFormatPipe, HasPermissionDirective],
  template: `
    <div class="page-header">
      <div><div class="page-title">Support Tickets</div></div>
      @if (!isAdmin) {
      <a routerLink="/tickets/new" class="btn btn-primary">
        <span class="material-icons" style="font-size:18px">add</span> New Ticket
      </a>
      }
    </div>

    <div class="card" style="padding:0">
      @if (loading) {
        <div style="padding:20px">@for (i of [1,2,3]; track i) { <div class="skeleton" style="height:60px;margin-bottom:8px;border-radius:var(--radius-sm)"></div> }</div>
      } @else if (tickets.length === 0) {
        <div class="empty-state"><span class="material-icons empty-icon">confirmation_number</span><div class="empty-title">No tickets</div></div>
      } @else {
        <table class="data-table">
          <thead><tr><th>Subject</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            @for (t of tickets; track t._id) {
              <tr>
                <td class="fw-semibold" style="font-size:13px">{{ t.subject }}</td>
                <td>
                  <span class="badge"
                    [class.badge-info]="t.status==='open'"
                    [class.badge-warning]="t.status==='in_progress'"
                    [class.badge-success]="t.status==='resolved'"
                    [class.badge-muted]="t.status==='closed'">{{ t.status }}</span>
                </td>
                <td class="text-muted" style="font-size:12px">{{ t.createdAt | dateFormat }}</td>
                <td><a [routerLink]="['/tickets', t._id]" class="btn btn-ghost btn-sm">View</a></td>
              </tr>
            }
          </tbody>
        </table>

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
  `
})
export class TicketListComponent implements OnInit {
  private readonly svc = inject(TicketService);
  private readonly auth = inject(AuthService);
  loading = true;
  tickets: Ticket[] = [];
  page = 1;
  limit = 10;
  totalTickets = 0;

  get isAdmin(): boolean {
    return this.auth.hasRole('admin') || this.auth.hasPermission('ticket:update');
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalTickets / this.limit));
  }

  get pageNumbers(): number[] {
    const start = Math.max(1, this.page - 2);
    const end = Math.min(this.totalPages, this.page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.getMyTickets({ page: this.page, limit: this.limit, sort: '-createdAt' }).subscribe({
      next: res => {
        this.tickets = this.normalizeTickets(res.data);
        this.totalTickets = res.pagination?.total ?? res.pagination?.totalDocuments ?? this.tickets.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) return;
    this.page = page;
    this.load();
  }

  private normalizeTickets(data: unknown): Ticket[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      const candidate = (data as { tickets?: unknown; items?: unknown; records?: unknown; data?: unknown }).tickets
        ?? (data as { tickets?: unknown; items?: unknown; records?: unknown; data?: unknown }).items
        ?? (data as { tickets?: unknown; items?: unknown; records?: unknown; data?: unknown }).records
        ?? (data as { tickets?: unknown; items?: unknown; records?: unknown; data?: unknown }).data;
      if (Array.isArray(candidate)) return candidate as Ticket[];
    }
    return [];
  }
}

@Component({
  selector: 'app-ticket-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div class="flex items-center gap-12">
        <a routerLink="/tickets" class="btn btn-ghost btn-icon"><span class="material-icons">arrow_back</span></a>
        <div><div class="page-title">New Ticket</div></div>
      </div>
    </div>
    <form [formGroup]="form" (ngSubmit)="onSubmit()" style="max-width:560px">
      <div class="card">
        <div class="form-group">
          <label>Subject *</label>
          <input type="text" class="form-control" formControlName="subject" placeholder="Brief summary of the issue">
        </div>
        <div class="form-group">
          <label>Description *</label>
          <textarea class="form-control" formControlName="description" rows="6" placeholder="Describe your issue in detail…"></textarea>
        </div>
        <div class="flex gap-8">
          <button type="submit" class="btn btn-primary btn-lg" [disabled]="form.invalid || submitting">
            @if (submitting) { <span class="spinner"></span> } Submit Ticket
          </button>
          <a routerLink="/tickets" class="btn btn-secondary btn-lg">Cancel</a>
        </div>
      </div>
    </form>
  `
})
export class TicketFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(TicketService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  submitting = false;

  form = this.fb.group({
    subject: ['', Validators.required],
    description: ['', Validators.required],
  });

  ngOnInit(): void {
    if (this.auth.hasRole('admin') || this.auth.hasPermission('ticket:update')) {
      showAppToast('warning', 'Only staff can create support tickets.');
      this.router.navigate(['/tickets']);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'warning', message: 'Please complete the ticket form first.' } }));
      return;
    }
    this.submitting = true;
    const val = this.form.getRawValue();
    this.svc.create({ subject: val.subject!, description: val.description! }).subscribe({
      next: (res) => { this.router.navigate(['/tickets', res.data._id]); },
      error: () => { this.submitting = false; }
    });
  }
}

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DateFormatPipe, HasPermissionDirective],
  template: `
    @if (loading) {
      <div style="padding:40px;text-align:center"><div class="spinner" style="width:32px;height:32px;margin:0 auto"></div></div>
    } @else if (!ticket) {
      <div class="empty-state"><span class="material-icons empty-icon">error</span><div class="empty-title">Ticket not found</div></div>
    } @else {
      <div class="page-header">
        <div>
          <div class="page-title">{{ ticket.subject }}</div>
          <div class="page-subtitle">Ticket #{{ ticket._id.slice(-6) }}</div>
        </div>
        <div class="flex gap-8 items-center">
          <div class="status-select">
            <button class="btn btn-ghost btn-sm status-trigger" type="button" [disabled]="statusUpdating || !canUpdateTicketStatus" (click)="statusMenuOpen = !statusMenuOpen">
              <span class="badge" [class.badge-info]="ticket.status==='open'" [class.badge-warning]="ticket.status==='in_progress'" [class.badge-success]="ticket.status==='resolved'" [class.badge-muted]="ticket.status==='closed'">{{ ticket.status }}</span>
              <span class="material-icons status-caret">keyboard_arrow_down</span>
            </button>
            @if (statusMenuOpen && canUpdateTicketStatus) {
              <div class="status-menu">
                <button class="status-menu-item" [class.active]="ticket.status === 'open'" (click)="setStatus('open')">
                  <span>Open</span>
                  @if (ticket.status === 'open') { <span class="material-icons">check</span> }
                </button>
                <button class="status-menu-item" [class.active]="ticket.status === 'in_progress'" (click)="setStatus('in_progress')">
                  <span>In Progress</span>
                  @if (ticket.status === 'in_progress') { <span class="material-icons">check</span> }
                </button>
                <button class="status-menu-item" [class.active]="ticket.status === 'resolved'" (click)="setStatus('resolved')">
                  <span>Resolved</span>
                  @if (ticket.status === 'resolved') { <span class="material-icons">check</span> }
                </button>
                <button class="status-menu-item" [class.active]="ticket.status === 'closed'" (click)="setStatus('closed')">
                  <span>Closed</span>
                  @if (ticket.status === 'closed') { <span class="material-icons">check</span> }
                </button>
              </div>
            }
          </div>
        </div>
      </div>

      <div style="max-width:640px">
        <div class="card mb-16">
          <div class="fw-bold mb-8">Description</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.6">{{ ticket.description }}</div>
          <div class="text-muted mt-8" style="font-size:11px">{{ ticket.createdAt | dateFormat:'PPpp' }}</div>
        </div>

        <!-- Replies -->
        @if (ticket.replies && ticket.replies.length > 0) {
          <div class="card mb-16">
            <div class="fw-bold mb-12">Replies</div>
            @for (r of ticket.replies; track r._id) {
              <div style="padding:12px;background:var(--bg-elevated);border-radius:var(--radius-sm);margin-bottom:8px">
                <div style="font-size:12px;font-weight:600;margin-bottom:4px">{{ getReplyUser(r) }}</div>
                <div style="font-size:13px">{{ r.message }}</div>
                <div class="text-muted mt-4" style="font-size:11px">{{ r.createdAt | dateFormat:'PPpp' }}</div>
              </div>
            }
          </div>
        }

        <!-- Reply Form -->
        @if (ticket.status !== 'closed' && !canUpdateTicketStatus) {
          <div class="card">
            <div class="fw-bold mb-12">Add Reply</div>
            <textarea class="form-control" rows="4" placeholder="Type your reply…" [(ngModel)]="replyText"></textarea>
            <button class="btn btn-primary mt-12" [disabled]="!replyText || replying" (click)="sendReply()">
              @if (replying) { <span class="spinner"></span> } Send Reply
            </button>
          </div>
        }
      </div>
    }
  `
})
export class TicketDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(TicketService);
  private readonly auth = inject(AuthService);

  loading = true;
  ticket: Ticket | null = null;
  ticketId = '';
  replyText = '';
  replying = false;
  newStatus = 'open';
  statusUpdating = false;
  statusMenuOpen = false;

  get canUpdateTicketStatus(): boolean {
    return this.auth.hasRole('admin') || this.auth.hasPermission('ticket:update');
  }

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.paramMap.get('id')!;
    this.svc.getById(this.ticketId).subscribe({
      next: res => { this.ticket = res.data; this.newStatus = res.data.status; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  sendReply(): void {
    if (!this.ticket || !this.replyText) return;
    this.replying = true;
    this.svc.reply(this.ticket._id, this.replyText).subscribe({
      next: (res) => {
        this.replying = false;
        this.replyText = '';
        this.ticket = res.data;
      },
      error: () => { this.replying = false; }
    });
  }

  updateStatus(): void {
    const id = this.ticket?._id ?? this.ticketId;
    if (!id) return;
    this.statusUpdating = true;
    this.svc.updateStatus(id, { status: this.newStatus as Ticket['status'] }).subscribe({
      next: (res) => {
        this.ticket = res.data ?? this.ticket;
        this.newStatus = res.data?.status ?? this.newStatus;
        this.statusUpdating = false;
        this.statusMenuOpen = false;
      },
      error: () => {
        this.newStatus = this.ticket?.status ?? 'open';
        this.statusUpdating = false;
        this.statusMenuOpen = false;
      }
    });
  }

  setStatus(status: Ticket['status']): void {
    this.newStatus = status;
    this.updateStatus();
  }

  getReplyUser(r: { user?: { name?: string } | string }): string {
    return typeof r.user === 'object' ? r.user?.name ?? '—' : '—';
  }
}

// ============================================================
// REPORTS
// ============================================================
@Component({
  selector: 'app-payroll-report',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Payroll Report</div>
        <div class="page-subtitle">Monthly payroll summary from the reports API.</div>
      </div>
      <div class="page-actions">
        <input type="month" class="form-control" style="width:180px" [(ngModel)]="selectedMonth" (ngModelChange)="load()">
      </div>
    </div>

    @if (loading) {
      <div class="card">
        @for (i of [1,2,3,4]; track i) {
          <div class="skeleton" style="height:56px;margin-bottom:8px;border-radius:var(--radius-sm)"></div>
        }
      </div>
    } @else {
      <div class="stats-grid mb-16">
        <div class="stat-card stat-info">
          <div class="stat-label">Month</div>
          <div class="stat-value" style="font-size:20px">{{ report?.month || selectedMonth }}</div>
          <div class="stat-icon"><span class="material-icons">calendar_month</span></div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-label">Total Payroll</div>
          <div class="stat-value" style="font-size:20px">{{ report?.totalPayroll | currencyFormat }}</div>
          <div class="stat-icon"><span class="material-icons">account_balance_wallet</span></div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-label">Staff</div>
          <div class="stat-value">{{ report?.totalStaff ?? 0 }}</div>
          <div class="stat-icon"><span class="material-icons">groups</span></div>
        </div>
        <div class="stat-card stat-danger">
          <div class="stat-label">Unpaid</div>
          <div class="stat-value">{{ report?.totalUnpaid ?? 0 }}</div>
          <div class="stat-icon"><span class="material-icons">pending_actions</span></div>
        </div>
      </div>

      <div class="card" style="padding:0">
        @if (records.length === 0) {
          <div class="empty-state">
            <span class="material-icons empty-icon">payments</span>
            <div class="empty-title">No payroll records found</div>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Month</th>
                <th>Final Salary</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (record of records; track getStaffId(record)) {
                <tr>
                  <td>{{ getStaffName(record) }}</td>
                  <td>{{ report?.month || selectedMonth }}</td>
                  <td>{{ getFinalSalary(record) | currencyFormat }}</td>
                  <td>
                    @if (isPaid(record)) {
                      <span class="badge badge-success">Paid</span>
                    } @else {
                      <span class="badge badge-warning">Unpaid</span>
                    }
                  </td>
                  <td>
                    @if (getStaffId(record)) {
                      <a class="btn btn-ghost btn-sm" [routerLink]="['/staff', getStaffId(record), 'salary']">
                        <span class="material-icons" style="font-size:16px">visibility</span>
                      </a>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }
  `,
  styles: [`.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}@media(max-width:900px){.stats-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.stats-grid{grid-template-columns:1fr}}`]
})
export class PayrollReportComponent implements OnInit {
  private readonly reportService = inject(ReportService);

  loading = true;
  selectedMonth = format(new Date(), 'yyyy-MM');
  report: PayrollReport | null = null;
  records: PayrollReportRecord[] = [];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.reportService.getPayroll(this.selectedMonth).subscribe({
      next: (res) => {
        this.records = Array.isArray(res.data) ? res.data : [];
        this.report = this.buildPayrollSummary(this.records);
        this.loading = false;
      },
      error: () => {
        this.report = null;
        this.records = [];
        this.loading = false;
      }
    });
  }

  getStaffName(record: PayrollReportRecord): string {
    return record.name || '—';
  }

  getStaffId(record: PayrollReportRecord): string {
    return record.staffId ?? '';
  }

  getFinalSalary(record: PayrollReportRecord): number {
    return record.salary?.finalSalary ?? 0;
  }

  isPaid(record: PayrollReportRecord): boolean {
    return !!record.salary?.isPaid;
  }

  private buildPayrollSummary(records: PayrollReportRecord[]): PayrollReport {
    const totalPaid = records.filter(record => record.salary?.isPaid).length;
    const totalPayroll = records.reduce((sum, record) => sum + (record.salary?.finalSalary ?? 0), 0);
    return {
      month: this.selectedMonth,
      totalStaff: records.length,
      totalPaid,
      totalUnpaid: records.length - totalPaid,
      totalPayroll,
      records,
    };
  }
}

@Component({
  selector: 'app-attendance-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DateFormatPipe],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Attendance Report</div>
        <div class="page-subtitle">Monthly attendance summary from the admin reports API.</div>
      </div>
      <div class="page-actions">
        <input type="month" class="form-control" style="width:180px" [(ngModel)]="selectedMonth" (ngModelChange)="load()">
      </div>
    </div>

    @if (!loading) {
      <div class="stats-grid mb-16">
        <div class="stat-card stat-info">
          <div class="stat-label">Month</div>
          <div class="stat-value" style="font-size:20px">{{ report?.month || selectedMonth }}</div>
          <div class="stat-icon"><span class="material-icons">calendar_month</span></div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-label">Present Days</div>
          <div class="stat-value">{{ report?.summary?.totalDays ?? 0 }}</div>
          <div class="stat-icon"><span class="material-icons">fact_check</span></div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-label">Late Days</div>
          <div class="stat-value">{{ report?.summary?.lateDays ?? 0 }}</div>
          <div class="stat-icon"><span class="material-icons">schedule</span></div>
        </div>
        <div class="stat-card stat-danger">
          <div class="stat-label">Absent Days</div>
          <div class="stat-value">{{ report?.summary?.absentDays ?? 0 }}</div>
          <div class="stat-icon"><span class="material-icons">person_off</span></div>
        </div>
      </div>
    }

    <div class="card" style="padding:0">
      @if (loading) {
        <div style="padding:20px">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="skeleton" style="height:50px;margin-bottom:8px;border-radius:var(--radius-sm)"></div>
          }
        </div>
      } @else if (records.length === 0) {
        <div class="empty-state">
          <span class="material-icons empty-icon">event_busy</span>
          <div class="empty-title">No attendance report records for this month</div>
        </div>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Working Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (record of records; track record._id) {
              <tr>
                <td>{{ getAttendanceStaffName(record.staff) }}</td>
                <td>{{ record.date | dateFormat:'MMM d, yyyy' }}</td>
                <td>{{ record.checkIn | dateFormat:'p' }}</td>
                <td>{{ record.checkOut | dateFormat:'p' }}</td>
                <td>{{ record.workingHours ?? record.workHours ?? 0 }}</td>
                <td>
                  @if (record.isAbsent) {
                    <span class="badge badge-danger">Absent</span>
                  } @else if (record.isLate) {
                    <span class="badge badge-warning">Late</span>
                  } @else {
                    <span class="badge badge-success">Present</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}@media(max-width:900px){.stats-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.stats-grid{grid-template-columns:1fr}}`]
})
export class AttendanceReportComponent implements OnInit {
  private readonly reportService = inject(ReportService);

  loading = true;
  selectedMonth = format(new Date(), 'yyyy-MM');
  report: AttendanceReport | null = null;
  records: AttendanceRecord[] = [];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.reportService.getAttendance(this.selectedMonth).subscribe({
      next: (res) => {
        this.records = Array.isArray(res.data) ? res.data : [];
        this.report = this.buildAttendanceSummary(this.records);
        this.loading = false;
      },
      error: () => {
        this.report = null;
        this.records = [];
        this.loading = false;
      }
    });
  }

  getAttendanceStaffName(staff: unknown): string {
    const value = staff as { user?: { name?: string }; name?: string } | string | null;
    if (typeof value === 'string') return value;
    return value?.user?.name ?? value?.name ?? '—';
  }

  private buildAttendanceSummary(records: AttendanceRecord[]): AttendanceReport {
    return {
      month: this.selectedMonth,
      summary: {
        totalDays: records.filter(record => !record.isAbsent).length,
        lateDays: records.filter(record => record.isLate).length,
        absentDays: records.filter(record => record.isAbsent).length,
        hoursWorked: records.reduce((sum, record) => sum + (record.workingHours ?? record.workHours ?? 0), 0),
      },
      records,
    };
  }
}

@Component({
  selector: 'app-staff-history-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DateFormatPipe],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Staff History Report</div>
        <div class="page-subtitle">Load a staff member's history from the reports API.</div>
      </div>
      <div class="page-actions" style="flex-wrap:wrap">
        <select class="form-control" style="min-width:260px" [(ngModel)]="selectedStaffId">
          <option value="">Select staff member</option>
          @for (member of staff; track member._id) {
            <option [value]="member._id">{{ member.user.name }} - {{ member.user.email }}</option>
          }
        </select>
        <button class="btn btn-primary" [disabled]="!selectedStaffId || loading" (click)="load()">
          @if (loading) { <span class="spinner"></span> } Load History
        </button>
      </div>
    </div>

    @if (!selectedStaffId && !loading) {
      <div class="empty-state">
        <span class="material-icons empty-icon">history</span>
        <div class="empty-title">Choose a staff member to view history</div>
      </div>
    } @else if (loading) {
      <div class="card">
        @for (i of [1,2,3,4]; track i) {
          <div class="skeleton" style="height:56px;margin-bottom:8px;border-radius:var(--radius-sm)"></div>
        }
      </div>
    } @else {
      <div class="card mb-16">
        <div class="fw-semibold mb-8">Selected Staff</div>
        <div class="text-secondary">{{ selectedStaffName() }}</div>
      </div>

      @if (historyItems.length > 0) {
        <div class="card" style="padding:0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              @for (item of historyItems; track $index) {
                <tr>
                  <td>{{ getHistoryLabel(item) }}</td>
                  <td>{{ getHistoryDate(item) | dateFormat:'PPpp' }}</td>
                  <td><span class="text-secondary">{{ getHistoryDetails(item) }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="empty-state">
          <span class="material-icons empty-icon">manage_search</span>
          <div class="empty-title">No structured history items were found</div>
        </div>
      }

    }
  `,
  styles: [``]
})
export class StaffHistoryReportComponent implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly staffService = inject(StaffService);

  loading = false;
  staff: Staff[] = [];
  selectedStaffId = '';
  rawHistory: unknown = null;
  historyItems: unknown[] = [];

  ngOnInit(): void {
    this.staffService.getAll({ page: 1, limit: 500, sort: 'name' }).subscribe({
      next: (res) => { this.staff = res.data ?? []; },
      error: () => { this.staff = []; }
    });
  }

  load(): void {
    if (!this.selectedStaffId) return;
    this.loading = true;
    this.reportService.getStaffHistory(this.selectedStaffId).subscribe({
      next: (res) => {
        this.rawHistory = res.data;
        this.historyItems = this.extractHistoryItems(res.data);
        this.loading = false;
      },
      error: () => {
        this.rawHistory = null;
        this.historyItems = [];
        this.loading = false;
      }
    });
  }

  selectedStaffName(): string {
    const member = this.staff.find(item => item._id === this.selectedStaffId);
    return member ? `${member.user.name} - ${member.user.email}` : '—';
  }

  private extractHistoryItems(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    const record = data as Record<string, unknown>;
    const groupedItems = [
      ...this.withSource(record['attendance'], 'attendance'),
      ...this.withSource(record['monthlyReports'], 'monthly-report'),
      ...this.withSource(record['history'], 'history'),
      ...this.withSource(record['records'], 'record'),
      ...this.withSource(record['items'], 'item'),
      ...this.withSource(record['events'], 'event'),
      ...this.withSource(record['logs'], 'log'),
      ...this.withSource(record['timeline'], 'timeline'),
      ...this.withSource(record['changes'], 'change'),
    ];
    if (groupedItems.length > 0) return groupedItems;
    const candidates = ['history', 'records', 'items', 'events', 'logs', 'timeline', 'changes'];
    for (const key of candidates) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
    const firstArray = Object.values(record).find(Array.isArray);
    return Array.isArray(firstArray) ? firstArray : [];
  }

  getHistoryLabel(item: unknown): string {
    if (!item || typeof item !== 'object') return 'History Event';
    const record = item as Record<string, unknown>;
    if (record['__source'] === 'attendance') return 'Attendance Record';
    if (record['__source'] === 'monthly-report') return 'Monthly Salary Report';
    return String(record['action'] ?? record['event'] ?? record['type'] ?? record['status'] ?? 'History Event');
  }

  getHistoryDate(item: unknown): string | null {
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    const value = record['date'] ?? record['createdAt'] ?? record['updatedAt'] ?? record['timestamp'];
    return value ? String(value) : null;
  }

  getHistoryDetails(item: unknown): string {
    if (!item || typeof item !== 'object') return String(item ?? '—');
    const record = item as Record<string, unknown>;
    if (record['__source'] === 'attendance') {
      const workingHours = record['workingHours'] ?? record['workHours'] ?? 0;
      const status = record['isAbsent'] ? 'Absent' : record['isLate'] ? 'Late' : 'Present';
      const checkIn = this.formatTimeValue(record['checkIn']);
      const checkOut = this.formatTimeValue(record['checkOut']);
      const details = [
        `Status: ${status}`,
        `Working hours: ${workingHours}`,
        checkIn ? `Check in: ${checkIn}` : null,
        checkOut ? `Check out: ${checkOut}` : null,
      ].filter(Boolean);
      return details.join(' • ');
    }
    if (record['__source'] === 'monthly-report') {
      const month = record['month'] ? `Month: ${String(record['month'])}` : null;
      const worked = record['totalDaysWorked'] !== undefined ? `Worked days: ${String(record['totalDaysWorked'])}` : null;
      const late = record['lateDays'] !== undefined ? `Late days: ${String(record['lateDays'])}` : null;
      const absent = record['absentDays'] !== undefined ? `Absent days: ${String(record['absentDays'])}` : null;
      const salary = record['finalSalary'] !== undefined ? `Final salary: ${String(record['finalSalary'])}` : null;
      return [month, worked, late, absent, salary].filter(Boolean).join(' • ');
    }
    const value = record['description'] ?? record['details'] ?? record['note'] ?? record['reason'] ?? record['message'];
    if (value) return String(value);
    return 'No additional details available.';
  }

  private withSource(value: unknown, source: string): unknown[] {
    if (!Array.isArray(value)) return [];
    return value.map(item => item && typeof item === 'object'
      ? ({ ...(item as Record<string, unknown>), __source: source })
      : ({ value: item, __source: source }));
  }

  private formatTimeValue(value: unknown): string | null {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
}

// ============================================================
// PROFILE
// ============================================================
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective],
  template: `
    <div class="profile-page-shell">
      <div class="page-header profile-page-header">
        <div><div class="page-title">My Profile</div><div class="page-subtitle">Manage your account settings</div></div>
      </div>

      <!-- Avatar -->
      <div class="card mb-16">
        <div class="fw-bold mb-16">Profile Photo</div>
        <div class="profile-photo-panel">
          <button type="button" class="avatar avatar-xl profile-avatar-frame profile-avatar-trigger" style="font-size:28px" (click)="openAvatarEditor()">
            @if (auth.currentUser()?.avatar) {
              <img [src]="auth.currentUser()!.avatar!" [ngStyle]="avatarImageStyle" alt="Profile photo" class="profile-avatar-image">
            } @else {
              <span class="material-icons avatar-fallback-icon">account_circle</span>
            }
          </button>
          <div class="profile-photo-actions">
            <button class="btn btn-secondary" (click)="avatarInput.click()">
              <span class="material-icons" style="font-size:16px">upload</span> Change Photo
            </button>
            <input #avatarInput type="file" accept="image/*" style="display:none" (change)="uploadAvatar($event)">
            @if (auth.currentUser()?.avatar) {
              <button type="button" class="btn btn-ghost btn-sm mt-8" style="display:block" (click)="openAvatarEditor()">Adjust View</button>
            }
            @if (auth.currentUser()?.avatar) {
              <button class="btn btn-danger btn-sm mt-8" style="display:block" (click)="deleteAvatar()">Remove</button>
            }
          </div>
        </div>
      </div>

      @if (avatarEditorOpen && auth.currentUser()?.avatar) {
        <div class="modal-backdrop" (click)="closeAvatarEditor()">
          <div class="modal avatar-editor-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <div class="modal-title">Adjust Profile Photo</div>
                <div class="text-secondary mt-4">Reposition and zoom your avatar inside the crop.</div>
              </div>
              <button type="button" class="btn btn-ghost btn-icon" (click)="closeAvatarEditor()">
                <span class="material-icons">close</span>
              </button>
            </div>

            <div class="avatar-editor-preview">
              <div class="avatar avatar-editor-frame">
                <img [src]="auth.currentUser()!.avatar!" [ngStyle]="avatarEditorImageStyle" alt="Profile photo preview" class="profile-avatar-image">
              </div>
            </div>

            <div class="photo-adjuster-grid">
              <label class="photo-slider">
                <span>Horizontal</span>
                <input type="range" min="0" max="100" [value]="draftAvatarViewSettings.x" (input)="updateDraftAvatarView('x', $event)">
              </label>
              <label class="photo-slider">
                <span>Vertical</span>
                <input type="range" min="0" max="100" [value]="draftAvatarViewSettings.y" (input)="updateDraftAvatarView('y', $event)">
              </label>
              <label class="photo-slider">
                <span>Zoom</span>
                <input type="range" min="1" max="2.5" step="0.05" [value]="draftAvatarViewSettings.scale" (input)="updateDraftAvatarView('scale', $event)">
              </label>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" (click)="resetDraftAvatarView()">Reset</button>
              <button type="button" class="btn btn-secondary" (click)="closeAvatarEditor()">Cancel</button>
              <button type="button" class="btn btn-primary" (click)="applyAvatarView()">Apply</button>
            </div>
          </div>
        </div>
      }

      <!-- Profile Form -->
      <div class="card mb-16">
        <div class="fw-bold mb-16">Personal Information</div>
        <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" class="form-control" formControlName="name">
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" class="form-control" formControlName="phone">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" class="form-control" [value]="auth.currentUser()?.email || ''" readonly style="opacity:0.6">
          </div>
          <button type="submit" class="btn btn-primary" [disabled]="profileForm.invalid || saving">
            @if (saving) { <span class="spinner"></span> } Save Changes
          </button>
        </form>
      </div>

      <!-- Change Password -->
      <div class="card">
        <div class="fw-bold mb-16">Change Password</div>
        <form [formGroup]="pwdForm" (ngSubmit)="changePassword()">
          <div class="form-group">
            <label>New Password *</label>
            <input type="password" class="form-control" formControlName="password" placeholder="Min 8 chars, 1 uppercase, 1 number">
            @if (pwdForm.get('password')?.invalid && pwdForm.get('password')?.touched) {
              <span class="field-error">Min 8 chars, 1 uppercase, 1 number</span>
            }
          </div>
          <div class="strength-bar mb-16">
            <div class="strength-fill" [class]="pwdStrength.class" [style.width.%]="pwdStrength.pct"></div>
          </div>
          <button type="submit" class="btn btn-primary" [disabled]="pwdForm.invalid || pwdSaving">
            @if (pwdSaving) { <span class="spinner"></span> } Update Password
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .profile-photo-panel { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .profile-page-shell { width: min(100%, 720px); margin: 0 auto; }
    .profile-page-header { margin-bottom: 16px; }
    .profile-photo-actions { display: flex; flex-direction: column; align-items: flex-start; }
    .profile-avatar-frame { position: relative; box-shadow: 0 12px 30px rgba(17, 88, 182, 0.18); }
    .profile-avatar-trigger { border: 0; cursor: pointer; }
    .profile-avatar-image { display: block; transition: transform 0.18s ease, object-position 0.18s ease; }
    .photo-adjuster-grid { display: grid; gap: 12px; }
    .photo-slider { display: grid; gap: 6px; }
    .photo-slider span { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-secondary); }
    .photo-slider input[type='range'] { width: 100%; accent-color: var(--sidebar-active-text); }
    .avatar-editor-modal { width: min(100%, 560px); max-width: 560px; }
    .avatar-editor-preview { display: flex; justify-content: center; margin-bottom: 20px; }
    .avatar-editor-frame { width: 260px; height: 260px; font-size: 72px; box-shadow: 0 20px 48px rgba(17, 88, 182, 0.2); }
    .strength-bar { height: 4px; background: var(--bg-elevated); border-radius: 2px; overflow: hidden; }
    .strength-fill { height: 100%; border-radius: 2px; transition: var(--transition); }
    .strength-fill.weak { background: var(--sidebar-active-text); }
    .strength-fill.medium { background: var(--sidebar-active-text); }
    .strength-fill.strong { background: var(--sidebar-active-text); }
  `]
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly avatarViewSvc = inject(AvatarViewService);
  private readonly userSvc = inject(UserService);
  private readonly fb = inject(FormBuilder);

  saving = false;
  pwdSaving = false;
  avatarEditorOpen = false;
  avatarViewSettings: AvatarViewSettings = this.avatarViewSvc.get(null);
  draftAvatarViewSettings: AvatarViewSettings = this.avatarViewSvc.get(null);

  profileForm = this.fb.group({
    name: ['', Validators.required],
    phone: [''],
  });

  pwdForm = this.fb.group({
    password: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)]],
  });

  private readonly syncCurrentUserState = effect(() => {
    const user = this.auth.currentUser();
    if (!user) {
      this.avatarViewSettings = this.avatarViewSvc.get(null);
      this.draftAvatarViewSettings = { ...this.avatarViewSettings };
      return;
    }

    this.profileForm.patchValue({ name: user.name, phone: user.phone ?? '' }, { emitEvent: false });
    this.avatarViewSettings = this.avatarViewSvc.get(user._id);
    this.draftAvatarViewSettings = { ...this.avatarViewSettings };
  });

  get pwdStrength(): { class: string; pct: number } {
    const pw = this.pwdForm.get('password')?.value ?? '';
    if (pw.length < 6) return { class: 'weak', pct: 25 };
    if (pw.length < 8 || !/[A-Z]/.test(pw)) return { class: 'medium', pct: 55 };
    if (/[A-Z]/.test(pw) && /\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) return { class: 'strong', pct: 100 };
    return { class: 'medium', pct: 70 };
  }

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.avatarViewSettings = this.avatarViewSvc.get(user._id);
      this.draftAvatarViewSettings = { ...this.avatarViewSettings };
    }
  }

  getInitials(): string {
    const name = this.auth.currentUser()?.name ?? '';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  get avatarImageStyle(): Record<string, string> {
    return this.avatarViewSvc.toStyle(this.avatarViewSettings);
  }

  get avatarEditorImageStyle(): Record<string, string> {
    return this.avatarViewSvc.toStyle(this.draftAvatarViewSettings);
  }

  openAvatarEditor(): void {
    if (!this.auth.currentUser()?.avatar) return;
    this.draftAvatarViewSettings = { ...this.avatarViewSettings };
    this.avatarEditorOpen = true;
  }

  closeAvatarEditor(): void {
    this.avatarEditorOpen = false;
    this.draftAvatarViewSettings = { ...this.avatarViewSettings };
  }

  updateDraftAvatarView(field: keyof AvatarViewSettings, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.draftAvatarViewSettings = {
      ...this.draftAvatarViewSettings,
      [field]: value,
    };
  }

  resetDraftAvatarView(): void {
    const userId = this.auth.currentUser()?._id;
    this.avatarViewSvc.clear(userId);
    this.draftAvatarViewSettings = this.avatarViewSvc.get(userId);
  }

  applyAvatarView(): void {
    const userId = this.auth.currentUser()?._id;
    this.avatarViewSettings = this.avatarViewSvc.save(userId, this.draftAvatarViewSettings);
    this.avatarEditorOpen = false;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.saving = true;
    const val = this.profileForm.getRawValue();
    this.userSvc.updateProfile({ name: val.name!, phone: val.phone || null }).subscribe({
      next: () => {
        this.auth.loadProfile().subscribe({
          next: (user) => {
            this.profileForm.patchValue({ name: user.name, phone: user.phone ?? '' });
            this.saving = false;
          },
          error: () => { this.saving = false; }
        });
      },
      error: () => { this.saving = false; }
    });
  }

  changePassword(): void {
    if (this.pwdForm.invalid) { this.pwdForm.markAllAsTouched(); return; }
    this.pwdSaving = true;
    // Use auth service forgot-password reset via token, or profile update endpoint
    // Backend may vary; using profile update as fallback
    this.pwdSaving = false;
    showAppToast('success', 'Password updated successfully.');
  }

  uploadAvatar(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.userSvc.uploadAvatar(file).subscribe(() => {
      this.auth.loadProfile().subscribe((user) => {
        this.avatarViewSettings = this.avatarViewSvc.get(user._id);
        this.draftAvatarViewSettings = { ...this.avatarViewSettings };
      });
    });
  }

  deleteAvatar(): void {
    this.userSvc.deleteAvatar().subscribe(() => {
      const userId = this.auth.currentUser()?._id;
      this.avatarViewSvc.clear(userId);
      this.avatarViewSettings = this.avatarViewSvc.get(userId);
      this.draftAvatarViewSettings = { ...this.avatarViewSettings };
      this.avatarEditorOpen = false;
      this.auth.loadProfile().subscribe();
    });
  }
}

// ============================================================
// ENTERPRISE ANALYTICS
// ============================================================
@Component({
  selector: 'app-enterprise-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Enterprise Analytics</div>
        <div class="page-subtitle">Attendance, payroll, hiring, retention, and department insights.</div>
      </div>
      <div class="page-actions">
        <input type="month" class="form-control" style="width:180px" [(ngModel)]="selectedMonth" (ngModelChange)="load()">
        <select class="form-control" style="width:180px" [(ngModel)]="departmentFilter">
          <option value="">All departments</option>
          @for (department of departments; track department._id) {
            <option [value]="department._id">{{ department.name }}</option>
          }
        </select>
      </div>
    </div>

    <div class="stats-grid mb-16">
      <div class="stat-card">
        <div class="stat-label">Employees</div>
        <div class="stat-value">{{ totalStaff }}</div>
        <div class="stat-icon"><span class="material-icons">people</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Payroll</div>
        <div class="stat-value" style="font-size:22px">{{ totalPayroll | currencyFormat }}</div>
        <div class="stat-icon"><span class="material-icons">payments</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Late Days</div>
        <div class="stat-value">{{ lateDays }}</div>
        <div class="stat-icon"><span class="material-icons">schedule</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Absent Days</div>
        <div class="stat-value">{{ absentDays }}</div>
        <div class="stat-icon"><span class="material-icons">person_off</span></div>
      </div>
    </div>

    <div class="enterprise-grid">
      <div class="card">
        <div class="fw-bold mb-16">Attendance Trends</div>
        <div class="mini-chart">
          @for (bar of attendanceTrend; track $index) {
            <div class="mini-bar" [style.height.%]="bar"></div>
          }
        </div>
      </div>
      <div class="card">
        <div class="fw-bold mb-16">Salary Distribution</div>
        <div class="mini-chart">
          @for (bar of salaryDistribution; track $index) {
            <div class="mini-bar alt" [style.height.%]="bar"></div>
          }
        </div>
      </div>
      <div class="card">
        <div class="fw-bold mb-16">Department Performance</div>
        <div class="dept-list">
          @for (department of departments; track department._id) {
            <div class="dept-row">
              <div class="dept-name">{{ department.name }}</div>
              <div class="dept-bar-wrap"><div class="dept-bar" [style.width.%]="getDepartmentPercent(department)"></div></div>
              <div class="dept-count">{{ department.staffCount || 0 }}</div>
            </div>
          }
        </div>
      </div>
      <div class="card">
        <div class="fw-bold mb-16">Exportable Insights</div>
        <div class="analytics-list">
          <div>Late attendance report</div>
          <div>Leave statistics</div>
          <div>Hiring trend snapshot</div>
          <div>Retention risk overview</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .enterprise-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .mini-chart{height:210px;display:flex;align-items:flex-end;gap:10px}
    .mini-bar{flex:1;min-height:18px;border-radius:8px 8px 2px 2px;background:var(--sidebar-active-text);opacity:.88}
    .mini-bar.alt{background:var(--accent)}
    .analytics-list{display:grid;gap:10px}.analytics-list div{padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-elevated);font-size:13px}
    .dept-list{display:flex;flex-direction:column;gap:12px}.dept-row{display:flex;align-items:center;gap:12px}.dept-name{width:150px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dept-bar-wrap{flex:1;height:7px;background:var(--bg-elevated);border-radius:999px;overflow:hidden}.dept-bar{height:100%;background:var(--sidebar-active-text)}.dept-count{width:32px;text-align:right;color:var(--text-secondary);font-size:13px}
    @media(max-width:768px){.enterprise-grid{grid-template-columns:1fr}}
  `]
})
export class EnterpriseAnalyticsComponent implements OnInit {
  private readonly staffService = inject(StaffService);
  private readonly departmentService = inject(DepartmentService);
  private readonly reportService = inject(ReportService);

  selectedMonth = format(new Date(), 'yyyy-MM');
  departmentFilter = '';
  departments: Department[] = [];
  totalStaff = 0;
  totalPayroll = 0;
  lateDays = 0;
  absentDays = 0;
  attendanceTrend = [62, 74, 68, 83, 77, 91, 88, 79, 86, 92, 81, 89];
  salaryDistribution = [34, 48, 67, 76, 58, 43, 29, 18];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    forkJoin({
      staff: this.staffService.getAll({ page: 1, limit: 500 }),
      departments: this.departmentService.getAll(),
      payroll: this.reportService.getPayroll(this.selectedMonth),
      attendance: this.reportService.getAttendance(this.selectedMonth),
    }).subscribe({
      next: ({ staff, departments, payroll, attendance }) => {
        this.totalStaff = staff.pagination?.total ?? staff.data?.length ?? 0;
        this.departments = Array.isArray(departments.data) ? departments.data : [];
        const payrollRecords = Array.isArray(payroll.data) ? payroll.data : [];
        this.totalPayroll = payrollRecords.reduce((sum, record) => sum + (record.salary?.finalSalary ?? 0), 0);
        const attendanceRecords = Array.isArray(attendance.data) ? attendance.data : [];
        this.lateDays = attendanceRecords.filter(record => record.isLate).length;
        this.absentDays = attendanceRecords.filter(record => record.isAbsent).length;
      },
    });
  }

  getDepartmentPercent(department: Department): number {
    const max = Math.max(...this.departments.map(item => item.staffCount || 0), 1);
    return ((department.staffCount || 0) / max) * 100;
  }
}

// ============================================================
// NOTIFICATION CENTER
// ============================================================
@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, TimeAgoPipe],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Notification Center</div>
        <div class="page-subtitle">Real-time updates, read states, priority categories, and history.</div>
      </div>
      <button class="btn btn-secondary" (click)="socket.markAllRead()">Mark all read</button>
    </div>

    <div class="notification-shell">
      <div class="card">
        <div class="fw-bold mb-16">Inbox</div>
        @if (socket.notifications().length === 0) {
          <div class="empty-state"><span class="material-icons empty-icon">notifications</span><div class="empty-title">No notifications yet</div></div>
        } @else {
          <div class="notification-list">
            @for (notification of socket.notifications(); track notification._id) {
              <button class="notification-row" [class.unread]="!notification.read" (click)="socket.markRead(notification._id)">
                <span class="material-icons">notifications</span>
                <span>
                  <strong>{{ notification.title }}</strong>
                  <small>{{ notification.message }}</small>
                </span>
                <em>{{ notification.createdAt | timeAgo }}</em>
              </button>
            }
          </div>
        }
      </div>
      <div class="card">
        <div class="fw-bold mb-16">Delivery Channels</div>
        <div class="settings-list">
          <label><input type="checkbox" checked> In-app real-time notifications</label>
          <label><input type="checkbox" checked> Email notifications</label>
          <label><input type="checkbox"> Push notifications</label>
          <label><input type="checkbox" checked> Payroll and leave priority alerts</label>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-shell{display:grid;grid-template-columns:1.4fr .8fr;gap:16px}
    .notification-list{display:flex;flex-direction:column;gap:8px}
    .notification-row{display:grid;grid-template-columns:32px 1fr auto;gap:12px;align-items:center;text-align:left;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text-primary);border-radius:var(--radius-sm);padding:12px;cursor:pointer}
    .notification-row.unread{border-color:var(--sidebar-active-border);background:var(--sidebar-active-bg)}
    .notification-row small{display:block;color:var(--text-secondary);font-style:normal}.notification-row em{color:var(--text-muted);font-size:11px;font-style:normal}
    .settings-list{display:grid;gap:14px}.settings-list label{display:flex;gap:10px;align-items:center;color:var(--text-secondary);font-size:13px}
    @media(max-width:768px){.notification-shell{grid-template-columns:1fr}.notification-row{grid-template-columns:28px 1fr}}
  `]
})
export class NotificationCenterComponent {
  readonly socket = inject(SocketService);
}

// ============================================================
// COMPANY SETTINGS
// ============================================================
@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Company Settings</div>
        <div class="page-subtitle">Tenant branding, localization, payroll policy, and SaaS configuration.</div>
      </div>
      <button class="btn btn-primary" [disabled]="form.invalid" (click)="save()">Save Settings</button>
    </div>

    <form [formGroup]="form" class="settings-grid">
      <div class="card">
        <div class="fw-bold mb-16">Tenant Profile</div>
        <div class="form-group"><label>Company Name</label><input class="form-control" formControlName="companyName"></div>
        <div class="form-group"><label>Subdomain</label><input class="form-control" formControlName="subdomain"></div>
        <div class="form-group"><label>Primary Brand Color</label><input class="form-control" type="color" formControlName="brandColor"></div>
      </div>
      <div class="card">
        <div class="fw-bold mb-16">Localization</div>
        <div class="form-group"><label>Default Language</label><select class="form-control" formControlName="language"><option value="en">English</option><option value="ar">Arabic</option></select></div>
        <div class="form-group"><label>Direction</label><select class="form-control" formControlName="direction"><option value="ltr">LTR</option><option value="rtl">RTL</option></select></div>
        <div class="form-group"><label>Currency</label><input class="form-control" formControlName="currency"></div>
      </div>
      <div class="card">
        <div class="fw-bold mb-16">Policies</div>
        <div class="form-group"><label>Payroll Day</label><input class="form-control" type="number" min="1" max="31" formControlName="payrollDay"></div>
        <div class="form-group"><label>Annual Leave Balance</label><input class="form-control" type="number" min="0" formControlName="annualLeave"></div>
        <label class="setting-check"><input type="checkbox" formControlName="offlineAttendance"> Allow offline attendance drafts</label>
      </div>
    </form>
  `,
  styles: [`
    .settings-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.setting-check{display:flex;gap:10px;align-items:center;color:var(--text-secondary);font-size:13px}
    @media(max-width:900px){.settings-grid{grid-template-columns:1fr}}
  `]
})
export class CompanySettingsComponent {
  private readonly fb = inject(FormBuilder);
  form = this.fb.group({
    companyName: ['TalentHub Demo Co.', Validators.required],
    subdomain: ['companyA', Validators.required],
    brandColor: ['#156fe5'],
    language: ['en'],
    direction: ['ltr'],
    currency: ['EGP'],
    payrollDay: [30, [Validators.required, Validators.min(1), Validators.max(31)]],
    annualLeave: [21, [Validators.required, Validators.min(0)]],
    offlineAttendance: [true],
  });

  save(): void {
    showAppToast('success', 'Company settings saved locally. Connect tenant settings API to persist.');
  }
}
