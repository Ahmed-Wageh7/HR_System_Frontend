import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

// ── Forgot Password ─────────────────────────────────────────
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="width:100%;max-width:400px">
      @if (!sent) {
        <div class="login-header">
          <h2 style="font-size:26px;font-weight:800;letter-spacing:-0.02em">Reset Password</h2>
          <p style="color:var(--text-secondary);font-size:14px;margin-top:6px">
            Enter your email and we'll send a reset link
          </p>
        </div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" class="form-control" formControlName="email" placeholder="you@company.com">
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="field-error"><span class="material-icons" style="font-size:14px">error_outline</span>Valid email required</span>
            }
          </div>
          @if (errorMsg) {
            <div class="error-alert" style="background:var(--danger-dim);border:1px solid rgba(239,68,68,.2);color:var(--danger);padding:10px 14px;border-radius:var(--radius-sm);font-size:13px;display:flex;align-items:center;gap:8px;margin-bottom:12px">
              {{ errorMsg }}
            </div>
          }
          <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center" [disabled]="form.invalid || loading">
            @if (loading) { <span class="spinner"></span> }
            Send Reset Link
          </button>
        </form>
      } @else {
        <div style="text-align:center;padding:20px 0">
          <span class="material-icons" style="font-size:56px;color:var(--success)">mark_email_read</span>
          <h2 style="font-size:22px;font-weight:700;margin-top:16px">Check your email</h2>
          <p style="color:var(--text-secondary);margin-top:8px;font-size:14px">
            A password reset link has been sent to <strong>{{ form.get('email')?.value }}</strong>
          </p>
        </div>
      }
      <div style="margin-top:24px;text-align:center">
        <a routerLink="/auth/login" style="color:var(--text-secondary);font-size:13px;display:inline-flex;align-items:center;gap:4px">
          <span class="material-icons" style="font-size:16px">arrow_back</span>
          Back to login
        </a>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  loading = false;
  sent = false;
  errorMsg = '';

  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.forgotPassword(this.form.controls.email.value ?? '').subscribe({
      next: () => { this.loading = false; this.sent = true; },
      error: (err: { error?: { message?: string } }) => { this.loading = false; this.errorMsg = err.error?.message || 'Error sending reset email'; }
    });
  }
}

// ── Reset Password ─────────────────────────────────────────
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="width:100%;max-width:400px">
      <div class="login-header">
        <h2 style="font-size:26px;font-weight:800;letter-spacing:-0.02em">New Password</h2>
        <p style="color:var(--text-secondary);font-size:14px;margin-top:6px">Must be at least 8 chars with 1 uppercase and 1 number</p>
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label>New Password</label>
          <input [type]="showPwd ? 'text' : 'password'" class="form-control" formControlName="password" placeholder="••••••••">
          @if (form.get('password')?.errors?.['pattern'] && form.get('password')?.touched) {
            <span class="field-error"><span class="material-icons" style="font-size:14px">error_outline</span>Min 8 chars, 1 uppercase, 1 number</span>
          }
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <input [type]="showPwd ? 'text' : 'password'" class="form-control" formControlName="confirm" placeholder="••••••••">
          @if (form.errors?.['mismatch'] && form.get('confirm')?.touched) {
            <span class="field-error"><span class="material-icons" style="font-size:14px">error_outline</span>Passwords do not match</span>
          }
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);margin-bottom:16px;cursor:pointer">
          <input type="checkbox" [(ngModel)]="showPwd" [ngModelOptions]="{standalone:true}"> Show password
        </label>
        @if (success) {
          <div style="background:var(--success-dim);color:var(--success);padding:10px 14px;border-radius:var(--radius-sm);font-size:13px;margin-bottom:12px">
            Password reset! <a routerLink="/auth/login">Login here</a>
          </div>
        }
        @if (errorMsg) {
          <div style="background:var(--danger-dim);color:var(--danger);padding:10px 14px;border-radius:var(--radius-sm);font-size:13px;margin-bottom:12px">{{ errorMsg }}</div>
        }
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center" [disabled]="form.invalid || loading">
          @if (loading) { <span class="spinner"></span> }
          Reset Password
        </button>
      </form>
    </div>
  `
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  showPwd = false;
  loading = false;
  success = false;
  errorMsg = '';

  form = this.fb.group({
    password: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)]],
    confirm: ['', Validators.required],
  }, { validators: matchPasswords });

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const token = this.route.snapshot.paramMap.get('token')!;
    this.loading = true;
    this.auth.resetPassword(token, this.form.controls.password.value ?? '').subscribe({
      next: () => { this.loading = false; this.success = true; },
      error: (err: { error?: { message?: string } }) => { this.loading = false; this.errorMsg = err.error?.message || 'Reset failed'; }
    });
  }
}

function matchPasswords(ctrl: AbstractControl): Record<string, boolean> | null {
  const pw = ctrl.get('password')?.value;
  const confirm = ctrl.get('confirm')?.value;
  return pw === confirm ? null : { mismatch: true };
}
