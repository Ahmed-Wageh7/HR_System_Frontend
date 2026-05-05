import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Staff, StaffDocument } from '../../../core/models';
import { StaffService } from '../../../core/services/staff.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { DateFormatPipe } from '../../../shared/pipes/pipes';

@Component({
  selector: 'app-staff-documents-section',
  standalone: true,
  imports: [CommonModule, HasPermissionDirective, DateFormatPipe, ConfirmDialogComponent],
  template: `
    <div class="section-stack">
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-title">Staff Documents</div>
            <div class="section-subtitle">Upload and delete official staff files.</div>
          </div>
          <button *hasPermission="'staff:update'" class="btn btn-secondary" (click)="documentInput.click()">
            <span class="material-icons" style="font-size:16px">upload_file</span>
            Upload Document
          </button>
          <input #documentInput type="file" style="display:none" (change)="uploadDocument($event)">
        </div>

        @if (loading) {
          <div class="section-loading"><div class="spinner" style="width:26px;height:26px"></div></div>
        } @else if (!staff?.documents?.length) {
          <div class="empty-state compact-empty">
            <span class="material-icons empty-icon">folder_open</span>
            <div class="empty-title">No documents uploaded</div>
          </div>
        } @else {
          <div class="document-list">
            @for (document of staff!.documents!; track document._id) {
              <div class="document-row">
                <div class="document-copy">
                  <span class="material-icons text-muted">description</span>
                  <div>
                    <div class="document-name">{{ getDocumentName(document) }}</div>
                    <div class="document-meta">{{ document.uploadedAt | dateFormat:'MMM d, yyyy' }}</div>
                  </div>
                </div>

                <div class="document-actions">
                  <a class="btn btn-ghost btn-sm" [href]="document.url" target="_blank" rel="noopener">Open</a>
                  <button *hasPermission="'staff:update'" class="btn btn-danger btn-sm btn-icon" (click)="deleteTarget = document">
                    <span class="material-icons" style="font-size:14px">delete</span>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <app-confirm-dialog
      [open]="!!deleteTarget"
      title="Delete Staff Document"
      [message]="'Delete ' + getDocumentName(deleteTarget) + '?'"
      confirmText="Delete"
      confirmColor="danger"
      (confirmed)="deleteDocument()"
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
    .document-row,
    .document-copy,
    .document-actions {
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

    .document-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .document-row {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 14px 16px;
      background: var(--bg-elevated);
    }

    .document-copy {
      justify-content: flex-start;
    }

    .document-name {
      font-weight: 600;
      font-size: 14px;
    }

    .document-meta {
      color: var(--text-muted);
      font-size: 12px;
      margin-top: 2px;
    }

    .section-loading {
      min-height: 180px;
      display: grid;
      place-items: center;
    }

    .compact-empty {
      padding: 28px 18px;
    }
  `],
})
export class StaffDocumentsSectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly staffService = inject(StaffService);

  staffId = '';
  staff: Staff | null = null;
  loading = true;
  deleteTarget: StaffDocument | null = null;

  ngOnInit(): void {
    this.staffId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    if (!this.staffId) {
      this.loading = false;
      return;
    }

    this.loadStaff();
  }

  loadStaff(): void {
    this.loading = true;
    this.staffService.getById(this.staffId).subscribe({
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

  uploadDocument(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.staffId) return;

    this.staffService.uploadDocument(this.staffId, file).subscribe(() => {
      this.loadStaff();
      (event.target as HTMLInputElement).value = '';
    });
  }

  deleteDocument(): void {
    if (!this.deleteTarget) return;
    this.staffService.deleteDocument(this.staffId, this.deleteTarget._id).subscribe(() => {
      this.deleteTarget = null;
      this.loadStaff();
    });
  }

  getDocumentName(document: StaffDocument | null): string {
    return document?.name ?? document?.filename ?? 'Document';
  }
}
