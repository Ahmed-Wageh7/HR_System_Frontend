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
import { CurrencyFormatPipe, DateFormatPipe, TimeAgoPipe } from '../../shared/pipes/pipes';
import { AuthService } from '../../core/services/auth.service';
import { format } from 'date-fns';
import { SocketService } from '../../core/services/socket.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TimeAgoPipe, CurrencyFormatPipe, DateFormatPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly firstName = computed(() => this.auth.currentUser()?.name.split(' ')[0] ?? 'Team');
  readonly hasAdminDashboardAccess = computed(() => this.auth.isAdminLike());
  readonly shouldShowLimitedAccess = computed(() =>
    !!this.auth.currentUser() && !this.hasAdminDashboardAccess()
  );
  private readonly staffService = inject(StaffService);
  private readonly leaveService = inject(LeaveService);
  private readonly reportService = inject(ReportService);
  private readonly auditService = inject(AuditLogService);
  private readonly deptService = inject(DepartmentService);
  readonly socket = inject(SocketService);
  private cachedStaff: Staff[] = [];

  loading = true;
  staffLoading = true;
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
  staffDashboard = {
    attendanceStatus: 'Ready to check in',
    remainingLeaveBalance: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
    recentLeaves: [] as { _id: string; reason: string; status: string; startDate: string; endDate: string }[],
    upcomingPayrollDate: this.getUpcomingPayrollDate(),
    assignedTickets: 0,
    monthlyAttendanceScore: 0,
  };

  private refreshSub?: Subscription;

  ngOnInit(): void {
    this.loadData();
    this.refreshSub = interval(60_000).subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadData(): void {
    if (!this.auth.currentUser() && this.auth.isAuthenticated()) {
      this.loading = true;
      this.auth.loadProfile().subscribe({
        next: () => this.loadData(),
        error: () => { this.loading = false; },
      });
      return;
    }

    if (!this.hasAdminDashboardAccess()) {
      this.loading = false;
      this.loadStaffDashboard();
      return;
    }

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

  loadStaffDashboard(): void {
    this.staffLoading = true;
    this.leaveService.getMyLeaves().pipe(
      timeout(6000),
      catchError(() => of({ data: [] }))
    ).subscribe({
      next: (results) => {
        const leaves = this.normalizeArray<{ _id: string; reason: string; status: string; startDate: string; endDate: string }>(results.data);
        this.staffDashboard = {
          ...this.staffDashboard,
          remainingLeaveBalance: this.currentUserLeaveBalance(),
          pendingLeaves: leaves.filter((leave) => leave.status === 'pending').length,
          approvedLeaves: leaves.filter((leave) => leave.status === 'approved').length,
          rejectedLeaves: leaves.filter((leave) => leave.status === 'rejected').length,
          recentLeaves: leaves.slice(0, 4),
          monthlyAttendanceScore: this.estimateAttendanceScore(leaves),
        };
        this.staffLoading = false;
      },
      error: () => {
        this.staffDashboard = {
          ...this.staffDashboard,
          remainingLeaveBalance: this.currentUserLeaveBalance(),
        };
        this.staffLoading = false;
      },
    });
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

  private currentUserLeaveBalance(): number {
    const user = this.auth.currentUser() as { annualLeaveBalance?: number } | null;
    return user?.annualLeaveBalance ?? 21;
  }

  private estimateAttendanceScore(leaves: { status: string }[]): number {
    const approvedLeaveCount = leaves.filter((leave) => leave.status === 'approved').length;
    return Math.max(72, 96 - approvedLeaveCount * 3);
  }

  private getUpcomingPayrollDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 1, 1);
    date.setDate(0);
    return format(date, 'MMM d, yyyy');
  }
}
