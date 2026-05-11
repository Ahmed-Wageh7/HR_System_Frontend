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
  templateUrl: './staff-profile-section.component.html',
  styleUrl: './staff-profile-section.component.scss',
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
