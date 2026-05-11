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
  templateUrl: './staff-deductions-section.component.html',
  styleUrl: './staff-deductions-section.component.scss',
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
