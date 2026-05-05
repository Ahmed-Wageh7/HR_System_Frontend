import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Staff } from '../../../core/models';
import { StaffService } from '../../../core/services/staff.service';
import { CurrencyFormatPipe, DateFormatPipe } from '../../../shared/pipes/pipes';

@Component({
  selector: 'app-staff-profile-section',
  standalone: true,
  imports: [CommonModule, DateFormatPipe, CurrencyFormatPipe],
  template: `
    @if (loading) {
      <div class="card section-loading">
        <div class="spinner" style="width:28px;height:28px"></div>
      </div>
    } @else if (staff) {
      <div class="profile-grid">
        <div class="card">
          <div class="section-title">Staff Information</div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Full Name</span><span>{{ staff.user.name }}</span></div>
            <div class="info-item"><span class="info-label">Employee Code</span><span>{{ staff.employeeCode || '—' }}</span></div>
            <div class="info-item"><span class="info-label">Email</span><span>{{ staff.user.email }}</span></div>
            <div class="info-item"><span class="info-label">Phone</span><span>{{ staff.user.phone || '—' }}</span></div>
            <div class="info-item"><span class="info-label">Department</span><span>{{ staff.department?.name || '—' }}</span></div>
            <div class="info-item"><span class="info-label">Position</span><span>{{ staff.position || '—' }}</span></div>
          </div>
        </div>

        <div class="card">
          <div class="section-title">Employment Snapshot</div>
          <div class="stat-stack">
            <div class="mini-stat">
              <span class="info-label">Daily Salary</span>
              <strong>{{ staff.dailySalary | currencyFormat }}</strong>
            </div>
            <div class="mini-stat">
              <span class="info-label">Join Date</span>
              <strong>{{ staff.joinDate | dateFormat }}</strong>
            </div>
            <div class="mini-stat">
              <span class="info-label">Annual Leave Balance</span>
              <strong>{{ staff.annualLeaveBalance ?? 0 }} days</strong>
            </div>
            <div class="mini-stat">
              <span class="info-label">Last Update</span>
              <strong>{{ staff.updatedAt | dateFormat:'MMM d, yyyy' }}</strong>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .section-loading {
      min-height: 220px;
      display: grid;
      place-items: center;
    }

    .profile-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 16px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 18px;
    }

    .info-grid,
    .stat-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .info-item,
    .mini-stat {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
    }

    .info-item:last-child,
    .mini-stat:last-child {
      border-bottom: none;
    }

    .info-label {
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    @media (max-width: 860px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .info-item,
      .mini-stat {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
})
export class StaffProfileSectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly staffService = inject(StaffService);

  loading = true;
  staff: Staff | null = null;

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      return;
    }

    this.staffService.getById(id).subscribe({
      next: (response) => {
        this.staff = response.data;
        this.loading = false;
      },
      error: () => {
        this.staff = null;
        this.loading = false;
      },
    });
  }
}
