# Deployment Notes

These notes outline the necessary environment variables and manual steps required for deploying the ERP Portal updates to Railway and Hostinger.

---

## 1. Railway Environment Configuration (Backend)
To restore database connectivity and secure the production environment, add or verify the following variables in the **Railway Variables Dashboard** for your server service:

1. **`MONGO_URI`** (Required)
   - **Type:** Secret string
   - **Value:** `mongodb+srv://yadavakhil415_db_user:XANHB3uc4LdlhhwQ@ac-c1qxgnd.dhl6oc8.mongodb.net/attendanceDB?retryWrites=true&w=majority`
   - **Verification:** Adding this variable will trigger an automatic redeployment of the container. Check the deployment logs to verify that `[MongoDB] Connection state: CONNECTED` is printed and no connection errors exist.

2. **`NODE_ENV`** (Required)
   - **Type:** String
   - **Value:** `production`
   - **Verification:** Setting this to `production` will automatically deactivate the mock authentication, mock verification, and mock password changes in `AuthService.js`, securing the backend.

3. **`JWT_SECRET`** (Required)
   - **Type:** Secret string
   - **Value:** Ensure a strong secret key is configured (e.g. your existing production secret).

4. **`REDIS_URL`** (Optional/Highly Recommended)
   - **Type:** Secret string
   - **Value:** The Redis connection URI (e.g. `redis://default:password@host:port` or `rediss://...` for secure TLS). If omitted, background queues, workers, and schedulers are disabled gracefully to prevent local localhost connection spamming.
   - **Verification:** Logs will print `[Redis] Connecting to Redis server...` followed by `[Redis] Redis client is ready and connected.`

5. **`REDIS_TLS`** (Optional)
   - **Type:** String
   - **Value:** `true` (if TLS encryption is required manually; automatically enabled if scheme is `rediss://`).

---

## 2. Hostinger Static Deployment (Frontend)
1. Navigate to the `client/` folder:
   ```bash
   cd client
   ```
2. Build the production files:
   ```bash
   npm run build
   ```
3. Upload the contents of the generated `client/dist` directory (including the `.htaccess` file) to the root public folder of `https://erp.jainscomputer.com` on your Hostinger File Manager.

---

## 3. Cloudflare DNS Proxy Setup (Mobile compatibility)
To guarantee the application is fully reachable from mobile 4G/5G networks (e.g. Jio and Airtel) without custom DNS overrides:
1. Log in to your **Cloudflare Dashboard**.
2. Navigate to your domain's **DNS Records**.
3. Locate the CNAME record for `cms.jainscomputer.com`.
4. Toggle the **Proxy status** switch from **DNS Only (Grey Cloud)** to **Proxied (Orange Cloud)**.
5. In Cloudflare **SSL/TLS** menu, verify that SSL mode is set to **Full** or **Full (Strict)** to allow encrypted traffic to proxy successfully to Railway.

---

## 4. Post-Deployment Verification Steps
Once both deployments complete, verify:
- Accessing `https://erp.jainscomputer.com/` loads the page instantly.
- Logging in as an Employee works (proves database lookup and authentication succeed).
- Opening the Admin Dashboard and looking at attendance, fees, and students works (proves database queries and aggregation queries are successful).
- Opening Lead Management works.
