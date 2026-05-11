import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { format } from 'date-fns';
import { SalaryRecord } from '../../../core/models';
import { StaffService } from '../../../core/services/staff.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { CurrencyFormatPipe, DateFormatPipe } from '../../../shared/pipes/pipes';

@Component({
  selector: 'app-staff-salary-section',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective, CurrencyFormatPipe, DateFormatPipe, ConfirmDialogComponent],
  templateUrl: './staff-salary-section.component.html',
  styleUrl: './staff-salary-section.component.scss',
})
export class StaffSalarySectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly staffService = inject(StaffService);

  staffId = '';
  selectedMonth = format(new Date(), 'yyyy-MM');
  salary: SalaryRecord | null = null;
  loading = true;
  actionLoading = false;
  payConfirmOpen = false;
  bulkConfirmOpen = false;
  adjustOpen = false;
  adjustments = 0;

  ngOnInit(): void {
    this.staffId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.selectedMonth = this.route.snapshot.queryParamMap.get('month') ?? this.selectedMonth;

    if (!this.staffId) {
      this.loading = false;
      return;
    }

    this.loadSalary();
  }

  loadSalary(): void {
    if (!this.staffId) return;
    this.loading = true;
    this.staffService.getSalaryByMonth(this.staffId, this.selectedMonth).subscribe({
      next: (response) => {
        this.salary = response.data;
        this.adjustments = response.data.adjustments ?? 0;
        this.loading = false;
      },
      error: () => {
        this.salary = null;
        this.loading = false;
      },
    });
  }

  paySalary(): void {
    if (!this.staffId) return;
    this.actionLoading = true;
    this.staffService.paySalary(this.staffId, this.selectedMonth).subscribe({
      next: (response) => {
        this.salary = response.data;
        this.payConfirmOpen = false;
        this.actionLoading = false;
      },
      error: () => {
        this.payConfirmOpen = false;
        this.actionLoading = false;
      },
    });
  }

  saveAdjustment(): void {
    if (!this.staffId) return;
    this.actionLoading = true;
    this.staffService.adjustSalary(this.staffId, this.selectedMonth, this.adjustments).subscribe(() => {
      this.adjustOpen = false;
      this.actionLoading = false;
      this.loadSalary();
    }, () => {
      this.actionLoading = false;
    });
  }

  bulkPay(): void {
    this.actionLoading = true;
    this.staffService.bulkPay(this.selectedMonth).subscribe(() => {
      this.bulkConfirmOpen = false;
      this.actionLoading = false;
      this.loadSalary();
    }, () => {
      this.bulkConfirmOpen = false;
      this.actionLoading = false;
    });
  }
}
