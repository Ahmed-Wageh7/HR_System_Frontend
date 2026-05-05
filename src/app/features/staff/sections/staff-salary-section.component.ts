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
  template: `
    <div class="section-stack">
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-title">Monthly Salary</div>
            <div class="section-subtitle">Salary calculation, payment, adjustment, and bulk payroll in one place.</div>
          </div>
          <input type="month" class="form-control month-input" [(ngModel)]="selectedMonth" (ngModelChange)="loadSalary()">
        </div>

        @if (loading) {
          <div class="section-loading"><div class="spinner" style="width:26px;height:26px"></div></div>
        } @else if (!salary) {
          <div class="empty-state compact-empty">
            <span class="material-icons empty-icon">payments</span>
            <div class="empty-title">No salary data for this month</div>
          </div>
        } @else {
          <div class="salary-grid">
            <div class="metric-card">
              <span class="metric-label">Worked Days</span>
              <strong>{{ salary.totalDaysWorked ?? 0 }}</strong>
            </div>
            <div class="metric-card">
              <span class="metric-label">Late Days</span>
              <strong>{{ salary.lateDays ?? 0 }}</strong>
            </div>
            <div class="metric-card">
              <span class="metric-label">Absent Days</span>
              <strong>{{ salary.absentDays ?? 0 }}</strong>
            </div>
            <div class="metric-card">
              <span class="metric-label">Total Deductions</span>
              <strong>{{ (salary.totalDeductions ?? 0) | currencyFormat }}</strong>
            </div>
            <div class="metric-card">
              <span class="metric-label">Adjustments</span>
              <strong>{{ salary.adjustments | currencyFormat }}</strong>
            </div>
            <div class="metric-card metric-card-highlight">
              <span class="metric-label">Final Salary</span>
              <strong>{{ salary.finalSalary | currencyFormat }}</strong>
            </div>
          </div>

          <div class="salary-actions">
            @if (salary.isPaid) {
              <span class="badge badge-success salary-status">Paid {{ salary.paidAt ? (salary.paidAt | dateFormat:'MMM d, yyyy') : '' }}</span>
            } @else {
              <span class="badge badge-warning salary-status">Not Paid Yet</span>
              <button *hasPermission="'salary:pay'" class="btn btn-success" (click)="payConfirmOpen = true">
                <span class="material-icons" style="font-size:16px">payments</span>
                Pay This Salary
              </button>
            }

            <button *hasPermission="'salary:adjust'" class="btn btn-secondary" (click)="adjustOpen = !adjustOpen">
              <span class="material-icons" style="font-size:16px">tune</span>
              Adjust Salary
            </button>

            <button *hasPermission="'salary:pay'" class="btn btn-primary" (click)="bulkConfirmOpen = true">
              <span class="material-icons" style="font-size:16px">sync_alt</span>
              Pull Pay For Month
            </button>
          </div>

          @if (adjustOpen) {
            <div class="adjust-panel">
              <input type="number" class="form-control" placeholder="Adjustment amount" [(ngModel)]="adjustments">
              <button class="btn btn-primary" (click)="saveAdjustment()">Save Adjustment</button>
              <button class="btn btn-ghost" (click)="adjustOpen = false">Cancel</button>
            </div>
          }
        }
      </div>
    </div>

    <app-confirm-dialog
      [open]="payConfirmOpen"
      title="Pay Staff Salary"
      [message]="'Mark salary for ' + selectedMonth + ' as paid?'"
      confirmText="Pay Salary"
      confirmColor="primary"
      (confirmed)="paySalary()"
      (cancelled)="payConfirmOpen = false"
    />

    <app-confirm-dialog
      [open]="bulkConfirmOpen"
      title="Pull Pay Staff Salary"
      [message]="'Queue salary payment for all staff for ' + selectedMonth + '?'"
      confirmText="Queue Payroll"
      confirmColor="primary"
      (confirmed)="bulkPay()"
      (cancelled)="bulkConfirmOpen = false"
    />
  `,
  styles: [`
    .section-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-header,
    .salary-actions,
    .adjust-panel {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .section-header {
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
    }

    .section-subtitle {
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 4px;
    }

    .month-input {
      width: 180px;
    }

    .salary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .metric-card {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
      background: var(--bg-elevated);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .metric-card-highlight {
      background: linear-gradient(135deg, rgba(22, 163, 74, 0.18), rgba(31, 143, 255, 0.12)), var(--bg-elevated);
      border-color: rgba(34, 197, 94, 0.35);
    }

    .metric-label {
      color: var(--text-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .salary-status {
      padding: 10px 16px;
      font-size: 12px;
    }

    .adjust-panel {
      margin-top: 18px;
      padding: 16px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.02);
      justify-content: flex-start;
    }

    .adjust-panel .form-control {
      width: 220px;
    }

    .section-loading {
      min-height: 180px;
      display: grid;
      place-items: center;
    }

    .compact-empty {
      padding: 28px 18px;
    }

    @media (max-width: 860px) {
      .salary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .month-input,
      .adjust-panel .form-control {
        width: 100%;
      }

      .salary-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class StaffSalarySectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly staffService = inject(StaffService);

  staffId = '';
  selectedMonth = format(new Date(), 'yyyy-MM');
  salary: SalaryRecord | null = null;
  loading = true;
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
    this.staffService.paySalary(this.staffId, this.selectedMonth).subscribe({
      next: (response) => {
        this.salary = response.data;
        this.payConfirmOpen = false;
      },
      error: () => {
        this.payConfirmOpen = false;
      },
    });
  }

  saveAdjustment(): void {
    if (!this.staffId) return;
    this.staffService.adjustSalary(this.staffId, this.selectedMonth, this.adjustments).subscribe(() => {
      this.adjustOpen = false;
      this.loadSalary();
    });
  }

  bulkPay(): void {
    this.staffService.bulkPay(this.selectedMonth).subscribe(() => {
      this.bulkConfirmOpen = false;
      this.loadSalary();
    });
  }
}
