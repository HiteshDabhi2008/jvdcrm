# JVD CRM — System Specification & Requirements

Status: FINALIZED
Version: 1.0.0
Organization: Jivdaya Vatsalya Dham (Edufun Foundation Trust)
Target Platform: Node.js, Express.js, MongoDB (Local / Atlas Free Tier), HTML5, CSS3, Vanilla JavaScript

---

## 1. Executive Summary

Jivdaya Vatsalya Dham (JVD) is a 24/7 veterinary care, emergency rescue, and animal hospital and shelter facility located in Samarvada / Dhanera, Gujarat, managed by Edufun Foundation Trust. This CRM application digitizes, secures, and tracks veterinary case lifecycles, emergency call intakes, animal triage, treatments, outcomes, user management, and organizational auditing.

---

## 2. Technical Architecture & Constraints

- **Backend**: Node.js (>=18.x) + Express.js. Modular MVC structure (models, controllers, routes, middleware, services).
- **Database**: MongoDB (Local `mongodb://127.0.0.1:27017/jvd_crm` or MongoDB Atlas M0 Free Tier) via Mongoose ODM.
- **Authentication**:
  - Google OAuth 2.0 with domain restriction (`@edufunfoundation.in` or configurable via `ALLOWED_DOMAIN`).
  - Local credentials authentication with bcrypt hashing (work factor 10) for offline/local staff operation.
  - Server-side sessions with secure cookies (`httpOnly: true`, `sameSite: 'lax'`).
- **Security**:
  - Helmet for HTTP security headers (CSP, HSTS, frameguard, etc.).
  - Express-Rate-Limit for brute-force prevention on authentication and API routes.
  - Input validation and sanitized queries to prevent NoSQL operator injection and regex DoS.
  - Centralized error handler without stack trace leaks.
- **Reporting & Exports**:
  - Node.js server-side Excel generation (`exceljs`) with column styling, auto-fit widths, and metadata.
  - Node.js server-side PDF generation (`pdfkit`) with official hospital letterhead, timestamp, and page numbers.
  - Browser-side instant export fallbacks.
- **Cost**: 100% Free and Open Source (FOSS) and free-tier infrastructure. No paid dependencies.

---

## 3. Data Models & Schemas

### 3.1 Case Model (`models/Case.js`)
- `reg_no`: String, required, unique, indexed (format `JVD-YYYY-NNNN`).
- `caller_name`: String, required, trimmed.
- `contact_no`: String, required, 10-digit numeric validation.
- `village`: String, required (Area / Village).
- `city`: String, required (Taluka / City).
- `district`: String, required (District, e.g., Banaskantha).
- `state`: String, default "Gujarat".
- `animal_type`: String, required, enum `['Domestic', 'Wild']`.
- `species`: String, required.
- `sex`: String, required, enum `['Male', 'Female', 'Unknown']`.
- `cause`: String, required (Accident, Illness, Wire fence, Dog bite, Dehydration, etc.).
- `discrimination`: String, optional clinical notes / background description.
- `treatment`: String, required (Emergency first aid, Surgery, Dressing, Antibiotics, etc.).
- `contribution`: String, optional donation / fee contribution received.
- `status`: String, required, enum:
  - `Under Treatment`
  - `Site Treatment`
  - `JVD Treatment`
  - `Release`
  - `Death`
  - `Run Away`
- `post_time`: Date/String timestamp.
- `created_by`: String (name or ID of creator).
- `last_edited_by`: String (name or ID of updater).
- `last_edited_at`: Date/String.
- `is_archived`: Boolean, default `false`, indexed.
- Indexes: `reg_no`, `contact_no`, `status`, `animal_type`, `species`, `post_time`, `is_archived`.

### 3.2 Counter Model (`models/Counter.js`)
- `_id`: String (e.g., `case_reg_no_2026`).
- `seq`: Number, default 0.
- Guarantees race-condition-free, atomic auto-incrementing registration numbers.

### 3.3 User Model (`models/User.js`)
- `full_name`: String, required.
- `username`: String, required, unique, indexed.
- `email`: String, optional, lowercase, indexed.
- `password`: String, optional (required for local auth, null for Google OAuth).
- `role`: String, required, enum `['employee', 'head']`, default `'employee'`.
- `status`: String, required, enum `['active', 'blocked', 'pending']`, default `'active'`.
- `googleId`: String, optional, sparse unique index.
- `avatar`: String, optional.
- `last_login`: Date.
- `created_at`, `updated_at`: Timestamps.

### 3.4 Audit Log Model (`models/AuditLog.js`)
- `user_id`: ObjectId ref User.
- `user_name`: String.
- `user_role`: String.
- `action`: String, required (e.g., `LOGIN`, `LOGOUT`, `CASE_CREATE`, `CASE_UPDATE`, `CASE_ARCHIVE`, `EXPORT_EXCEL`, `EXPORT_PDF`, `ROLE_CHANGE`, `USER_STATUS_CHANGE`).
- `target_type`: String (e.g., `CASE`, `USER`, `SYSTEM`).
- `target_id`: String (e.g., `JVD-2026-0001` or username).
- `details`: Object / String.
- `ip_address`: String.
- `timestamp`: Date, default `Date.now`, indexed.

---

## 4. Role-Based Access Control (RBAC)

### 4.1 HEAD Administrator
- Access Dashboard with full organizational statistics and charts.
- Create new cases.
- View, search, and filter all cases.
- Edit any case details and update statuses.
- Archive or restore cases.
- Export filtered records to Excel and PDF.
- Access Administration Portal (`/admin`):
  - View all registered staff accounts.
  - Change staff roles (`employee` <-> `head`).
  - Activate or block staff accounts.
  - View and filter complete system Audit Logs.
- Setup: First administrator configured via `HEAD_ADMIN_EMAIL` in `.env` or automatic bootstrap.

### 4.2 EMPLOYEE
- Access Dashboard with permitted statistics, quick actions, and recent rescues.
- Create new cases with automatic registration number generation.
- Search and lookup case records by registration number, caller, contact, species.
- View case details and print hospital medical sheets.
- Update permitted medical treatment, status, and notes.
- Cannot export database sheets, cannot archive cases, cannot access user admin or audit logs.

---

## 5. Endpoints & Route Structure

### Web Routes:
- `GET /` — Home page with JVD hospital branding, services, helpline, and CRM portal link.
- `GET /dashboard` — CRM Dashboard with live DB metrics, quick actions, recent activity.
- `GET /login` — Login page (Google OAuth + Staff credentials).
- `POST /login` — Local login handler.
- `GET /register` — Staff registration / onboarding page.
- `POST /register` — Local registration handler (safeguarded role assignment).
- `GET /logout` — Logout handler with audit log.
- `GET /profile` — Staff profile, role, status, and activity overview.
- `GET /entry` — Case entry form (New & Edit modes) with auto-assigned reg number.
- `POST /entry/save` — Save new case endpoint.
- `POST /entry/update` — Update case endpoint.
- `GET /entry/lookup` — Case lookup by Reg No.
- `GET /view` — View records page with advanced multi-parameter filtering, search, sorting, pagination, and details modal.
- `GET /print/:reg_no` — Printable hospital case sheet formatted for standard A4 printing.
- `GET /success/:reg_no` — Post-submission confirmation page with quick actions.
- `GET /admin` — Head Administrator portal for user management and audit trails.

### API Routes:
- `GET /api/health` — System status, DB connectivity, uptime.
- `GET /api/cases` — Filtered, searched, paginated cases query.
- `GET /api/cases/:reg_no` — Single case details.
- `PUT /api/cases/:reg_no/status` — Quick status update endpoint.
- `DELETE /api/cases/:reg_no` — Archive case endpoint (HEAD only).
- `GET /api/dashboard/stats` — Live aggregated counts (Total, Under Treatment, Site Treatment, JVD Treatment, Release, Death, Run Away, Domestic vs Wild).
- `GET /api/dashboard/recent` — Recent 10 case submissions.
- `GET /api/export/excel` — Filtered Excel download (HEAD only).
- `GET /api/export/pdf` — Filtered PDF report download (HEAD only).
- `GET /api/users` — Staff list for admin (HEAD only).
- `PUT /api/users/:id/role` — Update role (HEAD only).
- `PUT /api/users/:id/status` — Activate/block account (HEAD only).
- `GET /api/audit-logs` — Audit logs query with pagination (HEAD only).

---

## 6. UI/UX & Responsive Design Integrity

- Preserve existing JVD visual identity:
  - Logo (`JVD_logo.jpeg`).
  - Color palette: Deep forest green (`#163d2e`, `#0d271d`), Warm amber/gold accents (`#f59e0b`), Clean slate neutrals.
  - Unified navbar with active link highlight, staff badge, role pill, and mobile toggle.
  - Unified footer status bar with helpline `97272-97187`, email `info@edufunfoundation.in`, and official address.
- Clear empty, loading, success, and error states on all async operations.
- Accessible form controls with proper ARIA attributes, labels, keyboard focus rings, and validation indicators.
