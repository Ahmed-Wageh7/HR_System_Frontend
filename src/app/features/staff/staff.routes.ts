import { Routes } from '@angular/router';
import { unsavedGuard } from '../../core/guards/guards';

export const staffRoutes: Routes = [
  {
    path: '',
    title: 'Staff',
    loadComponent: () => import('./list/staff-list.component').then(m => m.StaffListComponent),
  },
  {
    path: 'new',
    title: 'New Staff Member',
    loadComponent: () => import('./form/staff-form.component').then(m => m.StaffFormComponent),
    canDeactivate: [unsavedGuard],
  },
  {
    path: ':id',
    title: 'Staff Details',
    loadComponent: () => import('./detail/staff-detail.component').then(m => m.StaffDetailComponent),
  },
  {
    path: ':id/edit',
    title: 'Edit Staff Member',
    loadComponent: () => import('./form/staff-form.component').then(m => m.StaffFormComponent),
    canDeactivate: [unsavedGuard],
  },
];
