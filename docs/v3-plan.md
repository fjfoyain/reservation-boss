# Reservation Boss v3 — Full Implementation Plan

> **Branch:** `v3` → deployed to Vercel staging
> **Production:** `main` branch at `reservationboss.io` (untouched)
> **Last updated:** 2026-03-05

---

## Background

The current app (`reservationboss.io/parking`) is a stateless parking reservation tool where users identify themselves by email only — no accounts. v3 is a complete platform upgrade:

- Real user accounts with email + password login
- Office attendance scheduling (Mon–Fri weekly calendar)
- Parking integrated into attendance for external users
- Internal parking spots permanently assigned per user
- Meeting room and calling booth reservations (30-min slots)
- Late-change request workflow with admin approval
- Comprehensive admin suite (user management, analytics, config)

---

## Key Decisions

| Topic | Decision |
|---|---|
| **Internal parking** | Permanently assigned per user — owner of that spot, no daily confirmation, not in the external pool |
| **External parking** | Prompted when user marks attendance for a day; deadline 8am same day |
| **No parking users** | Just schedule attendance, no parking section shown |
| **Rooms** | 30-min time slots, 8am–6pm, Mon–Fri |
| **Invitations** | Admin sends invite email → user clicks link → pre-filled email, sets name + password |
| **Firebase** | Same project as v2, new Firestore collections prefixed `v3_` |
| **Week visibility** | New week visible from Friday 5pm (was Fri 2pm in v2) |
| **Attendance lock** | Monday 11pm — after that, changes need late request |

---

## Firestore Schema (new v3 collections)

### `v3_users`
```
{
  uid: string,               // Firebase Auth UID
  email: string,             // lowercase, @northhighland.com
  name: string,              // Display name
  role: 'admin' | 'internal' | 'external' | 'none',
  internalSpot?: string,     // Only for role='internal', e.g. "Parking 3"
  active: boolean,
  createdAt: timestamp,
  lastLogin: timestamp
}
```

### `v3_invitations`
```
{
  email: string,
  token: string,             // UUID v4
  createdAt: timestamp,
  expiresAt: timestamp,      // 48 hours after creation
  used: boolean
}
```

### `v3_attendance`
```
{
  userId: string,
  email: string,
  date: string,              // YYYY-MM-DD
  status: 'office' | 'remote',
  createdAt: timestamp,
  updatedAt: timestamp
}
```
Unique constraint: one doc per (userId, date).

### `v3_parking`
```
{
  userId: string,
  email: string,
  date: string,              // YYYY-MM-DD
  spot: string,              // e.g. "Parking 5"
  createdAt: timestamp
}
```
External users only. Max 4 reservations/week (unchanged from v2).

### `v3_rooms`
```
{
  id: string,                // auto-generated
  name: string,              // e.g. "Conference Room A"
  type: 'meeting' | 'calling',
  capacity: number,
  active: boolean
}
```

### `v3_room_reservations`
```
{
  userId: string,
  email: string,
  roomId: string,
  roomName: string,
  roomType: 'meeting' | 'calling',
  date: string,              // YYYY-MM-DD
  startTime: string,         // "08:00"
  endTime: string,           // "08:30"
  createdAt: timestamp
}
```

### `v3_late_requests`
```
{
  userId: string,
  email: string,
  userName: string,
  type: 'attendance' | 'parking' | 'room',
  reservationId: string,     // ID of the record to cancel/change
  date: string,              // YYYY-MM-DD
  reason: string,
  status: 'pending' | 'approved' | 'denied',
  createdAt: timestamp,
  resolvedAt?: timestamp,
  resolvedBy?: string        // admin uid
}
```

---

## Implementation Phases

### Phase 0 — Branch, Staging & Docs ✅
1. `git checkout -b v3 && git push -u origin v3`
2. Configure Vercel staging deployment from `v3` branch
3. Docs created: `docs/v3-plan.md` (this file), `docs/v3-architecture.md`

---

### Phase 1 — Auth & Invitation System

#### Pages
| Page | Path | Purpose |
|---|---|---|
| Login | `pages/auth/login.js` | Email+password login; `?email=` pre-fills email |
| Register | `pages/auth/register.js` | Token-based; fetches invite → pre-fills email; user sets name + password |
| Forgot Password | `pages/auth/forgot-password.js` | Firebase `sendPasswordResetEmail` |

#### API Routes
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v3/auth/invite` | Admin token | Validate domain, create `v3_invitations` doc, send email |
| GET | `/api/v3/auth/invite/[token]` | None | Validate token, return `{ email }` |
| POST | `/api/v3/auth/register` | None | Mark invite used, create Firebase user, create `v3_users` doc (role: 'none') |

#### New Lib
- `lib/utils/inviteHelpers.js` — `generateToken()`, `validateInviteToken(token)`

#### Reused Files
- `lib/config/firebase.js`, `lib/config/firebaseAdmin.js`, `lib/config/email.js`, `lib/middleware/auth.js`

---

### Phase 2 — User Profile & Types

#### API Routes
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v3/profile` | User token | Returns `v3_users` doc for current user |
| PUT | `/api/v3/profile` | User token | Update name |

#### User Role → UI Behavior
- `admin` → admin sidebar nav, no attendance dashboard
- `internal` → attendance dashboard; parking section shows "Your assigned spot: X" (read-only)
- `external` → attendance dashboard; parking prompt per office day
- `none` → attendance dashboard; no parking section

---

### Phase 3 — User Dashboard (Attendance)

#### Page: `pages/dashboard.js`
Design ref: `stitch/user_attendance_dashboard_1/code.html`

**Features:**
- Week navigator with `< >` arrows (prev/next week)
- Mon–Fri rows with day tile + "Attending/Remote" toggle
- If `external` + Attending → parking sub-row (Phase 4)
- If `internal` + Attending → "Your spot: Parking X" label (read-only)
- Amber banner: "Finalize by Monday 11pm" when week is editable
- "Save Weekly Schedule" button
- Past weeks: read-only view

**Week Logic (update `lib/utils/weekHelpers.js`):**
- Default shows current week
- If now ≥ Friday 5:00 PM Ecuador → default shows next week
- Can navigate back (past, read-only) and forward (up to 4 weeks)
- Editing locked after Monday 11:00 PM Ecuador time for that week

#### API Routes
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v3/attendance/week?start=YYYY-MM-DD` | User token | User's attendance for a week |
| POST | `/api/v3/attendance` | User token | Set/update attendance for a date (enforces Mon 11pm) |
| DELETE | `/api/v3/attendance/[date]` | User token | Remove attendance (same cutoff; past deadline → 403 lateCancellation) |

---

### Phase 4 — External Parking Integration

**Parking sub-row behavior** (appears when external user marks "Attending"):
- No spot reserved → spot dropdown + "Reserve" button
- Spot reserved → "Reserved: Spot #X" badge + "Cancel" link
- Cancel after 8am → 403 → trigger late request modal

**Logic reused from v2:**
- Spot list from `lib/config/constants.js`
- Weekly limit (4/week) same rule
- `lib/utils/cache.js` for caching

#### API Routes
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v3/parking` | User token | Reserve external spot; checks limit, availability, role=external |
| DELETE | `/api/v3/parking/[id]` | User token | Cancel; if past 8am same day → 403 `{ lateCancellation: true }` |
| GET | `/api/v3/parking/week?start=YYYY-MM-DD` | User token | User's parking for the week |

---

### Phase 5 — Room Reservations

#### Page: `pages/rooms.js`
Design ref: `stitch/room_reservation_booking/code.html`

**Features:**
- Date picker (Mon–Fri, defaults to visible week)
- Tabs: "Meeting Rooms" | "Calling Booths"
- Grid: room rows × 30-min time slots (8:00–17:30)
- Slot colors: green (available), blue (mine — cancel button), gray (taken)
- Booking confirmation modal

#### New Lib: `lib/utils/roomHelpers.js`
```js
generateTimeSlots(startHour=8, endHour=18, intervalMinutes=30)
// Returns: ["08:00", "08:30", "09:00", ..., "17:30"]
```

#### API Routes
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v3/rooms` | User token | List active rooms |
| GET | `/api/v3/room-reservations?date=&roomType=` | User token | All bookings for a date/type |
| POST | `/api/v3/room-reservations` | User token | Book slot; conflict check |
| DELETE | `/api/v3/room-reservations/[id]` | User token | Cancel; past 8am → 403 `{ lateCancellation: true }` |

---

### Phase 6 — Late Request Workflow

**User flow:** Any operation blocked by deadline → modal appears:
> "This change is past the deadline. Submit a request to admins?"
> [Text area for reason] [Submit Request]

**Page: `pages/my-requests.js`** — shows user's submitted requests + status (pending/approved/denied)

#### API Routes
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v3/late-requests` | User token | Create request; email admins |
| GET | `/api/v3/late-requests/mine` | User token | User's own requests |

**Email to admins:** "New late request from [Name] for [Date] — [Reason]"

---

### Phase 7 — Admin Suite

All admin pages use the sidebar layout from `stitch/admin_user_management_dashboard_1`.

#### `pages/admin/index.js` — Dashboard
Stats cards: total users, office attendance this week, pending requests, room bookings today.

#### `pages/admin/users.js` — User Management
Design ref: `stitch/admin_user_management_dashboard_1/code.html`
- Employee table: name, email, parking type badge, active toggle, "Change Type" dropdown
- Filter chips: All / Internal / External / No Parking
- Search by name or email
- "Add User" → invite modal (enter email → sends invite)
- When setting role to `internal` → "Assign Parking Spot" dropdown (only spots not yet assigned)
- "Export Data" CSV button

API:
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v3/admin/users` | Admin | List all users |
| PUT | `/api/v3/admin/users/[uid]` | Admin | Update role, internalSpot, active |

#### `pages/admin/requests.js` — Late Request Approvals
Design ref: `stitch/admin_late_request_approval_1/code.html`
- Table: Employee, Date, Type, Reason, Approve/Deny buttons
- On Approve: cascade-delete the blocked reservation → update late request status → email user
- On Deny: update status → email user

API:
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v3/admin/late-requests?status=pending` | Admin | List pending requests |
| PUT | `/api/v3/admin/late-requests/[id]` | Admin | `{ action: 'approve'\|'deny' }` |

#### `pages/admin/reports.js` — Analytics
Design ref: `stitch/admin_attendance_reports_1/code.html`
- Tabs: Attendance | External Parking | Rooms | Late Requests
- Weekly and monthly views
- CSV export per tab

API:
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v3/admin/reports/attendance` | Admin | `?type=weekly\|monthly&date=` |
| GET | `/api/v3/admin/reports/parking` | Admin | `?type=weekly\|monthly&date=` |
| GET | `/api/v3/admin/reports/rooms` | Admin | `?type=weekly\|monthly&date=` |
| GET | `/api/v3/admin/reports/late-requests` | Admin | `?period=monthly&date=` |

#### `pages/admin/parking.js` — Parking Configuration
Design ref: `stitch/admin_parking_configuration_dashboard/code.html`
- External spots list with active/maintenance toggle
- Internal spots list with assigned user
- Blackout dates management

#### `pages/admin/rooms.js` — Room Management
Design ref: `stitch/admin_room_management_dashboard/code.html`
- Add/edit/deactivate rooms
- Set name, type (meeting/calling), capacity

API:
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v3/admin/rooms` | Admin | List all rooms |
| POST | `/api/v3/admin/rooms` | Admin | Create room |
| PUT | `/api/v3/admin/rooms/[id]` | Admin | Update room |
| DELETE | `/api/v3/admin/rooms/[id]` | Admin | Deactivate room |

---

### Phase 8 — Email Notifications

All use existing `lib/config/email.js` (Nodemailer/Gmail SMTP).

| Trigger | Recipient | Subject |
|---|---|---|
| Admin invites user | Employee | "You're invited to North Highland Workspace" |
| Parking reserved | User | "Parking spot confirmed: [Spot] on [Date]" |
| Room reserved | User | "Room booked: [Room] on [Date] [Time]" |
| Late request submitted | Admin(s) | "New late cancellation request from [Name]" |
| Late request approved | User | "Your request for [Date] was approved" |
| Late request denied | User | "Your request for [Date] was denied" |

Admin email list: stored in `lib/config/constants.js` or `v3_config` Firestore document.

---

## Navigation Map

```
Auth (unauthenticated)
├── /auth/login
├── /auth/register?token=xxx
└── /auth/forgot-password

User (authenticated, non-admin)
├── /dashboard          ← default after login
├── /rooms
└── /my-requests

Admin
├── /admin              ← dashboard
├── /admin/users
├── /admin/requests
├── /admin/reports
├── /admin/parking
└── /admin/rooms
```

---

## Critical Files Reference

### Existing — reuse/extend
- `packages/web/lib/config/firebaseAdmin.js`
- `packages/web/lib/config/firebase.js`
- `packages/web/lib/config/email.js`
- `packages/web/lib/config/constants.js`
- `packages/web/lib/middleware/auth.js`
- `packages/web/lib/middleware/cors.js`
- `packages/web/lib/utils/weekHelpers.js` — update Fri threshold to 5pm
- `packages/web/lib/utils/cache.js`

### New
- `packages/web/lib/utils/inviteHelpers.js`
- `packages/web/lib/utils/roomHelpers.js`
- `packages/web/pages/auth/login.js`
- `packages/web/pages/auth/register.js`
- `packages/web/pages/auth/forgot-password.js`
- `packages/web/pages/dashboard.js`
- `packages/web/pages/rooms.js`
- `packages/web/pages/my-requests.js`
- `packages/web/pages/admin/index.js`
- `packages/web/pages/admin/users.js`
- `packages/web/pages/admin/requests.js`
- `packages/web/pages/admin/reports.js`
- `packages/web/pages/admin/parking.js`
- `packages/web/pages/admin/rooms.js`
- All new API routes under `packages/web/pages/api/v3/`

---

## Verification Checklist

- [ ] `v3` branch deployed to Vercel staging
- [ ] Admin invite → employee receives email → clicks link → pre-filled email → sets name+password → logs in → lands on dashboard
- [ ] External user: mark Mon "Attending" → parking sub-row → reserve spot → save → shows "Reserved"
- [ ] Attendance locked after Mon 11pm → late request modal appears → submits → admin sees in `/admin/requests`
- [ ] Parking cancel after 8am → late request modal → admin approves → reservation removed
- [ ] Room booking: `/rooms` → select date → click 30-min slot → confirm → slot turns blue "Mine"
- [ ] Admin `/admin/users` → "Add User" → invite sent → user appears in table → type changed to "internal" → spot assigned
- [ ] Admin `/admin/reports` → attendance weekly table correct → CSV exports
- [ ] Admin approves late request → user email notification sent
- [ ] Production `main` branch completely unaffected
