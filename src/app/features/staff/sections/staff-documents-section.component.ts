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
  templateUrl: './staff-documents-section.component.html',
  styleUrl: './staff-documents-section.component.scss',
})
export class StaffDocumentsSectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly staffService = inject(StaffService);

  staffId = '';
  staff: Staff | null = null;
  loading = true;
  uploading = false;
  deleting = false;
  deleteTarget: StaffDocument | null = null;

  get latestUploadLabel(): string {
    const documents = this.staff?.documents ?? [];
    if (documents.length === 0) return 'No uploads yet';
    return documents[0].uploadedAt ? new Date(documents[0].uploadedAt).toLocaleDateString() : 'Available';
  }

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
    this.uploading = true;

    this.staffService.uploadDocument(this.staffId, file).subscribe(() => {
      this.uploading = false;
      this.loadStaff();
      (event.target as HTMLInputElement).value = '';
    }, () => {
      this.uploading = false;
      (event.target as HTMLInputElement).value = '';
    });
  }

  deleteDocument(): void {
    if (!this.deleteTarget) return;
    this.deleting = true;
    this.staffService.deleteDocument(this.staffId, this.deleteTarget._id).subscribe(() => {
      this.deleting = false;
      this.deleteTarget = null;
      this.loadStaff();
    }, () => {
      this.deleting = false;
    });
  }

  getDocumentName(document: StaffDocument | null): string {
    return document?.name ?? document?.filename ?? 'Document';
  }
}
