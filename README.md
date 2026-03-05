# Reservation Boss v3

**Staging (v3):** [reservationboss.io](https://reservationboss.io) · **Branch:** `v3`

Full-platform workspace management for North Highland offices — attendance scheduling, parking reservations, meeting/calling room bookings, and a comprehensive admin suite.

---

## Monorepo Structure

```
reservation-boss/
├── packages/
│   ├── web/           # Next.js 15 Full-Stack app (frontend + API routes)
│   └── shared/        # Shared utilities (future mobile)
├── apps/              # Reserved for React Native mobile app
├── docs/
│   ├── v3-plan.md         # Full 8-phase implementation plan
│   └── v3-architecture.md # Data model, API map, business rules
├── stitch/            # Figma/Stitch design HTML mockups (22 screens)
└── scripts/
    └── create-first-admin.mjs  # Bootstrap first admin user
```

---

## Quick Start

### Prerequisites
- Node.js >= 24.13.0
- Firebase project (same project as v2)

### Install & Run

```bash
cd packages/web
npm install
cp .env.example .env.local   # Fill in Firebase + Email credentials
npm run dev
# Open http://localhost:3000
```

### First Admin User

There is no self-registration — users are invited by admins. To create the very first admin:

```bash
node scripts/create-first-admin.mjs
# Follow prompts: enter email, display name, password
```

Then log in at `/auth/login`.

---

## User Roles

| Role | Access |
|---|---|
| `admin` | Full admin suite + personal attendance/rooms dashboard |
| `internal` | Attendance dashboard + permanently assigned parking spot |
| `external` | Attendance dashboard + external parking reservations (max 4/week) |
| `none` | Attendance dashboard only |

---

## Features (v3)

### User Features
- **Weekly Attendance** (`/dashboard`) — Plan Mon–Fri office/remote schedule
- **External Parking** — Reserve a spot per office day; deadline 8am same day
- **Internal Parking** — Permanently assigned spot, always visible on dashboard
- **Room Bookings** (`/rooms`) — 30-min slots, 8am–6pm, meeting or calling rooms
- **My Bookings** (`/my-bookings`) — Unified view of all reservations with cancel/late-request
- **Late Requests** (`/my-requests`) — View status of submitted late-change requests

### Admin Features
- **Dashboard** (`/admin`) — KPIs: users, attendance today, pending requests, room bookings
- **User Management** (`/admin/users`) — Invite, role assignment, parking spot allocation, last login
- **Pending Requests** (`/admin/requests`) — Approve/deny late-change requests with email notification
- **Reports** (`/admin/reports`) — KPI cards, CSS charts, late changes log, CSV export
- **Parking Config** (`/admin/parking`) — Spot toggles (maintenance), global rules, blackout dates
- **Room Management** (`/admin/rooms`) — Add/edit/deactivate rooms
- **Room Analytics** (`/admin/room-analytics`) — Usage charts, peak times, top users

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (Pages Router) |
| UI | React 19 + Tailwind CSS 4 |
| Icons | Material Symbols Outlined |
| Database | Firebase Firestore (`v3_*` collections) |
| Auth | Firebase Authentication (email/password) |
| Email | Nodemailer (Gmail SMTP) |
| Deployment | Vercel (auto-deploy from `v3` branch) |
| Timezone | America/Guayaquil (UTC-5, no DST) |

---

## Firestore Collections

| Collection | Purpose |
|---|---|
| `v3_users` | User profiles (uid, email, name, role, internalSpot, active, lastLogin) |
| `v3_invitations` | Pending email invitations (token, 48h TTL) |
| `v3_attendance` | Daily attendance records (office/remote per user per date) |
| `v3_parking` | External parking reservations |
| `v3_rooms` | Room configuration (meeting/calling, capacity, active) |
| `v3_room_reservations` | Room bookings (30-min slots) |
| `v3_late_requests` | Late change requests (pending/approved/denied) |
| `v3_config` | Global config (`parking_rules` doc: weeklyLimit, cutoffTime, disabledSpots) |
| `v3_blackout_dates` | Holiday/closure dates (blocks parking + office attendance) |

### Required Firestore Indexes

These composite indexes must be created in Firebase console (Firestore → Indexes):

| Collection | Fields | Order |
|---|---|---|
| `v3_attendance` | `userId` ASC, `date` ASC | Ascending |
| `v3_parking` | `userId` ASC, `date` ASC | Ascending |
| `v3_late_requests` | `userId` ASC, `createdAt` DESC | Mixed |
| `v3_late_requests` | `reservationId` ASC, `status` ASC | Ascending |
| `v3_room_reservations` | `date` ASC, `roomId` ASC | Ascending |

> Firestore will show a direct link to create each missing index when the query is first run.

---

## Key Business Rules

- **Attendance lock**: Monday 11:00 PM Ecuador time — changes after require late request
- **New week visible**: Friday 5:00 PM Ecuador time (next week appears)
- **Parking cutoff**: 8:00 AM same day (configurable in admin parking config)
- **External parking max**: 4 days/week per user (configurable)
- **Room slots**: 30-min blocks, 8am–6pm, Mon–Fri
- **Blackout dates**: Block office attendance and parking reservations on closure days

---

## Environment Variables

### `packages/web/.env.local`

```bash
# Firebase Client (public — prefix NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-only)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=        # Include escaped newlines: "-----BEGIN...\\n..."
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FIREBASE_AUTH_URI=
FIREBASE_TOKEN_URI=
FIREBASE_AUTH_PROVIDER_CERT_URL=
FIREBASE_CLIENT_CERT_URL=

# Email (Gmail SMTP)
EMAIL_USER=                  # Gmail address
EMAIL_PASS=                  # Gmail App Password
ADMIN_NOTIFICATION_EMAIL=    # Where late-request notifications go

# App URL
NEXT_PUBLIC_API_URL=https://reservationboss.io
```

---

## Deployment

| Branch | Environment | Auto-deploy |
|---|---|---|
| `v3` | Staging | Push to `v3` → Vercel |
| `main` | Production | Push to `main` → Vercel |

Same Firebase project; v3 uses isolated `v3_*` Firestore collections.

---

## Author

Francisco Foyain — North Highland
