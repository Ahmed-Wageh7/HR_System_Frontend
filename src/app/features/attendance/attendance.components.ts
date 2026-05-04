import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, interval, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AttendanceService } from '../../core/services/api.services';
import { StaffService } from '../../core/services/staff.service';
import { AttendanceRecord, Staff } from '../../core/models';
import { DateFormatPipe } from '../../shared/pipes/pipes';
import { format } from 'date-fns';

// ── Check-In Component ──────────────────────────────────────
@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [CommonModule, DateFormatPipe],
  template: `
    <div class="checkin-page">
      <div class="checkin-card">
        <div class="checkin-time">{{ currentTime }}</div>
        <div class="checkin-date">{{ currentDate }}</div>

        @if (isLate) {
          <div class="late-warning">
            <span class="material-icons">warning</span>
            Late check-in (after 9:00 AM)
          </div>
        }

        @if (status) {
          <div class="status-display" [class.checked-in]="status === 'in'" [class.checked-out]="status === 'out'">
            <span class="material-icons status-icon">{{ status === 'in' ? 'work' : 'home' }}</span>
            <div>{{ status === 'in' ? 'Currently Working' : 'Checked Out' }}</div>
            @if (checkInTime) {
              <div class="status-sub">{{ status === 'in' ? 'Since ' : 'Was in since ' }}{{ checkInTime | dateFormat:'HH:mm' }}</div>
            }
          </div>
        }

        <button
          class="checkin-btn"
          [class.checkout]="status === 'in'"
          [disabled]="loading"
          (click)="toggle()"
        >
          @if (loading) {
            <span class="spinner" style="width:24px;height:24px;border-width:3px"></span>
          } @else {
            <span class="material-icons" style="font-size:32px">
              {{ status === 'in' ? 'logout' : 'login' }}
            </span>
          }
          <span>{{ status === 'in' ? 'Check Out' : 'Check In' }}</span>
        </button>

        @if (message) {
          <div class="checkin-msg" [class.success]="!error" [class.error]="error">{{ message }}</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .checkin-page {
      display: flex; align-items: center; justify-content: center;
      min-height: calc(100vh - var(--header-h) - 48px);
    }
    .checkin-card {
      text-align: center;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 48px 40px;
      width: 100%; max-width: 420px;
    }
    .checkin-time {
      font-size: 56px; font-weight: 900; letter-spacing: -0.04em;
      font-variant-numeric: tabular-nums;
      background: linear-gradient(135deg, var(--text-primary), var(--accent));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .checkin-date { color: var(--text-secondary); font-size: 14px; margin-bottom: 32px; }

    .late-warning {
      background: var(--warning-dim); color: var(--warning);
      border: 1px solid rgba(245,158,11,0.2);
      padding: 10px 16px; border-radius: var(--radius-sm);
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; margin-bottom: 20px;
    }
    .status-display {
      padding: 16px; border-radius: var(--radius); margin-bottom: 24px;
      &.checked-in { background: var(--success-dim); color: var(--success); }
      &.checked-out { background: var(--bg-elevated); color: var(--text-secondary); }
    }
    .status-icon { font-size: 28px; margin-bottom: 4px; }
    .status-sub { font-size: 12px; opacity: 0.8; margin-top: 4px; }

    .checkin-btn {
      width: 100%; padding: 20px;
      background: var(--success); color: white;
      border: none; border-radius: var(--radius);
      font-family: var(--font-sans); font-size: 18px; font-weight: 700;
      cursor: pointer; transition: var(--transition);
      display: flex; align-items: center; justify-content: center; gap: 12px;
      &:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(16,185,129,0.3); }
      &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
      &.checkout { background: var(--danger); &:hover:not(:disabled) { box-shadow: 0 8px 24px rgba(239,68,68,0.3); } }
    }
    .checkin-msg {
      margin-top: 16px; padding: 10px 16px; border-radius: var(--radius-sm); font-size: 13px;
      &.success { background: var(--success-dim); color: var(--success); }
      &.error { background: var(--danger-dim); color: var(--danger); }
    }
    @media (max-width: 480px) {
      .checkin-card { padding: 32px 20px; }
      .checkin-time { font-size: 40px; }
    }
  `]
})
export class CheckinComponent implements OnInit, OnDestroy {
  private readonly svc = inject(AttendanceService);

  currentTime = '';
  currentDate = '';
  isLate = false;
  status: 'in' | 'out' | null = null;
  checkInTime: string | null = null;
  loading = false;
  message = '';
  error = false;

  private timer?: Subscription;

  ngOnInit(): void {
    this.tick();
    this.timer = interval(1000).subscribe(() => this.tick());
  }

  ngOnDestroy(): void { this.timer?.unsubscribe(); }

  private tick(): void {
    const now = new Date();
    this.currentTime = format(now, 'HH:mm:ss');
    this.currentDate = format(now, 'EEEE, MMMM d, yyyy');
    this.isLate = now.getHours() >= 9;
  }

  toggle(): void {
    this.loading = true;
    this.message = '';
    const call = this.status === 'in' ? this.svc.checkOut() : this.svc.checkIn();
    call.subscribe({
      next: (res) => {
        this.loading = false;
        if (this.status === 'in') {
          this.status = 'out';
          this.message = 'Checked out successfully!';
        } else {
          this.status = 'in';
          this.checkInTime = (res.data as { checkIn?: string }).checkIn ?? new Date().toISOString();
          this.message = 'Checked in successfully!';
        }
        this.error = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = true;
        this.message = err.error?.message || 'Action failed';
      }
    });
  }
}

// ── Attendance List Component ──────────────────────────────
@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DateFormatPipe],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Attendance</div>
        <div class="page-subtitle">Track daily attendance records</div>
      </div>
      <div class="page-actions">
        <a routerLink="/attendance/checkin" class="btn btn-primary">
          <span class="material-icons" style="font-size:18px">fingerprint</span>
          Check In / Out
        </a>
        <input type="date" class="form-control" style="width:180px" [(ngModel)]="selectedDate" (ngModelChange)="load()">
      </div>
    </div>

    @if (loading) {
      @for (i of [1,2,3,4,5]; track i) {
        <div class="skeleton" style="height:50px;margin-bottom:8px;border-radius:var(--radius-sm)"></div>
      }
    } @else {
      <!-- Summary Cards -->
      <div class="stats-grid mb-16">
        <div class="stat-card stat-success">
          <div class="stat-label">Present</div>
          <div class="stat-value">{{ summary.present }}</div>
          <div class="stat-icon"><span class="material-icons">check_circle</span></div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-label">Late</div>
          <div class="stat-value">{{ summary.late }}</div>
          <div class="stat-icon"><span class="material-icons">schedule</span></div>
        </div>
        <div class="stat-card stat-danger">
          <div class="stat-label">Absent</div>
          <div class="stat-value">{{ summary.absent }}</div>
          <div class="stat-icon"><span class="material-icons">person_off</span></div>
        </div>
      </div>

      <div class="card" style="padding:0">
        @if (records.length === 0) {
          <div class="empty-state"><span class="material-icons empty-icon">event_busy</span><div class="empty-title">No records for this date</div></div>
        } @else {
          <table class="data-table">
            <thead><tr><th>Staff</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr></thead>
            <tbody>
              @for (r of records; track r._id) {
                <tr [class]="getRowClass(r)">
                  <td>
                    <div class="fw-semibold" style="font-size:13px">{{ getStaffName(r) }}</div>
                  </td>
                  <td>{{ r.checkIn ? (r.checkIn | dateFormat:'HH:mm') : '—' }}</td>
                  <td>{{ r.checkOut ? (r.checkOut | dateFormat:'HH:mm') : '—' }}</td>
                  <td>{{ r.workHours ? (r.workHours | number:'1.1-1') + 'h' : '—' }}</td>
                  <td>
                    @if (r.isAbsent) { <span class="badge badge-danger">Absent</span> }
                    @else if (r.isLate) { <span class="badge badge-warning">Late</span> }
                    @else { <span class="badge badge-success">Present</span> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }
  `,
  styles: [`
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    tr.row-late td { background: rgba(245,158,11,0.03); }
    tr.row-absent td { background: rgba(239,68,68,0.03); }
    @media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr; } }
  `]
})
export class AttendanceListComponent implements OnInit {
  private readonly staffService = inject(StaffService);

  loading = true;
  selectedDate = format(new Date(), 'yyyy-MM-dd');
  records: AttendanceRecord[] = [];
  summary = { present: 0, late: 0, absent: 0 };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.records = [];
    this.summary = { present: 0, late: 0, absent: 0 };

    const month = this.selectedDate.slice(0, 7);
    this.staffService.getAll({ limit: 500 }).subscribe({
      next: (staffRes) => {
        const staff = staffRes.data ?? [];
        if (staff.length === 0) {
          this.loading = false;
          return;
        }

        forkJoin(
          staff.map(member =>
            this.staffService.getAttendance(member._id, month).pipe(
              catchError(() => of({ data: [] as AttendanceRecord[] }))
            )
          )
        ).subscribe({
          next: (responses) => {
            this.records = responses
              .flatMap((response, index) => {
                const member = staff[index];
                return this.normalizeAttendanceRecords(response.data)
                  .filter(record => record.date?.startsWith(this.selectedDate))
                  .map(record => this.attachStaff(record, member));
              })
              .sort((a, b) => this.getStaffName(a).localeCompare(this.getStaffName(b)));

            this.calcSummary(staff.length);
            this.loading = false;
          },
          error: () => { this.loading = false; }
        });
      },
      error: () => { this.loading = false; }
    });
  }

  private attachStaff(record: AttendanceRecord, staff: Staff): AttendanceRecord {
    return {
      ...record,
      staff: typeof record.staff === 'string' ? staff : record.staff || staff,
    };
  }

  private normalizeAttendanceRecords(data: unknown): AttendanceRecord[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      const candidate = (data as { records?: unknown }).records;
      if (Array.isArray(candidate)) return candidate as AttendanceRecord[];
    }
    return [];
  }

  calcSummary(totalStaff = this.records.length): void {
    this.summary.present = this.records.filter(r => !r.isAbsent).length;
    this.summary.late = this.records.filter(r => r.isLate).length;
    const recordedAbsences = this.records.filter(r => r.isAbsent).length;
    this.summary.absent = Math.max(recordedAbsences, totalStaff - this.summary.present);
  }

  getRowClass(r: AttendanceRecord): string {
    if (r.isAbsent) return 'row-absent';
    if (r.isLate) return 'row-late';
    return '';
  }

  getStaffName(r: AttendanceRecord): string {
    return typeof r.staff === 'string' ? 'Unknown' : r.staff?.user?.name ?? 'Unknown';
  }
}
