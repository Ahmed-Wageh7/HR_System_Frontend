import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { format } from 'date-fns';
import { Deduction, DeductionPayload } from '../../../core/models';
import { StaffService } from '../../../core/services/staff.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { CurrencyFormatPipe, DateFormatPipe } from '../../../shared/pipes/pipes';

@Component({
  selector: 'app-staff-deductions-section',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe, DateFormatPipe, ConfirmDialogComponent],
  template: `
    <div class="section-stack">
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-title">Manual Deductions</div>
            <div class="section-subtitle">Create, update, delete, and review staff deductions.</div>
          </div>
          <button class="btn btn-secondary" [disabled]="saving" (click)="startCreate()">
            <span class="material-icons" style="font-size:16px">add</span>
            Add Deduction
          </button>
        </div>

        <div class="deduction-summary">
          <div class="summary-tile">
            <span class="summary-label">Entries</span>
            <strong>{{ deductions.length }}</strong>
          </div>
          <div class="summary-tile">
            <span class="summary-label">Current Month</span>
            <strong>{{ currentMonthCount }}</strong>
          </div>
          <div class="summary-tile">
            <span class="summary-label">Total Amount</span>
            <strong>{{ totalAmount | currencyFormat }}</strong>
          </div>
        </div>

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
                        <button class="btn btn-ghost btn-sm btn-icon" [disabled]="saving" (click)="startEdit(deduction)">
                          <span class="material-icons" style="font-size:14px">edit</span>
                        </button>
                        <button class="btn btn-danger btn-sm btn-icon" [disabled]="saving" (click)="deleteTarget = deduction">
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

    @if (formOpen) {
      <div class="modal-backdrop form-backdrop" (click)="resetForm()">
        <div class="modal modal-form deduction-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">{{ editingId ? 'Update Deduction' : 'Create Deduction' }}</div>
              <div class="text-secondary mt-4" style="font-size:13px">
                {{ editingId ? 'Edit the selected deduction entry.' : 'Add a new manual deduction for this staff member.' }}
              </div>
            </div>
            <button class="btn btn-ghost btn-icon" [disabled]="saving" (click)="resetForm()">
              <span class="material-icons">close</span>
            </button>
          </div>

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

          <div class="modal-footer">
            <button class="btn btn-secondary" [disabled]="saving" (click)="resetForm()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving" (click)="saveDeduction()">
              {{ editingId ? 'Update Deduction' : 'Create Deduction' }}
            </button>
          </div>
        </div>
      </div>
    }

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

    .deduction-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .summary-tile {
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(255, 106, 26, 0.08), transparent), var(--bg-elevated);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .summary-label {
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .editor-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .deduction-modal {
      width: min(100%, 560px);
      max-width: 560px;
    }

    .section-loading {
      min-height: 180px;
      display: grid;
      place-items: center;
    }

    .data-table-wrapper {
      max-height: min(52vh, 520px);
      overflow: auto;
    }

    .compact-empty {
      padding: 28px 18px;
    }

    @media (max-width: 640px) {
      .deduction-summary,
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
  saving = false;
  formOpen = false;
  editingId: string | null = null;
  deleteTarget: Deduction | null = null;

  draft: DeductionPayload = {
    month: format(new Date(), 'yyyy-MM'),
    amount: 0,
    reason: '',
  };

  get totalAmount(): number {
    return this.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  }

  get currentMonthCount(): number {
    const month = format(new Date(), 'yyyy-MM');
    return this.deductions.filter(deduction => deduction.month === month).length;
  }

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
    this.saving = true;

    const request$ = this.editingId
      ? this.staffService.updateDeduction(this.staffId, this.editingId, this.draft)
      : this.staffService.addDeduction(this.staffId, this.draft);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.resetForm();
        this.loadDeductions();
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.saving = true;
    this.staffService.deleteDeduction(this.staffId, this.deleteTarget._id).subscribe(() => {
      this.saving = false;
      this.deleteTarget = null;
      this.loadDeductions();
    }, () => {
      this.saving = false;
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
