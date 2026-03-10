# North Highland Workspace — Mobile App Plan

## Overview

A mobile companion app (iOS + Android) for the North Highland Workspace reservation platform, covering office attendance scheduling, parking reservations, and meeting/calling room bookings.

The mobile app **reuses the existing backend entirely** — all `/api/v3/*` endpoints and Firebase Auth remain unchanged. Only the UI layer needs to be built.

---

## Recommended Stack: React Native with Expo

### Why Expo / React Native
- Team already knows React — hooks, state, and component model are identical
- Firebase has a first-class React Native SDK
- Expo EAS Build generates `.ipa` (iOS) and `.aab` (Android) in the cloud — no Mac required for iOS builds
- Existing `/api/v3/*` REST API works as-is from the mobile app
- No need to learn Swift or Kotlin — one codebase covers both platforms

### Why not native Swift/Kotlin
- Would require two separate codebases in two new languages
- Performance difference is imperceptible for a reservation/scheduling tool (forms, lists, calendars)
- Native makes sense for games, AR, Bluetooth, video processing — none of which apply here

### Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **React Native + Expo** ✅ | Native feel, reuses React knowledge, single codebase | UI layer must be rewritten (no HTML/Tailwind) |
| **Native Swift/Kotlin** | Truly native, maximum performance | Two codebases, two new languages, 2x maintenance |
| **Capacitor (web wrapper)** | Fastest to ship, zero UI rewrite | Feels like a WebView, worse performance/UX |
| **PWA** | Zero new code | iOS limitations (no push notifications, no background sync) |

---

## Distribution Strategy (Decided: Internal Only)

Since this is an internal tool for North Highland employees only, **we skip the public App Stores entirely**.

### Phase 1 — Development & Testing: Expo Go
- Employees download the free **Expo Go** app from App Store / Play Store
- You share a QR code or link — they scan it and the app loads instantly
- **No Apple Developer account needed, no Google Play account needed, $0 cost**
- Updates are instant — push code, employees get new version automatically on next open
- Best for: active development, internal testing, demos

### Phase 2 — Stable Internal Release: EAS Internal Distribution
- Build a proper standalone `.ipa` / `.apk` once via EAS
- Share a link — employees tap and install directly, no app stores involved
- Standalone app icon on home screen, works offline
- Requires $99/year Apple Developer account for iOS code signing (Android is free)
- Updates require a new build + resharing the link
- Best for: stable production-ready internal release

### What we skip
- Public App Store listing (not needed)
- Apple Business Manager (overkill for this size)
- Google Play internal track (EAS internal distribution is simpler)

---

## Location Features

Location support is fully available in Expo with `expo-location`:

```bash
npx expo install expo-location
```

### Capabilities
- Get current GPS coordinates
- Reverse geocoding (coordinates → address)
- Geofencing (trigger when entering/leaving an area)
- Map display via `react-native-maps`

### Potential use cases for this app
- **Auto check-in** — detect arrival at the office, auto-mark attendance as "Office"
- **Parking suggestion** — show available spots near current location
- **Proximity alert** — "You're near the office — did you forget to book parking?"
- **Confirm on arrival** — prompt "You've arrived, confirm your attendance?"

### Permissions note
- **Foreground location** (while app is open) — straightforward, no issues
- **Background location** — needs extra justification for App Store; not needed for our use cases
- For internal distribution via Expo Go / EAS internal, permission prompts work the same as any app

---

## What to Reuse vs. Rewrite

### Reuse (unchanged)
- All `/api/v3/*` API routes
- Firebase Auth (login, token refresh)
- Firebase Firestore collections (`v3_*`)
- Business logic (week helpers, deadlines, parking rules)
- All environment variables and config

### Rewrite (mobile UI layer)
- Navigation → **React Navigation** (instead of Next.js Router)
- UI components → `View`, `Text`, `Pressable` (or **NativeWind** for Tailwind-like syntax)
- No HTML, no Tailwind CSS classes
- Firebase Auth client → `@react-native-firebase/auth`

---

## Screens to Build

| Screen | Corresponds to Web Page |
|---|---|
| Login | `/auth/login` |
| Dashboard (Weekly Attendance) | `/dashboard` |
| Room Reservations | `/rooms` |
| My Bookings | `/my-bookings` |
| My Requests | `/my-requests` |
| Profile / Settings | (basic) |

Admin screens are not planned for mobile — the admin portal is better suited to desktop/web.

---

## Project Setup

```bash
# Create Expo project (place alongside the web package)
npx create-expo-app packages/mobile --template blank-typescript

# Install dependencies
cd packages/mobile
npx expo install @react-native-firebase/app @react-native-firebase/auth
npm install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context

# Location support
npx expo install expo-location

# For Tailwind-like styling (optional but recommended)
npm install nativewind
npm install --save-dev tailwindcss
```

### Project structure suggestion
```
reservation-boss/
├── packages/
│   ├── web/          ← existing Next.js app
│   └── mobile/       ← new Expo app
│       ├── app/      (or screens/)
│       ├── components/
│       ├── lib/
│       │   ├── firebase.ts   ← Firebase client config
│       │   └── api.ts        ← fetch wrappers for /api/v3/*
│       └── ...
```

---

## Authentication Flow

The mobile app uses the same Firebase Auth project:

1. User enters email + password → `signInWithEmailAndPassword`
2. Get `idToken` via `user.getIdToken()`
3. Pass token as `Authorization: Bearer <token>` header on all API calls
4. Token auto-refreshes via Firebase SDK

```ts
// lib/api.ts
import auth from '@react-native-firebase/auth';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await auth().currentUser?.getIdToken();
  return fetch(`https://your-domain.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
```

> **Note:** Replace `https://your-domain.com` with the production domain. For local dev, use your machine's LAN IP (not `localhost`) — devices can't reach localhost. Android emulator uses `http://10.0.2.2:3000`.

---

## EAS Build for Internal Distribution

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure the project
eas build:configure

# Build for internal distribution (no App Store)
eas build --platform all --profile preview

# Share the install link with employees (printed after build completes)
```

### `eas.json`
```json
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

## Environment Variables

```ts
// app.config.ts
export default {
  extra: {
    firebaseApiKey: process.env.FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    apiBaseUrl: process.env.API_BASE_URL, // e.g. https://reservationboss.io
  },
};
```

```ts
import Constants from 'expo-constants';
const { apiBaseUrl } = Constants.expoConfig.extra;
```

---

## Development Tips

- Use **Expo Go** on a real device for fast iteration — scan QR from `npx expo start`
- Use iOS Simulator (Mac only) or Android Studio emulator for full testing
- For local API dev: use your machine's LAN IP (`http://192.168.x.x:3000`)
- Android emulator alias for localhost: `http://10.0.2.2:3000`

---

## Next Steps (ordered)

1. [ ] Set up Expo project under `packages/mobile`
2. [ ] Configure Firebase client (`google-services.json` for Android, `GoogleService-Info.plist` for iOS)
3. [ ] Build Auth screens (Login, Forgot Password)
4. [ ] Build Dashboard screen (weekly attendance grid)
5. [ ] Build Rooms screen (date picker + slot grid)
6. [ ] Build My Bookings screen (list with cancel actions)
7. [ ] Build My Requests screen
8. [ ] Test internally via Expo Go with the team
9. [ ] Set up EAS Build `preview` profile for standalone internal distribution
10. [ ] (Optional) Add location-based auto check-in with `expo-location`
11. [ ] (Optional) Add push notifications via Expo Notifications

---

## Design System

Match the web app:
- Primary navy: `#112A46`
- Accent teal: `#00A3E0`
- Interactive blue: `#1183d4`
- Font: Inter (via `expo-font` or `@expo-google-fonts/inter`)
- Icons: `@expo/vector-icons` (MaterialIcons or MaterialCommunityIcons as substitute for Material Symbols)
