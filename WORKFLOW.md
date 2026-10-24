# Jivdaya Vatsalya Dham (JVD CRM) — Master System Workflow & Operational Playbook

> **Veterinary Care Record Management System**  
> **Edufun Foundation Trust • Registration No. E/1897/BK**  
> **Helpline:** 97272-97187 &bull; **Email:** info@edufunfoundation.in  
> **Official Web App:** http://127.0.0.1:5000 &bull; **GitHub Repository:** [https://github.com/HiteshDabhi2008/jvdcrm](https://github.com/HiteshDabhi2008/jvdcrm)

---

## 1. System Overview & Zero-Cost Architecture

The JVD CRM is a full-stack, production-grade veterinary clinical care record management system built with 100% free and open-source software, requiring zero subscriptions or paid tiers.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (HTML5 / CSS3 / JS)                         │
│   Home (/)  •  Dashboard (/dashboard)  •  Entry (/entry)  •  Records (/view)  │
│   Print (/print/:id)  •  Admin (/admin)  •  Profile (/profile)  •  Auth Pages  │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │ HTTP / REST / Sessions
┌──────────────────────────────────────▼─────────────────────────────────────────┐
│                     BACKEND (Node.js v18+ & Express.js)                        │
│   • Security: Helmet (CSP, script-src-attr), express-rate-limit, Sanitizers    │
│   • Auth: Google OAuth 2.0 (@edufunfoundation.in) + Secure Cookie Sessions     │
│   • RBAC: HEAD vs. CARE EMPLOYEE Permission Matrix                             │
│   • Sequence Engine: Concurrency-Safe Atomic Counter (models/Counter.js)       │
│   • Document Streams: ExcelJS (.xlsx) & PDFKit (.pdf A4 Landscape)             │
│   • Audit Logging: Immutable Event Tracker (models/AuditLog.js)                │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │ Mongoose ODM v9
┌──────────────────────────────────────▼─────────────────────────────────────────┐
│                    DATABASE (MongoDB Local or MongoDB Atlas M0)                │
│   Collections: users, cases, counters, auditlogs                               │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Total Website Workflow (Step-by-Step)

### Flow 1: Public Welcome & Organization Portal (`/`)
- **Route:** `GET /` &bull; **Template:** `index.html`
- **Access:** Public (all visitors).
- **Functionality:**
  - Presents JVD branding, hospital photo, 24/7 emergency helpline (`97272-97187`), and office address.
  - Highlights core services: 24/7 Animal Rescue, Structured Case Admission, Veterinary Clinical Treatment, and Real-Time Records.
  - Public navigation drawer with responsive mobile hamburger toggle.
  - Direct call-to-action buttons: **"Staff Sign In"** and **"Staff Register"** (or **"Go to Dashboard"** if already logged in).

---

### Flow 2: Compulsory Google Workspace Onboarding (`/register`)
- **Route:** `GET /register` &bull; **Template:** `register.html`
- **Access:** Guest only.
- **Rule:** **Compulsory Google Workspace SSO.** Arbitrary/manual username-password registration is permanently disabled.
- **Onboarding Steps:**
  1. User navigates to `/register`.
  2. The page displays the official notice: `🔒 Compulsory: Official @edufunfoundation.in Accounts Only`.
  3. Staff clicks **"Register & Onboard with Google (@edufunfoundation.in)"**.
  4. User is redirected to Google OAuth consent screen (`/auth/google`).
  5. **Domain Validation:** Backend strictly checks that the authenticated email ends with `@edufunfoundation.in`. Any personal Gmail or third-party email is instantly rejected.
  6. **Automated User Provisioning:**
     - First registered user or matching `HEAD_ADMIN_EMAIL` receives the **HEAD** administrator role.
     - Subsequent staff members are automatically provisioned with the **CARE EMPLOYEE** role and `active` status.
     - Profile avatar, name, and email are saved into MongoDB.
     - An audit record `USER_REGISTRATION` is committed to the immutable audit trail.
  7. Staff is logged in with secure server session cookies and redirected to the Dashboard.

---

### Flow 3: Staff Sign-In (`/login`)
- **Route:** `GET /login`, `POST /login` &bull; **Template:** `login.html`
- **Access:** Guest only.
- **Primary Method:** **"Continue with Google Workspace (@edufunfoundation.in)"**.
- **Secondary/Bootstrap Method:** Local staff credential login for existing bootstrap accounts.
- **Session Security:**
  - Passwords hashed with `bcrypt` (10 rounds).
  - Suspended accounts (`status: 'blocked'`) are rejected with a clear administrative message.
  - Rate-limited to prevent brute-force attempts (30 requests / 15 minutes).
  - Session cookies configured with `httpOnly: true`, `sameSite: 'lax'`, and 24-hour expiration.

---

### Flow 4: Real-Time Analytics Dashboard (`/dashboard`)
- **Route:** `GET /dashboard`, `GET /api/dashboard/stats` &bull; **Template:** `dashboard.html`
- **Access:** Authenticated Staff (`EMPLOYEE` and `HEAD`).
- **Functionality:**
  - Real-time MongoDB aggregation pipeline (`$facet`) computing live database metrics:
    - **Total Admissions**
    - **Cases Under Treatment**
    - **Site-Treated Cases**
    - **JVD Hospital Admissions**
    - **Released / Recovered Cases**
    - **Mortality (Death) Count**
    - **Run Away Count**
    - **Domestic vs. Wild Animal Classification Ratio**
  - **Recent Rescues Table:** Displays the 8 latest admissions with live status badges, dates, and direct links.
  - **Quick Action Bar:** One-click shortcuts for New Admission, View Records, Excel Download, PDF Download, and Admin Portal.

---

### Flow 5: Veterinary Case Admission (`/entry`)
- **Route:** `GET /entry`, `POST /api/cases`, `GET /entry/lookup` &bull; **Template:** `entry.html`
- **Access:** Authenticated Staff.
- **Step-by-Step Form Walkthrough:**
  1. **Registration Number Assignment:** The top banner displays the next sequential registration number assigned automatically upon submission (e.g. `JVD-2026-0005`).
  2. **Card 1 — Caller & Incident Location:**
     - Caller Name, 10-digit Contact Number (validated on client & server).
     - Village / Area, City / Taluka, District (`Banaskantha`), State (`Gujarat`).
  3. **Card 2 — Animal Classification & Species:**
     - **Animal Classification:** Select `Domestic` or `Wild`.
     - **Species Dropdown:** Automatically populates with curated species:
       - *Domestic:* Cow, Dog, Buffalo, Calf, Goat, Sheep, Horse, Donkey, Cat, Kitten, Ox, Rabbit, Birds, etc.
       - *Wild:* Nilgai, Monkey, Snake, Peacock, Deer, Leopard, Monitor Lizard, Owl, Eagle, etc.
     - **Custom Species ("Other"):** If staff selects **"Other"**, an input box dynamically appears allowing manual entry of any specific animal/bird (e.g. *Camel, Star Tortoise, Falcon*).
     - **Gender / Sex:** `Male`, `Female`, or `Unknown`.
  4. **Card 3 — Incident Cause & Clinical Symptoms:**
     - Detailed cause of injury/illness (e.g. *Hit by vehicle on highway, severe horn fracture, dehydration, dog bite*).
     - Detailed clinical observations / discrimination notes.
  5. **Card 4 — Treatment Administered & Case Status:**
     - Select Initial Status: `Under Treatment`, `Site Treatment`, `JVD Treatment`, `Release`, `Death`, `Run Away`.
     - Clinical treatment given (medicines administered, dressing, suture, antiseptic injection).
     - Voluntary financial contribution (if any).
  6. **Submission & Concurrency Protection:**
     - Double-click prevention disables submit button with loading spinner.
     - Handled by `models/Counter.js` using atomic `findOneAndUpdate({ $inc: { seq: 1 } })` to guarantee **zero duplicate numbers** even under simultaneous submissions.
     - Creates audit log `CASE_CREATE`.
     - Redirects to Success Confirmation (`/success/:reg_no`) with a printable card link.

---

### Flow 6: Records Search, Filtering & Management (`/view`)
- **Route:** `GET /view`, `GET /api/cases` &bull; **Template:** `view.html`
- **Access:** Authenticated Staff.
- **Search & Filter Capabilities:**
  - **Universal Text Search:** Searches Registration Number, Caller Name, Contact Number, and Species simultaneously.
  - **Animal Type Filter:** `All`, `Domestic`, `Wild`.
  - **Case Status Filter:** `All`, `Under Treatment`, `Site Treatment`, `JVD Treatment`, `Release`, `Death`, `Run Away`.
  - **Date Range Filters:** Start Date (`start_date`) and End Date (`end_date`).
  - **Server-Side Pagination:** 10, 25, 50, or 100 records per page.
  - **Active Filter Counter & Reset:** Real-time badge showing active filter count and a one-click "Clear All Filters" button.
- **Interactive Actions:**
  - **View Details Modal:** Opens a rich popup showing all caller, animal, clinical, and audit timestamps.
  - **Quick Status Changer:** Allows updating patient recovery status directly from the table with automatic audit tracking.
  - **Print Record:** Opens the streamlined hospital printable sheet (`/print/:reg_no`).
  - **Edit Case:** Pre-loads the case into the admission form (`/entry?reg_no=...`).

---

### Flow 7: Streamlined Single-Page Clinical Sheet Printing (`/print/:reg_no`)
- **Route:** `GET /print/:reg_no` &bull; **Template:** `print_case.html`
- **Access:** Authenticated Staff.
- **Layout Highlights:**
  - Formatted specifically for standard A4 portrait paper (`@media print` clean single-page layout).
  - Displays actual stored database values: Reg No, Admission Date, Status Badge, Animal Classification, Patient Profile, Rescuer details, Cause, and Full Clinical Treatment.
  - Replaced the old 12-row empty grid with a compact 3-row clinical progress box.
  - Signature blocks for Prepared By Staff, Attending Veterinarian, and Authorized Signatory.
  - Buttons for **"🖨 Print / Save as PDF"** and **"📸 Screenshot PNG"**.

---

### Flow 8: Filtered Excel & PDF Data Exports (`/api/export/*`)
- **Routes:** `GET /api/export/excel`, `GET /api/export/pdf` &bull; **Service:** `services/exportService.js`
- **Access:** `HEAD` Administrator Only (RBAC enforced).
- **Excel (.xlsx):**
  - Generated using `exceljs`.
  - Dark forest-green header row with white bold text, alternating row fills, and formatted columns.
  - Exports the **currently filtered dataset** (respecting search, date ranges, species, and status).
- **PDF (.pdf):**
  - Streamed directly via `pdfkit` (A4 landscape orientation).
  - Features official trust header, generation timestamp, filter criteria summary, tabular case listings, and page numbering (`Page X of Y`).
  - Audited automatically (`EXPORT_EXCEL` / `EXPORT_PDF`).

---

### Flow 9: Head Administration Portal (`/admin`)
- **Route:** `GET /admin`, `GET /api/users`, `PUT /api/users/:id/role`, `PUT /api/users/:id/status`, `GET /api/audit-logs` &bull; **Template:** `admin.html`
- **Access:** `HEAD` Administrator Only.
- **Features:**
  1. **Staff User Management:**
     - View all registered staff profiles (Name, Username, Email, Role, Status, Last Login).
     - Promote/demote staff between `Care Employee` and `Head Administrator`.
     - Activate or suspend/block accounts with instant session invalidation.
  2. **Immutable Audit Trail:**
     - Searchable and paginated logs capturing every critical system action:
       `LOGIN`, `LOGOUT`, `USER_REGISTRATION`, `CASE_CREATE`, `CASE_UPDATE`, `CASE_STATUS_CHANGE`, `CASE_ARCHIVE`, `EXPORT_EXCEL`, `EXPORT_PDF`, `USER_ROLE_CHANGE`, `USER_STATUS_CHANGE`.
     - Logs record actor name, IP address, target record ID, and exact timestamp.

---

### Flow 10: Staff Profile & Session (`/profile`)
- **Route:** `GET /profile` &bull; **Template:** `profile.html`
- **Access:** Authenticated Staff.
- **Functionality:** Displays full name, username, official email, assigned role badge, account standing, and session details with a clean Logout button.

---

## 3. Operational Runbook: What to Do When Something Does Not Work

This section provides direct, step-by-step actions for any operational scenario or error.

---

### Problem 1: "Google Sign-In says: Google OAuth 2.0 is not configured on this server"
- **Cause:** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are not set in `.env`.
- **Action to Take (100% Free Setup):**
  1. Go to the free [Google Cloud Console](https://console.cloud.google.com/).
  2. Create a project named **`JVD-CRM`**.
  3. Navigate to **APIs & Services > OAuth consent screen**:
     - User Type: **Internal** (if using Google Workspace for `@edufunfoundation.in`) or **External** (in Testing mode).
     - App Name: `Jivdaya Vatsalya Dham CRM`.
     - Support Email: `info@edufunfoundation.in`.
  4. Navigate to **APIs & Services > Credentials > Create Credentials > OAuth client ID**:
     - Application type: **Web application**.
     - Name: `JVD CRM Web Client`.
     - **Authorized redirect URIs (Crucial):**
       - For local development: `http://127.0.0.1:5000/auth/google/callback`
       - For production: `https://your-domain.com/auth/google/callback`
  5. Click **Create** and copy your **Client ID** and **Client Secret**.
  6. Open `.env` in the project root and paste them:
     ```bash
     GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
     GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret"
     GOOGLE_CALLBACK_URL="http://127.0.0.1:5000/auth/google/callback"
     ALLOWED_DOMAIN="edufunfoundation.in"
     ```
  7. Restart the server (`node server.js`). Google Workspace authentication will now be fully active!

---

### Problem 2: "Access restricted: Only @edufunfoundation.in accounts are authorized"
- **Cause:** The user attempted to log in or register with a personal `@gmail.com` or non-organizational email account.
- **Action to Take:**
  - This is an intentional security feature requested for the JVD system. Staff **must** use their official `@edufunfoundation.in` Google Workspace email.
  - **Testing with another domain:** If you need to test authentication with a different domain during testing (e.g. `@gmail.com` or your own test domain), edit `.env`:
    ```bash
    ALLOWED_DOMAIN="gmail.com"
    ```
    Or leave it blank to allow any Google account:
    ```bash
    ALLOWED_DOMAIN=""
    ```
  - For production, keep `ALLOWED_DOMAIN="edufunfoundation.in"`.

---

### Problem 3: "Staff member registered but cannot access Admin Panel or Exports"
- **Cause:** By default, all new staff are registered with the **`Care Employee`** role to prevent unauthorized administrative actions and data downloads.
- **Action to Take:**
  - **Method A (Via Admin Portal):**
    1. A Head Administrator logs in and opens [http://127.0.0.1:5000/admin](http://127.0.0.1:5000/admin).
    2. Under **Staff Directory**, find the employee.
    3. Click **"Promote to Head"**. The user immediately gains Head privileges.
  - **Method B (Via Environment Variable):**
    1. Set the email in `.env`:
       ```bash
       HEAD_ADMIN_EMAIL="doctor.name@edufunfoundation.in"
       ```
    2. Any user registering with that specific email will automatically be granted the **HEAD** role.

---

### Problem 4: "Database connection failed / MongoServerError / ECONNREFUSED"
- **Cause:** The local MongoDB service is stopped or MongoDB Atlas URI has invalid credentials.
- **Action to Take:**
  - **If using local MongoDB on Windows:**
    Open PowerShell as Administrator and run:
    ```powershell
    net start MongoDB
    ```
    Or start it manually:
    ```powershell
    mongod --dbpath "C:\data\db"
    ```
  - **If using free MongoDB Atlas cloud cluster:**
    1. Check `.env` contains your correct URI:
       ```bash
       MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/jvd_crm?retryWrites=true&w=majority"
       ```
    2. In MongoDB Atlas, go to **Network Access** and ensure your IP is whitelisted (or `0.0.0.0/0` is allowed).
    3. Verify your database username and password in **Database Access**.

---

### Problem 5: "Port 5000 is already in use (EADDRINUSE)"
- **Cause:** Another instance of Node.js or another application is already listening on port 5000.
- **Action to Take:**
  - **Option 1: Switch Port in `.env`:**
    Change `PORT` in `.env`:
    ```bash
    PORT=5001
    ```
    Then visit `http://127.0.0.1:5001/`.
  - **Option 2: Terminate existing process in PowerShell:**
    ```powershell
    # Find process ID listening on port 5000
    Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
    ```

---

### Problem 6: "The species I want to register is not in the dropdown list"
- **Cause:** The animal or bird is an uncommon or regional species.
- **Action to Take:**
  1. On the Case Entry page (`/entry`), in Card 2, select **"Domestic"** or **"Wild"**.
  2. In the **Species Name** dropdown, select **"Other"**.
  3. A new text input **"Custom / Other Species"** appears immediately.
  4. Type the exact species name (e.g. *Camel, Star Tortoise, Peregrine Falcon, Hedgehog*).
  5. When you click **Save & Register Case**, the system records the custom species into the database. It will be fully searchable and exportable.

---

### Problem 7: "Excel or PDF download gives: 403 Forbidden"
- **Cause:** The logged-in staff member has the `EMPLOYEE` role. Per organizational security specifications, bulk data exports are restricted to `HEAD` administrators to protect caller contact details and animal incident locations.
- **Action to Take:**
  - Log in with a `HEAD` account, or have the trust administrator promote your account to `HEAD` in `/admin`.

---

### Problem 8: "Printing layout looks skewed or spans across multiple pages"
- **Cause:** Browser print margins or headers/footers are interfering with the A4 layout.
- **Action to Take:**
  1. On the print page (`/print/:reg_no`), click **"🖨 Print / Save as PDF"**.
  2. In the Chrome/Edge print preview dialog:
     - **Destination:** Save as PDF (or select your physical printer).
     - **Layout:** Portrait.
     - **Paper Size:** A4.
     - **Margins:** Set to **"Default"** or **"None"**.
     - **Options:** Uncheck "Headers and footers" to avoid browser URLs printing over the document.
  3. The page will render as a single clinical sheet.
  4. Alternatively, click the **"📸 Screenshot"** button to download a high-resolution PNG image card.

---

### Problem 9: "Session expired or logged out unexpectedly"
- **Cause:** Session cookies expire after 24 hours of inactivity for hospital data protection.
- **Action to Take:**
  - Re-login at `http://127.0.0.1:5000/login` via Google Workspace.
  - To adjust the session duration, change `maxAge` in `server.js` (line 50):
    ```javascript
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
    ```

---

## 4. Zero-Cost Cloud Deployment (Production Runbook)

To host the JVD CRM for actual hospital staff online at zero monthly cost:

### Step 1: Free Database (MongoDB Atlas M0)
1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/).
2. Create a free **M0 Sandbox** cluster (512MB storage, forever free).
3. Under **Database Access**, create a user (e.g. `jvd_admin`).
4. Under **Network Access**, add IP `0.0.0.0/0` (allows cloud host to connect).
5. Copy the connection string into your production environment variables as `MONGODB_URI`.

### Step 2: Free Web Service Hosting (Render.com)
1. Create a free account at [render.com](https://render.com/).
2. Click **New > Web Service** and connect your GitHub repository:
   `https://github.com/HiteshDabhi2008/jvdcrm`
3. Configure service:
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free` (0.1 CPU, 512MB RAM)
4. Add **Environment Variables** in Render dashboard:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `SESSION_SECRET`: `[generate a random 64-char string]`
   - `MONGODB_URI`: `mongodb+srv://...` (from Step 1)
   - `GOOGLE_CLIENT_ID`: `your-client-id.apps.googleusercontent.com`
   - `GOOGLE_CLIENT_SECRET`: `your-client-secret`
   - `GOOGLE_CALLBACK_URL`: `https://your-service.onrender.com/auth/google/callback`
   - `ALLOWED_DOMAIN`: `edufunfoundation.in`
   - `HEAD_ADMIN_EMAIL`: `info@edufunfoundation.in`
5. Click **Deploy Web Service**. Render provides free automatic SSL HTTPS (`https://your-service.onrender.com`).
6. Update your Google Cloud Console OAuth redirect URI to include `https://your-service.onrender.com/auth/google/callback`.

---

## 5. System Health Check & Test Commands

Run these automated verification commands in PowerShell whenever you update code or dependencies:

```powershell
# 1. Run Complete Automated API & End-to-End Test Suite (13 Suites)
npm test

# 2. Test Atomic Registration Number Concurrency (10 Parallel Submissions)
node scripts/test_models.js

# 3. Test All 10 HTML/Nunjucks Templates Rendering
node scripts/test_templates.js

# 4. Check Real-Time Server Health Endpoint
curl.exe http://127.0.0.1:5000/api/health
```

---

*Document compiled and maintained for Edufun Foundation Trust • Jivdaya Vatsalya Dham CRM.*
