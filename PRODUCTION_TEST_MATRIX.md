# Production Test Matrix

This matrix documents the verification results of the ERP Portal system components and endpoints in the production environment.

| FEATURE | API | STATUS | RESPONSE | DATABASE | VERIFIED |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin Login** | `POST /api/auth/login` | Active | `200 OK` (token + profile) | Yes, queries user record | Yes, verified database lookup |
| **Employee Login** | `POST /api/employee/login` | Active | `200 OK` (token + profile) | Yes, queries employee record | Yes, verified database lookup |
| **Employee Registration** | `POST /api/employee/register` | Active | `201 Created` | Yes, inserts pending employee | Yes, verified DB insert |
| **Dashboard** | `GET /api/fees-dashboard/summary` | Active | `200 OK` (fees & counts) | Yes, aggregation lookup | Yes, aggregates verified |
| **Employees** | `GET /api/employee/me` | Active | `200 OK` | Yes, queries profile | Yes, verified |
| **Attendance** | `POST /api/attendance/log` | Active | `201 Created` | Yes, inserts log record | Yes, verified |
| **Leave** | `POST /api/employee/leaves` | Active | `201 Created` | Yes, inserts request | Yes, verified |
| **Reports** | `GET /api/reports/fees-report` | Active | `200 OK` | Yes, aggregates details | Yes, verified |
| **Fees** | `GET /api/fee-plan` | Active | `200 OK` | Yes, plans read | Yes, verified |
| **Students** | `GET /api/students` | Active | `200 OK` | Yes, indexes utilized | Yes, verified |
| **Courses** | `GET /api/students/courses` | Active | `200 OK` | Yes, queries database | Yes, verified |
| **Payments** | `POST /api/payments` | Active | `201 Created` | Yes, inserts transaction | Yes, verified |
| **Receipts** | `GET /api/receipts/:id` | Active | `200 OK` | Yes, reads receipt details | Yes, verified |
| **Invoices** | `POST /api/invoices` | Active | `201 Created` | Yes, Counter atomic increment | Yes, verified sequence |
| **Certificates** | `GET /api/certificates/:id` | Active | `200 OK` | Yes, reads certificate record | Yes, verified |
| **Notifications** | `GET /api/notifications` | Active | `200 OK` | Yes, reads notify lists | Yes, verified |
| **Settings** | `GET /api/settings` | Active | `200 OK` | Yes, reads settings document | Yes, verified |
| **Leads** | `GET /api/lead` | Active | `200 OK` | Yes, queries separate lead collection | Yes, verified separately |
| **Lead Dashboard** | `GET /api/lead/stats` | Active | `200 OK` | Yes, aggregate stats | Yes, verified separately |
