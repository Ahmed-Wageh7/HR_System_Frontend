import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { format } from 'date-fns';
import { PayrollReport, PayrollReportRecord } from '../../core/models';
import { ReportService } from '../../core/services/api.services';
import { CurrencyFormatPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-payroll-report',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe, FormsModule, RouterLink],
  templateUrl: './payroll-report.component.html',
  styleUrl: './payroll-report.component.scss',
})
export class PayrollReportComponent implements OnInit {
  private readonly reportService = inject(ReportService);

  loading = true;
  selectedMonth = format(new Date(), 'yyyy-MM');
  report: PayrollReport | null = null;
  records: PayrollReportRecord[] = [];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.reportService.getPayroll(this.selectedMonth).subscribe({
      next: (res) => {
        this.records = Array.isArray(res.data) ? res.data : [];
        this.report = this.buildPayrollSummary(this.records);
        this.loading = false;
      },
      error: () => {
        this.records = [];
        this.report = this.buildPayrollSummary([]);
        this.loading = false;
      },
    });
  }

  getStaffName(record: PayrollReportRecord): string {
    return record.name ?? '-';
  }

  getStaffId(record: PayrollReportRecord): string {
    return record.staffId ?? '';
  }

  getFinalSalary(record: PayrollReportRecord): number {
    return record.salary?.finalSalary ?? 0;
  }

  isPaid(record: PayrollReportRecord): boolean {
    return !!record.salary?.isPaid;
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
