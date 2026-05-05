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
    loadComponent: () => import('./workspace/staff-workspace.component').then(m => m.StaffWorkspaceComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'profile',
      },
      {
        path: 'profile',
        title: 'Staff Profile',
        loadComponent: () => import('./sections/staff-profile-section.component').then(m => m.StaffProfileSectionComponent),
      },
      {
        path: 'attendance',
        title: 'Staff Attendance',
        loadComponent: () => import('./sections/staff-attendance-section.component').then(m => m.StaffAttendanceSectionComponent),
      },
      {
        path: 'salary',
        title: 'Staff Salary',
        loadComponent: () => import('./sections/staff-salary-section.component').then(m => m.StaffSalarySectionComponent),
      },
      {
        path: 'deductions',
        title: 'Staff Deductions',
        loadComponent: () => import('./sections/staff-deductions-section.component').then(m => m.StaffDeductionsSectionComponent),
      },
      {
        path: 'documents',
        title: 'Staff Documents',
        loadComponent: () => import('./sections/staff-documents-section.component').then(m => m.StaffDocumentsSectionComponent),
      },
    ],
  },
  {
    path: ':id/edit',
    title: 'Edit Staff Member',
    loadComponent: () => import('./form/staff-form.component').then(m => m.StaffFormComponent),
    canDeactivate: [unsavedGuard],
  },
];
