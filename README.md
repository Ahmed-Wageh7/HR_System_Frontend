# HR Management System — Angular Frontend

A production-ready Angular 17+ HR Management System frontend built for the NTI Angular HR Frontend Exam.

## Screenshots

> Login, Dashboard, Staff Management, Salary, Leaves, Audit Logs, Notifications

## Tech Stack

| Technology                      | Purpose                 |
| ------------------------------- | ----------------------- |
| Angular 17+ (Standalone)        | SPA Framework           |
| TypeScript (strict mode)        | Type safety             |
| RxJS                            | Reactive programming    |
| Angular Router + Guards         | Client-side routing     |
| Angular Reactive Forms          | All forms               |
| HttpClient + Interceptors       | API communication       |
| JWT in-memory + httpOnly cookie | Auth token handling     |
| Socket.io-client                | Real-time notifications |
| Chart.js                        | Dashboard charts        |
| date-fns                        | Date formatting         |
| Custom SCSS Design System       | Styling                 |

## Project Structure

```
src/
  app/
    core/
      services/        # auth, staff, dept, socket, ui, token + all API services
      interceptors/    # auth, refresh (401 retry), error, loader
      guards/          # authGuard, guestGuard, unsavedGuard, permissionGuard
      models/          # TypeScript interfaces for all entities
    shared/
      components/      # ConfirmDialog, Pagination, EmptyState, Skeleton
      pipes/           # timeAgo, currencyFormat, dateFormat, initials
      directives/      # HasPermission (*hasPermission="'staff:create'")
    features/
      auth/            # Login, ForgotPassword, ResetPassword
      dashboard/       # Stats, charts, audit activity
      staff/           # List (server-side filter/sort/paginate), Detail (tabs), Form
      attendance/      # Check-in/out, List
      salary/          # Overview, Detail, Deductions, Bulk Pay
      leaves/          # List, Form, Detail (approve/reject)
      departments/     # Cards, Create/Edit, Archive/Restore
      roles/           # Permission matrix, CRUD
      audit-logs/      # Table, filters, detail panel, CSV export
      tickets/         # List, Form, Detail with replies
      profile/         # Avatar upload, profile edit, password strength
    layout/
      admin-layout/    # Sidebar, topbar, notifications bell
      auth-layout/     # Split-screen auth pages
  environments/        # API URL configuration
```

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
# Clone repo
git clone <repository-url>
cd hr-angular-source

# Install dependencies
npm install

# Start development server
npm start
# → http://localhost:4200

# Build for production
npm run build

# Lint
npm run lint
```

### Environment Variables

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: "https://hr-system-backend-green.vercel.app/api",
  socketUrl: "https://hr-system-backend-green.vercel.app",
  devRefreshToken: null,
};
```

## Deploying

### GitHub

Initialize git locally if needed, then push the project:

```bash
git init
git add .
git commit -m "Prepare app for deployment"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

This project includes a GitHub Actions workflow at `.github/workflows/ci.yml` that runs `npm ci` and `npm run build` on pushes and pull requests.

### Vercel

This project includes a `vercel.json` configured for Angular SPA deployment:

- Build command: `npm run build`
- Output directory: `dist/hr-management-system/browser`
- SPA rewrites: all routes fall back to `index.html`

After pushing to GitHub:

1. Import the repository into Vercel.
2. Keep the detected root directory as the project root.
3. Confirm the framework settings or let `vercel.json` override them.
4. Deploy.

## Feature List & Routes

| Feature             | Routes                                                                | Description                                     |
| ------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| Authentication      | `/auth/login`, `/auth/forgot-password`, `/auth/reset-password/:token` | JWT auth with silent refresh                    |
| Dashboard           | `/dashboard`                                                          | Stats widgets, department chart, audit activity |
| Staff Management    | `/staff`, `/staff/new`, `/staff/:id`, `/staff/:id/edit`               | Full CRUD with server-side pagination           |
| Attendance          | `/attendance`, `/attendance/checkin`                                  | Daily tracking, check-in/out                    |
| Salary              | `/salary`, `/salary/:staffId/:month`                                  | Payroll overview, pay flow, deductions          |
| Leaves              | `/leaves`, `/leaves/new`, `/leaves/:id`                               | Request, approve/reject                         |
| Departments         | `/departments`                                                        | Cards, archive/restore                          |
| Roles & Permissions | `/roles`                                                              | Permission matrix editor                        |
| Audit Logs          | `/audit-logs`                                                         | Filterable log table with CSV export            |
| Tickets             | `/tickets`, `/tickets/new`, `/tickets/:id`                            | Support ticket system                           |
| Profile             | `/profile`                                                            | Avatar upload, password change                  |

## Architecture Highlights

### Token Security

- Access token stored **only in Angular Signal** (memory) — never localStorage/sessionStorage
- Refresh token is httpOnly cookie handled automatically by browser
- Silent refresh on app init via `APP_INITIALIZER`
- Auto-retry on 401 with `refreshInterceptor`

### RBAC

- `*hasPermission="'salary:pay'"` directive hides/shows UI elements
- `authGuard` protects all authenticated routes
- `guestGuard` redirects logged-in users from auth pages
- `unsavedGuard` warns before leaving dirty forms

### State Management

- Angular Signals for reactive state (no NgRx required)
- `shareReplay(1)` caching for departments and roles
- Cache invalidated on any mutating operation

### HTTP Layer

- `authInterceptor` — attaches `Bearer` token
- `refreshInterceptor` — handles 401 → refresh → retry
- `errorInterceptor` — global error toasts (403, 404, 429, 5xx)
- `loaderInterceptor` — global loading indicator

## API Base URL

```
https://hr-system-backend-green.vercel.app/api
```
