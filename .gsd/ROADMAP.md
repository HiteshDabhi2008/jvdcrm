# JVD CRM — Phased Development Roadmap

This roadmap structures the end-to-end implementation of the Jivdaya Vatsalya Dham (JVD) Veterinary Care Record Management System.

---

## Phase 1: Existing Project Audit & Specification [COMPLETED]
- [x] Inspect all existing files, templates, styles, and data.
- [x] Identify gaps, missing features, duplicate components, and security weaknesses.
- [x] Setup `.gitignore` to protect `.env` and node_modules.
- [x] Commit clean baseline to Git.
- [x] Define finalized `.gsd/SPEC.md`.

## Phase 2: Database Models & Atomic Registration Counter
- [ ] Implement enhanced `models/User.js` (roles, status `active`/`blocked`, avatar, timestamps).
- [ ] Implement enhanced `models/Case.js` (strict enums, `is_archived`, created_by, indexing).
- [ ] Implement `models/Counter.js` for atomic, race-condition-free `JVD-YYYY-NNNN` registration numbers.
- [ ] Implement `models/AuditLog.js` for comprehensive compliance and action tracking.

## Phase 3: Modular Backend Architecture & Security Middleware
- [ ] Refactor monolithic `server.js` into modular structure:
  - `middleware/auth.js` (session & Google OAuth check, account status check).
  - `middleware/rbac.js` (permission guards: HEAD vs EMPLOYEE).
  - `middleware/security.js` (Helmet, sanitized queries, secure cookie configs).
  - `middleware/rateLimiter.js` (rate limiting for auth & API).
  - `middleware/errorHandler.js` (centralized error handling without stack leaks).
- [ ] Implement controllers:
  - `controllers/authController.js`
  - `controllers/caseController.js`
  - `controllers/dashboardController.js`
  - `controllers/exportController.js`
  - `controllers/adminController.js`
- [ ] Implement routes:
  - `/api/health`
  - `/api/auth`
  - `/api/cases`
  - `/api/dashboard`
  - `/api/export`
  - `/api/users`
  - `/api/audit-logs`

## Phase 4: Google OAuth 2.0 & Session Management
- [ ] Wire Google OAuth 2.0 with domain check (`@edufunfoundation.in`).
- [ ] Ensure graceful offline fallback for local staff credentials.
- [ ] Implement secure session cookie configuration (`httpOnly`, `sameSite`, expiration).
- [ ] Implement initial HEAD admin bootstrapping via `HEAD_ADMIN_EMAIL`.
- [ ] Enforce account status check (`active` vs `blocked`).

## Phase 5: Common UI Components & Page Enhancements
- [ ] Harmonize Navigation Bar across all pages (responsive hamburger toggle for mobile).
- [ ] Harmonize Status Bar footer across all pages.
- [ ] Create Profile & Account area (`profile.html` or modal with user details, role, status).
- [ ] Create Head Administration page (`admin.html`) with user management and audit log viewer.
- [ ] Add Case Details Modal in View Records.
- [ ] Add toast notification system and loading spinners.

## Phase 6: Case Entry, Auto-Registration & Edit Workflows
- [ ] Connect Case Entry to atomic registration number generator (`JVD-YYYY-0001`).
- [ ] Implement frontend and backend validation for all fields.
- [ ] Support seamless lookup and editing for authorized users.
- [ ] Add form reset with confirmation dialog.
- [ ] Success page with instant medical sheet print action.

## Phase 7: View Records — Search, Filter, Sort & Pagination
- [ ] Real-time combined multi-parameter filters (from date, to date, contact, animal type, species, status).
- [ ] Fast search across reg_no, caller_name, contact_no, species, cause.
- [ ] Pagination controls with record counts and page jump.
- [ ] Quick status update dropdown directly from records table.
- [ ] Case archiving / soft deletion for HEAD administrators.

## Phase 8: Real-Time Aggregated Dashboard
- [ ] Backend aggregation pipeline for all required statuses:
  - Total cases
  - Under Treatment
  - Site Treatment
  - JVD Treatment
  - Release
  - Death
  - Run Away
  - Domestic vs Wild ratio
- [ ] Recent cases live table/feed.
- [ ] Quick actions bar for fast intake and lookup.
- [ ] Support permitted stats visibility for Employee role.

## Phase 9: Server-Side Excel & PDF Exports
- [ ] Node.js Excel export via `exceljs` (`/api/export/excel`) formatting filtered records with styled headers and column widths.
- [ ] Node.js PDF report export via `pdfkit` (`/api/export/pdf`) with hospital letterhead and layout.
- [ ] Retain client-side instant export fallbacks.
- [ ] Restrict exports to HEAD administrators.

## Phase 10: Audit Logging Engine
- [ ] Automatic logging for case creation, edits, status updates, archives, logins, exports, and user administration.
- [ ] Audit log viewer in Admin portal with search and filtering.

## Phase 11: End-to-End Verification & Automated Testing
- [ ] Integration test suite verifying:
  - Database connectivity and models
  - Concurrent registration number generation
  - User authentication and role guards
  - Case creation, lookup, update, and filtering
  - Export generation
  - Audit logging
- [ ] Manual browser / curl verification of all endpoints and pages.

## Phase 12: Documentation, Deployment Setup & Handover
- [ ] Create clear `.env.example` and setup guide.
- [ ] Document free-tier deployment options (Render, Railway, Fly.io, MongoDB Atlas).
- [ ] Provide production launch checklist.
