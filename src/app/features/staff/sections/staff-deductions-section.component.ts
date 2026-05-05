import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { format } from 'date-fns';
import { Deduction, DeductionPayload } from '../../../core/models';
import { StaffService } from '../../../core/services/staff.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { CurrencyFormatPipe, DateFormatPipe } from '../../../shared/pipes/pipes';

@Component({
  selector: 'app-staff-deductions-section',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective, CurrencyFormatPipe, DateFormatPipe, ConfirmDialogComponent],
  template: `
    <div class="section-stack">
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-title">Manual Deductions</div>
            <div class="section-subtitle">Create, update, delete, and review staff deductions.</div>
          </div>
          <button *hasPermission="'salary:update'" class="btn btn-secondary" (click)="startCreate()">
            <span class="material-icons" style="font-size:16px">add</span>
            Add Deduction
          </button>
        </div>

        @if (formOpen) {
          <div class="editor-panel">
            <div class="editor-grid">
              <div class="form-group">
                <label>Month</label>
                <input type="month" class="form-control" [(ngModel)]="draft.month">
              </div>
              <div class="form-group">
                <label>Amount</label>
                <input type="number" class="form-control" [(ngModel)]="draft.amount" min="0">
              </div>
            </div>
            <div class="form-group">
              <label>Reason</label>
              <input type="text" class="form-control" [(ngModel)]="draft.reason" placeholder="Enter deduction reason">
            </div>
            <div class="editor-actions">
              <button class="btn btn-primary" (click)="saveDeduction()">{{ editingId ? 'Update Deduction' : 'Create Deduction' }}</button>
              <button class="btn btn-ghost" (click)="resetForm()">Cancel</button>
            </div>
          </div>
        }

        @if (loading) {
          <div class="section-loading"><div class="spinner" style="width:26px;height:26px"></div></div>
        } @else if (deductions.length === 0) {
          <div class="empty-state compact-empty">
            <span class="material-icons empty-icon">receipt_long</span>
            <div class="empty-title">No deductions added yet</div>
          </div>
        } @else {
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (deduction of deductions; track deduction._id) {
                  <tr>
                    <td>{{ deduction.month }}</td>
                    <td class="text-danger">{{ deduction.amount | currencyFormat }}</td>
                    <td>{{ deduction.reason }}</td>
                    <td>{{ deduction.createdAt | dateFormat }}</td>
                    <td>
                      <div class="table-actions">
                        <button *hasPermission="'salary:update'" class="btn btn-ghost btn-sm btn-icon" (click)="startEdit(deduction)">
                          <span class="material-icons" style="font-size:14px">edit</span>
                        </button>
                        <button *hasPermission="'salary:update'" class="btn btn-danger btn-sm btn-icon" (click)="deleteTarget = deduction">
                          <span class="material-icons" style="font-size:14px">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <app-confirm-dialog
      [open]="!!deleteTarget"
      title="Delete Deduction"
      [message]="'Delete the deduction for ' + (deleteTarget?.month || '') + '?'"
      confirmText="Delete"
      confirmColor="danger"
      (confirmed)="confirmDelete()"
      (cancelled)="deleteTarget = null"
    />
  `,
  styles: [`
    .section-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-header,
    .editor-actions,
    .table-actions {
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

    .editor-panel {
      margin-bottom: 18px;
      padding: 18px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.02);
    }

    .editor-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .section-loading {
      min-height: 180px;
      display: grid;
      place-items: center;
    }

    .compact-empty {
      padding: 28px 18px;
    }

    @media (max-width: 640px) {
      .editor-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class StaffDeductionsSectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly staffService = inject(StaffService);

  staffId = '';
  deductions: Deduction[] = [];
  loading = true;
  formOpen = false;
  editingId: string | null = null;
  deleteTarget: Deduction | null = null;

  draft: DeductionPayload = {
    month: format(new Date(), 'yyyy-MM'),
    amount: 0,
    reason: '',
  };

  ngOnInit(): void {
    this.staffId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    if (!this.staffId) {
      this.loading = false;
      return;
    }

    this.loadDeductions();
  }

  loadDeductions(): void {
    this.loading = true;
    this.staffService.getDeductions(this.staffId).subscribe({
      next: (response) => {
        this.deductions = response.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.deductions = [];
        this.loading = false;
      },
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.formOpen = true;
    this.draft = {
      month: format(new Date(), 'yyyy-MM'),
      amount: 0,
      reason: '',
    };
  }

  startEdit(deduction: Deduction): void {
    this.editingId = deduction._id;
    this.formOpen = true;
    this.draft = {
      month: deduction.month,
      amount: deduction.amount,
      reason: deduction.reason,
    };
  }

  saveDeduction(): void {
    if (!this.draft.month || !this.draft.reason || this.draft.amount <= 0) return;

    const request$ = this.editingId
      ? this.staffService.updateDeduction(this.staffId, this.editingId, this.draft)
      : this.staffService.addDeduction(this.staffId, this.draft);

    request$.subscribe(() => {
      this.resetForm();
      this.loadDeductions();
    });
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.staffService.deleteDeduction(this.staffId, this.deleteTarget._id).subscribe(() => {
      this.deleteTarget = null;
      this.loadDeductions();
    });
  }

  resetForm(): void {
    this.formOpen = false;
    this.editingId = null;
    this.draft = {
      month: format(new Date(), 'yyyy-MM'),
      amount: 0,
      reason: '',
    };
  }
}
