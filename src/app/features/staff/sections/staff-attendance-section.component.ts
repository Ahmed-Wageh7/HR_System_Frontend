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
  templateUrl: './staff-attendance-section.component.html',
  styleUrl: './staff-attendance-section.component.scss',
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
