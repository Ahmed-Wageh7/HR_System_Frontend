import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Leave, LeavePayload, Role, RoleDeleteResult, RolePayload, RoleQuery, Ticket, TicketQuery, TicketReply, TicketStatusPayload, AuditLog, PayrollReport, AttendanceReport, AttendanceRecord, User } from '../models';

// ── Leave Service ──────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  submit(payload: LeavePayload): Observable<ApiResponse<Leave>> {
    return this.http.post<ApiResponse<Leave>>(`${this.api}/leaves`, payload);
  }

  getMyLeaves(): Observable<ApiResponse<Leave[]>> {
    return this.http.get<ApiResponse<Leave[]>>(`${this.api}/leaves`);
  }

  getMyLeave(id: string): Observable<ApiResponse<Leave>> {
    return this.http.get<ApiResponse<Leave>>(`${this.api}/leaves/${id}`);
  }

  deleteMyLeave(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/leaves/${id}`);
  }

  // Admin
  getAllLeaves(): Observable<ApiResponse<Leave[]>> {
    return this.http.get<ApiResponse<Leave[]>>(`${this.api}/admin/leaves`);
  }

  updateStatus(id: string, status: 'approved' | 'rejected', reviewNote?: string | null): Observable<ApiResponse<Leave>> {
    return this.http.patch<ApiResponse<Leave>>(`${this.api}/admin/leaves/${id}/status`, { status, reviewNote });
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

  create(payload: RolePayload): Observable<ApiResponse<Role>> {
    this._cache$ = undefined;
    return this.http.post<ApiResponse<Role>>(`${this.api}/admin/roles`, payload);
  }

  update(id: string, payload: Partial<RolePayload>): Observable<ApiResponse<Role>> {
    this._cache$ = undefined;
    return this.http.put<ApiResponse<Role>>(`${this.api}/admin/roles/${id}`, payload);
  }

  delete(id: string): Observable<ApiResponse<RoleDeleteResult>> {
    this._cache$ = undefined;
    return this.http.delete<ApiResponse<RoleDeleteResult>>(`${this.api}/admin/roles/${id}`);
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
    return this.http.post<void>(`${this.api}/admin/roles/users/${userId}/roles`, { roleId });
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
    return this.http.post<ApiResponse<Ticket>>(`${this.api}/tickets`, payload);
  }

  getAll(query: TicketQuery = {}): Observable<ApiResponse<Ticket[]>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (key === 'sort' && typeof value === 'string') value = this.normalizeSort(value);
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<ApiResponse<Ticket[]>>(`${this.api}/tickets`, { params });
  }

  getById(id: string): Observable<ApiResponse<Ticket>> {
    return this.http.get<ApiResponse<Ticket>>(`${this.api}/tickets/${id}`);
  }

  reply(id: string, message: string): Observable<ApiResponse<Ticket>> {
    return this.http.post<ApiResponse<Ticket>>(`${this.api}/tickets/${id}/reply`, { message });
  }

  updateStatus(id: string, payload: TicketStatusPayload): Observable<ApiResponse<Ticket>> {
    return this.http.patch<ApiResponse<Ticket>>(`${this.api}/admin/tickets/${id}/status`, payload);
  }

  private normalizeSort(sort: string): string {
    if (sort.includes('_asc') || sort.includes('_desc')) return sort;
    return sort.startsWith('-') ? `${sort.slice(1)}_desc` : `${sort}_asc`;
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

  getPayroll(month: string): Observable<ApiResponse<PayrollReport>> {
    return this.http.get<ApiResponse<PayrollReport>>(`${this.api}/admin/reports/payroll/${month}`);
  }

  getAttendance(month: string): Observable<ApiResponse<AttendanceReport>> {
    return this.http.get<ApiResponse<AttendanceReport>>(`${this.api}/admin/reports/attendance/${month}`);
  }

  getStaffHistory(id: string): Observable<ApiResponse<unknown>> {
    return this.http.get<ApiResponse<unknown>>(`${this.api}/admin/reports/staff/${id}/history`);
  }
}

// ── Attendance Service ──────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  checkIn(): Observable<ApiResponse<AttendanceRecord>> {
    return this.http.post<ApiResponse<AttendanceRecord>>(`${this.api}/staff/checkin`, {});
  }

  checkOut(): Observable<ApiResponse<AttendanceRecord>> {
    return this.http.post<ApiResponse<AttendanceRecord>>(`${this.api}/staff/checkout`, {});
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
    return this.http.put<ApiResponse<User>>(`${this.api}/users/profile`, payload);
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/profile`);
  }

  uploadAvatar(file: File): Observable<unknown> {
    const form = new FormData();
    form.append('avatar', file);
    return this.http.post(`${this.api}/users/upload-avatar`, form);
  }

  deleteAvatar(): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/avatar`);
  }

  restoreUser(id: string): Observable<void> {
    return this.http.patch<void>(`${this.api}/admin/users/${id}/restore`, {});
  }
}

// ── Notification Service ──────────────────────────────────
@Injectable({ providedIn: 'root' })
export class NotificationService {
  // Handled via Socket.io in socket.service.ts
}
