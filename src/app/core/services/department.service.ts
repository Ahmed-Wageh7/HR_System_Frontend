import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Department, DepartmentDeleteResult, DepartmentQuery } from '../models';
import { showAppToast } from '../utils/toast';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  private _cache$?: Observable<ApiResponse<Department[]>>;

  getAll(query: DepartmentQuery = {}): Observable<ApiResponse<Department[]>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (key === 'sort' && typeof value === 'string') value = this.normalizeSort(value);
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });

    const request$ = this.http.get<ApiResponse<Department[]>>(`${this.api}/admin/departments`, { params });
    if (params.keys().length > 0) {
      return request$;
    }

    if (!this._cache$) {
      this._cache$ = request$.pipe(shareReplay(1));
    }

    return this._cache$;
  }

  getById(id: string): Observable<ApiResponse<Department>> {
    return this.http.get<ApiResponse<Department>>(`${this.api}/admin/departments/${id}`);
  }

  create(payload: { name: string; description?: string }): Observable<ApiResponse<Department>> {
    this.invalidate();
    return this.http.post<ApiResponse<Department>>(`${this.api}/admin/departments`, payload).pipe(
      tap(() => showAppToast('success', 'Department created successfully.'))
    );
  }

  update(id: string, payload: { name?: string; description?: string }): Observable<ApiResponse<Department>> {
    this.invalidate();
    return this.http.put<ApiResponse<Department>>(`${this.api}/admin/departments/${id}`, payload).pipe(
      tap(() => showAppToast('success', 'Department updated successfully.'))
    );
  }

  delete(id: string): Observable<ApiResponse<DepartmentDeleteResult>> {
    this.invalidate();
    return this.http.delete<ApiResponse<DepartmentDeleteResult>>(`${this.api}/admin/departments/${id}`).pipe(
      tap(() => showAppToast('success', 'Department deleted successfully.'))
    );
  }

  restore(id: string): Observable<ApiResponse<Department>> {
    this.invalidate();
    return this.http.patch<ApiResponse<Department>>(`${this.api}/admin/departments/${id}/restore`, {}).pipe(
      tap(() => showAppToast('success', 'Department restored successfully.'))
    );
  }

  private invalidate(): void {
    this._cache$ = undefined;
  }

  private normalizeSort(sort: string): string {
    if (sort.includes('_asc') || sort.includes('_desc')) return sort;
    return sort.startsWith('-') ? `${sort.slice(1)}_desc` : `${sort}_asc`;
  }
}
