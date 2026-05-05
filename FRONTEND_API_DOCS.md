# Staff API Frontend Docs

This file documents all staff-related APIs in the current backend.

Base URL:

- `/api/v1`
- `/api`

Examples below use `/api/v1`.

## Response Format

Success:

```json
{
  "status": "success",
  "data": {}
}
```

List responses may also include:

```json
{
  "status": "success",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "totalResults": 1
  }
}
```

Fail:

```json
{
  "status": "fail",
  "message": "Human readable error"
}
```

## Auth Requirement

All routes in this file require:

```http
Authorization: Bearer <accessToken>
```

## Route Groups

There are two staff-related route groups:

- staff self-service attendance routes under `/staff`
- admin staff management routes under `/admin/staff`

---

## 1. Staff Self-Service Attendance

These routes are for the logged-in staff member.

### `POST /api/v1/staff/checkin`

Purpose:

- check in for today

Request body:

```json
{}
```

Success `200`:

```json
{
  "status": "success",
  "data": {
    "_id": "6818f8d6d11d3d1c9a333333",
    "staff": "6818f8d6d11d3d1c9a444444",
    "date": "2026-05-05T00:00:00.000Z",
    "checkIn": "2026-05-05T08:07:00.000Z",
    "workingHours": 0,
    "isLate": false,
    "isAbsent": false,
    "deductionAmount": 0,
    "createdAt": "2026-05-05T08:07:01.000Z",
    "updatedAt": "2026-05-05T08:07:01.000Z"
  }
}
```

Possible fail responses:

```json
{
  "status": "fail",
  "message": "Staff profile not found"
}
```

```json
{
  "status": "fail",
  "message": "You have already checked in today"
}
```

### `POST /api/v1/staff/checkout`

Purpose:

- check out for today

Request body:

```json
{}
```

Success `200`:

```json
{
  "status": "success",
  "data": {
    "_id": "6818f8d6d11d3d1c9a333333",
    "staff": "6818f8d6d11d3d1c9a444444",
    "date": "2026-05-05T00:00:00.000Z",
    "checkIn": "2026-05-05T08:07:00.000Z",
    "checkOut": "2026-05-05T16:10:00.000Z",
    "workingHours": 8.05,
    "isLate": false,
    "isAbsent": false,
    "deductionAmount": 0,
    "createdAt": "2026-05-05T08:07:01.000Z",
    "updatedAt": "2026-05-05T16:10:01.000Z"
  }
}
```

Possible fail responses:

```json
{
  "status": "fail",
  "message": "Staff profile not found"
}
```

```json
{
  "status": "fail",
  "message": "You have not checked in today"
}
```

```json
{
  "status": "fail",
  "message": "You have already checked out today"
}
```

Notes:

- if `workingHours < 8`, backend sets `deductionAmount = dailySalary * 0.1`
- late logic is based on checking in after `09:00`

---

## 2. Admin Staff Management

Base prefix:

- `/api/v1/admin/staff`

### `POST /api/v1/admin/staff`

Purpose:

- create a staff profile
- create or reactivate the linked user account

Request body:

```json
{
  "name": "Sara Ali",
  "email": "sara@example.com",
  "phone": "01022222222",
  "dailySalary": 600,
  "joinDate": "2026-05-01",
  "department": "6818f8d6d11d3d1c9a555555",
  "position": "HR Specialist"
}
```

Validation:

- `name`: required string
- `email`: required valid email
- `phone`: optional string, `""` and `null` allowed
- `dailySalary`: required positive number
- `joinDate`: optional date
- `department`: optional 24-char ObjectId, `""` and `null` allowed
- `position`: optional string, `""` and `null` allowed

Success `201`:

```json
{
  "status": "success",
  "data": {
    "_id": "6818f8d6d11d3d1c9a444444",
    "user": {
      "_id": "6818f8d6d11d3d1c9a111111",
      "name": "Sara Ali",
      "email": "sara@example.com",
      "phone": "01022222222"
    },
    "employeeCode": "EMP-00001",
    "dailySalary": 600,
    "joinDate": "2026-05-01T00:00:00.000Z",
    "department": {
      "_id": "6818f8d6d11d3d1c9a555555",
      "name": "HR"
    },
    "position": "HR Specialist",
    "isActive": true,
    "annualLeaveBalance": 21,
    "documents": [],
    "monthlyReports": [],
    "isDeleted": false,
    "createdAt": "2026-05-05T11:00:00.000Z",
    "updatedAt": "2026-05-05T11:00:00.000Z"
  }
}
```

Possible fail response:

```json
{
  "status": "fail",
  "message": "Email already registered"
}
```

### `GET /api/v1/admin/staff`

Purpose:

- list staff

Common query params:

- `page`
- `limit`
- `sort`
- `employeeCode`
- any shared query filters supported by the repo `APIFeatures`

Success `200`:

```json
{
  "status": "success",
  "data": [
    {
      "_id": "6818f8d6d11d3d1c9a444444",
      "user": {
        "_id": "6818f8d6d11d3d1c9a111111",
        "name": "Sara Ali",
        "email": "sara@example.com",
        "phone": "01022222222"
      },
      "employeeCode": "EMP-00001",
      "dailySalary": 600,
      "joinDate": "2026-05-01T00:00:00.000Z",
      "department": {
        "_id": "6818f8d6d11d3d1c9a555555",
        "name": "HR"
      },
      "position": "HR Specialist",
      "isActive": true,
      "annualLeaveBalance": 21,
      "documents": [],
      "monthlyReports": [],
      "isDeleted": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "totalResults": 1
  }
}
```

### `GET /api/v1/admin/staff/:id`

Purpose:

- get one staff record by id

Path params:

- `id`: staff MongoDB ObjectId

Success `200`:

```json
{
  "status": "success",
  "data": {
    "_id": "6818f8d6d11d3d1c9a444444",
    "user": {
      "_id": "6818f8d6d11d3d1c9a111111",
      "name": "Sara Ali",
      "email": "sara@example.com",
      "phone": "01022222222"
    },
    "employeeCode": "EMP-00001",
    "dailySalary": 600,
    "joinDate": "2026-05-01T00:00:00.000Z",
    "department": {
      "_id": "6818f8d6d11d3d1c9a555555",
      "name": "HR"
    },
    "position": "HR Specialist",
    "isActive": true,
    "annualLeaveBalance": 21,
    "documents": [],
    "monthlyReports": [],
    "isDeleted": false
  }
}
```

Possible fail response:

```json
{
  "status": "fail",
  "message": "Staff not found"
}
```

### `PUT /api/v1/admin/staff/:id`

Purpose:

- update selected editable fields for a staff record

Request body:

```json
{
  "dailySalary": 650,
  "joinDate": "2026-05-01",
  "department": "6818f8d6d11d3d1c9a555555",
  "position": "Senior HR Specialist",
  "isActive": true
}
```

Validation:

- `dailySalary`: positive number
- `joinDate`: date
- `department`: ObjectId or `""`
- `position`: string or `""`
- `isActive`: boolean

Success `200`: returns updated staff object

Possible fail response:

```json
{
  "status": "fail",
  "message": "Staff not found"
}
```

### `DELETE /api/v1/admin/staff/:id`

Purpose:

- soft delete a staff record

Important behavior:

- this is not a hard delete
- it sets `isDeleted = true`
- it sets `deletedAt`
- it also soft deletes linked attendance records
- it also soft deletes linked deduction records

Request body:

```json
{}
```

Success `200`:

```json
{
  "status": "success",
  "data": {
    "_id": "6818f8d6d11d3d1c9a444444",
    "isDeleted": true,
    "deletedAt": "2026-05-05T11:20:00.000Z"
  }
}
```

### `PATCH /api/v1/admin/staff/:id/restore`

Purpose:

- restore a soft-deleted staff record

Important behavior:

- sets `isDeleted = false`
- sets `deletedAt = null`
- restores linked attendance records
- restores linked deduction records

Request body:

```json
{}
```

Success `200`:

```json
{
  "status": "success",
  "data": {
    "_id": "6818f8d6d11d3d1c9a444444",
    "isDeleted": false,
    "deletedAt": null
  }
}
```

Possible fail responses:

```json
{
  "status": "fail",
  "message": "Staff not found"
}
```

```json
{
  "status": "fail",
  "message": "Staff already restored"
}
```

---

## 3. Admin Staff Attendance History

### `GET /api/v1/admin/staff/:id/attendance`

Purpose:

- list attendance records for one staff member

Path params:

- `id`: staff id

Common query params:

- `page`
- `limit`

Success `200`:

```json
{
  "status": "success",
  "data": [
    {
      "_id": "6818f8d6d11d3d1c9a333333",
      "staff": "6818f8d6d11d3d1c9a444444",
      "date": "2026-05-05T00:00:00.000Z",
      "checkIn": "2026-05-05T08:07:00.000Z",
      "checkOut": "2026-05-05T16:10:00.000Z",
      "workingHours": 8.05,
      "isLate": false,
      "isAbsent": false,
      "deductionAmount": 0,
      "createdAt": "2026-05-05T08:07:01.000Z",
      "updatedAt": "2026-05-05T16:10:01.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "totalResults": 1
  }
}
```

### `GET /api/v1/admin/staff/:id/attendance/:month`

Purpose:

- get monthly attendance summary for one staff member

Path params:

- `id`: staff id
- `month`: `YYYY-MM`

Example:

- `/api/v1/admin/staff/6818f8d6d11d3d1c9a444444/attendance/2026-05`

Success `200`:

```json
{
  "status": "success",
  "data": {
    "totalDays": 12,
    "lateDays": 1,
    "absentDays": 2,
    "hoursWorked": 91.5
  }
}
```

---

## 4. Staff Deductions

### `POST /api/v1/admin/staff/:id/deductions`

Purpose:

- add a manual deduction to a staff member for a specific month

Path params:

- `id`: staff id

Request body:

```json
{
  "month": "2026-05",
  "amount": 500,
  "reason": "Damage deduction"
}
```

Validation:

- `month`: required string
- `amount`: required positive number
- `reason`: required string

Success `201`:

```json
{
  "status": "success",
  "data": {
    "_id": "6818f8d6d11d3d1c9a666666",
    "staff": "6818f8d6d11d3d1c9a444444",
    "month": "2026-05",
    "amount": 500,
    "reason": "Damage deduction",
    "isDeleted": false,
    "createdAt": "2026-05-05T11:30:00.000Z",
    "updatedAt": "2026-05-05T11:30:00.000Z"
  }
}
```

### `GET /api/v1/admin/staff/:id/deductions`

Purpose:

- list manual deductions for one staff member

Success `200`:

```json
{
  "status": "success",
  "data": [
    {
      "_id": "6818f8d6d11d3d1c9a666666",
      "staff": "6818f8d6d11d3d1c9a444444",
      "month": "2026-05",
      "amount": 500,
      "reason": "Damage deduction",
      "isDeleted": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "totalResults": 1
  }
}
```

### `PUT /api/v1/admin/staff/:id/deductions/:did`

Purpose:

- update one manual deduction

Path params:

- `id`: staff id
- `did`: deduction id

Request body:

```json
{
  "month": "2026-05",
  "amount": 300,
  "reason": "Updated deduction reason"
}
```

Success `200`: returns updated deduction object

Possible fail response:

```json
{
  "status": "fail",
  "message": "Deduction not found"
}
```

### `DELETE /api/v1/admin/staff/:id/deductions/:did`

Purpose:

- soft delete one deduction

Success `200`:

```json
{
  "status": "success",
  "data": {
    "message": "Deduction removed successfully"
  }
}
```

Possible fail response:

```json
{
  "status": "fail",
  "message": "Deduction not found"
}
```

---

## 5. Salary APIs

Month format for all salary endpoints:

- `YYYY-MM`
- example: `2026-05`

### `GET /api/v1/admin/staff/:id/salary/:month`

Purpose:

- calculate salary for a month
- or return already stored paid month data

Path params:

- `id`: staff id
- `month`: `YYYY-MM`

Success `200`:

```json
{
  "status": "success",
  "data": {
    "totalDaysWorked": 1,
    "lateDays": 0,
    "absentDays": 20,
    "totalDeductions": 12000,
    "adjustments": 2000,
    "finalSalary": 2600,
    "isPaid": false
  }
}
```

Meaning of fields:

- `totalDaysWorked`: number of attendance records counted as worked
- `lateDays`: number of late attendance days
- `absentDays`: computed absent working days
- `totalDeductions`: late deduction + absent deduction + manual deductions
- `adjustments`: saved manual adjustment for that month
- `finalSalary`: computed net salary
- `isPaid`: whether salary for that month is already marked as paid

Important behavior:

- if the month was already paid, backend returns the stored monthly report and `isPaid` will be `true`
- if the month was not paid, backend calculates fresh values from attendance, approved leaves, manual deductions, and saved adjustment

### `POST /api/v1/admin/staff/:id/salary/:month/pay`

Purpose:

- mark salary as paid for one staff member for one month

Request body:

```json
{}
```

Success `200`:

```json
{
  "status": "success",
  "data": {
    "totalDaysWorked": 1,
    "lateDays": 0,
    "absentDays": 20,
    "totalDeductions": 12000,
    "adjustments": 2000,
    "finalSalary": 2600,
    "isPaid": true
  }
}
```

Possible fail responses:

```json
{
  "status": "fail",
  "message": "Staff not found"
}
```

```json
{
  "status": "fail",
  "message": "Salary already paid for this month"
}
```

### `PUT /api/v1/admin/staff/:id/salary/:month/adjust`

Purpose:

- save monthly salary adjustment

Path params:

- `id`: staff id
- `month`: `YYYY-MM`

Request body:

```json
{
  "adjustments": 2000
}
```

Validation:

- `adjustments`: required number

Success `200`:

```json
{
  "status": "success",
  "data": {
    "message": "Salary adjusted successfully"
  }
}
```

Notes:

- this value is stored in `staff.monthlyReports`
- it is later added into `finalSalary`

### `POST /api/v1/admin/staff/salary/:month/bulk-pay`

Purpose:

- queue payroll for all staff for one month

Path params:

- `month`: `YYYY-MM`

Request body:

```json
{}
```

Success `202`:

```json
{
  "status": "success",
  "data": {
    "message": "Bulk salary processing queued"
  }
}
```

What this means:

- backend accepted the bulk-pay request
- backend pushes one salary job per staff member into the queue
- background worker performs the actual payment
- staff already paid for that month are skipped safely

---

## 6. Staff Documents

### `POST /api/v1/admin/staff/:id/documents`

Purpose:

- upload one document to a staff record

Content type:

- `multipart/form-data`

Path params:

- `id`: staff id

Form-data fields:

- `document`: file

Success `201`:

```json
{
  "status": "success",
  "data": {
    "_id": "6818f8d6d11d3d1c9a777777",
    "name": "contract.pdf",
    "url": "/uploads/staff-documents/contract.pdf",
    "publicId": "staff-documents/contract.pdf",
    "path": "uploads/staff-documents/contract.pdf",
    "mimeType": "application/pdf",
    "uploadedAt": "2026-05-05T11:40:00.000Z"
  }
}
```

Possible fail response:

```json
{
  "status": "fail",
  "message": "Staff not found"
}
```

### `DELETE /api/v1/admin/staff/:id/documents/:docId`

Purpose:

- delete one document from a staff record

Path params:

- `id`: staff id
- `docId`: embedded document id

Success `200`:

```json
{
  "status": "success",
  "data": {
    "message": "Document deleted successfully"
  }
}
```

Possible fail responses:

```json
{
  "status": "fail",
  "message": "Staff not found"
}
```

```json
{
  "status": "fail",
  "message": "Document not found"
}
```

---

## 7. Frontend Notes

- Use `YYYY-MM` for all salary and monthly attendance routes.
- `DELETE /admin/staff/:id` is a soft delete, not a hard delete.
- `PATCH /admin/staff/:id/restore` now returns `Staff already restored` if the staff member is already active.
- `GET /admin/staff/:id/salary/:month` now returns stored paid data with `isPaid: true` when that month was already paid.
- `POST /admin/staff/salary/:month/bulk-pay` returns `202` because it is queued background work.
- Upload endpoints need `multipart/form-data`.

