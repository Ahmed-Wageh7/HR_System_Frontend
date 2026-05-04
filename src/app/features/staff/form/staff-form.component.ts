import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { StaffService } from '../../../core/services/staff.service';
import { DepartmentService } from '../../../core/services/department.service';
import { Department, Staff } from '../../../core/models';
import { CanComponentDeactivate } from '../../../core/guards/guards';
import { format } from 'date-fns';

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

    <form [formGroup]="form" (ngSubmit)="onSubmit()" [style.max-width]="embedded ? '100%' : '700px'">
      <!-- Avatar Preview -->
      @if (!isEdit) {
        <div class="card mb-16">
          <div class="fw-bold mb-12">Profile Photo</div>
          <div class="flex items-center gap-16">
            <div class="avatar avatar-xl" style="font-size:32px">
              @if (avatarPreview) {
                <img [src]="avatarPreview" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">
              } @else {
                {{ form.get('name')?.value?.slice(0,1)?.toUpperCase() || '?' }}
              }
            </div>
            <div>
              <button type="button" class="btn btn-secondary" (click)="avatarInput.click()">
                <span class="material-icons" style="font-size:16px">upload</span> Upload Photo
              </button>
              <input #avatarInput type="file" accept="image/*" style="display:none" (change)="onAvatarChange($event)">
              <div class="text-muted mt-4" style="font-size:12px">JPG, PNG or GIF. Max 2MB</div>
            </div>
          </div>
        </div>
      }

      <!-- Personal Info -->
      <div class="card mb-16">
        <div class="fw-bold mb-16">Personal Information</div>
        <div class="form-row">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" class="form-control" formControlName="name" placeholder="Ahmed Mohamed">
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
            <input type="tel" class="form-control" formControlName="phone" placeholder="+20 1000000000">
          </div>
          @if (!isEdit) {
            <div class="form-group">
              <label>Password *</label>
              <input type="password" class="form-control" formControlName="password" placeholder="Min 8 chars">
              @if (f['password'].invalid && f['password'].touched) {
                <span class="field-error"><span class="material-icons" style="font-size:14px">error_outline</span>Min 8 chars, 1 uppercase, 1 number</span>
              }
            </div>
          }
        </div>
      </div>

      <!-- Employment Info -->
      <div class="card mb-16">
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

      <div class="flex gap-8">
        <button type="submit" class="btn btn-primary btn-lg" [disabled]="form.invalid || submitting">
          @if (submitting) { <span class="spinner"></span> }
          <span class="material-icons" style="font-size:18px">{{ isEdit ? 'save' : 'person_add' }}</span>
          {{ isEdit ? 'Save Changes' : 'Create Staff Member' }}
        </button>
        <button type="button" class="btn btn-secondary btn-lg" (click)="onCancel()">Cancel</button>
      </div>
    </form>
  `
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
  avatarPreview: string | null = null;
  avatarFile: File | null = null;
  submitted = false;

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)]],
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
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
      this.staffService.getById(id).subscribe(res => {
        const s = res.data;
        this.form.patchValue({
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

  onAvatarChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = () => this.avatarPreview = reader.result as string;
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'warning', message: 'Please complete the staff form first.' } }));
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
        password: val.password as string,
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
