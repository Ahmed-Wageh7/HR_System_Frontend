import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Staff } from '../../../core/models';
import { StaffService } from '../../../core/services/staff.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { CurrencyFormatPipe, DateFormatPipe, InitialsPipe } from '../../../shared/pipes/pipes';

@Component({
  selector: 'app-staff-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, HasPermissionDirective, InitialsPipe, DateFormatPipe, CurrencyFormatPipe],
  template: `
    @if (loading) {
      <div class="card detail-loading">
        <div class="spinner" style="width:28px;height:28px"></div>
      </div>
    } @else if (!staff) {
      <div class="empty-state">
        <span class="material-icons empty-icon">person_off</span>
        <div class="empty-title">Staff not found</div>
      </div>
    } @else {
      <div class="card">
        <div class="detail-header">
          <div class="detail-identity">
            <div class="avatar avatar-lg">
              @if (staff.user.avatar) {
                <img [src]="staff.user.avatar" alt="" class="avatar-image">
              } @else {
                {{ staff.user.name | initials }}
              }
            </div>
            <div>
              <div class="page-title" style="font-size:24px">{{ staff.user.name }}</div>
              <div class="page-subtitle">{{ staff.position || 'No position' }} • {{ staff.department?.name || 'No department' }}</div>
            </div>
          </div>

          <div class="detail-actions">
            <a *ngIf="!embedded" class="btn btn-secondary" [routerLink]="['/staff', staff._id]">
              <span class="material-icons" style="font-size:16px">account_tree</span>
              Open Full Workspace
            </a>
            <button *hasPermission="'staff:update'" class="btn btn-secondary" (click)="startEdit()">
              <span class="material-icons" style="font-size:16px">edit</span>
              Edit
            </button>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">Email</span><strong>{{ staff.user.email }}</strong></div>
          <div class="detail-item"><span class="detail-label">Phone</span><strong>{{ staff.user.phone || '—' }}</strong></div>
          <div class="detail-item"><span class="detail-label">Daily Salary</span><strong>{{ staff.dailySalary | currencyFormat }}</strong></div>
          <div class="detail-item"><span class="detail-label">Join Date</span><strong>{{ staff.joinDate | dateFormat }}</strong></div>
          <div class="detail-item"><span class="detail-label">Employee Code</span><strong>{{ staff.employeeCode || '—' }}</strong></div>
          <div class="detail-item"><span class="detail-label">Leave Balance</span><strong>{{ staff.annualLeaveBalance ?? 0 }} days</strong></div>
        </div>
      </div>
    }
  `,
  styles: [`
    .detail-loading {
      min-height: 240px;
      display: grid;
      place-items: center;
    }

    .detail-header,
    .detail-identity,
    .detail-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .detail-header {
      margin-bottom: 20px;
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .detail-item {
      padding: 16px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-label {
      color: var(--text-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    @media (max-width: 640px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class StaffDetailComponent implements OnInit {
  @Input() staffId?: string | null;
  @Input() embedded = false;
  @Output() editRequested = new EventEmitter<string>();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly staffService = inject(StaffService);

  loading = true;
  staff: Staff | null = null;

  ngOnInit(): void {
    const id = this.staffId ?? this.route.snapshot.paramMap.get('id');
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

  startEdit(): void {
    if (!this.staff) return;
    if (this.embedded) {
      this.editRequested.emit(this.staff._id);
      return;
    }

    this.router.navigate(['/staff', this.staff._id, 'edit']);
  }
}
