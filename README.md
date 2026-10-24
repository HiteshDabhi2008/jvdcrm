# Jivdaya Vatsalya Dham (JVD) — Veterinary Care CRM

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-brightgreen.svg)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Jivdaya Vatsalya Dham (JVD)** is a real-world Veterinary Hospital, Shelter House, and 24/7 Animal Rescue Center operated by **Edufun Foundation Trust** in Samarvada / Dhanera, Banaskantha, Gujarat.

This repository provides a complete, production-grade, secure Veterinary Record Management System built with **Node.js, Express.js, MongoDB (Mongoose), Google OAuth 2.0, Helmet, ExcelJS, and PDFKit**, built strictly using free and open-source software (FOSS).

---

## 🚀 Key Features

### 1. Hospital Dashboard
- **Real-Time Database Aggregation**: Dynamically calculates counts for:
  - Total Rescues
  - Under Treatment
  - Site Treatment
  - JVD Treatment
  - Released Animals
  - Casualties / Death
  - Run Away / Escaped
  - Domestic vs Wild Wildlife ratio
- **Recent Rescues Feed**: Displays the latest 8 case admissions with instant status pills and quick actions.
- **Role-Aware Views**: Permitted metrics and quick triage actions available to both Care Employees and Head Administrators.

### 2. Case Intake & Auto-Registration
- **Concurrency-Safe Registration Numbers**: Atomically generates sequential annual numbers (e.g. `JVD-2026-0001`, `JVD-2026-0002`). Zero risk of duplicate assignment under simultaneous submissions.
- **Dynamic Classification & Species**: Categorizes domestic (dogs, cows, goats, birds, etc.) and wild animals (Nilgai, monkeys, leopards, deer, etc.) with automated species auto-population.
- **Address & Caller Intake**: 10-digit mobile validation, caller details, village, city, district, and cause of injury.
- **Real-time Lookup & Edit**: Quickly load and edit any existing case by Registration Number without losing previous medical notes.

### 3. Advanced Records Engine & Query System
- **Universal Multi-Field Search**: Searches instantaneously across registration number, caller name, contact number, species, and incident cause.
- **Combined Filtering**: Date ranges (from/to), contact number, animal type, species, and clinical status work together seamlessly.
- **True Server-Side Pagination**: High-efficiency paginated queries for large datasets with configurable items per page (15, 25, 50, 100).
- **Case Details Modal**: Clean modal dialog presenting full triage history, timestamps, doctor notes, and immediate print action.
- **Quick Status Updates**: Update case status directly from the records table.

### 4. Official Hospital Exports (Excel & PDF)
- **Node.js Server-Side Excel Export (`exceljs`)**: Downloads formatted `.xlsx` workbooks of currently filtered cases with styled headers, alternating row colors, auto-fit column widths, and metadata.
- **Node.js Server-Side PDF Export (`pdfkit`)**: Streams official A4 landscape medical reports with official hospital banner, registration tables, timestamps, and page numbers.
- **Printable Medical Case Sheet (`/print/:reg_no`)**: Dedicated A4 printable case sheet matching official hospital stationery for physical patient files.

### 5. Authentication & Role-Based Access Control (RBAC)
- **Google OAuth 2.0 Integration**: Sign in with Google Workspace. Configurable domain restriction (`@edufunfoundation.in`).
- **Internal Staff Credentials**: Bcrypt-hashed password authentication with work factor 10 for offline or local staff setups.
- **Roles**:
  - `head`: Full administrator privileges (Case creation, editing, viewing, exports, staff user management, audit logs).
  - `employee`: Care staff privileges (Case intake, lookup, search, status updates, printing medical sheets).
- **Secure Bootstrap**: The designated initial administrator (`HEAD_ADMIN_EMAIL`) or the first registered user receives Head status automatically. Subsequent registrations default securely to Employee.

### 6. Administration Portal & Compliance Audit Trails
- **Staff User Management (`/admin`)**: Head administrators can inspect all staff accounts, promote/demote roles (`employee` <-> `head`), and activate or suspend accounts.
- **Comprehensive Audit Logs**: Automatically tracks logins, logouts, case creation, updates, status changes, archives, exports, and user administration with timestamp, acting user, target ID, and IP address.

### 7. Security Hardening
- **Helmet**: Production-grade Content Security Policy (CSP), frameguard, XSS filter, and HSTS headers.
- **Rate Limiting**: Protects authentication and public API endpoints against brute force and DoS attacks.
- **Secure Sessions**: Signed cookies with `httpOnly: true`, `sameSite: 'lax'`, and production `secure` flags.
- **NoSQL Query Sanitization**: Protects against MongoDB operator injections (`$gt`, `$ne`, etc.) and ReDoS regex attacks.

---

## 🛠 Technology Stack

- **Runtime**: Node.js (v18+)
- **Server Framework**: Express.js (v5.x)
- **Database**: MongoDB (Local or MongoDB Atlas M0 Free Tier)
- **ODM**: Mongoose (v9.x)
- **Templating**: Nunjucks (compatible with Jinja2 syntax)
- **Security**: Helmet, express-rate-limit, bcrypt, express-session, connect-flash, cookie-parser
- **Spreadsheets**: ExcelJS
- **PDF Generation**: PDFKit
- **Styling**: Vanilla CSS3 design system with custom CSS variables (Zero Tailwind dependencies)

---

## 💻 Local Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally, OR a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster URI.

### Step 1: Clone and Install Dependencies
```bash
git clone https://github.com/edufun-foundation/jvd_complete.git
cd jvd_complete
npm install
```

### Step 2: Configure Environment Variables
Copy the template file to `.env`:
```bash
cp .env.example .env
```
Open `.env` in any text editor and adjust values if needed:
```env
PORT=5000
NODE_ENV=development
SESSION_SECRET=jvd_edufun_dev_2026_super_secret_session_key
MONGODB_URI=mongodb://127.0.0.1:27017/jvd_crm
ALLOWED_DOMAIN=edufunfoundation.in
HEAD_ADMIN_EMAIL=info@edufunfoundation.in
```

### Step 3: Run the Server
```bash
npm start
```
Visit the website at: **`http://127.0.0.1:5000`**

---

## 🧪 Testing

Run the automated test suites:
```bash
# Run comprehensive API & End-to-End integration tests
npm test

# Run atomic counter and database model validation tests
npm run test:models

# Run template rendering validation tests
npm run test:templates
```

---

## 🌐 Free Tier Cloud Deployment Guide

This application is designed to run within free tiers of popular hosting providers.

### 1. Database: MongoDB Atlas (M0 Free Cluster)
1. Sign up for a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create an **M0 Free Shared Cluster** in your closest region (e.g. AWS Mumbai or us-east).
3. Under **Database Access**, create a database user and password.
4. Under **Network Access**, whitelist `0.0.0.0/0` (Allow Access from Anywhere) or your host IP.
5. Copy your connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/jvd_crm`) and set as `MONGODB_URI` in production environment variables.

### 2. Hosting: Render / Railway / Fly.io Free Tier
1. Push this repository to your GitHub account.
2. In [Render](https://render.com/) or [Railway](https://railway.app/), create a **New Web Service** connected to your repo.
3. Set the following build and start commands:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. In the service **Environment Variables**, add:
   - `NODE_ENV=production`
   - `SESSION_SECRET=<random 64 char string>`
   - `MONGODB_URI=<your MongoDB Atlas connection string>`
   - `ALLOWED_DOMAIN=edufunfoundation.in`
   - `HEAD_ADMIN_EMAIL=info@edufunfoundation.in`
   - `GOOGLE_CLIENT_ID=<optional Google Client ID>`
   - `GOOGLE_CLIENT_SECRET=<optional Google Client Secret>`

> **Free Tier Sleep Note**: Free hosting instances (such as Render Free Tier) may spin down after 15 minutes of inactivity. When a request comes in, a cold start of ~30–50 seconds may occur.

---

## 🏥 Hospital & Organization Contact
- **Organization**: Edufun Foundation Trust
- **Hospital Location**: NH-168, Dhanera Khimat Highway, At: Samarvada Village, Ta: Dhanera, Dist: Banaskantha, Gujarat.
- **Head Office**: 38, Navgrah Society, Behind Madhusudan Plaza, Dhanera, Gujarat - 385310
- **24/7 Helpline**: `+91 97272-97187`
- **Email**: `info@edufunfoundation.in`
- **Website**: `edufunfoundation.in`
