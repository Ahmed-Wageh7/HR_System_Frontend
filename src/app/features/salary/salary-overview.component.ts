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
  templateUrl: './salary-overview.component.html',
  styleUrl: './salary-overview.component.scss'
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
