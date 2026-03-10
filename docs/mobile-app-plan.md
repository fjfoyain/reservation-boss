# North Highland Workspace — Mobile App Plan

## Overview

A mobile companion app (iOS + Android) for the North Highland Workspace reservation platform, covering office attendance scheduling, parking reservations, and meeting/calling room bookings.

The mobile app **reuses the existing backend entirely** — all `/api/v3/*` endpoints and Firebase Auth remain unchanged. Only the UI layer needs to be built.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | React Native + Expo SDK 52 | Team knows React; single codebase for iOS + Android |
| **Routing** | Expo Router (file-based) | Same mental model as Next.js Pages Router |
| **Auth** | Firebase JS SDK (`firebase/auth`) | Same SDK as web app, works in Expo Go without native modules |
| **API** | REST calls to `/api/v3/*` | Backend unchanged — just HTTP + Bearer token |
| **Styling** | `StyleSheet.create` | Simple, zero config; add NativeWind later if needed |
| **Icons** | `@expo/vector-icons` (MaterialIcons) | Closest match to Material Symbols used on web |
| **Font** | Inter via `expo-font` | Matches web design system |
| **Language** | TypeScript | Type safety, better DX |

### Why not...
- **Native Swift/Kotlin** — 2 codebases, 2 languages, 2x maintenance for a forms/lists app
- **Capacitor/Ionic** — WebView wrapper, worse UX than true native components
- **PWA** — iOS limitations (no push notifications, limited background)
- **`@react-native-firebase`** — requires native modules, can't use Expo Go without dev client builds

### Why Firebase JS SDK instead of `@react-native-firebase`
- Works in **Expo Go** out of the box (no native modules)
- **Same SDK** you already use in `packages/web` — same `signInWithEmailAndPassword`, `getIdToken`, etc.
- No `google-services.json` or `GoogleService-Info.plist` needed during development
- Only switch to native Firebase if you need push notifications, crashlytics, or offline Firestore sync later

---

## Project Location: `apps/mobile/`

```
reservation-boss/
├── packages/
│   ├── web/              ← existing Next.js app (unchanged)
│   ├── shared/           ← shared constants, types, helpers
│   └── backend/          ← legacy (archived)
├── apps/
│   └── mobile/           ← NEW: Expo Router app
│       ├── app/          ← file-based routes (like pages/ in Next.js)
│       │   ├── _layout.tsx        ← root layout (auth provider, nav)
│       │   ├── (auth)/
│       │   │   ├── login.tsx
│       │   │   └── forgot-password.tsx
│       │   └── (tabs)/
│       │       ├── _layout.tsx    ← tab navigator
│       │       ├── index.tsx      ← Dashboard (attendance)
│       │       ├── rooms.tsx      ← Room reservations
│       │       ├── bookings.tsx   ← My Bookings
│       │       ├── requests.tsx   ← My Requests
│       │       └── profile.tsx    ← Profile / Settings
│       ├── components/
│       │   ├── ui/               ← reusable primitives (Button, Card, etc.)
│       │   ├── WeekGrid.tsx      ← attendance week view
│       │   ├── RoomSlotGrid.tsx  ← room time slot grid
│       │   └── BookingCard.tsx   ← booking list item
│       ├── lib/
│       │   ├── firebase.ts       ← Firebase JS SDK init
│       │   ├── api.ts            ← apiFetch() wrapper with auth token
│       │   ├── auth-context.tsx  ← AuthProvider + useAuth hook
│       │   └── constants.ts     ← colors, API base URL, timezone
│       ├── assets/               ← app icon, splash screen
│       ├── app.json              ← Expo config
│       ├── eas.json              ← EAS Build profiles
│       ├── tsconfig.json
│       └── package.json
```

This lives in `apps/` (not `packages/`) because it's a deployable app, not a library. The root `package.json` already has `"workspaces": ["packages/*", "apps/*"]`.

---

## Distribution Strategy (Internal Only)

### Phase 1 — Development & Testing: Expo Go
- Employees download the free **Expo Go** app from App Store / Play Store
- Share a QR code — they scan it and the app loads instantly
- **$0 cost**, no Apple Developer account needed
- Updates are instant — push code, employees get new version on next open

### Phase 2 — Stable Internal Release: EAS Internal Distribution
- Build standalone `.ipa` / `.apk` via EAS
- Share install link — employees tap and install directly
- Requires $99/year Apple Developer account for iOS code signing
- Android is free (sideload APK)

### What we skip
- Public App Store listing
- Apple Business Manager
- Google Play internal track

---

## Screens to Build

| Screen | Web Equivalent | Tab? |
|--------|---------------|------|
| Login | `/auth/login` | No (auth flow) |
| Forgot Password | `/auth/forgot-password` | No (auth flow) |
| Dashboard (Attendance) | `/dashboard` | Tab 1 |
| Rooms | `/rooms` | Tab 2 |
| My Bookings | `/my-bookings` | Tab 3 |
| My Requests | `/my-requests` | Tab 4 |
| Profile / Settings | (basic) | Tab 5 |

**Admin screens stay web-only** — admin portal is better suited to desktop.

---

## Authentication Flow

Same Firebase Auth project, same approach as web:

```ts
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const app = initializeApp({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
});

export const auth = getAuth(app);
```

```ts
// lib/api.ts
import { auth } from './firebase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL; // https://reservationboss.io

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
```

> **Local dev:** Use your machine's LAN IP (`http://192.168.x.x:3000`), not `localhost`. Android emulator uses `http://10.0.2.2:3000`.

---

## Design System

Match the web app exactly:

| Token | Value | Usage |
|-------|-------|-------|
| Navy | `#112A46` | Headers, nav bar |
| Teal | `#00A3E0` | Accent, links |
| Blue | `#1183d4` | Primary buttons, interactive |
| Green | `#059669` | Success states |
| Red | `#DC2626` | Destructive actions |
| Gray-50 | `#f9fafb` | Backgrounds |
| Gray-900 | `#111827` | Body text |
| Font | Inter | `expo-font` + `@expo-google-fonts/inter` |
| Icons | MaterialIcons | `@expo/vector-icons` |
| Border radius | 12px | Cards, modals |
| Border radius | 8px | Buttons, inputs |

**Important:** The stitch-mobile designs have different colors/styles. Follow the **web app design** as the source of truth, not the stitch-mobile mockups. Use stitch-mobile only for layout/UX reference.

---

## Environment Variables

```bash
# apps/mobile/.env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_API_URL=https://reservationboss.io
```

Expo automatically exposes `EXPO_PUBLIC_*` vars to the client bundle.

---

## EAS Build Config

```json
// apps/mobile/eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

---

## Implementation Phases

### Phase 0: Project Scaffold (do first)
- [ ] Create Expo project at `apps/mobile/` with Expo Router template
- [ ] Configure TypeScript
- [ ] Set up Firebase JS SDK (`lib/firebase.ts`)
- [ ] Create `apiFetch()` wrapper (`lib/api.ts`)
- [ ] Create `AuthProvider` context (`lib/auth-context.tsx`)
- [ ] Set up root layout with auth guard (`app/_layout.tsx`)
- [ ] Add Inter font via `expo-font`
- [ ] Create design tokens/constants file
- [ ] Add root scripts: `"dev:mobile": "npm run start --workspace=apps/mobile"`
- [ ] Test Expo Go on physical device

### Phase 1: Auth Screens
- [ ] Login screen (email + password)
- [ ] Forgot Password screen (send reset email)
- [ ] Auth flow redirect (logged in → tabs, logged out → login)

### Phase 2: Dashboard (Attendance)
- [ ] Weekly attendance grid (Mon-Fri)
- [ ] Toggle office/remote per day
- [ ] Week navigation (current + next week)
- [ ] Lock indicators for past/deadline dates
- [ ] Late request modal for locked dates
- [ ] Parking section for external users

### Phase 3: Rooms
- [ ] Date picker (next 14 weekdays)
- [ ] Room type filter (meeting/calling)
- [ ] Time slot grid per room
- [ ] Booking confirmation modal
- [ ] Cancel booking flow

### Phase 4: My Bookings & Requests
- [ ] Aggregated booking list (attendance + parking + rooms)
- [ ] Cancel actions with deadline enforcement
- [ ] Late cancellation request flow
- [ ] My Requests list (pending/approved/denied)

### Phase 5: Profile & Polish
- [ ] Profile screen (name, email, role display)
- [ ] Pull-to-refresh on all screens
- [ ] Loading skeletons
- [ ] Error handling / retry states
- [ ] Haptic feedback on actions

### Phase 6: Internal Distribution
- [ ] Create Expo account
- [ ] Configure EAS Build
- [ ] Build preview profiles (iOS + Android)
- [ ] Share install links with team
- [ ] Set up OTA updates via EAS Update

### Phase 7: Optional Enhancements
- [ ] Push notifications (Expo Notifications)
- [ ] Location-based auto check-in (`expo-location`)
- [ ] Biometric login (Face ID / fingerprint)
- [ ] Offline support with local cache

---

## Development Tips

- Use **Expo Go** on a real device for fastest iteration — scan QR from `npx expo start`
- Use iOS Simulator (Mac only) or Android Studio emulator for testing
- For local API dev: run `npm run dev:web` and point `EXPO_PUBLIC_API_URL` to LAN IP
- Android emulator localhost alias: `http://10.0.2.2:3000`
- Use `console.log` + Expo dev tools for debugging (React Native Debugger for advanced)

---

## What Can Be Shared (`packages/shared/`)

Move these from `packages/web/` into `packages/shared/` as mobile development begins:

- `weekHelpersV3.js` — week calculation logic (Mon-Fri dates, deadlines)
- `constants.js` — roles, collection names, allowed domain
- TypeScript types for API responses (create as needed)

This avoids duplicating business logic between web and mobile.
