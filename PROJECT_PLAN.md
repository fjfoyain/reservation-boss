# Reservation Boss — Project Plan

**Author:** Francisco Foyain (fjfoyain@gmail.com)
**Last Updated:** March 2026
**Status:** Active Development — v3 in progress

---

## Overview

**Reservation Boss** is an internal workspace portal for North Highland (Quito, Ecuador). It allows employees to manage their weekly office attendance, parking reservations, and room bookings, with admin oversight.

**Live URL:** https://reservationboss.io
**Deployment:** Vercel (auto-deploy from GitHub)

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable — legacy parking-only system, deployed to production |
| `v3` | Active development — full workspace portal |

`main` should only receive critical bug fixes. All new features go to `v3`.

---

## Current State

### `main` branch — Legacy System
Simple email-based parking reservation system. No user accounts.

- Weekly parking reservations (Mon–Fri)
- Email-based cancellation with one-time code
- Admin panel: reports, reservation management
- People Lead approval system (new — PLs can approve parking requests for their team)

### `v3` branch — Workspace Portal
Full user-account based system with Firebase Auth and rich feature set.

**Completed:**
- User registration via invite link
- Weekly attendance scheduling (office / remote)
- External parking reservations with spot assignment
- Internal parking with pre-assigned spots
- Meeting room and calling booth booking
- Late change request system (employee submits → admin reviews)
- Admin dashboard: reports, user management, parking config, room management, blackout dates
- People Lead approval system (PL approves team's parking requests)
- Role system: Admin, People Lead, Admin+PL dual role
- Responsive design (mobile + desktop)

**In Progress / Planned:**
- Mobile app (React Native + Expo, in `apps/mobile`)
- Push notifications
- Multi-office support

---

## Architecture

```
reservation-boss/               # Monorepo root
├── packages/
│   ├── web/                    # Next.js full-stack app (Vercel)
│   │   ├── pages/              # Frontend + API routes
│   │   │   ├── api/v3/         # v3 API endpoints
│   │   │   ├── api/approvals/  # People Lead approval API
│   │   │   ├── api/auth/       # Role API
│   │   │   ├── admin/          # Admin pages
│   │   │   └── ...             # User-facing pages
│   │   ├── components/         # Shared React components
│   │   ├── lib/
│   │   │   ├── config/         # Firebase, email, constants
│   │   │   ├── middleware/     # auth.js, authV3.js, cors.js
│   │   │   └── utils/          # weekHelpers, validation, cache
│   │   └── README.md           # Detailed technical reference
│   │
│   └── shared/                 # Shared utilities (web + future mobile)
│       ├── constants/
│       └── utils/
│
└── apps/
    └── mobile/                 # React Native (future)
```

---

## Firestore Collections

### v3 Collections

| Collection | Description |
|-----------|-------------|
| `v3_users` | User profiles (name, email, role, parking type, isAdmin, isPeopleLead, peopleLeadEmail) |
| `v3_attendance` | Daily attendance records (office/remote) |
| `v3_parking` | Parking reservations |
| `v3_room_reservations` | Room bookings |
| `v3_late_requests` | Late change requests |
| `v3_config` | App configuration (attendance deadlines, parking config) |
| `v3_blackout_dates` | Closed office dates |
| `v3_invitations` | Pending invite tokens |

### Legacy Collections (main branch)

| Collection | Description |
|-----------|-------------|
| `reservations` | Parking reservations (email-based) |
| `cancellationCodes` | One-time cancellation codes |
| `approvalRequests` | People Lead approval requests |
| `users` | (Unused in main, used by PL feature) |

---

## People Lead Approval Flow

A People Lead (PL) is a team manager who must approve parking reservation requests for their direct reports.

**Setup (Admin):**
1. Go to **Admin → User Management**
2. Edit a user → toggle **People Lead** ON to make them a PL
3. Edit another user → select their **Assigned People Lead** from the dropdown

**Flow:**
1. Employee submits parking reservation
2. If they have a PL assigned → request goes to `approvalRequests` with status `pending`
3. PL receives email notification
4. PL logs in → redirected to `/admin/pl-dashboard`
5. PL reviews requests in `/admin/approvals` → Approve or Reject
6. Employee receives email with the decision

**Roles:**
- **PL only** → Can only access `/admin/pl-dashboard` and `/admin/approvals`
- **Admin** → Full access to all admin pages
- **Admin + PL** → Full admin access (isAdmin takes priority); also visible in PL approval flow

---

## Key Design Decisions

### Token Refresh
Firebase ID tokens expire after 1 hour. All pages call `auth.currentUser.getIdToken()` fresh before each API request instead of caching the token in state. This prevents 401 errors in long sessions.

```js
function getToken() {
  return auth.currentUser?.getIdToken();
}
```

### Collection Name Constants
Collection names are defined in `lib/config/constants.js` as `USERS_COLLECTION` and `APPROVAL_REQUESTS_COLLECTION`. Change in one place, updates everywhere.

### Attendance Lock
Weekly attendance locks on Monday at the admin-configured deadline time (default 23:00 Ecuador). After lock, clicking a day opens a **Late Change Request** modal instead of directly toggling the day. The request is reviewed by an admin.

### Security
- `withFullAdmin` blocks People Lead-only users from admin API routes
- `withAdminAuth` (v3) requires `isAdmin: true` or legacy `role: 'admin'`
- Cancellation endpoints validate `reservationId` format before Firestore lookup
- Admin-only endpoints use `withFullAdmin` / `withAdminAuth` middleware

---

## Environment Variables

See `packages/web/README.md` for the full list of required environment variables.

Key variables:
- Firebase Admin credentials (server-side)
- Firebase Client config (public, browser)
- `EMAIL_USER` + `EMAIL_PASS` (Gmail SMTP via Nodemailer)
- `ADMIN_NOTIFICATION_EMAIL` (receives late request notifications)
- `NEXT_PUBLIC_API_URL` (base URL for emails and links)

---

## Quick Commands

```bash
# Run development server
cd packages/web && npm run dev

# Build
cd packages/web && npm run build

# Deploy
git push origin v3   # Vercel auto-deploys
```

---

## Roadmap

### Near Term
- [ ] Push v3 to production (reservationboss.io)
- [ ] Mobile app scaffolding (React Native + Expo in `apps/mobile`)
- [ ] Firestore composite indexes for attendance queries
- [ ] Push notifications for PL approvals

### Medium Term
- [ ] Mobile app: attendance + parking on iOS/Android
- [ ] Multi-office support
- [ ] Recurring reservations

### Long Term
- [ ] TypeScript migration
- [ ] Analytics dashboard
- [ ] Slack/Teams integration
- [ ] Visitor badge printing
