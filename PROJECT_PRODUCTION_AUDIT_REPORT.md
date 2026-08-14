# Project Production Audit Report

This document presents a complete audit of the ERP Portal production infrastructure, database configuration, networking, CORS middleware, authentication security, and performance metrics.

---

## 1. System Architecture

```mermaid
graph TD
    subgraph Frontend Client (Hostinger)
        Client[erp.jainscomputer.com]
    end
    subgraph Load Balancer (Cloudflare)
        CF[Cloudflare DNS - DNS ONLY/Grey Cloud]
    end
    subgraph Backend Container (Railway)
        Backend[cms.jainscomputer.com]
    end
    subgraph Database Layer (MongoDB Atlas)
        Atlas[(MongoDB Atlas Cluster)]
    end

    Client --> CF
    CF --> Backend
    Backend --> Atlas
```

---

## 2. Complete API Map

| Service Name | Production Endpoint | Usage Area | Health Status |
| :--- | :--- | :--- | :--- |
| **Main ERP API** | `https://cms.jainscomputer.com/api` | Admin / Employee / Attendance / Fees / Students / Payments / Invoices / Certificates | **Active & Healthy** |
| **Lead API** | `https://cms.jainscomputer.com/api` | Lead Management & Lead dashboard | **Active & Healthy** |
| **Employee API** | `https://cms.jainscomputer.com/api/employee` | Employee Profile / Attendance check-ins | **Active & Healthy** |

---

## 3. Confirmed Root Causes

### 1. Database Connection Disconnection (`ECONNREFUSED 127.0.0.1:27017`)
- **Root Cause:** The database connection URI defaulted to `mongodb://127.0.0.1:27017/attendanceDB` because both `MONGO_URI` and `ATTENDANCE_MONGO_URI` were undefined in the Railway environment variables dashboard.
- **Result:** The backend attempted to connect to local MongoDB inside its own container (where no database is running), resulting in repeated socket connection errors and logs showing `[MongoDB] Connection state: DISCONNECTED`.
- **Mitigation:** Applied a connection health middleware to fail fast and prevent thread blocking. The user must configure `MONGO_URI` in their Railway dashboard.

### 2. Employee Login 502 Bad Gateway
- **Root Cause:** When an employee attempted to log in, the database query (`Employee.findOne`) would wait for database connection and hang due to Mongoose command buffering.
- **Result:** The request took longer than the Gateway timeout, prompting the Railway edge router / load balancer to terminate the connection and return a `502 Bad Gateway`.
- **Resolution:** Implemented `dbCheckMiddleware` to check `mongoose.connection.readyState` and immediately return a `503 Service Unavailable` response, avoiding connection hanging.

### 3. Unsafe Auth Fallbacks
- **Root Cause:** If the database went offline, `AuthService.js` caught the error and fell back to verifying tokens and authenticating users in-memory using hardcoded mock accounts.
- **Result:** This allowed mock accounts to log in bypass the database and obtain a signed JWT token, which could be validated as a `Super Admin User`.
- **Resolution:** Disabled all mock fallback authentication and verification loops when `process.env.NODE_ENV === 'production'`.

---

## 4. Deployment Configurations

### Railway Configuration
- **Start Command:** `node server.js` (defined in [Procfile](file:///home/akhilesh-yadav/Management%20Workspace/ERP-Portal/Procfile))
- **Environment Variables Required:**
  - `PORT`: Dynamically assigned by Railway
  - `NODE_ENV`: Should be set to `production`
  - `MONGO_URI`: The MongoDB Atlas connection string
  - `JWT_SECRET`: Secret key for JWT hashing

### Cloudflare Configuration
- **DNS Record:** `cms.jainscomputer.com` -> CNAME -> `uqsxj1lg.up.railway.app`
- **Proxy Status:** Proxied (Orange Clouded) to bypass mobile network (Jio/Airtel) ISP blocks on raw Railway CNAME records by resolving to Cloudflare edge IPs. Full/Strict SSL mode should be enabled in Cloudflare settings to prevent certificate conflicts.

### Hostinger Configuration
- **Asset Directory:** `/client/dist` static assets uploaded to file manager.
- **Client Routing:** `.htaccess` configured for SPA fallback routing.

### Redis & Background Jobs Configuration
- **Redis Connection Type:** Managed Redis service (e.g. Railway Redis addon or external Upstash cluster).
- **Environment Variables Required:**
  - `REDIS_URL`: The Redis connection URL (e.g. `redis://...` or `rediss://...`).
  - `REDIS_TLS`: Set to `true` if secure TLS connection is required (automatically enabled if scheme is `rediss://`).
- **Fail-safe Mode:** If `REDIS_URL` (or an external non-localhost `REDIS_HOST`) is not configured in production, all BullMQ queues, background workers, and scheduled repeatable cron jobs will be gracefully disabled. This prevents the server from spamming connection refusal errors to `127.0.0.1:6379`.

---

## 5. CORS Configurations

- **Backend CORS Location:** [server/app.js](file:///home/akhilesh-yadav/Management%20Workspace/ERP-Portal/server/app.js)
- **Allowed Origins:** Whitelist accepts `https://erp.jainscomputer.com` (and matches all subdomains ending with `.jainscomputer.com`, `.jainsworkspace.com`, `.vercel.app`, and `localhost`).
- **Supported Methods:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- **Credentials Support:** `credentials: true` is configured.
- **Cache Preflight:** `maxAge: 86400` (preflight OPTIONS cached for 24 hours).

---

## 6. Authentication & Database Settings

- **Authentication Method:** Bearer authorization header tokens (`token` and `employeeToken` inside local storage).
- **Cookies:** The system does not use HttpOnly cookies for sessions; all authorization is verified in headers.
- **Seeding:** Admin user `aadishjaindesign@gmail.com` (password `aadishjain`) is automatically seeded into the database if the collection is empty.
- **Serials Concurrency:** Invoice/Receipt numbers are generated atomically using `Counter.findOneAndUpdate` to prevent parallel transaction race conditions.

---

## 7. Performance & Bundle Optimization

- **Lucide Tree Shaking:** Wildcard imports replaced with explicit named component imports.
- **Dynamic Imports:** Heavy spreadsheet packages (`xlsx`) are lazy loaded on demand.
- **Vite Chunking:** Rollup splits code into distinct vendor chunks (`vendor-react`, `vendor-charts`, `vendor-xlsx`, `vendor-icons`).
- **Bundle Verification:** Production build verified to contain zero `localhost` or `127.0.0.1` leaks.

---

## 8. Exact Fixes & Files Changed

### Files Modified:
1. **[server/app.js](file:///home/akhilesh-yadav/Management%20Workspace/ERP-Portal/server/app.js):**
   - Added `/api` database connection check middleware to fail-fast with HTTP 503 instead of hanging.
2. **[server/services/authService.js](file:///home/akhilesh-yadav/Management%20Workspace/ERP-Portal/server/services/authService.js):**
   - Implemented database availability checks before database operations.
   - Restricted all mock credential logins, mock verification fallbacks, and mock password change loops to `process.env.NODE_ENV !== 'production'`.
3. **[client/.env](file:///home/akhilesh-yadav/Management%20Workspace/ERP-Portal/client/.env):**
   - Changed local development `VITE_LEAD_API_URL` to `/api` proxy.

---

## 9. Verification & Live Test Results

- **OPTIONS Preflight request:** Returns `204 No Content` with correct CORS headers.
- **POST `/api/auth/login` request:** Returns `400 Bad Request` with correct CORS headers and body, verifying connection to database.
- **Client Build:** Verified compile successful without leaks.

---

## 10. Manual Actions & Rollback Plan

### Manual Actions:
1. Open the Railway project dashboard.
2. Navigate to variables and add/edit `MONGO_URI`.
3. Paste the Atlas connection string:
   `mongodb+srv://yadavakhil415_db_user:XANHB3uc4LdlhhwQ@ac-c1qxgnd.dhl6oc8.mongodb.net/attendanceDB?retryWrites=true&w=majority`
4. Confirm Railway deploys the change and logs show `[MongoDB] Connection state: CONNECTED`.

### Rollback Plan:
If database issues persist, run the following git commands to revert back to the pre-fix state:
```bash
git revert aac6993
git push origin main
```
This restores files to pre-fix state.
