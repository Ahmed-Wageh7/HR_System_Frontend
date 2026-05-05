import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { format } from 'date-fns';
import { AttendanceRecord, AttendanceSummary } from '../../../core/models';
import { StaffService } from '../../../core/services/staff.service';
import { DateFormatPipe } from '../../../shared/pipes/pipes';

@Component({
  selector: 'app-staff-attendance-section',
  standalone: true,
  imports: [CommonModule, FormsModule, DateFormatPipe],
  template: `
    <div class="section-stack">
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-title">Attendance by Month</div>
            <div class="section-subtitle">Monthly summary from the dedicated month endpoint.</div>
          </div>
          <input type="month" class="form-control month-input" [(ngModel)]="selectedMonth" (ngModelChange)="loadSummary()">
        </div>

        @if (summaryLoading) {
          <div class="section-loading"><div class="spinner" style="width:26px;height:26px"></div></div>
        } @else if (summary) {
          <div class="summary-grid">
            <div class="metric-card">
              <span class="metric-label">Worked Days</span>
              <strong>{{ summary.totalDays }}</strong>
            </div>
            <div class="metric-card">
              <span class="metric-label">Late Days</span>
              <strong>{{ summary.lateDays }}</strong>
            </div>
            <div class="metric-card">
              <span class="metric-label">Absent Days</span>
              <strong>{{ summary.absentDays }}</strong>
            </div>
            <div class="metric-card">
              <span class="metric-label">Hours Worked</span>
              <strong>{{ summary.hoursWorked | number:'1.1-1' }}</strong>
            </div>
          </div>
        }
      </div>

      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-title">Attendance History</div>
            <div class="section-subtitle">Full attendance records from the history endpoint.</div>
          </div>
        </div>

        @if (recordsLoading) {
          <div class="section-loading"><div class="spinner" style="width:26px;height:26px"></div></div>
        } @else if (records.length === 0) {
          <div class="empty-state compact-empty">
            <span class="material-icons empty-icon">event_busy</span>
            <div class="empty-title">No attendance records found</div>
          </div>
        } @else {
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Deduction</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (record of records; track record._id) {
                  <tr>
                    <td>{{ record.date | dateFormat }}</td>
                    <td>{{ record.checkIn ? (record.checkIn | dateFormat:'HH:mm') : '—' }}</td>
                    <td>{{ record.checkOut ? (record.checkOut | dateFormat:'HH:mm') : '—' }}</td>
                    <td>{{ getWorkingHours(record) | number:'1.1-1' }}</td>
                    <td>{{ record.deductionAmount ?? 0 | number:'1.0-2' }}</td>
                    <td>
                      @if (record.isAbsent) {
                        <span class="badge badge-danger">Absent</span>
                      } @else if (record.isLate) {
                        <span class="badge badge-warning">Late</span>
                      } @else {
                        <span class="badge badge-success">Present</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .section-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
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

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .metric-card {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
      background: linear-gradient(180deg, rgba(31, 143, 255, 0.08), transparent), var(--bg-elevated);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .metric-label {
      color: var(--text-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
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
      .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .section-header {
        flex-direction: column;
        align-items: stretch;
      }

      .month-input {
        width: 100%;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class StaffAttendanceSectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly staffService = inject(StaffService);

  selectedMonth = format(new Date(), 'yyyy-MM');

  staffId = '';
  summary: AttendanceSummary | null = null;
  records: AttendanceRecord[] = [];
  summaryLoading = true;
  recordsLoading = true;

  ngOnInit(): void {
    this.staffId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    if (!this.staffId) {
      this.summaryLoading = false;
      this.recordsLoading = false;
      return;
    }

    this.loadSummary();
    this.loadRecords();
  }

  loadSummary(): void {
    if (!this.staffId) return;
    this.summaryLoading = true;
    this.staffService.getAttendanceByMonth(this.staffId, this.selectedMonth).subscribe({
      next: (response) => {
        this.summary = response.data;
        this.summaryLoading = false;
      },
      error: () => {
        this.summary = null;
        this.summaryLoading = false;
      },
    });
  }

  loadRecords(): void {
    if (!this.staffId) return;
    this.recordsLoading = true;
    this.staffService.getAttendance(this.staffId, { page: 1, limit: 20 }).subscribe({
      next: (response) => {
        this.records = Array.isArray(response.data) ? response.data : [];
        this.recordsLoading = false;
      },
      error: () => {
        this.records = [];
        this.recordsLoading = false;
      },
    });
  }

  getWorkingHours(record: AttendanceRecord): number {
    return record.workingHours ?? record.workHours ?? 0;
  }
}
