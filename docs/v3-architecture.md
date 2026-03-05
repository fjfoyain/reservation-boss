# Reservation Boss v3 — Architecture Overview

> **For team review — feedback welcome**
> This document describes the planned architecture for v3. Please share thoughts, concerns, or ideas before or during implementation.

---

## What's New in v3

| Feature | v2 (current) | v3 (new) |
|---|---|---|
| Identity | Email only (no accounts) | Firebase Auth (email + password) |
| Onboarding | Anyone with @northhighland.com email | Admin invites via email link |
| User types | Admin only | Admin, Internal Parking, External Parking, No Parking |
| Attendance | Not tracked | Weekly Mon–Fri schedule per user |
| Parking | Standalone reservation | Integrated into attendance for external users |
| Internal parking | Not supported | Permanently assigned spot per user |
| Meeting rooms | Coming soon placeholder | Full 30-min slot booking |
| Calling booths | Coming soon placeholder | Full 30-min slot booking |
| Late changes | 6-digit code cancellation | Request → admin approve/deny workflow |
| Analytics | Parking only (weekly/monthly CSV) | Attendance + Parking + Rooms + Late requests |

---

## Tech Stack (unchanged from v2)

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (Pages Router) |
| UI | React 19 + Tailwind CSS 4 |
| Database | Firebase Firestore |
| Auth | Firebase Authentication (email/password) |
| Email | Nodemailer (Gmail SMTP) |
| Deployment | Vercel (auto-deploy from branch) |
| Timezone | America/Guayaquil (Ecuador, UTC-5) |
| Monorepo | npm workspaces |

---

## Repository Structure

```
reservation-boss/
├── packages/
│   ├── web/                    # Next.js full-stack app
│   │   ├── pages/
│   │   │   ├── auth/           # NEW: login, register, forgot-password
│   │   │   ├── admin/          # NEW: full admin suite
│   │   │   ├── dashboard.js    # NEW: user attendance dashboard
│   │   │   ├── rooms.js        # NEW: room reservations
│   │   │   ├── my-requests.js  # NEW: user's late requests
│   │   │   ├── parking.js      # KEPT: v2 (untouched, still works)
│   │   │   └── api/
│   │   │       ├── v3/         # NEW: all v3 API routes
│   │   │       └── [v2 routes] # KEPT: v2 routes untouched
│   │   └── lib/
│   │       ├── config/         # Firebase, email, constants
│   │       ├── middleware/      # Auth token verification, CORS
│   │       └── utils/          # weekHelpers, cache, + new helpers
│   └── shared/                 # Shared utilities (unchanged)
├── stitch/                     # Figma/Stitch design HTML mockups
├── docs/
│   ├── v3-plan.md              # Detailed implementation plan
│   └── v3-architecture.md      # This file
└── apps/                       # Reserved for future mobile app
```

---

## User Types & Access

```
┌─────────────────────────────────────────────────────────┐
│                     User Roles                           │
├──────────────┬──────────────────────────────────────────┤
│ admin        │ Full access: user mgmt, reports, config   │
├──────────────┼──────────────────────────────────────────┤
│ internal     │ Attendance + permanently assigned spot     │
│              │ Spot not in the external reservation pool  │
├──────────────┼──────────────────────────────────────────┤
│ external     │ Attendance + external parking per day      │
│              │ Max 4 spots/week, deadline 8am same day   │
├──────────────┼──────────────────────────────────────────┤
│ none         │ Attendance only, no parking               │
└──────────────┴──────────────────────────────────────────┘
All users: can book meeting rooms and calling booths
```

---

## Data Model

### Firestore Collections

#### `v3_users` — User profiles
```js
{
  uid: "firebase-auth-uid",
  email: "john.doe@northhighland.com",
  name: "John Doe",
  role: "external",          // 'admin' | 'internal' | 'external' | 'none'
  internalSpot: null,        // "Parking 3" if role='internal'
  active: true,
  createdAt: Timestamp,
  lastLogin: Timestamp
}
```

#### `v3_invitations` — Pending invites
```js
{
  email: "jane.doe@northhighland.com",
  token: "uuid-v4-string",
  createdAt: Timestamp,
  expiresAt: Timestamp,      // 48h TTL
  used: false
}
```

#### `v3_attendance` — Office attendance
```js
{
  userId: "uid",
  email: "john.doe@northhighland.com",
  date: "2026-03-10",        // YYYY-MM-DD
  status: "office",          // 'office' | 'remote'
  createdAt: Timestamp,
  updatedAt: Timestamp
}
// Index: userId + date (unique)
```

#### `v3_parking` — External parking reservations
```js
{
  userId: "uid",
  email: "john.doe@northhighland.com",
  date: "2026-03-10",
  spot: "Parking 5",
  createdAt: Timestamp
}
// Rules: max 4/week per user, 1/day per user, spot must be available
```

#### `v3_rooms` — Room configuration
```js
{
  id: "auto",
  name: "Conference Room A",
  type: "meeting",           // 'meeting' | 'calling'
  capacity: 8,
  active: true
}
```

#### `v3_room_reservations` — Room bookings
```js
{
  userId: "uid",
  email: "john.doe@northhighland.com",
  roomId: "room-id",
  roomName: "Conference Room A",
  roomType: "meeting",
  date: "2026-03-10",
  startTime: "09:00",        // 30-min increments 08:00–17:30
  endTime: "09:30",
  createdAt: Timestamp
}
```

#### `v3_late_requests` — Late cancellation/change requests
```js
{
  userId: "uid",
  email: "john.doe@northhighland.com",
  userName: "John Doe",
  type: "parking",           // 'attendance' | 'parking' | 'room'
  reservationId: "doc-id",   // ID of the blocked record
  date: "2026-03-10",
  reason: "Car broke down",
  status: "pending",         // 'pending' | 'approved' | 'denied'
  createdAt: Timestamp,
  resolvedAt: null,
  resolvedBy: null           // admin uid
}
```

---

## API Map

### Public (no auth)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v3/auth/invite/[token]` | Validate invite token |
| POST | `/api/v3/auth/register` | Complete registration |

### User (Firebase ID token required)
| Method | Endpoint | Purpose |
|---|---|---|
| GET/PUT | `/api/v3/profile` | Get or update own profile |
| GET/POST | `/api/v3/attendance` | Get week's attendance / set a day |
| DELETE | `/api/v3/attendance/[date]` | Remove attendance |
| GET/POST | `/api/v3/parking` | Get week's parking / reserve spot |
| DELETE | `/api/v3/parking/[id]` | Cancel parking |
| GET | `/api/v3/rooms` | List active rooms |
| GET/POST | `/api/v3/room-reservations` | Get bookings / book a slot |
| DELETE | `/api/v3/room-reservations/[id]` | Cancel room booking |
| GET/POST | `/api/v3/late-requests` | View own requests / submit request |

### Admin (Firebase token with role='admin')
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v3/auth/invite` | Send invite email |
| GET | `/api/v3/admin/users` | List all users |
| PUT | `/api/v3/admin/users/[uid]` | Update user role/spot/status |
| GET | `/api/v3/admin/late-requests` | List pending requests |
| PUT | `/api/v3/admin/late-requests/[id]` | Approve or deny |
| GET | `/api/v3/admin/reports/attendance` | Attendance report |
| GET | `/api/v3/admin/reports/parking` | Parking report |
| GET | `/api/v3/admin/reports/rooms` | Room usage report |
| GET | `/api/v3/admin/reports/late-requests` | Late request report |
| GET/POST | `/api/v3/admin/rooms` | List/create rooms |
| PUT/DELETE | `/api/v3/admin/rooms/[id]` | Update/deactivate room |

---

## Key Business Rules

### Attendance Scheduling
- Users plan Mon–Fri attendance weekly
- New week visible starting **Friday 5:00 PM** Ecuador time (prior week)
- Schedule locked **Monday 11:00 PM** Ecuador time — changes after this require late request
- Users can view past weeks (read-only) and plan up to 4 weeks ahead

### External Parking
- Only users with role `external` can reserve
- Max **4 reservations per week** per user
- Max **1 reservation per day** per user
- Cancellation allowed until **8:00 AM same day** — after that, requires late request

### Internal Parking
- Permanently assigned spot (set by admin on user profile)
- Spot is "owned" by that user — never available in the external pool
- No action needed from user — their spot is always reserved when they're in office

### Room Reservations
- Available to all users (any role)
- 30-minute time slots: 8:00 AM – 6:00 PM (last slot: 17:30–18:00)
- Mon–Fri only
- Cancellation before **8:00 AM same day** — after that, requires late request

### Late Request Workflow
```
User tries to cancel/change past deadline
        ↓
Late Request modal (user provides reason)
        ↓
POST /api/v3/late-requests → status: 'pending'
        ↓
Email notification sent to admins
        ↓
Admin reviews in /admin/requests
        ↓
Approve → reservation deleted + user email "approved"
Deny    → request closed + user email "denied"
```

---

## Authentication Flow

### Registration (invitation-based)
```
Admin enters email in /admin/users "Add User"
        ↓
POST /api/v3/auth/invite
→ creates v3_invitations doc (token, 48h TTL)
→ sends email: "Set up your account" + link
        ↓
Employee clicks link → /auth/register?token=xxx
→ GET /api/v3/auth/invite/[token] validates token
→ Email pre-filled (read-only)
→ User enters Name + Password → submits
→ POST /api/v3/auth/register
  → Firebase createUser (email, password)
  → creates v3_users doc (role: 'none')
  → marks invitation used
→ Redirect to /auth/login
```

### Login
```
/auth/login → signInWithEmailAndPassword (Firebase client SDK)
→ Get ID token → store in memory / Firebase handles session
→ Redirect to /dashboard (users) or /admin (admins)
```

### API Authorization
```
Client → Authorization: Bearer <Firebase ID token>
→ lib/middleware/auth.js → firebaseAdmin.auth().verifyIdToken(token)
→ Attach decoded user to request
→ Check role from v3_users doc if admin-only route
```

---

## Week Calendar Logic

All calculations use **America/Guayaquil timezone (UTC-5, no DST)**.

### Visible Week Default
| Current time | Show |
|---|---|
| Mon–Fri before 5pm | Current week |
| Fri 5pm or later | Next week |
| Sat–Sun | Next week |

### Attendance Edit Lock
| When | State |
|---|---|
| Fri 5pm → Mon 11pm | Editable (upcoming week) |
| After Mon 11pm | Locked — late request required |
| Past weeks | Always read-only |

---

## Design System

Based on Stitch-generated designs in the `/stitch` folder.

| Token | Value |
|---|---|
| Primary | `#112A46` (dark navy) |
| Secondary | `#00A3E0` (teal/blue) |
| Background (light) | `#F8F9FA` |
| Background (dark) | `#121212` |
| Surface (light) | `#FFFFFF` |
| Success | `#DEF7EC` / `#03543F` |
| Font | Inter (weights 300–700) |
| Icons | Material Icons / Material Symbols Outlined |
| Border radius | 0.5rem default |
| Dark mode | Tailwind `darkMode: "class"` |

### Screen Reference
| Screen | Stitch File | Used For |
|---|---|---|
| User login | `stitch/user_login_screen` | `/auth/login` |
| Registration | `stitch/registration_and_sign_up` | `/auth/register` |
| Forgot password | `stitch/forgot_password_recovery` | `/auth/forgot-password` |
| Attendance dashboard | `stitch/user_attendance_dashboard_1` | `/dashboard` (base) |
| Attendance (max reached) | `stitch/user_attendance_dashboard_2` | `/dashboard` (4-day state) |
| My bookings | `stitch/manage_my_bookings_1` | `/my-requests` |
| Room booking | `stitch/room_reservation_booking` | `/rooms` |
| Room analytics | `stitch/room_usage_analytics_dashboard` | `/admin/reports` (rooms tab) |
| Admin: users (1) | `stitch/admin_user_management_dashboard_1` | `/admin/users` |
| Admin: late requests | `stitch/admin_late_request_approval_1` | `/admin/requests` |
| Admin: attendance report | `stitch/admin_attendance_reports_1` | `/admin/reports` |
| Admin: parking config | `stitch/admin_parking_configuration_dashboard` | `/admin/parking` |
| Admin: room mgmt | `stitch/admin_room_management_dashboard` | `/admin/rooms` |

---

## Email Notifications

All sent via Nodemailer using existing Gmail SMTP config (`EMAIL_USER`, `EMAIL_PASS`).

| Event | To | Subject |
|---|---|---|
| User invited | Employee | "You're invited to North Highland Workspace" |
| Parking reserved | User | "Parking confirmed: [Spot] on [Date]" |
| Room booked | User | "Room booked: [Room] [Date] [Time]" |
| Late request submitted | Admin(s) | "New late request from [Name] for [Date]" |
| Late request approved | User | "Your request for [Date] has been approved" |
| Late request denied | User | "Your request for [Date] has been denied" |

---

## Environment Variables

All from existing `.env.local` — no new variables needed for v3 (same Firebase project, same Gmail).

```bash
# Firebase Client (public)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase Admin (server-only)
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL

# Email
EMAIL_USER
EMAIL_PASS

# API
NEXT_PUBLIC_API_URL
```

---

## Deployment

| Branch | Environment | URL |
|---|---|---|
| `main` | Production | `reservationboss.io` |
| `v3` | Staging | TBD (configure in Vercel) |

Vercel auto-deploys on push to each branch. Staging uses the same Firebase project but isolated `v3_` Firestore collections.

---

## Open Questions / Ideas for Team

1. **Max attendance days per week** — currently internal logic doesn't cap it. Should we add a policy limit? (e.g., max 4 days in office per week, same as parking)

2. **Meeting room capacity enforcement** — do we want to track attendees per room or just first-come-first-served for the slot?

3. **Calling booths** — are there existing booth numbers/names we should use, or define from scratch in the admin dashboard?

4. **Internal spot display** — when an internal user marks "attending", should we send them a confirmation email, or is it completely silent?

5. **Admin notification emails** — should late requests notify a single admin inbox, or all users with role='admin'?

6. **Mobile app** — planned for after web v3. Likely React Native. The API routes in Next.js will serve the mobile app too (same endpoints).

7. **Analytics retention** — how far back should reports go? Keep all historical data or rolling 12 months?

---

*Generated as part of Reservation Boss v3 planning — 2026-03-05*
