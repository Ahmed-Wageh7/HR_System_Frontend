import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActionMessage, ApiResponse, AttendanceRecord, AttendanceSummary, Deduction, DeductionPayload, Pagination, SalaryRecord, Staff, StaffAttendanceQuery, StaffCreatePayload, StaffDocument, StaffUpdatePayload } from '../models';
import { showAppToast } from '../utils/toast';

export interface StaffQuery {
  page?: number;
  limit?: number;
  sort?: string;
  department?: string;
  search?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  readonly staffList = signal<Staff[]>([]);
  readonly isLoading = signal(false);
  readonly pagination = signal<Pagination | null>(null);

  getAll(query: StaffQuery = {}): Observable<ApiResponse<Staff[]>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (k === 'sort' && typeof v === 'string') v = this.normalizeSort(v);
      if (v !== undefined && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<ApiResponse<Staff[]>>(`${this.api}/admin/staff`, { params }).pipe(
      tap(res => {
        this.staffList.set(res.data);
        if (res.pagination) this.pagination.set(res.pagination);
      })
    );
  }

  getById(id: string): Observable<ApiResponse<Staff>> {
    return this.http.get<ApiResponse<Staff>>(`${this.api}/admin/staff/${id}`);
  }

  create(payload: StaffCreatePayload): Observable<ApiResponse<Staff>> {
    return this.http.post<ApiResponse<Staff>>(`${this.api}/admin/staff`, payload).pipe(
      tap(() => {
        this.invalidateCache();
        showAppToast('success', 'Staff member created successfully.');
      })
    );
  }

  update(id: string, payload: StaffUpdatePayload): Observable<ApiResponse<Staff>> {
    return this.http.put<ApiResponse<Staff>>(`${this.api}/admin/staff/${id}`, payload).pipe(
      tap(() => {
        this.invalidateCache();
        showAppToast('success', 'Staff member updated successfully.');
      })
    );
  }

  delete(id: string): Observable<ApiResponse<Partial<Staff>>> {
    return this.http.delete<ApiResponse<Partial<Staff>>>(`${this.api}/admin/staff/${id}`).pipe(
      tap(() => {
        this.invalidateCache();
        showAppToast('success', 'Staff member deleted successfully.');
      })
    );
  }

  restore(id: string): Observable<ApiResponse<Partial<Staff>>> {
    return this.http.patch<ApiResponse<Partial<Staff>>>(`${this.api}/admin/staff/${id}/restore`, {}).pipe(
      tap(() => {
        this.invalidateCache();
        showAppToast('success', 'Staff member restored successfully.');
      })
    );
  }

  getAttendance(id: string, query: StaffAttendanceQuery = {}): Observable<ApiResponse<AttendanceRecord[]>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<ApiResponse<AttendanceRecord[]>>(`${this.api}/admin/staff/${id}/attendance`, { params });
  }

  getAttendanceByMonth(id: string, month: string): Observable<ApiResponse<AttendanceSummary>> {
    return this.http.get<ApiResponse<AttendanceSummary>>(`${this.api}/admin/staff/${id}/attendance/${month}`);
  }

  getSalaryByMonth(id: string, month: string): Observable<ApiResponse<SalaryRecord>> {
    return this.http.get<ApiResponse<SalaryRecord>>(`${this.api}/admin/staff/${id}/salary/${month}`);
  }

  paySalary(id: string, month: string): Observable<ApiResponse<SalaryRecord>> {
    return this.http.post<ApiResponse<SalaryRecord>>(`${this.api}/admin/staff/${id}/salary/${month}/pay`, {}).pipe(
      tap(() => showAppToast('success', 'Salary paid successfully.'))
    );
  }

  adjustSalary(id: string, month: string, adjustments: number): Observable<ApiResponse<ActionMessage>> {
    return this.http.put<ApiResponse<ActionMessage>>(`${this.api}/admin/staff/${id}/salary/${month}/adjust`, { adjustments }).pipe(
      tap(() => showAppToast('success', 'Salary adjustment saved successfully.'))
    );
  }

  bulkPay(month: string): Observable<ApiResponse<ActionMessage>> {
    return this.http.post<ApiResponse<ActionMessage>>(`${this.api}/admin/staff/salary/${month}/bulk-pay`, {}).pipe(
      tap(() => showAppToast('success', 'Bulk salary payment completed successfully.'))
    );
  }

  getDeductions(id: string): Observable<ApiResponse<Deduction[]>> {
    return this.http.get<ApiResponse<Deduction[]>>(`${this.api}/admin/staff/${id}/deductions`);
  }

  addDeduction(id: string, payload: DeductionPayload): Observable<ApiResponse<Deduction>> {
    return this.http.post<ApiResponse<Deduction>>(`${this.api}/admin/staff/${id}/deductions`, payload).pipe(
      tap(() => showAppToast('success', 'Deduction added successfully.'))
    );
  }

  updateDeduction(staffId: string, did: string, payload: DeductionPayload): Observable<ApiResponse<Deduction>> {
    return this.http.put<ApiResponse<Deduction>>(`${this.api}/admin/staff/${staffId}/deductions/${did}`, payload).pipe(
      tap(() => showAppToast('success', 'Deduction updated successfully.'))
    );
  }

  deleteDeduction(staffId: string, did: string): Observable<ApiResponse<ActionMessage>> {
    return this.http.delete<ApiResponse<ActionMessage>>(`${this.api}/admin/staff/${staffId}/deductions/${did}`).pipe(
      tap(() => showAppToast('success', 'Deduction deleted successfully.'))
    );
  }

  uploadDocument(id: string, file: File): Observable<ApiResponse<StaffDocument>> {
    const form = new FormData();
    form.append('document', file);
    return this.http.post<ApiResponse<StaffDocument>>(`${this.api}/admin/staff/${id}/documents`, form).pipe(
      tap(() => showAppToast('success', 'Document uploaded successfully.'))
    );
  }

  deleteDocument(staffId: string, docId: string): Observable<ApiResponse<ActionMessage>> {
    return this.http.delete<ApiResponse<ActionMessage>>(`${this.api}/admin/staff/${staffId}/documents/${docId}`).pipe(
      tap(() => showAppToast('success', 'Document deleted successfully.'))
    );
  }

  uploadAvatar(file: File): Observable<unknown> {
    const form = new FormData();
    form.append('avatar', file);
    return this.http.post(`${this.api}/users/upload-avatar`, form);
  }

  private invalidateCache(): void {
    this.staffList.set([]);
    this.pagination.set(null);
  }

  private normalizeSort(sort: string): string {
    if (sort.includes('_asc') || sort.includes('_desc')) return sort;
    return sort.startsWith('-') ? `${sort.slice(1)}_desc` : `${sort}_asc`;
  }
}
