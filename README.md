# 🚗 Parking Reservation System

Multi-platform parking reservation system for North Highland offices.

## 📦 Monorepo Structure

```
parking-app/
├── packages/
│   ├── backend/       # Express.js API (Node.js)
│   ├── web/           # Next.js web application
│   └── shared/        # Shared utilities & constants
├── apps/              # Future mobile apps (React Native)
└── docs/              # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Firebase account

### Installation

```bash
# Install all dependencies
npm install

# Copy environment files
cp packages/backend/.env.example packages/backend/.env
cp packages/web/.env.example packages/web/.env.local
```

### Development

```bash
# Run both backend and web in development mode
npm run dev

# Or run individually
npm run dev:backend    # Backend on port 4000
npm run dev:web        # Web on port 3000
```

### Build

```bash
# Build all packages
npm run build

# Build individually
npm run build:backend
npm run build:web
```

## 📱 Current Features

- **Weekly Parking Reservations**: Reserve parking spots Mon-Fri
- **Email Restrictions**: North Highland domain only
- **Weekly Limits**: Max 3 reservations per week
- **Admin Panel**: Manage reservations
- **Email Notifications**: Confirmation emails
- **Real-time Updates**: Live availability grid

## 🎯 Upcoming Features

- [ ] Office bot reservation system (meeting rooms, desks)
- [ ] Multi-office support
- [ ] iOS mobile app (React Native)
- [ ] Android mobile app (React Native)
- [ ] Push notifications
- [ ] Analytics dashboard

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Email**: Nodemailer

### Web
- **Framework**: Next.js 15.2
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **State**: React hooks
- **Deployment**: Hostinger (static export)

### Shared
- Utility functions
- Constants
- Validators
- Date helpers

## 📁 Package Details

### `packages/backend`
REST API for parking reservations
- Port: 4000 (configurable)
- Deployed on: Render

### `packages/web`
Next.js web application
- Port: 3000 (development)
- Deployed on: Hostinger subdomain (parking.foysys.com)

### `packages/shared`
Shared code between all platforms
- Constants (parking spots, limits)
- Utilities (email validation, date helpers)
- Future: TypeScript types

## 🌍 Environment Variables

### Backend (.env)
```
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
EMAIL_USER=
EMAIL_PASS=
PORT=4000
```

### Web (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

## 🔧 Development Scripts

```bash
npm run dev              # Run backend + web
npm run dev:backend      # Backend only
npm run dev:web          # Web only
npm run build            # Build all
npm run test             # Run all tests
npm run clean            # Clean node_modules
```

## 📊 Database Structure

### Collections

**reservations**
```javascript
{
  email: string,           // user@northhighland.com
  date: string,            // YYYY-MM-DD
  spot: string,            // "Parqueadero 57"
  createdAt: timestamp
}
```

**Future: bot_reservations**
```javascript
{
  resourceType: string,    // "meeting-room" | "desk"
  resourceId: string,      // "room-a"
  email: string,
  date: string,
  startTime: string,
  endTime: string,
  officeId: string
}
```

## 🚀 Deployment

### Backend (Render)
```bash
cd packages/backend
git push origin main
# Auto-deploys via Render
```

### Web (Hostinger)
```bash
cd packages/web
npm run build
npm run export
# Upload 'out' folder to Hostinger
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Submit a pull request

## 📄 License

ISC

## 👨‍💻 Author

Francisco Foyain

---

**Questions?** Contact the development team.
