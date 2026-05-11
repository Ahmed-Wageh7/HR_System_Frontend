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

        @if (checkInTime) {
          <div class="status-display checked-in">
            <span class="material-icons status-icon">login</span>
            <div>Last check-in recorded</div>
            <div class="status-sub">{{ checkInTime | dateFormat:'HH:mm' }}</div>
          </div>
        }

        <button
          class="checkin-btn"
          [disabled]="loading"
          (click)="checkIn()"
        >
          @if (loading) {
            <span class="spinner" style="width:24px;height:24px;border-width:3px"></span>
          } @else {
            <span class="material-icons" style="font-size:32px">login</span>
          }
          <span>Check In</span>
        </button>
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
      background: linear-gradient(135deg, var(--text-primary), var(--sidebar-active-text));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .checkin-date { color: var(--text-secondary); font-size: 14px; margin-bottom: 32px; }

    .late-warning {
      background: var(--sidebar-active-bg); color: var(--sidebar-active-text);
      border: 1px solid var(--sidebar-active-border);
      padding: 10px 16px; border-radius: var(--radius-sm);
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; margin-bottom: 20px;
    }
    .status-display {
      padding: 16px; border-radius: var(--radius); margin-bottom: 24px;
      &.checked-in { background: var(--sidebar-active-bg); color: var(--sidebar-active-text); border: 1px solid var(--sidebar-active-border); }
      &.checked-out { background: var(--bg-elevated); color: var(--text-secondary); }
    }
    .status-icon { font-size: 28px; margin-bottom: 4px; }
    .status-sub { font-size: 12px; opacity: 0.8; margin-top: 4px; }

    .checkin-btn {
      width: 100%; padding: 20px;
      background: var(--sidebar-active-bg); color: var(--sidebar-active-text); border: 1px solid var(--sidebar-active-border); border-radius: var(--radius);
      font-family: var(--font-sans); font-size: 18px; font-weight: 700;
      cursor: pointer; transition: var(--transition);
      display: flex; align-items: center; justify-content: center; gap: 12px;
      &:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: var(--shadow-md); }
      &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
      &.checkout { background: var(--sidebar-active-bg); }
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
  checkInTime: string | null = null;
  loading = false;

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

  checkIn(): void {
    this.loading = true;
    this.svc.checkIn().subscribe({
      next: (res) => {
        this.loading = false;
        this.checkInTime = (res.data as { checkIn?: string }).checkIn ?? new Date().toISOString();
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, DateFormatPipe],
  template: `
    <div class="checkin-page">
      <div class="checkin-card">
        <div class="checkin-time">{{ currentTime }}</div>
        <div class="checkin-date">{{ currentDate }}</div>

        @if (checkOutTime) {
          <div class="status-display checked-out">
            <span class="material-icons status-icon">logout</span>
            <div>Last check-out recorded</div>
            <div class="status-sub">{{ checkOutTime | dateFormat:'HH:mm' }}</div>
          </div>
        }

        <button class="checkin-btn checkout" [disabled]="loading" (click)="checkOut()">
          @if (loading) {
            <span class="spinner" style="width:24px;height:24px;border-width:3px"></span>
          } @else {
            <span class="material-icons" style="font-size:32px">logout</span>
          }
          <span>Check Out</span>
        </button>
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
      background: linear-gradient(135deg, var(--text-primary), var(--sidebar-active-text));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .checkin-date { color: var(--text-secondary); font-size: 14px; margin-bottom: 32px; }
    .status-display {
      padding: 16px; border-radius: var(--radius); margin-bottom: 24px;
      background: var(--bg-elevated); color: var(--text-secondary);
    }
    .status-icon { font-size: 28px; margin-bottom: 4px; }
    .status-sub { font-size: 12px; opacity: 0.8; margin-top: 4px; }
    .checkin-btn {
      width: 100%; padding: 20px;
      background: var(--sidebar-active-bg); color: var(--sidebar-active-text); border: 1px solid var(--sidebar-active-border); border-radius: var(--radius);
      font-family: var(--font-sans); font-size: 18px; font-weight: 700;
      cursor: pointer; transition: var(--transition);
      display: flex; align-items: center; justify-content: center; gap: 12px;
    }
    .checkin-btn:hover:not(:disabled) { box-shadow: var(--shadow-md); filter: brightness(1.06); transform: translateY(-1px); }
    .checkin-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    @media (max-width: 480px) {
      .checkin-card { padding: 32px 20px; }
      .checkin-time { font-size: 40px; }
    }
  `]
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private readonly svc = inject(AttendanceService);

  currentTime = '';
  currentDate = '';
  checkOutTime: string | null = null;
  loading = false;

  private timer?: Subscription;

  ngOnInit(): void {
    this.tick();
    this.timer = interval(1000).subscribe(() => this.tick());
  }

  ngOnDestroy(): void {
    this.timer?.unsubscribe();
  }

  private tick(): void {
    const now = new Date();
    this.currentTime = format(now, 'HH:mm:ss');
    this.currentDate = format(now, 'EEEE, MMMM d, yyyy');
  }

  checkOut(): void {
    this.loading = true;
    this.svc.checkOut().subscribe({
      next: (res) => {
        this.loading = false;
        this.checkOutTime = (res.data as { checkOut?: string }).checkOut ?? new Date().toISOString();
      },
      error: () => {
        this.loading = false;
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
          Check In
        </a>
        <a routerLink="/attendance/checkout" class="btn btn-secondary">
          <span class="material-icons" style="font-size:18px">logout</span>
          Check Out
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
    tr.row-late td { background: var(--sidebar-active-bg); }
    tr.row-absent td { background: var(--sidebar-active-bg); }
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
            this.staffService.getAttendance(member._id, { page: 1, limit: 100 }).pipe(
              catchError(() => of({ data: [] as AttendanceRecord[] }))
            )
          )
        ).subscribe({
          next: (responses) => {
            this.records = responses
              .flatMap((response, index) => {
                const member = staff[index];
                return this.normalizeAttendanceRecords(response.data)
                  .filter(record => record.date?.startsWith(month))
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
