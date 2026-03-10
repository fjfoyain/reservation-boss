# Reservation Boss — Web App (`packages/web`)

North Highland internal workspace portal. Next.js full-stack app deployed on Vercel.

**Live:** https://reservationboss.io
**Branch strategy:** `main` = stable/production legacy, `v3` = active development

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (Pages Router) |
| UI | React 19 + Tailwind CSS 4 |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Email | Nodemailer (Gmail SMTP) |
| Hosting | Vercel (auto-deploy from GitHub) |
| Timezone | America/Guayaquil (Ecuador) |

---

## Local Development

```bash
cd packages/web
npm install
npm run dev
# → http://localhost:3000
```

Copy `.env.local.example` → `.env.local` and fill in your Firebase credentials.

---

## Environment Variables

```bash
# Firebase Admin (server-side)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FIREBASE_AUTH_URI=
FIREBASE_TOKEN_URI=
FIREBASE_AUTH_PROVIDER_CERT_URL=
FIREBASE_CLIENT_CERT_URL=

# Firebase Client (public, browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Email
EMAIL_USER=
EMAIL_PASS=

# Admin notification recipient for late requests
ADMIN_NOTIFICATION_EMAIL=

# App
NEXT_PUBLIC_API_URL=https://reservationboss.io
```

---

## Architecture

### Branches

- **`main`** — Legacy parking reservation system (simple, email-based, no user accounts)
- **`v3`** — Full workspace portal with user accounts, attendance, room bookings, people lead approvals

### v3 Feature Set

| Feature | Description |
|---------|-------------|
| Attendance scheduling | Mon–Fri weekly schedule (office / remote) |
| External parking reservations | Employees with external parking type |
| Internal parking | Assigned spots shown, no reservation needed |
| Meeting room booking | Time-slot room reservations |
| Calling booth booking | Quick call booths |
| Late change requests | Requests for changes after schedule lock |
| People Lead approvals | PL must approve parking reservations for their reports |
| Admin dashboard | Reports, user management, parking/room config, late request review |

### Firestore Collections (v3)

| Collection | Purpose |
|-----------|---------|
| `v3_users` | User profiles: name, email, role, parking type, isAdmin, isPeopleLead, peopleLeadEmail |
| `v3_attendance` | Attendance records: userId, date, status (office/remote) |
| `v3_parking` | Parking reservations: userId, date, spot |
| `v3_room_reservations` | Room bookings: userId, roomId, date, startTime, endTime |
| `v3_late_requests` | Late change requests pending admin review |
| `v3_config` | App config (attendance deadline times, parking config, etc.) |
| `v3_blackout_dates` | Dates when office is closed |
| `v3_invitations` | Pending user invite tokens (48hr expiry) |
| `approvalRequests` | People Lead approval requests (pending/approved/rejected) |

### Firestore Collections (main/legacy)

| Collection | Purpose |
|-----------|---------|
| `reservations` | Parking reservations: email, date, spot |
| `cancellationCodes` | One-time 6-digit codes for cancellation (10 min expiry) |

---

## API Routes

### v3 API (`/api/v3/`)

```
Auth
  POST  /api/v3/auth/invite           Invite a user (admin only)
  POST  /api/v3/auth/register         Register via invite token

User
  GET   /api/v3/profile               Get / update current user profile
  PUT   /api/v3/profile

Attendance
  POST  /api/v3/attendance            Set attendance for a date
  GET   /api/v3/attendance/week       Get user's week attendance

Parking
  GET   /api/v3/parking/spots         List available spots
  GET   /api/v3/parking/week          User's parking for a week
  POST  /api/v3/parking               Reserve a spot
  DELETE /api/v3/parking/[id]         Cancel a reservation

Room Reservations
  GET   /api/v3/rooms                 List rooms
  GET   /api/v3/room-reservations     User's room bookings
  POST  /api/v3/room-reservations     Book a room
  DELETE /api/v3/room-reservations/[id]  Cancel a room booking

Late Requests
  GET   /api/v3/late-requests         User's late requests
  POST  /api/v3/late-requests         Submit a late request

My Bookings
  GET   /api/v3/my-bookings           Aggregated view of all bookings

Admin
  GET   /api/v3/admin/users           List all users
  PUT   /api/v3/admin/users/[uid]     Update user (role, parking, isAdmin, isPeopleLead, peopleLeadEmail)
  POST  /api/v3/admin/users/reset-password
  GET   /api/v3/admin/late-requests   List late requests
  PUT   /api/v3/admin/late-requests/[id]  Approve / deny
  GET/PUT /api/v3/admin/attendance-config  Schedule deadline settings
  GET/PUT /api/v3/admin/parking-config     Parking spot config
  GET/POST/DELETE /api/v3/admin/parking-blackout  Blackout dates
  GET/POST/PUT/DELETE /api/v3/admin/rooms  Room management
  GET   /api/v3/admin/stats
  GET   /api/v3/admin/reports/attendance
  GET   /api/v3/admin/reports/parking
  GET   /api/v3/admin/reports/rooms
  GET   /api/v3/admin/reports/late-requests
  GET   /api/v3/admin/reports/room-analytics
  GET   /api/v3/admin/reports/stats
```

### People Lead Approvals API (`/api/approvals/`)

```
GET   /api/approvals?status=pending   PL's approval requests
PATCH /api/approvals/[id]             Approve or reject { action: 'approve'|'reject', notes? }
GET   /api/auth/role                  Get current user's PL role
```

### Admin Users (non-v3) (`/api/admin/users/`)

```
GET   /api/admin/users                List users (PL management)
POST  /api/admin/users                Create user profile
PUT   /api/admin/users/[id]           Update isPeopleLead / peopleLeadEmail
DELETE /api/admin/users/[id]          Delete user profile
```

### Legacy Parking API (`/api/`)

```
POST  /api/reserve                    Create parking reservation (or approval request if user has a PL)
GET   /api/reservations/week          Weekly availability grid
GET/DELETE /api/reservations          Admin: list / clear all
DELETE /api/reservations/[id]         Admin: delete one
GET   /api/config                     App config (parking spots, visible dates)
GET   /api/summary/week               Public weekly summary
POST  /api/admin/cleanup              Delete old reservations
GET   /api/reports/weekly             Weekly attendance report
GET   /api/reports/monthly-csv        CSV download
POST  /api/cancellation/request-code  Request 6-digit cancellation code
POST  /api/cancellation/verify-and-cancel  Cancel with code
GET   /api/health                     Health check
```

---

## People Lead Approval Flow

1. Admin marks a user as **People Lead** (`isPeopleLead: true`) in User Management
2. Admin assigns a PL to another user via the **Assigned People Lead** dropdown
3. When that user submits a parking reservation, an `approvalRequests` document is created instead of a direct reservation
4. The PL receives an email notification and logs in → redirected to `/admin/pl-dashboard`
5. PL sees pending requests in `/admin/approvals` (Pending / Approved / Rejected tabs)
6. **Approve** → creates the actual reservation and emails the employee
7. **Reject** → emails the employee with optional reason
8. PLs who are also admins (`isAdmin: true`) have full admin access AND PL access

---

## Auth & Role System

| Role | Access | Login redirect |
|------|--------|---------------|
| Full Admin | Everything: reports, user management, room/parking config, approvals | `/admin/reports` |
| People Lead only | `/admin/pl-dashboard` and `/admin/approvals` only | `/admin/pl-dashboard` |
| Admin + PL | Full admin access (isAdmin takes priority) | `/admin/reports` |
| Regular user | Dashboard, my-bookings, my-requests | `/dashboard` |

Role is determined by `isAdmin` / `isPeopleLead` fields in the `v3_users` Firestore document. Users not found in the collection (or found with neither flag) are treated as full admins for backwards compatibility.

---

## Attendance Schedule Lock

- Weekly schedule locks on **Monday at the configured deadline time** (default 23:00 Ecuador)
- After the lock, attendance changes require a **Late Change Request**
- Clicking a locked attendance toggle opens the late request modal automatically
- Admins can configure the deadline time from the User Management page → Attendance Rules section

---

## Key Constants (`lib/config/constants.js`)

```js
USERS_COLLECTION = 'v3_users'           // change here to update everywhere
APPROVAL_REQUESTS_COLLECTION = 'approvalRequests'
ALLOWED_DOMAIN = '@northhighland.com'
MAX_WEEKLY_RESERVATIONS = 4
TIMEZONE = 'America/Guayaquil'
```

---

## Middleware

| Middleware | File | Usage |
|-----------|------|-------|
| `withAuth` | `lib/middleware/auth.js` | Any authenticated user |
| `withFullAdmin` | `lib/middleware/auth.js` | Full admins only (blocks PL-only users) |
| `withAuthV3` | `lib/middleware/authV3.js` | v3 authenticated users (checks v3_users, active status) |
| `withAdminAuth` | `lib/middleware/authV3.js` | v3 admins (isAdmin or legacy role=admin) |
| `withCors` | `lib/middleware/cors.js` | CORS whitelist |

---

## Token Handling

Firebase ID tokens expire after 1 hour. All pages use a `getToken()` helper instead of caching the token in state:

```js
function getToken() {
  return auth.currentUser?.getIdToken(); // Firebase auto-refreshes transparently
}
// Used before every API call: const t = await getToken();
```
