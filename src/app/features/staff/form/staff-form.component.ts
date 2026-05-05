import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { StaffService } from '../../../core/services/staff.service';
import { DepartmentService } from '../../../core/services/department.service';
import { Department, Staff } from '../../../core/models';
import { CanComponentDeactivate } from '../../../core/guards/guards';
import { format } from 'date-fns';
import { showAppToast } from '../../../core/utils/toast';

@Component({
  selector: 'app-staff-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    @if (!embedded) {
      <div class="page-header">
        <div class="flex items-center gap-12">
          <a routerLink="/staff" class="btn btn-ghost btn-icon">
            <span class="material-icons">arrow_back</span>
          </a>
          <div>
            <div class="page-title">{{ isEdit ? 'Edit Staff' : 'Add New Staff' }}</div>
            <div class="page-subtitle">{{ isEdit ? 'Update staff member details' : 'Create a new employee record' }}</div>
          </div>
        </div>
      </div>
    }

    <form [formGroup]="form" (ngSubmit)="onSubmit()" [style.max-width]="embedded ? '100%' : '700px'" [class.embedded-form]="embedded">
      <!-- Personal Info -->
      <div class="card" [class.mb-16]="!embedded" [class.embedded-card]="embedded">
        <div class="fw-bold mb-16">Personal Information</div>
        <div class="form-row">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" class="form-control" formControlName="name" placeholder="Ahmed Mohamed" [attr.readonly]="isEdit || null">
            @if (f['name'].invalid && f['name'].touched) {
              <span class="field-error"><span class="material-icons" style="font-size:14px">error_outline</span>Full name is required</span>
            }
          </div>
          <div class="form-group">
            <label>Email Address *</label>
            <input type="email" class="form-control" formControlName="email" placeholder="ahmed@company.com" [attr.readonly]="isEdit || null">
            @if (f['email'].invalid && f['email'].touched) {
              <span class="field-error"><span class="material-icons" style="font-size:14px">error_outline</span>Valid email is required</span>
            }
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" class="form-control" formControlName="phone" placeholder="+20 1000000000" [attr.readonly]="isEdit || null">
          </div>
        </div>
      </div>

      <!-- Employment Info -->
      <div class="card" [class.mb-16]="!embedded" [class.embedded-card]="embedded">
        <div class="fw-bold mb-16">Employment Details</div>
        <div class="form-row">
          <div class="form-group">
            <label>Department</label>
            <select class="form-control" formControlName="department">
              <option value="">No Department</option>
              @for (d of departments; track d._id) {
                <option [value]="d._id">{{ d.name }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label>Position</label>
            <input type="text" class="form-control" formControlName="position" placeholder="e.g. Senior Developer">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Daily Salary (EGP) *</label>
            <input type="number" class="form-control" formControlName="dailySalary" placeholder="500" min="0">
            @if (f['dailySalary'].invalid && f['dailySalary'].touched) {
              <span class="field-error"><span class="material-icons" style="font-size:14px">error_outline</span>Daily salary is required</span>
            }
          </div>
          <div class="form-group">
            <label>Join Date</label>
            <input type="date" class="form-control" formControlName="joinDate">
          </div>
        </div>
        @if (isEdit) {
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" formControlName="isActive"> Active Employee
            </label>
          </div>
        }
      </div>

      <div class="flex gap-8" [class.embedded-actions]="embedded">
        <button type="submit" class="btn btn-primary btn-lg" [disabled]="form.invalid || submitting">
          @if (submitting) { <span class="spinner"></span> }
          <span class="material-icons" style="font-size:18px">{{ isEdit ? 'save' : 'person_add' }}</span>
          {{ isEdit ? 'Save Changes' : 'Create Staff Member' }}
        </button>
        <button type="button" class="btn btn-secondary btn-lg" (click)="onCancel()">Cancel</button>
      </div>
    </form>
  `,
  styles: [`
    .embedded-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .embedded-card {
      padding: 16px;
    }

    .embedded-form .fw-bold {
      margin-bottom: 12px !important;
    }

    .embedded-form .form-group {
      margin-bottom: 14px;
    }

    .embedded-form .form-row {
      gap: 12px;
    }

    .embedded-actions {
      justify-content: flex-end;
      padding-top: 4px;
    }

    .embedded-actions .btn {
      padding: 9px 14px;
      font-size: 13px;
    }

    @media (max-width: 640px) {
      .embedded-form {
        gap: 8px;
      }

      .embedded-card {
        padding: 10px;
      }

      .embedded-form .fw-bold {
        margin-bottom: 8px !important;
        font-size: 13px;
      }

      .embedded-form .form-group {
        margin-bottom: 8px;
      }

      .embedded-form .form-row {
        gap: 8px;
        grid-template-columns: 1fr;
      }

      .embedded-form label {
        font-size: 11px;
      }

      .embedded-form .form-control {
        font-size: 13px;
        padding: 9px 10px;
      }

      .embedded-actions {
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }

      .embedded-actions .btn {
        flex: 1 1 0;
        justify-content: center;
        padding: 8px 10px;
        font-size: 12px;
      }
    }
  `]
})
export class StaffFormComponent implements OnInit, CanComponentDeactivate {
  @Input() staffId?: string | null;
  @Input() embedded = false;
  @Output() saved = new EventEmitter<Staff>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly staffService = inject(StaffService);
  private readonly deptService = inject(DepartmentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isEdit = false;
  submitting = false;
  departments: Department[] = [];
  submitted = false;

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    dailySalary: [0, [Validators.required, Validators.min(0)]],
    joinDate: [format(new Date(), 'yyyy-MM-dd')],
    department: [''],
    position: [''],
    isActive: [true],
  });

  get f() { return this.form.controls; }

  ngOnInit(): void {
    const id = this.staffId ?? this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;

    this.deptService.getAll().subscribe(res => this.departments = this.normalizeDepartments(res.data));

    if (this.isEdit && id) {
      this.staffService.getById(id).subscribe(res => {
        const s = res.data;
        this.form.patchValue({
          name: s.user.name,
          email: s.user.email,
          phone: s.user.phone ?? '',
          dailySalary: s.dailySalary,
          joinDate: s.joinDate ? s.joinDate.split('T')[0] : '',
          department: (s.department as { _id: string } | null)?._id ?? '',
          position: s.position ?? '',
          isActive: s.isActive,
        });
      });
    }
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

  canDeactivate(): boolean {
    return this.submitted || !this.form.dirty;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      showAppToast('warning', 'Please complete the staff form first.');
      return;
    }
    this.submitting = true;
    const id = this.staffId ?? this.route.snapshot.paramMap.get('id');
    const val = this.form.getRawValue();

    if (this.isEdit && id) {
      const payload = {
        dailySalary: val.dailySalary as number,
        joinDate: val.joinDate || undefined,
        department: val.department || null,
        position: val.position || null,
        isActive: val.isActive as boolean,
      };
      this.staffService.update(id, payload).subscribe({
        next: (res) => {
          this.submitted = true;
          this.submitting = false;
          if (this.embedded) {
            this.saved.emit(res.data);
            return;
          }
          this.router.navigate(['/staff', id]);
        },
        error: () => { this.submitting = false; }
      });
    } else {
      const payload = {
        name: val.name as string,
        email: val.email as string,
        phone: val.phone || null,
        dailySalary: val.dailySalary as number,
        joinDate: val.joinDate || undefined,
        department: val.department || null,
        position: val.position || null,
      };
      this.staffService.create(payload as never).subscribe({
        next: (res) => {
          this.submitted = true;
          this.submitting = false;
          if (this.embedded) {
            this.saved.emit(res.data);
            return;
          }
          this.router.navigate(['/staff', res.data._id]);
        },
        error: () => { this.submitting = false; }
      });
    }
  }

  onCancel(): void {
    if (this.embedded) {
      this.cancelled.emit();
      return;
    }

    this.router.navigate(['/staff']);
  }
}
