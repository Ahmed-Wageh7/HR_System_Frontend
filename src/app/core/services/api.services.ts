import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Leave, LeavePayload, Role, RoleDeleteResult, RolePayload, RoleQuery, Ticket, TicketQuery, TicketReply, TicketStatusPayload, AuditLog, PayrollReport, PayrollReportRecord, AttendanceRecord, User } from '../models';
import { showAppToast } from '../utils/toast';

// ── Leave Service ──────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  submit(payload: LeavePayload): Observable<ApiResponse<Leave>> {
    return this.http.post<ApiResponse<Leave>>(`${this.api}/leaves`, payload).pipe(
      tap(() => showAppToast('success', 'Leave request submitted successfully.'))
    );
  }

  getMyLeaves(): Observable<ApiResponse<Leave[]>> {
    return this.http.get<ApiResponse<Leave[]>>(`${this.api}/leaves`);
  }

  getMyLeave(id: string): Observable<ApiResponse<Leave>> {
    return this.http.get<ApiResponse<Leave>>(`${this.api}/leaves/${id}`);
  }

  updateMyLeave(id: string, payload: LeavePayload): Observable<ApiResponse<Leave>> {
    return this.http.put<ApiResponse<Leave>>(`${this.api}/leaves/${id}`, payload).pipe(
      tap(() => showAppToast('success', 'Leave request updated successfully.'))
    );
  }

  deleteMyLeave(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/leaves/${id}`).pipe(
      tap(() => showAppToast('success', 'Leave request cancelled successfully.'))
    );
  }

  // Admin
  getAllLeaves(): Observable<ApiResponse<Leave[]>> {
    return this.http.get<ApiResponse<Leave[]>>(`${this.api}/admin/leaves`);
  }

  getAdminLeaveById(id: string): Observable<ApiResponse<Leave>> {
    return this.http.get<ApiResponse<Leave>>(`${this.api}/admin/leaves/${id}`);
  }

  updateStatus(id: string, status: 'approved' | 'rejected', reviewNote?: string | null): Observable<ApiResponse<Leave>> {
    return this.http.patch<ApiResponse<Leave>>(`${this.api}/admin/leaves/${id}/status`, { status, reviewNote }).pipe(
      tap(() => showAppToast('success', `Leave request ${status} successfully.`))
    );
  }
}

// ── Role Service ──────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  private _cache$?: Observable<ApiResponse<Role[]>>;

  getAll(query: RoleQuery = {}): Observable<ApiResponse<Role[]>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (key === 'sort' && typeof value === 'string') value = this.normalizeSort(value);
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });

    const request$ = this.http.get<ApiResponse<Role[]>>(`${this.api}/admin/roles`, { params });
    if (params.keys().length > 0) {
      return request$;
    }

    if (!this._cache$) {
      this._cache$ = request$.pipe(shareReplay(1));
    }
    return this._cache$;
  }

  getById(id: string): Observable<ApiResponse<Role>> {
    return this.http.get<ApiResponse<Role>>(`${this.api}/admin/roles/${id}`);
  }

  create(payload: RolePayload): Observable<ApiResponse<Role>> {
    this._cache$ = undefined;
    return this.http.post<ApiResponse<Role>>(`${this.api}/admin/roles`, payload).pipe(
      tap(() => showAppToast('success', 'Role created successfully.'))
    );
  }

  update(id: string, payload: Partial<RolePayload>): Observable<ApiResponse<Role>> {
    this._cache$ = undefined;
    return this.http.put<ApiResponse<Role>>(`${this.api}/admin/roles/${id}`, payload).pipe(
      tap(() => showAppToast('success', 'Role updated successfully.'))
    );
  }

  delete(id: string): Observable<ApiResponse<RoleDeleteResult>> {
    this._cache$ = undefined;
    return this.http.delete<ApiResponse<RoleDeleteResult>>(`${this.api}/admin/roles/${id}`).pipe(
      tap(() => showAppToast('success', 'Role deleted successfully.'))
    );
  }

  addPermissions(id: string, permissions: string[]): Observable<ApiResponse<Role>> {
    this._cache$ = undefined;
    return this.http.post<ApiResponse<Role>>(`${this.api}/admin/roles/${id}/permissions`, { permissions });
  }

  removePermissions(id: string, permissions: string[]): Observable<ApiResponse<Role>> {
    this._cache$ = undefined;
    return this.http.delete<ApiResponse<Role>>(`${this.api}/admin/roles/${id}/permissions`, { body: { permissions } });
  }

  assignRoleToUser(userId: string, roleId: string): Observable<void> {
    return this.http.post<void>(`${this.api}/admin/roles/users/${userId}/roles`, { roleId }).pipe(
      tap(() => showAppToast('success', 'Role assigned successfully.'))
    );
  }

  private normalizeSort(sort: string): string {
    if (sort.includes('_asc') || sort.includes('_desc')) return sort;
    return sort.startsWith('-') ? `${sort.slice(1)}_desc` : `${sort}_asc`;
  }
}

// ── Ticket Service ──────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  create(payload: { subject: string; description: string }): Observable<ApiResponse<Ticket>> {
    return this.http.post<ApiResponse<Ticket>>(`${this.api}/tickets`, payload).pipe(
      tap(() => showAppToast('success', 'Ticket created successfully.'))
    );
  }

  getMyTickets(query: TicketQuery = {}): Observable<ApiResponse<Ticket[]>> {
    return this.http.get<ApiResponse<Ticket[]>>(`${this.api}/tickets`, { params: this.buildParams(query) });
  }

  getAll(query: TicketQuery = {}): Observable<ApiResponse<Ticket[]>> {
    return this.getMyTickets(query);
  }

  getById(id: string): Observable<ApiResponse<Ticket>> {
    return this.http.get<ApiResponse<Ticket>>(`${this.api}/tickets/${id}`);
  }

  reply(id: string, message: string): Observable<ApiResponse<Ticket>> {
    return this.http.post<ApiResponse<Ticket>>(`${this.api}/tickets/${id}/reply`, { message }).pipe(
      tap(() => showAppToast('success', 'Reply sent successfully.'))
    );
  }

  updateStatus(id: string, payload: TicketStatusPayload): Observable<ApiResponse<Ticket>> {
    return this.http.patch<ApiResponse<Ticket>>(`${this.api}/admin/tickets/${id}/status`, payload).pipe(
      tap(() => showAppToast('success', 'Ticket status updated successfully.'))
    );
  }

  private normalizeSort(sort: string): string {
    if (sort.includes('_asc') || sort.includes('_desc')) return sort;
    return sort.startsWith('-') ? `${sort.slice(1)}_desc` : `${sort}_asc`;
  }

  private buildParams(query: TicketQuery): HttpParams {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (key === 'sort' && typeof value === 'string') value = this.normalizeSort(value);
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return params;
  }
}

// ── Audit Log Service ──────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getAll(): Observable<ApiResponse<AuditLog[]>> {
    return this.http.get<ApiResponse<AuditLog[]>>(`${this.api}/admin/audit-logs`);
  }

  getByUser(userId: string): Observable<ApiResponse<AuditLog[]>> {
    return this.http.get<ApiResponse<AuditLog[]>>(`${this.api}/admin/audit-logs/user/${userId}`);
  }

  getByResource(resource: string): Observable<ApiResponse<AuditLog[]>> {
    return this.http.get<ApiResponse<AuditLog[]>>(`${this.api}/admin/audit-logs/resource/${resource}`);
  }
}

// ── Report Service ──────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  private readonly fallbackApi = this.api.replace(/\/api\/v\d+$/, '/api');

  getPayrollReport(): Observable<ApiResponse<PayrollReport>> {
    return this.requestWithVersionFallback<PayrollReport>('/admin/reports/payroll');
  }

  getPayroll(month: string): Observable<ApiResponse<PayrollReportRecord[]>> {
    return this.requestWithVersionFallback<PayrollReportRecord[]>(`/admin/reports/payroll/${month}`);
  }

  getAttendance(month: string): Observable<ApiResponse<AttendanceRecord[]>> {
    return this.requestWithVersionFallback<AttendanceRecord[]>(`/admin/reports/attendance/${month}`);
  }

  getStaffHistory(id: string): Observable<ApiResponse<unknown>> {
    return this.requestWithVersionFallback<unknown>(`/admin/reports/staff/${id}/history`);
  }

  private requestWithVersionFallback<T>(path: string): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.api}${path}`).pipe(
      catchError((err: HttpErrorResponse) => {
        if (!this.shouldFallback(err)) {
          return throwError(() => err);
        }
        return this.http.get<ApiResponse<T>>(`${this.fallbackApi}${path}`);
      })
    );
  }

  private shouldFallback(err: HttpErrorResponse): boolean {
    if (this.fallbackApi === this.api) return false;
    const message = String(err.error?.message ?? '');
    return err.status === 404 || message.includes('API version v1 does not exist');
  }
}

// ── Attendance Service ──────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  checkIn(): Observable<ApiResponse<AttendanceRecord>> {
    return this.http.post<ApiResponse<AttendanceRecord>>(`${this.api}/staff/checkin`, {}).pipe(
      tap(() => showAppToast('success', 'Checked in successfully.'))
    );
  }

  checkOut(): Observable<ApiResponse<AttendanceRecord>> {
    return this.http.post<ApiResponse<AttendanceRecord>>(`${this.api}/staff/checkout`, {}).pipe(
      tap(() => showAppToast('success', 'Checked out successfully.'))
    );
  }
}

// ── User Profile Service ──────────────────────────────────
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getProfile(): Observable<ApiResponse<unknown>> {
    return this.http.get<ApiResponse<unknown>>(`${this.api}/users/profile`);
  }

  updateProfile(payload: { name: string; phone?: string | null }): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.api}/users/profile`, payload).pipe(
      tap(() => showAppToast('success', 'Profile updated successfully.'))
    );
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/profile`).pipe(
      tap(() => showAppToast('success', 'Account deleted successfully.'))
    );
  }

  uploadAvatar(file: File): Observable<unknown> {
    const form = new FormData();
    form.append('avatar', file);
    return this.http.post(`${this.api}/users/upload-avatar`, form).pipe(
      tap(() => showAppToast('success', 'Profile photo updated successfully.'))
    );
  }

  deleteAvatar(): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/avatar`).pipe(
      tap(() => showAppToast('success', 'Profile photo deleted successfully.'))
    );
  }

  restoreUser(id: string): Observable<void> {
    return this.http.patch<void>(`${this.api}/admin/users/${id}/restore`, {}).pipe(
      tap(() => showAppToast('success', 'User restored successfully.'))
    );
  }
}

// ── Notification Service ──────────────────────────────────
@Injectable({ providedIn: 'root' })
export class NotificationService {
  // Handled via Socket.io in socket.service.ts
}
