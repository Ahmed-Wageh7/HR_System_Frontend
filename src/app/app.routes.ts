import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { authGuard, guestGuard } from './core/guards/guards';

export const appRoutes: Routes = [
  // Auth routes
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes),
  },

  // App routes
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      // Dashboard
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },

      // Staff
      {
        path: 'staff',
        loadChildren: () => import('./features/staff/staff.routes').then(m => m.staffRoutes),
      },

      // Attendance
      {
        path: 'attendance',
        title: 'Attendance',
        loadComponent: () => import('./features/attendance/attendance.components').then(m => m.AttendanceListComponent),
      },
      {
        path: 'attendance/checkin',
        title: 'Check In',
        loadComponent: () => import('./features/attendance/attendance.components').then(m => m.CheckinComponent),
      },
      {
        path: 'attendance/checkout',
        title: 'Check Out',
        loadComponent: () => import('./features/attendance/attendance.components').then(m => m.CheckoutComponent),
      },

      // Salary
      {
        path: 'salary',
        title: 'Salary Overview',
        loadComponent: () => import('./features/salary/salary-overview.component').then(m => m.SalaryOverviewComponent),
      },

      // Reports
      {
        path: 'reports/payroll',
        title: 'Payroll Report',
        loadComponent: () => import('./features/features.components').then(m => m.PayrollReportComponent),
      },
      {
        path: 'reports/attendance',
        title: 'Attendance Report',
        loadComponent: () => import('./features/features.components').then(m => m.AttendanceReportComponent),
      },
      {
        path: 'reports/staff-history',
        title: 'Staff History Report',
        loadComponent: () => import('./features/features.components').then(m => m.StaffHistoryReportComponent),
      },
      {
        path: 'reports',
        pathMatch: 'full',
        redirectTo: 'reports/payroll',
      },

      // Leaves
      {
        path: 'leaves',
        title: 'Leaves',
        loadComponent: () => import('./features/leaves/leaves.components').then(m => m.LeaveListComponent),
      },
      {
        path: 'leaves/new',
        title: 'New Leave Request',
        loadComponent: () => import('./features/leaves/leaves.components').then(m => m.LeaveFormComponent),
      },
      {
        path: 'leaves/:id',
        title: 'Leave Details',
        loadComponent: () => import('./features/leaves/leaves.components').then(m => m.LeaveDetailComponent),
      },

      // Departments
      {
        path: 'departments',
        title: 'Departments',
        loadComponent: () => import('./features/features.components').then(m => m.DeptListComponent),
      },

      // Roles
      {
        path: 'roles',
        title: 'Roles',
        loadComponent: () => import('./features/features.components').then(m => m.RoleListComponent),
      },

      // Audit Logs
      {
        path: 'audit-logs',
        title: 'Audit Logs',
        loadComponent: () => import('./features/features.components').then(m => m.AuditListComponent),
      },

      // Tickets
      {
        path: 'tickets',
        title: 'Tickets',
        loadComponent: () => import('./features/features.components').then(m => m.TicketListComponent),
      },
      {
        path: 'tickets/new',
        title: 'New Ticket',
        loadComponent: () => import('./features/features.components').then(m => m.TicketFormComponent),
      },
      {
        path: 'tickets/:id',
        title: 'Ticket Details',
        loadComponent: () => import('./features/features.components').then(m => m.TicketDetailComponent),
      },

      // Profile
      {
        path: 'profile',
        title: 'Profile',
        loadComponent: () => import('./features/features.components').then(m => m.ProfileComponent),
      },

      // Default redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Wildcard
  { path: '**', redirectTo: 'dashboard' },
];
