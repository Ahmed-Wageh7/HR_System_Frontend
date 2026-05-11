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
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, InitialsPipe, DateFormatPipe, CurrencyFormatPipe, ConfirmDialogComponent, HasPermissionDirective, StaffFormComponent],
  templateUrl: './staff-list.component.html',
  styleUrl: './staff-list.component.scss'
})
export class StaffListComponent implements OnInit {
  private readonly staffService = inject(StaffService);
  private readonly departmentService = inject(DepartmentService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

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

  get totalPages(): number { return Math.max(1, Math.ceil(this.totalStaff / this.limit)); }
  get canManageStaff(): boolean { return this.auth.isAdminLike(); }
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
    this.syncStaffStats();
    this.loading = false;
  }

  private syncStaffStats(): void {
    this.activeCount = this.staffList.filter(staff => staff.isActive && !staff.deletedAt && !staff.isDeleted).length;
    this.inactiveCount = this.staffList.filter(staff => !staff.isActive && !staff.deletedAt && !staff.isDeleted).length;
    this.deletedCount = this.staffList.filter(staff => !!staff.deletedAt || !!staff.isDeleted).length;
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
    if (!this.canManageStaff) return;
    this.statusMenuOpenId = this.statusMenuOpenId === id ? null : id;
  }

  updateStaffStatus(staff: Staff, isActive: boolean): void {
    if (!this.canManageStaff) return;
    if (staff.isActive === isActive) {
      this.statusMenuOpenId = null;
      return;
    }

    this.staffService.update(staff._id, { isActive }).subscribe({
      next: (res) => {
        const updatedStaff = { ...staff, ...res.data, isActive };
        this.staffList = this.staffList
          .map(item => item._id === staff._id ? updatedStaff : item)
          .filter(item => this.matchesCurrentStatusFilter(item));
        if (!this.matchesCurrentStatusFilter(updatedStaff) && this.totalStaff > 0) {
          this.totalStaff -= 1;
        }
        this.syncStaffStats();
        this.statusMenuOpenId = null;
      },
      error: () => {
        this.statusMenuOpenId = null;
      }
    });
  }

  toggleAll(e: Event): void {
    if (!this.canManageStaff) return;
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) this.staffList.forEach(s => this.selected.add(s._id));
    else this.selected.clear();
  }

  toggleSelect(id: string): void {
    if (!this.canManageStaff) return;
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
  }

  openDelete(s: Staff): void {
    if (!this.canManageStaff) return;
    this.deleteTarget = s;
    this.confirmOpen = true;
  }

  openCreateModal(): void {
    if (!this.canManageStaff) return;
    this.modalMode = 'create';
    this.activeStaffId = null;
    this.modalOpen = true;
  }

  openEditModal(id: string): void {
    if (!this.canManageStaff) return;
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
    if (!this.canManageStaff) return;
    if (!this.deleteTarget) return;
    this.staffService.delete(this.deleteTarget._id).subscribe(() => {
      this.confirmOpen = false;
      this.loadStaff();
    });
  }

  bulkDelete(): void {
    if (!this.canManageStaff) return;
    const ids = Array.from(this.selected);
    if (ids.length === 0) return;
    forkJoin(ids.map(id => this.staffService.delete(id))).subscribe(() => {
      this.selected.clear();
      this.loadStaff();
    });
  }

  restore(id: string): void {
    if (!this.canManageStaff) return;
    this.staffService.restore(id).subscribe(() => this.loadStaff());
  }

  private matchesCurrentStatusFilter(staff: Staff): boolean {
    if (this.statusFilter === 'active') return staff.isActive && !staff.deletedAt && !staff.isDeleted;
    if (this.statusFilter === 'inactive') return !staff.isActive && !staff.deletedAt && !staff.isDeleted;
    if (this.statusFilter === 'deleted') return !!staff.deletedAt || !!staff.isDeleted;
    return true;
  }
}
