# JVD CRM — Phased Development Roadmap

This roadmap structures the end-to-end implementation of the Jivdaya Vatsalya Dham (JVD) Veterinary Care Record Management System.

---

## Phase 1: Existing Project Audit & Specification [COMPLETED]
- [x] Inspect all existing files, templates, styles, and data.
- [x] Identify gaps, missing features, duplicate components, and security weaknesses.
- [x] Setup `.gitignore` to protect `.env` and node_modules.
- [x] Commit clean baseline to Git.
- [x] Define finalized `.gsd/SPEC.md`.

## Phase 2: Database Models & Atomic Registration Counter [COMPLETED]
- [x] Implement enhanced `models/User.js` (roles, status `active`/`blocked`, avatar, timestamps).
- [x] Implement enhanced `models/Case.js` (strict enums, `is_archived`, created_by, indexing).
- [x] Implement `models/Counter.js` for atomic, race-condition-free `JVD-YYYY-NNNN` registration numbers.
- [x] Implement `models/AuditLog.js` for comprehensive compliance and action tracking.
- [x] Verified with `scripts/test_models.js`.

## Phase 3: Modular Backend Architecture & Security Middleware [COMPLETED]
- [x] Refactor monolithic `server.js` into modular structure:
  - `middleware/auth.js` (session & Google OAuth check, account status check).
  - `middleware/rbac.js` (permission guards: HEAD vs EMPLOYEE).
  - `middleware/security.js` (Helmet, sanitized queries, secure cookie configs).
  - `middleware/rateLimiter.js` (rate limiting for auth & API).
  - `middleware/errorHandler.js` (centralized error handling without stack leaks).
- [x] Implement controllers:
  - `controllers/authController.js`
  - `controllers/caseController.js`
  - `controllers/dashboardController.js`
  - `controllers/exportController.js`
  - `controllers/adminController.js`
- [x] Implement routes:
  - `/api/health`
  - `/api/auth/me`
  - `/api/cases`
  - `/api/dashboard/stats`
  - `/api/export/excel`
  - `/api/export/pdf`
  - `/api/users`
  - `/api/audit-logs`
- [x] Verified with `scripts/test_api_endpoints.js`.

## Phase 4: Google OAuth 2.0 & Session Management [COMPLETED]
- [x] Wire Google OAuth 2.0 with domain check (`@edufunfoundation.in`).
- [x] Ensure graceful offline fallback for local staff credentials.
- [x] Implement secure session cookie configuration (`httpOnly`, `sameSite`, expiration).
- [x] Implement initial HEAD admin bootstrapping via `HEAD_ADMIN_EMAIL`.
- [x] Enforce account status check (`active` vs `blocked`).

## Phase 5: Common UI Components & Page Enhancements [COMPLETED]
- [x] Harmonize Navigation Bar across all pages (responsive hamburger toggle for mobile).
- [x] Harmonize Status Bar footer across all pages.
- [x] Create Profile & Account area (`profile.html` with user details, role, status).
- [x] Create Head Administration page (`admin.html`) with user management and audit log viewer.
- [x] Add Case Details Modal in View Records.
- [x] Add loading states and double-submit prevention.

## Phase 6: Case Entry, Auto-Registration & Edit Workflows [COMPLETED]
- [x] Connect Case Entry to atomic registration number generator (`JVD-YYYY-0001`).
- [x] Implement frontend and backend validation for all fields.
- [x] Support seamless lookup and editing for authorized users (`?reg_no=` auto-load).
- [x] Add form reset with confirmation dialog.
- [x] Success page with instant medical sheet print action.

## Phase 7: View Records — Search, Filter, Sort & Pagination [COMPLETED]
- [x] Real-time combined multi-parameter filters (from date, to date, contact, animal type, species, status).
- [x] Fast search across reg_no, caller_name, contact_no, species, cause.
- [x] Server-side pagination controls with record counts and page jump.
- [x] Quick status update dropdown directly from records table.
- [x] Case archiving / soft deletion for HEAD administrators.

## Phase 8: Real-Time Aggregated Dashboard [COMPLETED]
- [x] Backend aggregation pipeline for all required statuses:
  - Total cases
  - Under Treatment
  - Site Treatment
  - JVD Treatment
  - Release
  - Death
  - Run Away
  - Domestic vs Wild ratio
- [x] Recent cases live table/feed.
- [x] Quick actions bar for fast intake and lookup.
- [x] Support permitted stats visibility for Employee role.

## Phase 9: Server-Side Excel & PDF Exports [COMPLETED]
- [x] Node.js Excel export via `exceljs` (`/api/export/excel`) formatting filtered records with styled headers and column widths.
- [x] Node.js PDF report export via `pdfkit` (`/api/export/pdf`) with hospital letterhead and layout.
- [x] Retain client-side instant export fallbacks.
- [x] Restrict exports to HEAD administrators.

## Phase 10: Audit Logging Engine [COMPLETED]
- [x] Automatic logging for case creation, edits, status updates, archives, logins, exports, and user administration.
- [x] Audit log viewer in Admin portal with search and filtering.

## Phase 11: End-to-End Verification & Automated Testing [COMPLETED]
- [x] Integration test suite verifying:
  - Database connectivity and models (`npm run test:models`)
  - Concurrent registration number generation (10 parallel promises)
  - User authentication and role guards
  - Case creation, lookup, update, and filtering
  - Export generation (Excel & PDF)
  - Audit logging (`npm test`)
  - Template rendering test (`npm run test:templates`)

## Phase 12: Documentation, Deployment Setup & Handover [COMPLETED]
- [x] Create clear `.env.example` and setup guide.
- [x] Document free-tier deployment options (Render, Railway, Fly.io, MongoDB Atlas).
- [x] Provide production launch checklist in `README.md`.
