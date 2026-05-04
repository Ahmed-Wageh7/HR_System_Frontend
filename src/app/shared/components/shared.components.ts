import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// ── Pagination ─────────────────────────────────────────────
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pagination">
      <span class="page-info">
        {{ (page - 1) * limit + 1 }}–{{ [page * limit, total] | min }} of {{ total }} items
      </span>
      <div class="flex items-center gap-8">
        <select class="form-control" style="width:80px;padding:5px 8px" [value]="limit" (change)="limitChange.emit(+$any($event.target).value)">
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
        <div class="page-controls">
          <button class="page-btn" [disabled]="page === 1" (click)="pageChange.emit(page - 1)">
            <span class="material-icons" style="font-size:16px">chevron_left</span>
          </button>
          @for (p of pages; track p) {
            <button class="page-btn" [class.active]="p === page" (click)="pageChange.emit(p)">{{ p }}</button>
          }
          <button class="page-btn" [disabled]="page === totalPages" (click)="pageChange.emit(page + 1)">
            <span class="material-icons" style="font-size:16px">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  `,
  pipes: [],
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() limit = 10;
  @Input() total = 0;
  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }

  get pages(): number[] {
    const tp = this.totalPages;
    const p = this.page;
    const range: number[] = [];
    const start = Math.max(1, p - 2);
    const end = Math.min(tp, p + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }
}

// ── Empty State ────────────────────────────────────────────
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  template: `
    <div class="empty-state">
      <span class="material-icons empty-icon">{{ icon }}</span>
      <div class="empty-title">{{ title }}</div>
      <div class="empty-desc">{{ description }}</div>
      @if (actionLabel && actionRoute) {
        <a [href]="actionRoute" class="btn btn-primary mt-16">{{ actionLabel }}</a>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'No results found';
  @Input() description = '';
  @Input() actionLabel?: string;
  @Input() actionRoute?: string;
}

// ── Skeleton Loader ────────────────────────────────────────
@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [],
  template: `
    <div class="skeleton-wrapper">
      @for (i of rows; track i) {
        @if (type === 'table-row') {
          <div class="flex gap-12 mb-12 items-center">
            <div class="skeleton" style="width:36px;height:36px;border-radius:50%"></div>
            <div style="flex:1">
              <div class="skeleton skeleton-text" style="width:40%"></div>
              <div class="skeleton skeleton-text" style="width:25%"></div>
            </div>
            <div class="skeleton skeleton-text" style="width:80px"></div>
            <div class="skeleton skeleton-text" style="width:80px"></div>
          </div>
        } @else if (type === 'card') {
          <div class="skeleton skeleton-card mb-12"></div>
        } @else {
          <div class="skeleton skeleton-text"></div>
        }
      }
    </div>
  `,
})
export class SkeletonComponent {
  @Input() rows = 5;
  @Input() type: 'text' | 'card' | 'table-row' = 'table-row';

  get rowsArr(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
  get rows_(): number[] { return this.rowsArr; }
  rows: number[] = [1,2,3,4,5];

  ngOnChanges() {
    this.rows = Array.from({ length: this.rows?.length ?? 5 }, (_, i) => i + 1);
  }
}
