import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, interval, of, Subscription, timeout } from 'rxjs';
import { StaffService } from '../../core/services/staff.service';
import { LeaveService } from '../../core/services/api.services';
import { ReportService } from '../../core/services/api.services';
import { AuditLogService } from '../../core/services/api.services';
import { DepartmentService } from '../../core/services/department.service';
import { AttendanceRecord, AttendanceReport, Department, Staff } from '../../core/models';
import { TimeAgoPipe } from '../../shared/pipes/pipes';
import { CurrencyFormatPipe } from '../../shared/pipes/pipes';
import { AuthService } from '../../core/services/auth.service';
import { format } from 'date-fns';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TimeAgoPipe, CurrencyFormatPipe],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle">{{ today }} - Welcome back, {{ firstName() }}</div>
      </div>
      <button class="btn btn-secondary" (click)="loadData()" [disabled]="loading">
        <span class="material-icons" style="font-size:16px" [class.spin]="loading">refresh</span>
        Refresh
      </button>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      @if (loading) {
        @for (i of [1,2,3,4,5,6]; track i) {
          <div class="skeleton skeleton-card" style="height:100px"></div>
        }
      } @else {
        <div class="stat-card stat-info" routerLink="/staff">
          <div class="stat-label">Total Staff</div>
          <div class="stat-value">{{ stats.totalStaff }}</div>
          <div class="stat-icon"><span class="material-icons">people</span></div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-label">Present Today</div>
          <div class="stat-value">{{ stats.presentToday }}</div>
          <div class="stat-icon"><span class="material-icons">check_circle</span></div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-label">Late Today</div>
          <div class="stat-value">{{ stats.lateToday }}</div>
          <div class="stat-icon"><span class="material-icons">schedule</span></div>
        </div>
        <div class="stat-card stat-danger">
          <div class="stat-label">Absent Today</div>
          <div class="stat-value">{{ stats.absentToday }}</div>
          <div class="stat-icon"><span class="material-icons">person_off</span></div>
        </div>
        <div class="stat-card stat-warning" routerLink="/leaves">
          <div class="stat-label">Pending Leaves</div>
          <div class="stat-value">{{ stats.pendingLeaves }}</div>
          <div class="stat-icon"><span class="material-icons">beach_access</span></div>
        </div>
        <div class="stat-card stat-info" routerLink="/salary">
          <div class="stat-label">Unpaid Salaries</div>
          <div class="stat-value">{{ stats.unpaidSalaries }}</div>
          <div class="stat-icon"><span class="material-icons">payments</span></div>
        </div>
      }
    </div>

    <div class="dashboard-bottom">
      <!-- Recent Audit Logs -->
      <div class="card">
        <div class="flex items-center justify-between mb-16">
          <div class="fw-bold">Recent Activity</div>
          <a routerLink="/audit-logs" class="btn btn-ghost" style="font-size:12px;padding:4px 10px">View all</a>
        </div>
        @if (loading) {
          @for (i of [1,2,3,4,5]; track i) {
            <div class="skeleton skeleton-text mb-8"></div>
          }
        } @else if (auditLogs.length === 0) {
          <div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">No recent activity</div>
        } @else {
          <div class="audit-list">
            @for (log of auditLogs.slice(0, 5); track log._id) {
              <div class="audit-row">
                <div class="audit-info">
                  <span class="audit-action">{{ log.action }}</span>
                  <span class="audit-resource">{{ log.resource }}</span>
                </div>
                <div class="audit-meta">
                  <span class="badge" [class.badge-success]="log.status === 'success'" [class.badge-danger]="log.status === 'fail'">{{ log.status }}</span>
                  <span class="text-muted" style="font-size:11px">{{ log.createdAt | timeAgo }}</span>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Department Breakdown -->
      <div class="card">
        <div class="fw-bold mb-16">Department Breakdown</div>
        @if (loading) {
          <div class="skeleton skeleton-card"></div>
        } @else {
          <div class="dept-list">
            @for (dept of departments; track dept._id) {
              <div class="dept-row">
                <div class="dept-name">{{ dept.name }}</div>
                <div class="dept-bar-wrap">
                  <div class="dept-bar" [style.width.%]="getDeptPercent(dept.staffCount || 0)"></div>
                </div>
                <div class="dept-count">{{ dept.staffCount || 0 }}</div>
              </div>
            }
            @if (departments.length === 0) {
              <div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">No departments found</div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card { cursor: pointer; }

    .dashboard-bottom {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 768px) {
      .dashboard-bottom { grid-template-columns: 1fr; }
    }

    .audit-list { display: flex; flex-direction: column; gap: 8px; }
    .audit-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 12px; background: var(--bg-elevated); border-radius: var(--radius-sm);
      font-size: 13px;
    }
    .audit-info { display: flex; flex-direction: column; gap: 2px; }
    .audit-action { font-weight: 600; text-transform: capitalize; }
    .audit-resource { color: var(--text-muted); font-size: 11px; }
    .audit-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }

    .dept-list { display: flex; flex-direction: column; gap: 12px; }
    .dept-row { display: flex; align-items: center; gap: 12px; }
    .dept-name { width: 120px; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dept-bar-wrap { flex: 1; height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; }
    .dept-bar { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.5s ease; }
    .dept-count { width: 30px; text-align: right; font-size: 13px; color: var(--text-secondary); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly firstName = computed(() => this.auth.currentUser()?.name.split(' ')[0] ?? 'Team');
  private readonly staffService = inject(StaffService);
  private readonly leaveService = inject(LeaveService);
  private readonly reportService = inject(ReportService);
  private readonly auditService = inject(AuditLogService);
  private readonly deptService = inject(DepartmentService);
  private cachedStaff: Staff[] = [];

  loading = true;
  today = format(new Date(), 'EEEE, MMMM d, yyyy');
  currentMonth = format(new Date(), 'yyyy-MM');

  stats = {
    totalStaff: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    pendingLeaves: 0,
    unpaidSalaries: 0,
  };

  auditLogs: { _id: string; action: string; resource: string; status: string; createdAt: string }[] = [];
  departments: { _id: string; name: string; staffCount?: number }[] = [];

  private refreshSub?: Subscription;

  ngOnInit(): void {
    this.loadData();
    this.refreshSub = interval(60_000).subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadData(): void {
    this.loading = true;
    this.auditLogs = [];
    this.departments = [];
    this.stats = {
      totalStaff: 0,
      presentToday: 0,
      lateToday: 0,
      absentToday: 0,
      pendingLeaves: 0,
      unpaidSalaries: 0,
    };

    this.staffService.getAll({ limit: 500 }).pipe(
      timeout(8000),
      catchError(() => of({ data: [] as Staff[], pagination: { total: 0 } }))
    ).subscribe({
      next: (results) => {
        const staff = this.normalizeArray<Staff>(results.data);
        this.cachedStaff = staff;
        this.stats = {
          ...this.stats,
          totalStaff: results.pagination?.total ?? staff.length,
        };
        this.loading = false;
        this.loadAttendanceFallback(staff);
        this.loadDepartments(staff);
      },
      error: () => {
        this.cachedStaff = [];
        this.loading = false;
      }
    });

    this.loadLeaves();
    this.loadAuditLogs();
    this.loadPayroll();
  }

  private loadAttendanceFallback(staff: Staff[]): void {
    if (staff.length === 0) {
      return;
    }

    forkJoin(
      staff.map(member =>
        this.staffService.getAttendance(member._id, { page: 1, limit: 100 }).pipe(
          timeout(6000),
          catchError(() => of({ data: [] as AttendanceRecord[] }))
        )
      )
    ).subscribe({
      next: (responses) => {
        const todayRecords = responses
          .flatMap(response => this.normalizeAttendanceRecords(response.data))
          .filter(record => record.date?.startsWith(this.currentMonth))
          .filter(record => record.date?.startsWith(format(new Date(), 'yyyy-MM-dd')));

        this.stats.presentToday = todayRecords.filter(record => !record.isAbsent).length;
        this.stats.lateToday = todayRecords.filter(record => record.isLate).length;
        const recordedAbsences = todayRecords.filter(record => record.isAbsent).length;
        this.stats.absentToday = Math.max(recordedAbsences, staff.length - this.stats.presentToday);
      },
      error: () => {}
    });
  }

  private loadLeaves(): void {
    this.leaveService.getAllLeaves().pipe(
      timeout(6000),
      catchError(() => of({ data: [] }))
    ).subscribe(results => {
      const leaves = this.normalizeArray<{ status: string }>(results.data);
      this.stats.pendingLeaves = leaves.filter((leave) => leave.status === 'pending').length;
    });
  }

  private loadAuditLogs(): void {
    this.auditService.getAll().pipe(
      timeout(6000),
      catchError(() => of({ data: [] }))
    ).subscribe(results => {
      this.auditLogs = this.normalizeArray<{ _id: string; action: string; resource: string; status: string; createdAt: string }>(results.data);
    });
  }

  private loadDepartments(staff: Staff[]): void {
    this.deptService.getAll().pipe(
      timeout(6000),
      catchError(() => of({ data: [] }))
    ).subscribe(results => {
      this.departments = this.withDepartmentCounts(this.normalizeDepartments(results.data), staff);
    });
  }

  private loadPayroll(): void {
    this.reportService.getPayroll(this.currentMonth).pipe(
      timeout(6000),
      catchError(() => of({ data: null }))
    ).subscribe(results => {
      const payroll = results.data;
      if (payroll && typeof payroll === 'object') {
        this.stats.unpaidSalaries = (payroll as { totalUnpaid?: number }).totalUnpaid ?? 0;
      }
    });
  }

  private normalizeAttendanceRecords(data: unknown): AttendanceRecord[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      const candidate = (data as { records?: unknown }).records;
      if (Array.isArray(candidate)) return candidate as AttendanceRecord[];
    }
    return [];
  }

  private normalizeArray<T>(data: unknown): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === 'object') {
      const candidate = (data as { records?: unknown; items?: unknown; data?: unknown }).records
        ?? (data as { records?: unknown; items?: unknown; data?: unknown }).items
        ?? (data as { records?: unknown; items?: unknown; data?: unknown }).data;
      if (Array.isArray(candidate)) return candidate as T[];
    }
    return [];
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

  private withDepartmentCounts(departments: Department[], staff: Staff[]): Department[] {
    const counts = new Map<string, number>();
    for (const member of staff) {
      const deptId = member.department?._id;
      if (!deptId) continue;
      counts.set(deptId, (counts.get(deptId) ?? 0) + 1);
    }

    return departments.map(dept => ({
      ...dept,
      staffCount: dept.staffCount ?? counts.get(dept._id) ?? 0,
    }));
  }

  getDeptPercent(count: number): number {
    const max = Math.max(...this.departments.map(d => d.staffCount || 0), 1);
    return (count / max) * 100;
  }
}
