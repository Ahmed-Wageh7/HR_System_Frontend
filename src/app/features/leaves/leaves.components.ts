import { Component, EventEmitter, Input, Output, forwardRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { LeaveService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { Leave } from '../../core/models';
import { DateFormatPipe, TimeAgoPipe } from '../../shared/pipes/pipes';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { differenceInDays, parseISO } from 'date-fns';
import { showAppToast } from '../../core/utils/toast';

// ── Leave List ─────────────────────────────────────────────
@Component({
  selector: 'app-leave-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DateFormatPipe, HasPermissionDirective, forwardRef(() => LeaveFormComponent), ConfirmDialogComponent],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Leave Management</div>
        <div class="page-subtitle">{{ isAdmin ? 'All leave requests' : 'Your leave requests' }}</div>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn-primary" (click)="openRequestModal()">
          <span class="material-icons" style="font-size:18px">add</span>
          Request Leave
        </button>
      </div>
    </div>

    @if (requestOpen) {
      <div class="modal-backdrop form-backdrop" (click)="closeRequestModal()">
        <div class="modal modal-form" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">Request Leave</div>
              <div class="text-secondary mt-4" style="font-size:13px">Submit a new leave request</div>
            </div>
            <button class="btn btn-ghost btn-icon" (click)="closeRequestModal()"><span class="material-icons">close</span></button>
          </div>
          <app-leave-form [embedded]="true" (saved)="handleLeaveCreated()" (cancelled)="closeRequestModal()" />
        </div>
      </div>
    }

    <!-- Filters (admin only) -->
    @if (isAdmin) {
      <div class="filter-panel">
        <div class="form-group" style="margin-bottom:0">
          <select class="form-control" [(ngModel)]="filterStatus" (ngModelChange)="applyFilter()">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
    }

    <div class="card" style="padding:0">
      @if (loading) {
        <div style="padding:20px">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton" style="height:60px;margin-bottom:8px;border-radius:var(--radius-sm)"></div>
          }
        </div>
      } @else if (filtered.length === 0) {
        <div class="empty-state">
          <span class="material-icons empty-icon">beach_access</span>
          <div class="empty-title">No leave requests</div>
          <div class="empty-desc">{{ isAdmin ? 'No requests found' : 'Submit your first leave request' }}</div>
        </div>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              @if (isAdmin) { <th>Employee</th> }
              <th>Period</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (leave of filtered; track leave._id) {
              <tr>
                @if (isAdmin) {
                  <td>
                    <div class="fw-semibold" style="font-size:13px">{{ getUserName(leave) }}</div>
                  </td>
                }
                <td>
                  <div style="font-size:13px">{{ leave.startDate | dateFormat }} → {{ leave.endDate | dateFormat }}</div>
                </td>
                <td><span class="badge badge-info">{{ calcDays(leave) }}d</span></td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ leave.reason }}</td>
                <td>
                  <span class="badge"
                    [class.badge-warning]="leave.status === 'pending'"
                    [class.badge-success]="leave.status === 'approved'"
                    [class.badge-danger]="leave.status === 'rejected'">
                    {{ leave.status }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-8">
                    <a [routerLink]="['/leaves', leave._id]" class="btn btn-ghost btn-sm btn-icon">
                      <span class="material-icons" style="font-size:16px">visibility</span>
                    </a>
                    @if (!isAdmin && leave.status === 'pending') {
                      <button class="btn btn-danger btn-sm btn-icon" (click)="openDeleteLeave(leave)">
                        <span class="material-icons" style="font-size:16px">delete</span>
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <app-confirm-dialog
      [open]="confirmOpen"
      title="Cancel Leave Request"
      [message]="deleteMessage"
      confirmText="Cancel Request"
      confirmColor="danger"
      (confirmed)="deleteLeave()"
      (cancelled)="confirmOpen = false"
    />
  `
})
export class LeaveListComponent implements OnInit {
  private readonly svc = inject(LeaveService);
  readonly auth = inject(AuthService);

  loading = true;
  leaves: Leave[] = [];
  filtered: Leave[] = [];
  filterStatus = '';
  isAdmin = false;
  requestOpen = false;
  confirmOpen = false;
  deleteTarget: Leave | null = null;

  get deleteMessage(): string {
    if (!this.deleteTarget) return 'Cancel this leave request?';
    return `Cancel leave request from ${this.deleteTarget.startDate} to ${this.deleteTarget.endDate}?`;
  }

  ngOnInit(): void {
    this.isAdmin = this.auth.hasPermission('leave:read');
    this.load();
  }

  load(): void {
    this.loading = true;
    const call = this.isAdmin ? this.svc.getAllLeaves() : this.svc.getMyLeaves();
    call.subscribe({
      next: res => { this.leaves = res.data; this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  applyFilter(): void {
    this.filtered = this.filterStatus
      ? this.leaves.filter(l => l.status === this.filterStatus)
      : this.leaves;
  }

  calcDays(l: Leave): number {
    try { return Math.max(1, differenceInDays(parseISO(l.endDate), parseISO(l.startDate)) + 1); }
    catch { return 1; }
  }

  getUserName(l: Leave): string {
    return typeof l.user === 'object' ? (l.user as { name?: string }).name ?? '—' : '—';
  }

  openRequestModal(): void {
    this.requestOpen = true;
  }

  closeRequestModal(): void {
    this.requestOpen = false;
  }

  handleLeaveCreated(): void {
    this.requestOpen = false;
    this.load();
  }

  openDeleteLeave(leave: Leave): void {
    this.deleteTarget = leave;
    this.confirmOpen = true;
  }

  deleteLeave(): void {
    if (!this.deleteTarget) return;
    this.svc.deleteMyLeave(this.deleteTarget._id).subscribe(() => {
      this.confirmOpen = false;
      this.deleteTarget = null;
      this.load();
    });
  }
}

// ── Leave Form ─────────────────────────────────────────────
@Component({
  selector: 'app-leave-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    @if (!embedded) {
    <div class="page-header">
      <div class="flex items-center gap-12">
        <a routerLink="/leaves" class="btn btn-ghost btn-icon"><span class="material-icons">arrow_back</span></a>
        <div>
          <div class="page-title">Request Leave</div>
          <div class="page-subtitle">Submit a new leave request</div>
        </div>
      </div>
    </div>
    }

    <form [formGroup]="form" (ngSubmit)="onSubmit()" style="max-width:560px" [class.embedded-form]="embedded">
      <div class="card" [class.embedded-card]="embedded">
        <div class="form-group">
          <label>Start Date *</label>
          <input type="date" class="form-control" formControlName="startDate" [min]="today">
          @if (f['startDate'].invalid && f['startDate'].touched) {
            <span class="field-error"><span class="material-icons" style="font-size:14px">error_outline</span>Start date is required</span>
          }
        </div>
        <div class="form-group">
          <label>End Date *</label>
          <input type="date" class="form-control" formControlName="endDate" [min]="form.get('startDate')?.value || today">
          @if (f['endDate'].invalid && f['endDate'].touched) {
            <span class="field-error"><span class="material-icons" style="font-size:14px">error_outline</span>End date is required</span>
          }
        </div>

        @if (form.get('startDate')?.value && form.get('endDate')?.value) {
          <div class="info-box">
            <span class="material-icons" style="color:var(--info)">info</span>
            Total leave: <strong>{{ totalDays }} day(s)</strong>
          </div>
        }

        <div class="form-group mt-16">
          <label>Reason *</label>
          <textarea class="form-control" formControlName="reason" rows="4" placeholder="Explain the reason for your leave request…"></textarea>
          @if (f['reason'].invalid && f['reason'].touched) {
            <span class="field-error"><span class="material-icons" style="font-size:14px">error_outline</span>Reason is required</span>
          }
        </div>

        <div class="flex gap-8" [class.embedded-actions]="embedded">
          <button type="submit" class="btn btn-primary btn-lg" [disabled]="form.invalid || submitting">
            @if (submitting) { <span class="spinner"></span> }
            <span class="material-icons" style="font-size:18px">send</span>
            Submit Request
          </button>
          @if (embedded) {
            <button type="button" class="btn btn-secondary btn-lg" (click)="cancelled.emit()">Cancel</button>
          } @else {
            <a routerLink="/leaves" class="btn btn-secondary btn-lg">Cancel</a>
          }
        </div>
      </div>
    </form>
  `,
  styles: [`
    .info-box{background:var(--info-dim);border:1px solid rgba(59,130,246,.2);padding:10px 14px;border-radius:var(--radius-sm);font-size:13px;display:flex;align-items:center;gap:8px;color:var(--text-secondary)}
    .embedded-form .embedded-card { padding: 16px; }
    .embedded-form .form-group { margin-bottom: 14px; }
    .embedded-form .embedded-actions { justify-content: flex-end; }
    .embedded-form .embedded-actions .btn { padding: 9px 14px; font-size: 13px; }
    @media (max-width: 640px) {
      .embedded-form .embedded-card { padding: 10px; }
      .embedded-form .form-group { margin-bottom: 8px; }
      .embedded-form label { font-size: 11px; }
      .embedded-form .form-control { font-size: 13px; padding: 9px 10px; }
      .embedded-form .embedded-actions {
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }
      .embedded-form .embedded-actions .btn {
        flex: 1 1 0;
        justify-content: center;
        padding: 8px 10px;
        font-size: 12px;
      }
    }
  `]
})
export class LeaveFormComponent {
  @Input() embedded = false;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(LeaveService);
  private readonly router = inject(Router);

  submitting = false;
  today = new Date().toISOString().split('T')[0];

  form = this.fb.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(10)]],
  });

  get f() { return this.form.controls; }

  get totalDays(): number {
    const s = this.form.get('startDate')?.value;
    const e = this.form.get('endDate')?.value;
    if (!s || !e) return 0;
    try { return Math.max(1, differenceInDays(parseISO(e), parseISO(s)) + 1); }
    catch { return 0; }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      showAppToast('warning', 'Please complete the leave request form first.');
      return;
    }
    this.submitting = true;
    const val = this.form.getRawValue();
    this.svc.submit({ reason: val.reason!, startDate: val.startDate!, endDate: val.endDate! }).subscribe({
      next: () => {
        this.submitting = false;
        if (this.embedded) {
          this.saved.emit();
          return;
        }
        this.router.navigate(['/leaves']);
      },
      error: () => { this.submitting = false; }
    });
  }
}

// ── Leave Detail ───────────────────────────────────────────
@Component({
  selector: 'app-leave-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DateFormatPipe, HasPermissionDirective],
  template: `
    @if (loading) {
      <div style="padding:40px;text-align:center"><div class="spinner" style="width:32px;height:32px;margin:0 auto"></div></div>
    } @else if (!leave) {
      <div class="empty-state"><span class="material-icons empty-icon">error</span><div class="empty-title">Leave not found</div></div>
    } @else {
      <div class="page-header">
        <div class="flex items-center gap-12">
          <a routerLink="/leaves" class="btn btn-ghost btn-icon"><span class="material-icons">arrow_back</span></a>
          <div>
            <div class="page-title">Leave Request</div>
            <div class="page-subtitle">{{ leave.startDate | dateFormat }} → {{ leave.endDate | dateFormat }}</div>
          </div>
        </div>
        <div class="status-select">
          <button class="btn btn-ghost btn-sm status-trigger" type="button" [disabled]="!isAdmin" (click)="toggleStatusMenu()">
            <span class="badge"
              [class.badge-warning]="leave.status === 'pending'"
              [class.badge-success]="leave.status === 'approved'"
              [class.badge-danger]="leave.status === 'rejected'"
              style="padding:6px 14px;font-size:13px">{{ leave.status }}</span>
            <span class="material-icons status-caret">keyboard_arrow_down</span>
          </button>
          @if (statusMenuOpen && isAdmin) {
            <div class="status-menu">
              <button class="status-menu-item" [class.active]="leave.status === 'pending'" (click)="setStatus('pending')">
                <span>Pending</span>
                @if (leave.status === 'pending') { <span class="material-icons">check</span> }
              </button>
              <button class="status-menu-item" [class.active]="leave.status === 'approved'" (click)="setStatus('approved')">
                <span>Approved</span>
                @if (leave.status === 'approved') { <span class="material-icons">check</span> }
              </button>
              <button class="status-menu-item" [class.active]="leave.status === 'rejected'" (click)="setStatus('rejected')">
                <span>Rejected</span>
                @if (leave.status === 'rejected') { <span class="material-icons">check</span> }
              </button>
            </div>
          }
        </div>
      </div>

      <div style="max-width:560px">
        <div class="card mb-16">
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Start Date</span><span>{{ leave.startDate | dateFormat }}</span></div>
            <div class="info-item"><span class="info-label">End Date</span><span>{{ leave.endDate | dateFormat }}</span></div>
            <div class="info-item"><span class="info-label">Total Days</span><span>{{ calcDays() }}</span></div>
            <div class="info-item"><span class="info-label">Reason</span><span>{{ leave.reason }}</span></div>
            @if (leave.reviewNote) {
              <div class="info-item"><span class="info-label">Review Note</span><span>{{ leave.reviewNote }}</span></div>
            }
          </div>
        </div>

        @if (leave.status === 'pending') {
          <div *hasPermission="'leave:update'" class="card">
            <div class="fw-bold mb-12">Review Request</div>
            <div class="form-group">
              <label>Note (optional)</label>
              <textarea class="form-control" rows="3" placeholder="Add a review note…" [(ngModel)]="reviewNote"></textarea>
            </div>
            <div class="flex gap-8">
              <button class="btn btn-success" (click)="review('approved')">
                <span class="material-icons" style="font-size:16px">check</span> Approve
              </button>
              <button class="btn btn-danger" (click)="review('rejected')">
                <span class="material-icons" style="font-size:16px">close</span> Reject
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`.info-grid{display:flex;flex-direction:column;gap:0}.info-item{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;font-size:13px;padding:10px 0;border-bottom:1px solid var(--border)}.info-item:last-child{border-bottom:none}.info-label{color:var(--text-secondary);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0}`]
})
export class LeaveDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(LeaveService);
  readonly auth = inject(AuthService);

  loading = true;
  leave: Leave | null = null;
  reviewNote = '';
  isAdmin = false;
  statusMenuOpen = false;

  ngOnInit(): void {
    this.isAdmin = this.auth.hasPermission('leave:update');
    const id = this.route.snapshot.paramMap.get('id')!;
    const call = this.isAdmin ? this.svc.getMyLeave(id) : this.svc.getMyLeave(id);
    call.subscribe({
      next: res => { this.leave = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  calcDays(): string {
    if (!this.leave) return '—';
    try {
      const d = Math.max(1, differenceInDays(parseISO(this.leave.endDate), parseISO(this.leave.startDate)) + 1);
      return `${d} day(s)`;
    } catch { return '—'; }
  }

  review(status: 'approved' | 'rejected'): void {
    if (!this.leave) return;
    this.svc.updateStatus(this.leave._id, status, this.reviewNote || null).subscribe(res => {
      this.leave = res.data;
      this.statusMenuOpen = false;
    });
  }

  toggleStatusMenu(): void {
    if (!this.isAdmin) return;
    this.statusMenuOpen = !this.statusMenuOpen;
  }

  setStatus(status: 'pending' | 'approved' | 'rejected'): void {
    if (!this.leave) return;
    if (status === 'pending') {
      this.statusMenuOpen = false;
      return;
    }
    this.review(status);
  }
}
