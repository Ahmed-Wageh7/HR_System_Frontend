// ============================================================
// API Response Model
// ============================================================
export interface ApiResponse<T> {
  success?: boolean;
  status?: 'success' | 'fail' | string;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  totalDocuments?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

// ============================================================
// User / Auth Models
// ============================================================
export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: Role | string;
  roles?: Role[];
  permissions?: string[];
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

// ============================================================
// Staff Models
// ============================================================
export interface Staff {
  _id: string;
  user: User;
  employeeCode?: string;
  department?: Department | null;
  position?: string | null;
  dailySalary: number;
  joinDate?: string;
  isActive: boolean;
  annualLeaveBalance?: number;
  monthlyReports?: SalaryRecord[];
  isDeleted?: boolean;
  deletedAt?: string | null;
  documents?: StaffDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffCreatePayload {
  name: string;
  email: string;
  phone?: string | null;
  dailySalary: number;
  joinDate?: string;
  department?: string | null;
  position?: string | null;
}

export interface StaffUpdatePayload {
  dailySalary?: number;
  joinDate?: string;
  department?: string | null;
  position?: string | null;
  isActive?: boolean;
}

export interface StaffDocument {
  _id: string;
  name?: string;
  filename?: string;
  url: string;
  publicId?: string;
  path?: string;
  mimeType?: string;
  uploadedAt: string;
}

// ============================================================
// Department Models
// ============================================================
export interface Department {
  _id: string;
  name: string;
  description?: string;
  staffCount?: number;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export interface DepartmentQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface DepartmentDeleteResult {
  message: string;
}

// ============================================================
// Attendance Models
// ============================================================
export interface AttendanceRecord {
  _id: string;
  staff: Staff | string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  isLate: boolean;
  isAbsent: boolean;
  workingHours?: number;
  workHours?: number;
  deductionAmount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceSummary {
  totalDays: number;
  lateDays: number;
  absentDays: number;
  hoursWorked: number;
}

export interface StaffAttendanceQuery {
  page?: number;
  limit?: number;
}

// ============================================================
// Salary Models
// ============================================================
export interface SalaryRecord {
  _id?: string;
  staff: Staff | string;
  month: string;
  baseSalary?: number;
  lateDeductions?: number;
  absentDeductions?: number;
  manualDeductions?: number;
  totalDaysWorked?: number;
  lateDays?: number;
  absentDays?: number;
  totalDeductions?: number;
  adjustments: number;
  finalSalary: number;
  isPaid: boolean;
  paidAt?: string;
  deductions?: Deduction[];
}

export interface Deduction {
  _id: string;
  staff?: Staff | string;
  month: string;
  amount: number;
  reason: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DeductionPayload {
  month: string;
  amount: number;
  reason: string;
}

export interface ActionMessage {
  message: string;
}

// ============================================================
// Leave Models
// ============================================================
export interface Leave {
  _id: string;
  user: User | string;
  reason: string;
  startDate: string;
  endDate: string;
  totalDays?: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string | null;
  reviewedBy?: User | string;
  createdAt: string;
}

export interface LeavePayload {
  reason: string;
  startDate: string;
  endDate: string;
}

// ============================================================
// Role & Permission Models
// ============================================================
export interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
}

export interface RolePayload {
  name: string;
  description?: string;
  permissions?: string[];
  isSystem?: boolean;
}

export interface RoleQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface RoleDeleteResult {
  message: string;
}

// ============================================================
// Ticket Models
// ============================================================
export interface Ticket {
  _id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  user: User | string;
  replies?: TicketReply[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface TicketStatusPayload {
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
}

export interface TicketReply {
  _id: string;
  message: string;
  user: User | string;
  createdAt: string;
}

// ============================================================
// Audit Log Models
// ============================================================
export interface AuditLog {
  _id: string;
  user: User | string;
  action: string;
  resource: string;
  resourceId?: string;
  status: 'success' | 'fail';
  ipAddress?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
}

// ============================================================
// Notification Models
// ============================================================
export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'announcement' | 'payroll' | 'warning' | 'leave' | 'general';
  read: boolean;
  link?: string;
  createdAt: string;
}

// ============================================================
// Report Models
// ============================================================
export interface PayrollReport {
  month: string;
  totalStaff: number;
  totalPaid: number;
  totalUnpaid: number;
  totalPayroll: number;
  records: SalaryRecord[];
}

export interface AttendanceReport {
  month: string;
  summary: AttendanceSummary;
  records: AttendanceRecord[];
}
