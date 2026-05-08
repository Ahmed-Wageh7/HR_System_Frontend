import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../../core/services/staff.service';
import { ReportService } from '../../core/services/api.services';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { CurrencyFormatPipe, DateFormatPipe } from '../../shared/pipes/pipes';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { format } from 'date-fns';
import { RouterLink } from '@angular/router';
import { PayrollReport, PayrollReportRecord } from '../../core/models';

@Component({
  selector: 'app-salary-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective, CurrencyFormatPipe, DateFormatPipe, ConfirmDialogComponent, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Salary Management</div>
        <div class="page-subtitle">{{ selectedMonth }} payroll overview</div>
      </div>
      <div class="page-actions">
        <input type="month" class="form-control" style="width:180px" [(ngModel)]="selectedMonth" (ngModelChange)="load()">
        <button *hasPermission="'salary:pay'" class="btn btn-success" (click)="bulkConfirmOpen = true">
          <span class="material-icons" style="font-size:16px">payments</span> Bulk Pay All
        </button>
      </div>
    </div>

    <!-- Summary -->
    @if (!loading) {
      <div class="stats-grid mb-16">
        <div class="stat-card stat-info">
          <div class="stat-label">Total Payroll</div>
          <div class="stat-value" style="font-size:20px">{{ report?.totalPayroll | currencyFormat }}</div>
          <div class="stat-icon"><span class="material-icons">account_balance</span></div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-label">Paid</div>
          <div class="stat-value">{{ report?.totalPaid ?? 0 }}</div>
          <div class="stat-icon"><span class="material-icons">check_circle</span></div>
        </div>
        <div class="stat-card stat-danger">
          <div class="stat-label">Unpaid</div>
          <div class="stat-value">{{ report?.totalUnpaid ?? 0 }}</div>
          <div class="stat-icon"><span class="material-icons">pending</span></div>
        </div>
      </div>
    }

    <div class="card" style="padding:0">
      @if (loading) {
        <div style="padding:20px">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="skeleton" style="height:50px;margin-bottom:8px;border-radius:var(--radius-sm)"></div>
          }
        </div>
      } @else if (!records || records.length === 0) {
        <div class="empty-state">
          <span class="material-icons empty-icon">payments</span>
          <div class="empty-title">No salary records for this month</div>
        </div>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Base Salary</th>
              <th>Deductions</th>
              <th>Final Salary</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (r of records; track r.staffId) {
              <tr>
                <td>
                  <div class="fw-semibold" style="font-size:13px">{{ getStaffName(r) }}</div>
                </td>
                <td>{{ getBaseSalary(r) | currencyFormat }}</td>
                <td class="text-danger">
                  -{{ getDeductions(r) | currencyFormat }}
                </td>
                <td class="fw-bold text-accent">{{ getFinalSalary(r) | currencyFormat }}</td>
                <td>
                  @if (isPaid(r)) {
                    <span class="badge badge-success">Paid</span>
                  } @else {
                    <span class="badge badge-warning">Unpaid</span>
                  }
                </td>
                <td>
                  <a [routerLink]="['/staff', getStaffId(r), 'salary']" [queryParams]="{ month: selectedMonth }" class="btn btn-ghost btn-sm">
                    <span class="material-icons" style="font-size:16px">visibility</span>
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <app-confirm-dialog
      [open]="bulkConfirmOpen"
      title="Bulk Pay All Staff"
      [message]="'Mark all ' + (report?.totalUnpaid ?? 0) + ' unpaid salaries as paid for ' + selectedMonth + '?'"
      confirmText="Pay All"
      confirmColor="primary"
      (confirmed)="bulkPay()"
      (cancelled)="bulkConfirmOpen = false"
    />
  `,
  styles: [`.stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}@media(max-width:600px){.stats-grid{grid-template-columns:1fr}}`]
})
export class SalaryOverviewComponent implements OnInit {
  private readonly staffService = inject(StaffService);
  private readonly reportService = inject(ReportService);

  loading = true;
  selectedMonth = format(new Date(), 'yyyy-MM');
  report: PayrollReport | null = null;
  records: PayrollReportRecord[] = [];
  bulkConfirmOpen = false;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.reportService.getPayroll(this.selectedMonth).subscribe({
      next: (res) => {
        this.records = Array.isArray(res.data) ? res.data : [];
        this.report = this.buildPayrollSummary(this.records);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  bulkPay(): void {
    this.staffService.bulkPay(this.selectedMonth).subscribe(() => {
      this.bulkConfirmOpen = false;
      this.load();
    });
  }

  getStaffName(r: PayrollReportRecord): string {
    return r.name ?? '—';
  }

  getStaffId(r: PayrollReportRecord): string {
    return r.staffId ?? '';
  }

  getBaseSalary(r: PayrollReportRecord): number {
    return (r.salary?.finalSalary ?? 0) + (r.salary?.totalDeductions ?? 0) - (r.salary?.adjustments ?? 0);
  }

  getDeductions(r: PayrollReportRecord): number {
    return r.salary?.totalDeductions ?? 0;
  }

  getFinalSalary(r: PayrollReportRecord): number {
    return r.salary?.finalSalary ?? 0;
  }

  isPaid(r: PayrollReportRecord): boolean {
    return !!r.salary?.isPaid;
  }

  private buildPayrollSummary(records: PayrollReportRecord[]): PayrollReport {
    const totalPaid = records.filter(record => record.salary?.isPaid).length;
    const totalPayroll = records.reduce((sum, record) => sum + (record.salary?.finalSalary ?? 0), 0);
    return {
      month: this.selectedMonth,
      totalStaff: records.length,
      totalPaid,
      totalUnpaid: records.length - totalPaid,
      totalPayroll,
      records,
    };
  }
}
