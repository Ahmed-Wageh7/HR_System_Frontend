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
  templateUrl: './staff-detail.component.html',
  styleUrl: './staff-detail.component.scss',
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
