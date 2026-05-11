import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Staff } from '../../../core/models';
import { StaffService } from '../../../core/services/staff.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { CurrencyFormatPipe, DateFormatPipe, InitialsPipe } from '../../../shared/pipes/pipes';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { StaffFormComponent } from '../form/staff-form.component';
import { AuthService } from '../../../core/services/auth.service';

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
  templateUrl: './staff-workspace.component.html',
  styleUrl: './staff-workspace.component.scss',
})
export class StaffWorkspaceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly staffService = inject(StaffService);
  readonly auth = inject(AuthService);

  loading = true;
  staff: Staff | null = null;
  confirmDeleteOpen = false;

  get showHeroHeader(): boolean {
    const url = this.router.url.split('?')[0];
    return /\/staff\/[^/]+(\/profile)?$/.test(url);
  }
  get canManageStaff(): boolean {
    return this.auth.isAdminLike();
  }
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
    if (!this.staff || !this.canManageStaff) return;
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
    if (!this.canManageStaff) return;
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
    if (!this.staff || !this.canManageStaff) return;
    this.staffService.delete(this.staff._id).subscribe(() => {
      this.confirmDeleteOpen = false;
      this.router.navigate(['/staff']);
    });
  }

  restoreStaff(): void {
    if (!this.staff || !this.canManageStaff) return;
    this.staffService.restore(this.staff._id).subscribe(() => this.loadStaff());
  }
}
