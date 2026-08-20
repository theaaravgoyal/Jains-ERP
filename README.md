# ERP Portal

A professional Enterprise Resource Planning (ERP) Portal dashboard setup, complete with authentication routing, protected layouts, and structured database modules.

## Architecture

```
ERP-Portal/
├── client/          (React.js + Vite + Tailwind CSS v4)
└── server/          (Node.js + Express + Mongoose)
```

---

## Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (Ensure service is running locally or provide a remote connection URI)

### 2. Database configuration
Create/adjust `server/.env` with your parameters:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/erp-portal
JWT_SECRET=super_secret_erp_key_12345
```

### 3. Running Backend Services
Navigate to the `server/` directory:
```bash
cd server
npm install      # Installs all server dependencies
npm run dev      # Launches Express via Nodemon
```
The API server will listen on `http://localhost:5000`.

### 4. Running Frontend Client
Navigate to the `client/` directory in a new terminal:
```bash
cd client
npm install      # Installs client dependencies
npm run dev      # Boots Vite dev-server
```
The client app will launch at `http://localhost:5173`.

---

## Authentication & Default Credentials

This installation features an automatic database seed capability to allow testing out-of-the-box:

- **Username**: `admin@erp.com`
- **Password**: `admin123`

On your first login attempt, if MongoDB is connected, a user will be created. If MongoDB is offline, the authentication system falls back to mock memory context to facilitate client dashboard visual review.

---

## Active Routes

- `/login` - Custom glassmorphic authentication screen
- `/dashboard` - Overview panel featuring Attendance, Site, and Fees modules
- `/attendance` - Attendance management views
- `/site-management` - Site operations monitoring
- `/fees-management` - Receivables and invoices dashboard
# ERP-Portal
