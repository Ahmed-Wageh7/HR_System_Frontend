import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../../../core/services/staff.service';
import { Staff, AttendanceRecord, SalaryRecord, Deduction } from '../../../core/models';
import { InitialsPipe, DateFormatPipe, CurrencyFormatPipe, TimeAgoPipe } from '../../../shared/pipes/pipes';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { format } from 'date-fns';

@Component({
  selector: 'app-staff-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, InitialsPipe, DateFormatPipe, CurrencyFormatPipe, TimeAgoPipe, HasPermissionDirective, ConfirmDialogComponent],
  template: `
    @if (loading) {
      <div style="padding:40px;text-align:center">
        <div class="spinner" style="width:32px;height:32px;margin:0 auto"></div>
      </div>
    } @else if (!staff) {
      <div class="empty-state">
        <span class="material-icons empty-icon">person_off</span>
        <div class="empty-title">Staff not found</div>
        @if (!embedded) {
          <a routerLink="/staff" class="btn btn-secondary mt-16">Back to Staff</a>
        }
      </div>
    } @else {
      <!-- Header -->
      <div class="page-header">
        <div class="flex items-center gap-16">
          @if (!embedded) {
            <a routerLink="/staff" class="btn btn-ghost btn-icon">
              <span class="material-icons">arrow_back</span>
            </a>
          }
          <div class="flex items-center gap-12">
            <div class="avatar avatar-lg">
              @if (staff.user.avatar) {
                <img [src]="staff.user.avatar" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">
              } @else {
                {{ staff.user.name | initials }}
              }
            </div>
            <div>
              <div class="page-title">{{ staff.user.name }}</div>
              <div class="page-subtitle">{{ staff.position || 'No position' }} · {{ staff.department?.name || 'No department' }}</div>
            </div>
          </div>
        </div>
        <div class="page-actions">
          @if (staff.deletedAt) {
            <span class="badge badge-danger">Deleted</span>
          } @else if (staff.isActive) {
            <span class="badge badge-success">Active</span>
          } @else {
            <span class="badge badge-muted">Inactive</span>
          }
          <button *hasPermission="'staff:update'" class="btn btn-secondary" (click)="startEdit()">
            <span class="material-icons" style="font-size:16px">edit</span> Edit
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        @for (t of tabs; track t.key) {
          <button class="tab-btn" [class.active]="activeTab === t.key" (click)="activeTab = t.key; onTabChange(t.key)">
            {{ t.label }}
          </button>
        }
      </div>

      <!-- Overview Tab -->
      @if (activeTab === 'overview') {
        <div class="form-row">
          <div class="card">
            <div class="fw-bold mb-16">Personal Info</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Email</span><span>{{ staff.user.email }}</span></div>
              <div class="info-item"><span class="info-label">Phone</span><span>{{ staff.user.phone || '—' }}</span></div>
              <div class="info-item"><span class="info-label">Join Date</span><span>{{ staff.joinDate | dateFormat }}</span></div>
              <div class="info-item"><span class="info-label">Daily Salary</span><span class="text-accent fw-bold">{{ staff.dailySalary | currencyFormat }}</span></div>
              <div class="info-item"><span class="info-label">Position</span><span>{{ staff.position || '—' }}</span></div>
              <div class="info-item"><span class="info-label">Department</span><span>{{ staff.department?.name || '—' }}</span></div>
            </div>
          </div>
          <div class="card">
            <div class="fw-bold mb-16">Quick Stats</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Staff ID</span><span class="mono" style="font-size:11px">{{ staff._id }}</span></div>
              <div class="info-item"><span class="info-label">Created</span><span>{{ staff.createdAt | timeAgo }}</span></div>
              @if (staff.deletedAt) {
                <div class="info-item"><span class="info-label">Deleted</span><span class="text-danger">{{ staff.deletedAt | timeAgo }}</span></div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Attendance Tab -->
      @if (activeTab === 'attendance') {
        <div class="card">
          <div class="flex items-center justify-between mb-16">
            <div class="fw-bold">Attendance Records</div>
            <input type="month" class="form-control" style="width:180px" [(ngModel)]="attendanceMonth" (ngModelChange)="loadAttendance()">
          </div>
          @if (attendanceLoading) {
            <div class="skeleton skeleton-text" style="height:200px"></div>
          } @else if (attendance.length === 0) {
            <div class="empty-state" style="padding:40px 20px">
              <span class="material-icons empty-icon">event_busy</span>
              <div class="empty-title">No records for this month</div>
            </div>
          } @else {
            <table class="data-table">
              <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr></thead>
              <tbody>
                @for (a of attendance; track a._id) {
                  <tr>
                    <td>{{ a.date | dateFormat }}</td>
                    <td>{{ a.checkIn ? (a.checkIn | dateFormat:'HH:mm') : '—' }}</td>
                    <td>{{ a.checkOut ? (a.checkOut | dateFormat:'HH:mm') : '—' }}</td>
                    <td>{{ a.workHours ? (a.workHours | number:'1.1-1') + 'h' : '—' }}</td>
                    <td>
                      @if (a.isAbsent) { <span class="badge badge-danger">Absent</span> }
                      @else if (a.isLate) { <span class="badge badge-warning">Late</span> }
                      @else { <span class="badge badge-success">Present</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }

      <!-- Salary Tab -->
      @if (activeTab === 'salary') {
        <div class="card">
          <div class="flex items-center justify-between mb-16">
            <div class="fw-bold">Salary Details</div>
            <input type="month" class="form-control" style="width:180px" [(ngModel)]="salaryMonth" (ngModelChange)="loadSalary()">
          </div>
          @if (salaryLoading) {
            <div class="skeleton" style="height:200px;border-radius:var(--radius)"></div>
          } @else if (!salary) {
            <div class="empty-state" style="padding:40px 20px">
              <span class="material-icons empty-icon">payments</span>
              <div class="empty-title">No salary record for this month</div>
            </div>
          } @else {
            <div class="salary-breakdown">
              <div class="salary-row">
                <span>Base Salary</span>
                <span class="fw-bold">{{ salary.baseSalary | currencyFormat }}</span>
              </div>
              <div class="salary-row deduction">
                <span>Late Deductions</span>
                <span class="text-danger">-{{ salary.lateDeductions | currencyFormat }}</span>
              </div>
              <div class="salary-row deduction">
                <span>Absent Deductions</span>
                <span class="text-danger">-{{ salary.absentDeductions | currencyFormat }}</span>
              </div>
              <div class="salary-row deduction">
                <span>Manual Deductions</span>
                <span class="text-danger">-{{ salary.manualDeductions | currencyFormat }}</span>
              </div>
              @if (salary.adjustments !== 0) {
                <div class="salary-row">
                  <span>Adjustments</span>
                  <span [class.text-success]="salary.adjustments > 0" [class.text-danger]="salary.adjustments < 0">
                    {{ salary.adjustments > 0 ? '+' : '' }}{{ salary.adjustments | currencyFormat }}
                  </span>
                </div>
              }
              <div class="salary-row total">
                <span>Final Salary</span>
                <span class="text-accent">{{ salary.finalSalary | currencyFormat }}</span>
              </div>
            </div>
            <div class="flex gap-8 mt-16">
              @if (!salary.isPaid) {
                <button *hasPermission="'salary:pay'" class="btn btn-success" (click)="payConfirmOpen = true">
                  <span class="material-icons" style="font-size:16px">payments</span> Mark as Paid
                </button>
              } @else {
                <span class="badge badge-success" style="padding:8px 16px;font-size:13px">
                  ✓ Paid {{ salary.paidAt | dateFormat:'MMM d, yyyy' }}
                </span>
              }
              <button *hasPermission="'salary:adjust'" class="btn btn-secondary" (click)="adjustOpen = !adjustOpen">
                <span class="material-icons" style="font-size:16px">tune</span> Adjust
              </button>
            </div>
            @if (adjustOpen) {
              <div class="flex gap-8 mt-12 items-center">
                <input type="number" class="form-control" style="width:160px" placeholder="Amount" [(ngModel)]="adjustAmount">
                <button class="btn btn-primary" (click)="doAdjust()">Apply</button>
                <button class="btn btn-ghost" (click)="adjustOpen = false">Cancel</button>
              </div>
            }
          }
        </div>

        <!-- Deductions -->
        <div class="card mt-16">
          <div class="flex items-center justify-between mb-16">
            <div class="fw-bold">Manual Deductions</div>
            <button *hasPermission="'salary:update'" class="btn btn-secondary btn-sm" (click)="deductionFormOpen = true">
              <span class="material-icons" style="font-size:16px">add</span> Add
            </button>
          </div>
          @if (deductionFormOpen) {
            <div class="card card-elevated mb-16">
              <div class="form-row">
                <div class="form-group" style="margin-bottom:0">
                  <label>Month</label>
                  <input type="month" class="form-control" [(ngModel)]="newDeduction.month">
                </div>
                <div class="form-group" style="margin-bottom:0">
                  <label>Amount</label>
                  <input type="number" class="form-control" placeholder="0" [(ngModel)]="newDeduction.amount">
                </div>
              </div>
              <div class="form-group mt-8" style="margin-bottom:0">
                <label>Reason</label>
                <input type="text" class="form-control" placeholder="Reason for deduction" [(ngModel)]="newDeduction.reason">
              </div>
              <div class="flex gap-8 mt-12">
                <button class="btn btn-primary" (click)="addDeduction()">Save</button>
                <button class="btn btn-ghost" (click)="deductionFormOpen = false">Cancel</button>
              </div>
            </div>
          }
          @if (deductions.length === 0) {
            <div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">No deductions recorded</div>
          } @else {
            <table class="data-table">
              <thead><tr><th>Month</th><th>Amount</th><th>Reason</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                @for (d of deductions; track d._id) {
                  <tr>
                    <td>{{ d.month }}</td>
                    <td class="text-danger">{{ d.amount | currencyFormat }}</td>
                    <td>{{ d.reason }}</td>
                    <td>{{ d.createdAt | dateFormat }}</td>
                    <td>
                      <button class="btn btn-danger btn-sm btn-icon" (click)="deleteDeduction(d._id)">
                        <span class="material-icons" style="font-size:14px">delete</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }

      <!-- Documents Tab -->
      @if (activeTab === 'documents') {
        <div class="card">
          <div class="flex items-center justify-between mb-16">
            <div class="fw-bold">Documents</div>
            <button *hasPermission="'staff:update'" class="btn btn-secondary btn-sm" (click)="docInput.click()">
              <span class="material-icons" style="font-size:16px">upload</span> Upload
            </button>
            <input #docInput type="file" style="display:none" (change)="uploadDoc($event)">
          </div>
          @if (!staff.documents || staff.documents.length === 0) {
            <div class="empty-state" style="padding:40px 20px">
              <span class="material-icons empty-icon">folder_open</span>
              <div class="empty-title">No documents uploaded</div>
            </div>
          } @else {
            @for (doc of staff.documents; track doc._id) {
              <div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid var(--border)">
                <div class="flex items-center gap-8">
                  <span class="material-icons text-muted">description</span>
                  <span style="font-size:13px">{{ doc.filename }}</span>
                </div>
                <div class="flex gap-8">
                  <a [href]="doc.url" target="_blank" class="btn btn-ghost btn-sm">View</a>
                  <button class="btn btn-danger btn-sm btn-icon" (click)="deleteDoc(doc._id)">
                    <span class="material-icons" style="font-size:14px">delete</span>
                  </button>
                </div>
              </div>
            }
          }
        </div>
      }
    }

    <app-confirm-dialog
      [open]="payConfirmOpen"
      title="Confirm Payment"
      message="Mark this month's salary as paid? This cannot be undone."
      confirmText="Mark Paid"
      confirmColor="primary"
      (confirmed)="paySalary()"
      (cancelled)="payConfirmOpen = false"
    />
  `,
  styles: [`
    .info-grid { display: flex; flex-direction: column; gap: 12px; }
    .info-item { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .info-item:last-child { border-bottom: none; }
    .info-label { color: var(--text-secondary); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }

    .salary-breakdown { display: flex; flex-direction: column; gap: 4px; }
    .salary-row { display: flex; justify-content: space-between; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 14px; }
    .salary-row:hover { background: var(--bg-elevated); }
    .salary-row.deduction { color: var(--text-secondary); }
    .salary-row.total { background: var(--accent-dim); border: 1px solid rgba(245,158,11,0.2); font-weight: 700; font-size: 16px; margin-top: 8px; }
  `]
})
export class StaffDetailComponent implements OnInit {
  @Input() staffId?: string | null;
  @Input() embedded = false;
  @Output() editRequested = new EventEmitter<string>();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly staffService = inject(StaffService);

  loading = true;
  staff: Staff | null = null;
  activeTab = 'overview';

  tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'salary', label: 'Salary' },
    { key: 'documents', label: 'Documents' },
  ];

  attendanceMonth = format(new Date(), 'yyyy-MM');
  attendance: AttendanceRecord[] = [];
  attendanceLoading = false;

  salaryMonth = format(new Date(), 'yyyy-MM');
  salary: SalaryRecord | null = null;
  salaryLoading = false;
  payConfirmOpen = false;
  adjustOpen = false;
  adjustAmount = 0;

  deductions: Deduction[] = [];
  deductionFormOpen = false;
  newDeduction = { month: format(new Date(), 'yyyy-MM'), amount: 0, reason: '' };

  ngOnInit(): void {
    const id = this.staffId ?? this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      return;
    }

    this.staffService.getById(id).subscribe({
      next: res => { this.staff = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  startEdit(): void {
    if (!this.staff) return;
    if (this.embedded) {
      this.editRequested.emit(this.staff._id);
      return;
    }

    this.router.navigate(['/staff', this.staff._id, 'edit']);
  }

  onTabChange(tab: string): void {
    if (!this.staff) return;
    if (tab === 'attendance') this.loadAttendance();
    if (tab === 'salary') { this.loadSalary(); this.loadDeductions(); }
  }

  loadAttendance(): void {
    if (!this.staff) return;
    this.attendanceLoading = true;
    this.staffService.getAttendance(this.staff._id, this.attendanceMonth).subscribe({
      next: res => {
        const data = res.data;
        this.attendance = Array.isArray(data) ? data : Array.isArray((data as { records?: unknown })?.records) ? (data as { records: AttendanceRecord[] }).records : [];
        this.attendanceLoading = false;
      },
      error: () => { this.attendanceLoading = false; }
    });
  }

  loadSalary(): void {
    if (!this.staff) return;
    this.salaryLoading = true;
    this.staffService.getSalary(this.staff._id, this.salaryMonth).subscribe({
      next: res => { this.salary = res.data; this.salaryLoading = false; },
      error: () => { this.salary = null; this.salaryLoading = false; }
    });
  }

  loadDeductions(): void {
    if (!this.staff) return;
    this.staffService.getDeductions(this.staff._id).subscribe(res => this.deductions = res.data);
  }

  paySalary(): void {
    if (!this.staff) return;
    this.staffService.paySalary(this.staff._id, this.salaryMonth).subscribe(() => {
      this.payConfirmOpen = false;
      this.loadSalary();
    });
  }

  doAdjust(): void {
    if (!this.staff) return;
    this.staffService.adjustSalary(this.staff._id, this.salaryMonth, this.adjustAmount).subscribe(() => {
      this.adjustOpen = false;
      this.loadSalary();
    });
  }

  addDeduction(): void {
    if (!this.staff) return;
    this.staffService.addDeduction(this.staff._id, this.newDeduction).subscribe(() => {
      this.deductionFormOpen = false;
      this.newDeduction = { month: format(new Date(), 'yyyy-MM'), amount: 0, reason: '' };
      this.loadDeductions();
    });
  }

  deleteDeduction(did: string): void {
    if (!this.staff) return;
    this.staffService.deleteDeduction(this.staff._id, did).subscribe(() => this.loadDeductions());
  }

  uploadDoc(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !this.staff) return;
    this.staffService.uploadDocument(this.staff._id, file).subscribe(() => {
      const id = this.route.snapshot.paramMap.get('id')!;
      this.staffService.getById(id).subscribe(res => this.staff = res.data);
    });
  }

  deleteDoc(docId: string): void {
    if (!this.staff) return;
    this.staffService.deleteDocument(this.staff._id, docId).subscribe(() => {
      if (this.staff) this.staff.documents = this.staff.documents?.filter(d => d._id !== docId);
    });
  }
}
