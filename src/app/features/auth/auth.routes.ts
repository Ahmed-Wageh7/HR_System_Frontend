import { Routes } from '@angular/router';
import { AuthLayoutComponent } from '../../layout/auth-layout/auth-layout.component';

export const authRoutes: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        title: 'Login',
        loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'forgot-password',
        title: 'Forgot Password',
        loadComponent: () => import('./auth-extra.components').then(m => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password/:token',
        title: 'Reset Password',
        loadComponent: () => import('./auth-extra.components').then(m => m.ResetPasswordComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ]
  }
];
