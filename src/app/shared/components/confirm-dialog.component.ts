import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="onCancel()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">{{ title }}</div>
              <div class="text-secondary mt-4" style="font-size:13px">{{ message }}</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="onCancel()">Cancel</button>
            <button
              class="btn"
              [class.btn-danger]="confirmColor === 'danger'"
              [class.btn-warning]="confirmColor === 'warning'"
              [class.btn-primary]="confirmColor === 'primary'"
              (click)="onConfirm()"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmText = 'Confirm';
  @Input() confirmColor: 'danger' | 'warning' | 'primary' = 'danger';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
    this.open = false;
  }

  onCancel(): void {
    this.cancelled.emit();
    this.open = false;
  }
}
