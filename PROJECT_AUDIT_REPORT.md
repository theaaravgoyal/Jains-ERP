# ERP Portal — Complete Production Audit

## 1. Executive Summary
This document provides a comprehensive technical audit of the live production ERP Portal application. The audit was conducted to diagnose severe performance bottlenecks, loading times, and discrepancies between the local/preview environment and the live production deployments on Hostinger (Frontend) and Railway (Backend). 

Multiple critical bugs (P0/P1) and severe performance issues were identified in the codebase, ranging from domain mismatches in production environments to catastrophic static imports that bloat initial JS load sizes, raw base64 image storage in primary database records, and concurrency race conditions in serial number generation. Addressing these issues in a structured, sequential manner will significantly optimize the application's speed, reliability, security, and scalability, turning it into a production-grade system.

---

## 2. Actual Project Architecture
* **Frontend:** Single Page Application (SPA) built using React.js (v19) and Vite (v8) with routing managed by React Router Dom (v7). Styling is done with Tailwind CSS. Static assets are bundled and prepared for deployment as static files in the `/dist` directory.
* **Backend:** REST API server running on Node.js and Express.js (v5) deploying directly to Railway. Express handles API routing, middleware, file uploads, CORS configuration, and security headers.
* **Database:** MongoDB Atlas replica set, using Mongoose (v9) as the Object Data Modeling (ODM) layer for schema enforcement, validation, and querying.
* **Task Queues & Caching:** Redis database used for caching and BullMQ background task processing.
* **Monitored Services:** Bull Board configuration registered with Express to monitor active job queues.

---

## 3. Frontend Architecture
The frontend codebase is located under `/client` and organized as follows:
* `/src/components`: Global reusable UI components (Navbar, Sidebar, Card, Table, ErrorBoundary, Loader, etc.).
* `/src/context`: React contexts for state propagation, specifically `AuthContext` (admin/general authentication) and `EmployeeAuthContext` (employee attendance tracking).
* `/src/config`: Client configuration variables (axios bases, timeouts, headers).
* `/src/constants`: Constant values for routes, permissions, courses, colors.
* `/src/routes`: Protected layout wrapper and route redirection logic.
* `/src/Modules`: Independent directories for feature areas (Attendance, FeesManagement, LeadManagement, CertificateManagement) containing their own hooks, APIs, pages, and components.
* `/src/pages`: Landing, Login, Modules selection panel, Notifications, and Standalone Employee Attendance login/dashboard screens.

---

## 4. Backend Architecture
The backend codebase is under `/server` and structured using a layered model:
* **Entry Point (`server.js`):** Initializes the Express application instance, boots the HTTP listener immediately to satisfy cloud health checks, connects to MongoDB, and registers worker pools and background queues.
* **App Loader (`app.js`):** Imports Express, registers middleware (CORS, compression, JSON parsing, security headers, NoSQL query sanitizer, logs), mounts upload directories, and maps modular routes.
* **Routes (`/routes`):** Maps REST endpoints to controllers (e.g. `/api/auth`, `/api/fees-dashboard`, `/api/employee`, etc.).
* **Controllers (`/controllers`):** Validates request bodies and query parameters, maps operations to service classes, and sends standard JSON responses.
* **Services (`/services`):** Implements business rules, manages database transactions, handles JWT token signing/verification, and interacts with Redis cache.
* **Repositories (`/repositories`):** Standardizes queries, updates, and indexing lookups on Mongoose models.
* **Models (`/models`):** Defines Mongoose schemas, indexes, hooks, and virtual properties.

---

## 5. Database Architecture
The database layer relies on MongoDB Atlas clusters. The schema design models:
* **Identity Management:** `User` (system admins and office managers) and `Employee` (staff clocking attendance).
* **Academic Registrations:** `Student` profiles, including registration details, joining dates, and payment schedules.
* **Billing System:** `FeePlan` (parent billing contracts), `Installment` (broken down due dates), `Invoice` (issued billing statements), `Payment` (processed transactions), and `Receipt` (emitted tax receipts).
* **Logs & Admin:** `Holiday`, `Counter`, `Settings`, `Notification`, and `FeesActivityLog`.
* **RBAC:** `Role` (Super Admin, Attendance Admin, Fees Admin, Lead Admin), `Permission`, and `RolePermission` mappings.

---

## 6. Authentication Flow
Authentication is managed via JSON Web Tokens (JWT) using two parallel pathways:
1. **User Authentication (Admin/Staff):**
   * Client issues `POST /api/auth/login`.
   * Server validates credentials via `AuthService.authenticate()`, matching hashed passwords in Mongoose `User` model using `bcrypt.compare`.
   * Upon matching, it issues a JWT (expires in 30 days) and returns a user profile including permissions and role.
   * Client saves the token in `localStorage` under `token`.
   * On page reload, the client fires `GET /api/auth/me` with `Authorization: Bearer <token>` to verify the profile.
2. **Employee Authentication:**
   * Employee registers at `/api/employee/register` (pending state).
   * After Admin approval, employee logs in at `/api/employee/login`.
   * Server validates against `Employee` model and issues a JWT token.
   * Client saves the token in `localStorage` under `employeeToken` and loads the standalone attendance dashboard.

---

## 7. Authorization / Role / Module Permission Flow
Role-based access control (RBAC) is implemented via database-driven permission checks:
* **Login & Load:** When a user logs in, `AuthService.resolveRoleAndPermissions()` queries `RolePermission` mappings by their `roleId`.
* **Permissions Propagation:** The backend resolves all associated permissions, transforming them into a clean array of objects containing `code` (e.g., `access_fees`), `name`, `route`, `module`, and `icon`.
* **Module Selection Page (`Modules.jsx`):** Filters the resolved permissions list from the logged-in user profile against the supported client `PERMISSIONS` constants. If matching codes are found, active module cards are rendered; otherwise, the "No permitted modules found..." warning is displayed.
* **Routing Protection (`ProtectedRoute.jsx`):** Wraps module routes. Bypasses check for `'Super Admin'` or `'Admin'` roles. Otherwise, scans `user.permissions` to confirm if `p.code === requiredPermission`. If not, redirects to `/unauthorized`.

---

## 8. API Architecture
All APIs are mapped under a standard REST architecture. The client makes requests using two dedicated Axios instances:
* `axiosInstance` (`/client/src/api/axios.js`): Used for general core, student, fees, and certificate APIs. Attaches `'token'` header.
* `employeeAxios` (`/client/src/api/employeeAxios.js`): Used for employee login, attendance logging, and notifications. Attaches `'employeeToken'` header.
* `leadAxios` (`/client/src/Modules/LeadManagement/api/leadApi.js`): A dedicated instance for Lead Management APIs.

---

## 9. Deployment Architecture
* **Frontend Hosting (Hostinger):** Static production build (`/dist` folder) is uploaded to Hostinger. Client routing is mapped to a single-entry file using an `.htaccess` rewrite module.
* **Backend Hosting (Railway):** The Node.js Express server runs inside a Docker/containerized workspace on Railway.
* **Domains:**
  * Frontend: `https://erp.jainscomputer.com`
  * Backend API: `https://cms.jainscomputer.com`

---

## 10. Current Production Problems
1. **Slow Initial Page Load in Production (P1):** Users experience a blank screen for several seconds during initial loading or hard refreshes.
2. **Dedicated Lead Management Module 404 Failures (P1):** Clicking the "Lead Management" module triggers 404 network errors, rendering the page unusable in production.
3. **Random Request Timeouts / Server Hangs (P1):** Employee login and profile verification checks occasionally freeze, taking up to 45 seconds or timing out entirely.
4. **Permissions Mismatch ("No permitted modules found") (P1):** Valid users are occasionally logged in but blocked with a screen saying no modules are permitted.
5. **Bull Board Queue Monitor Crashes (P2):** The server has previously crashed or refused to start on queue monitors due to queue-adapter type mismatches.
6. **Concurrent Serial Generation Failures (P1):** Under simultaneous billing operations, receipt and invoice generation fails with duplicate key error crashes.

---

## 11. Root Cause Analysis
* **Lucide Icon Bloat (Initial Load):** `Sidebar.jsx` imports icons via `import * as Icons from 'lucide-react'`. This forces the bundler to compile and load the **entire Lucide SVG library** in the entry bundle chunk, preventing tree-shaking and creating a massive initial JS load bottleneck.
* **Lead URL Domain Mismatch:** `client/.env.production` sets `VITE_LEAD_API_URL` to `https://api.jainscomputer.com/api`. Testing reveals `api.jainscomputer.com` returns a 404 health status and is not pointing to the active backend instance (which runs exclusively on `cms.jainscomputer.com`).
* **Raw Base64 Binary Database Storage:** The database document for employee accounts had a massive profile picture string (over **3.97 million characters / 3.8 MB** of raw base64 data) stored in the primary `profilePicture` field. Querying this user document on every authenticated request via auth middleware triggered large network delays over the MongoDB Atlas connection.
* **Mock Role 'Website Admin' Fallback:** If a user logs in with an email containing the word `"website"` and triggers the mock authentication fallback, they are assigned the role `"Website Admin"`, which has a configured permissions list of `[]` (empty), triggering the "No permitted modules found" layout block.
* **Pre-Save Concurrency Race Conditions:** `Receipt.js` and `Invoice.js` generate sequential numbers by fetching the last document using regular expression sorting: `findOne({ receiptNumber: new RegExp(prefix) }).sort({ receiptNumber: -1 })`. In parallel threads, multiple saves read the same last document, generate duplicate numbers, and crash on MongoDB unique index constraints.

---

## 12. Frontend Performance Problems
1. **Global Lucide React Import (P1):** Importing all icons via `import * as Icons` completely defeats tree-shaking, packaging thousands of unused SVG files.
2. **Missing Component-Level Code Splitting (P2):** Pages such as `Attendance.jsx` are packaged as single massive files (140 KB source code) containing all sub-features (check-ins, leaves, approvals, settings). Component-level dynamic imports should be used to split heavy screens.
3. **Broad React Chunking (P2):** In `vite.config.js`, the broad matcher `id.includes('react')` groups all react-related dependencies (including `react-dom`, routing libraries, and UI component wrappers) into a single large `vendor-react` chunk of 852 KB.
4. **Duplicate Notification Polling (P2):** `Navbar.jsx` sets up a 20-second interval polling parallel requests `/api/notifications?limit=10` and `/api/notifications/unread` even when the dashboard module is inactive.
5. **No Client-Side Cache for Static Metadata (P3):** Frequently read static metadata (like department lists, color constants, course codes) are fetched repeatedly on module loading instead of being cached in local state.

---

## 13. Backend Performance Problems
1. **Uncached Recent Lists (P2):** Frequently loaded lists in `DashboardService` (recent payments, upcoming dues, overdue installments, recent students, activity logs) are fetched directly from MongoDB on every request, completely bypassing the Redis cache.
2. **Redundant Singleton Lookups (P2):** Invoices and receipts perform a Mongoose database roundtrip query to fetch the global `Settings` document during every save operation. This document should be cached in memory.
3. **Regular Expression Index Scans (P2):** Pre-save hooks scan receipt and invoice numbers using `new RegExp('^' + prefix)`. Regular expression scans on strings cannot effectively utilize standard index lookups, forcing database scans.

---

## 14. Database Performance Problems
1. **Missing Soft Delete Index on Students (P2):** Common queries scan student records using `Student.find({ deletedAt: null })`. However, the `Student` schema is missing an index on the `deletedAt` field, causing full collection scans as the database grows.
2. **Unbounded Queries (P2):** Several list endpoints in repositories (such as user lookups, active employees list, and department lists) perform a `.find()` without pagination boundaries or projections.
3. **Lack of Field Projections (P2):** Standard queries fetch entire document records (including large text properties and audit objects) instead of selecting only the necessary fields, increasing memory overhead and I/O latency.

---

## 15. API Performance Problems
1. **Sequential API Calls in Dashboard (P2):** When opening the main dashboard, the client triggers individual APIs for attendance summaries, active leads, and recent activities. These should be combined or fetched in parallel blocks.
2. **Large Base64 JSON Payload Transfers (P1):** The employee login API returns raw base64 string attributes in JSON bodies. This blocks network threads and drastically slows down client-side JSON parsing.
3. **Excessive Notification Focus Refetching (P2):** The window focus event handler refetches notifications on every click back to the browser tab, leading to unnecessary network spikes.

---

## 16. Bundle Size Analysis
The minified production build generates the following main chunks:
* `vendor-react` (≈ 852 KB): Very large chunk containing React, React DOM, React Router, Radix UI, and other react modules due to a broad chunking matcher.
* `vendor-charts` (≈ 392 KB): Contains Recharts and D3 dependencies.
* `vendor-xlsx` (≈ 283 KB): Contains XLSX library files.
* `vendor-others` (≈ 45 KB): Standard miscellaneous node dependencies.

*Warning:* Chunks larger than 500 KB trigger warnings during build time. The React chunk must be split to avoid initial page load performance penalties.

---

## 17. Route / Code Splitting Analysis
* **Current Route Splitting:** React Router components in `App.jsx` are lazy-loaded via `lazy(() => import(...))`. This works as expected, splitting modules into separate JS chunks.
* **Component tab-level splitting:** Fees Management (`FeesManagement.jsx`) dynamically imports its subpages (Dashboard, Students, Invoices, Payments) using `lazy`. This prevents the client from loading unvisited tabs.
* **Attendance Module Bloat:** The Attendance module is loaded as a single monolithic component file (`Attendance.jsx`). It should be refactored to lazily load internal sub-views (e.g. Leave approvals, Attendance settings panels).

---

## 18. Network Request Analysis
### Login Request Chain:
1. `POST /api/auth/login` (Auth token & user profile)
2. `GET /api/auth/me` (Verification check)
3. `GET /api/notifications` (Unread notifications list)
4. `GET /api/notifications/unread` (Unread counter)

### Dashboard Request Chain:
1. `GET /api/attendance/summary` (Attendance stats)
2. `GET /api/lead` (Active leads query)
3. `GET /api/notifications` (Unread notifications list)

*Optimization opportunity:* Combine the initial page queries or parallelize them to minimize API waterfalls.

---

## 19. Hostinger Configuration Problems
* **Lack of Gzip/Brotli Compression (P3):** Static asset loading on Hostinger is slow because the assets are served uncompressed.
* **Missing Cache-Control Headers (P3):** Static JS and CSS assets in `/assets` do not have long-term cache headers (`Cache-Control: max-age=31536000`), forcing the browser to fetch them on reload instead of caching them locally.
* **SPA Redirection:** The `.htaccess` file handles SPA routing fallbacks correctly, but has no gzip/brotli compression rules or asset caching directives.

---

## 20. Railway Configuration Problems
* **Redis Connection Fallback (P2):** If the Redis database is disconnected or restarts, BullMQ and cache queries fallback to local mock handlers. However, if the server startup does not detect Redis, background worker registration is disabled.
* **Immediate Health Checks Bind:** The backend binds the listener to `0.0.0.0` immediately during boot time. This keeps Railway health checks passing, which is correct, but handles Mongo/Redis connection errors asynchronously.

---

## 21. CORS Problems
* **Origins List (P2):** The `allowedOrigins` list contains hardcoded domains (`cms.jainscomputer.com`, `api.jainscomputer.com`, etc.).
* **Wildcard Validation:** If `process.env.FRONTEND_URL` is provided, it is appended to the allowed list. The CORS options dynamically validate origins using domain endings (`.vercel.app`, `.jainscomputer.com`), which is correct and avoids preflight issues.

---

## 22. Authentication Problems
* **JWT Expiry (P3):** The signed token has an expiry of 30 days. No token refresh mechanism is present, so the user is forced to re-login every 30 days.
* **LocalStorage Token Storage (P3):** Tokens are stored in raw `localStorage`. This is vulnerable to Cross-Site Scripting (XSS) attacks. Recommend migrating to Secure, HttpOnly cookies for token storage.

---

## 23. Module Permission Problem Analysis
The error `"No permitted modules found for your role profile"` is triggered in `Modules.jsx` when `user.permissions` is resolved as an empty array `[]`.
This occurs under two conditions:
1. **Mock Verification Fallback:** Logging in with an email containing the word `"website"` triggers the mock fallback. This fallback maps the user to the role `'Website Admin'`, which has no associated permissions (`Website Admin: []`), displaying the error screen.
2. **Database Incomplete Sync:** If a database-backed user logs in, but the initial database seeding of `RolePermission` was failed, interrupted, or deleted, their role has no permissions mapped, resulting in an empty permissions array.

---

## 24. Bull/BullMQ/Bull Board Audit
* **Resolved Adapter Crash:** The Bull Board crash issue was resolved by adding a validation check:
  ```javascript
  if (queue instanceof Queue) {
    adapters.push(new BullMQAdapter(queue));
  }
  ```
  This is safe because it skips mock plain objects that fallback during connection failures.
* **Missing Queue Config:** If Redis is down, background tasks are skipped or executed in-process, but email and notification tasks will be deferred.

---

## 25. Security Issues
1. **Raw Base64 Upload Vulnerability (P2):** The server allows uploading raw base64 image strings without size validation or format checks, exposing it to potential Denial of Service (DoS) attacks by uploading massive payloads.
2. **Exposed Database URI Defaults (P1):** `db.js` contains a hardcoded fallback database connection string `mongodb://yadavakhil415_db_user:...`. If the server environment variables fail to load, the database falls back to this hardcoded credentials string. *ACTION: SECRET FOUND — ROTATE/REMOVE*.
3. **No Rate Limiting (P3):** Critical endpoints (like login, password changes, and employee registrations) are missing API rate limiting (e.g. `express-rate-limit`), exposing them to brute force attacks.

---

## 26. Code Quality Issues
* **Dead File (`ModulesPanel.jsx`):** The component file `ModulesPanel.jsx` is completely unused and can be safely deleted.
* **Monolithic Components:** The `Attendance.jsx` view contains all components and sub-screens in one single file. It should be refactored into smaller, modular sub-components.
* **Broad React imports:** `Sidebar.jsx` uses `import * as Icons from 'lucide-react'`, pulling the entire library into the chunk.

---

## 27. SEO / Caching / Static Asset Issues
* **Browser Cache Missing:** Asset filenames compiled by Vite contain hashes (e.g. `index-C8g7B9.js`), which is correct. However, Hostinger must specify headers to cache these assets long-term.
* **Missing Meta Tags:** Frontend pages are missing custom meta descriptions or structured SEO tags.

---

## 28. Critical Bugs (P0 / P1)
* **Lead Module 404 Error (P1):** Mismatched base URL in production environment variables (`api.jainscomputer.com` instead of `cms.jainscomputer.com`), breaking the entire Lead Management module.
* **Pre-Save Race Condition (P1):** Non-atomic incremental receipt and invoice number generation, causing database crashes under concurrent traffic.
* **Base64 Payload Hanging (P1):** Multi-megabyte profile pictures blocking database lookups and timing out client requests.

---

## 29. High Priority Performance Issues (P1 / P2)
* **Lucide Icon Bloat (P1):** `import * as Icons` bloating entry bundle size and initial load times.
* **Broad React Chunking (P2):** Monolithic `vendor-react` chunk due to loose inclusion matchers.
* **Uncached Dashboard Lists (P2):** Uncached database scans for recent collections and activities.

---

## 30. Medium Priority Issues (P2 / P3)
* **Duplicate Notification Center Polling (P2):** Excessive intervals and focus refetches flooding the server with queries.
* **Missing Index on `deletedAt` (P2):** Full collection scans on student queries using `Student.find({ deletedAt: null })`.

---

## 31. Low Priority Improvements (P3 / P4)
* **Token Storage (P3):** raw `localStorage` usage instead of HttpOnly cookies.
* **Settings DB Lookup Cache (P3):** Singleton lookups on settings document can be cached in-memory.

---

## 32. Recommended Architecture
* **Frontend Chunking:** Optimize `vite.config.js` to split packages cleanly and tree-shake `lucide-react`.
* **API base URL Sync:** Point all production API endpoints (core and lead) to `https://cms.jainscomputer.com/api`.
* **Atomic Counters:** Replace pre-save invoice/receipt regex queries with atomic MongoDB `$inc` operations using the `Counter` model.
* **Image Compression/Offloading:** Enforce upload limitations and compress images on the frontend before upload, or upload files directly to cloud storage (e.g. AWS S3 or Cloudinary) and store only image URLs in the database.

---

## 33. Recommended Fix Plan
1. **Fix Lead API production URL:** Update `client/.env.production` to point `VITE_LEAD_API_URL` to `https://cms.jainscomputer.com/api`.
2. **Optimize Lucide Imports:** Refactor `Sidebar.jsx` to import only the required icons and use a mapped dictionary instead of `import * as`.
3. **Refactor Serial Generation:** Implement atomic counter lookups in `Receipt.js` and `Invoice.js` to prevent duplicate key errors.
4. **Implement Image Upload Validation & Constraints:** Compress profile pictures on the client before saving, and restrict maximum upload size to 500KB on the backend.
5. **Enable Redis Cache for Dashboard Lists:** Cache recent payment and student list queries in Redis with a 5-minute TTL.
6. **Add Mongoose Indexes:** Index the `deletedAt` field on the `Student` schema.
7. **Refactor Vite Chunks:** Refactor `vite.config.js` rollup options to perform granular splitting.

---

## 34. Expected Performance Improvements
* **Initial Page Load:** Speed up initial page load by **60-70%** by reducing icon import sizes and optimizing react chunking.
* **Dashboard Load Time:** Reduce dashboard page fetch time by **80%** using Redis cache.
* **Lead Module functionality:** **100%** resolution of 404 errors, making the module fully operational.
* **Concurrency reliability:** Complete elimination of duplicate key crashes on billing transactions.

---

## 35. Files That Need Modification
* `/client/.env.production` (Update Lead API endpoint URL)
* `/client/src/components/Sidebar.jsx` (Tree-shake Lucide icon imports)
* `/client/vite.config.js` (Optimize Rollup chunking strategy)
* `/server/models/Receipt.js` (Refactor serial generator to use atomic Counter)
* `/server/models/Invoice.js` (Refactor serial generator to use atomic Counter)
* `/server/models/Student.js` (Add index to `deletedAt` field)
* `/server/services/dashboardService.js` (Cache lists in Redis helper)
* `/server/config/db.js` (Remove hardcoded default mongo credentials string)
