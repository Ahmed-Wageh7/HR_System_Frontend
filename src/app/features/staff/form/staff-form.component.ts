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
  templateUrl: './staff-form.component.html',
  styleUrl: './staff-form.component.scss'
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
