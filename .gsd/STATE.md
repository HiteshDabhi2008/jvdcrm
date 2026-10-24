# JVD CRM — Project State & Session Memory

## Current Status
- **Current Phase**: Phase 12 & Final Acceptance Criteria — COMPLETED
- **Branch**: main
- **Last Verification**: 
  - `npm test`: All 13/13 API & integration tests passed.
  - `npm run test:models`: All model schemas and concurrent atomic registration tests passed.
  - `npm run test:templates`: All 10 HTML/Nunjucks templates rendered with 100% PASS.
  - Legacy `scripts/integration_test.js`: All 8/8 tests passed.

## Completed Milestones
1. **Audit & Specification**: Full audit of existing templates, scripts, models, and dependencies; created `.gitignore`; created `.gsd/SPEC.md` and `.gsd/ROADMAP.md`.
2. **Database Models & Atomic Counters**:
   - `models/User.js`: Roles (`employee`, `head`), account status (`active`, `blocked`), avatar, last_login.
   - `models/Case.js`: Validations, statuses, archive flag, compound indexes.
   - `models/Counter.js`: Concurrency-safe atomic `getNextRegNo()` sequence generator (`JVD-YYYY-0001`).
   - `models/AuditLog.js`: Full security and action tracking.
3. **Modular Backend Architecture**:
   - `middleware/security.js`: Helmet CSP and query sanitizer.
   - `middleware/rateLimiter.js`: Auth and API rate limiters.
   - `middleware/auth.js` & `middleware/rbac.js`: Session and role guards.
   - `middleware/errorHandler.js`: Safe centralized error handler.
   - `services/auditService.js` & `services/exportService.js`: ExcelJS & PDFKit.
   - Controllers: `caseController.js`, `dashboardController.js`, `exportController.js`, `adminController.js`, `authController.js`.
   - Routes: `routes/apiRoutes.js` and `routes/webRoutes.js`.
4. **Google Authentication & Role Access**: Google OAuth 2.0 with organizational domain check (`@edufunfoundation.in`), local credentials fallback, secure session cookies, initial Head administrator bootstrapping.
5. **UI Pages & Components**:
   - `index.html`: Responsive homepage with JVD branding and CRM portal links.
   - `dashboard.html`: Live DB aggregation metrics, recent cases table, quick actions.
   - `entry.html`: Multi-section intake form, atomic reg number badge, auto-load on `?reg_no=`, reset dialog, double-submit protection.
   - `view.html`: Universal search, combined filters, server-side pagination, details modal, quick status change, Excel/PDF downloads.
   - `print_case.html`: Printable A4 medical case sheet.
   - `success.html`: Post-submission confirmation with instant print action.
   - `profile.html`: Staff profile, role pill, account status, security details.
   - `admin.html`: Head admin portal with staff user management (role assignment, account blocking) and audit logs viewer.
6. **Documentation & Deployment**:
   - `README.md`: Complete architecture overview, feature list, local setup guide, and free-tier deployment guide for Render/Railway and MongoDB Atlas M0.
   - `.env.example`: Clear environment variables template.
