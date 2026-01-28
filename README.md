# 🚗 Reservation Boss

**Live at:** [https://reservationboss.io](https://reservationboss.io)

Multi-platform parking reservation system for North Highland offices. Modern Next.js full-stack application deployed on Vercel.

## 📦 Monorepo Structure

```
reservation-boss/
├── packages/
│   ├── web/           # Next.js Full-Stack (Frontend + API Routes)
│   └── shared/        # Shared utilities & constants
├── apps/              # Future mobile apps (React Native)
└── docs/              # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 24.13.0 (LTS)
- npm >= 10.0.0
- Firebase account

### Installation

```bash
# Install dependencies
cd packages/web
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Development

```bash
# Run development server
cd packages/web
npm run dev

# Open http://localhost:3000
```

### Build

```bash
# Build for production
cd packages/web
npm run build

# Start production server
npm start
```

## 🌐 Deployment

**Platform:** Vercel  
**Domain:** reservationboss.io  
**Auto-Deploy:** Push to `main` branch

Environment variables are configured in Vercel dashboard.

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

- **Framework**: Next.js 15.5.10 (Full-Stack)
- **Runtime**: Node.js 24.13.0 LTS
- **UI**: React 19.0.0
- **Styling**: Tailwind CSS 4.0.14
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Email**: Nodemailer (Gmail SMTP)
- **Deployment**: Vercel
- **Domain**: reservationboss.io

### Architecture
- **Frontend**: React pages with hooks
- **Backend**: Next.js API Routes (Serverless)
- **Middleware**: CORS + Firebase Auth
- **Caching**: In-memory cache for optimization
- **Timezone**: America/Guayaquil (Ecuador)

## 📁 Project Structure

### `packages/web`
Next.js Full-Stack Application
```
web/
├── pages/              # Frontend pages
│   ├── index.js       # Main reservation UI
│   ├── login.js       # Admin login
│   └── api/           # Backend API routes
├── lib/               # Server-side utilities
│   ├── config/        # Firebase Admin, Email, Constants
│   ├── middleware/    # CORS, Auth
│   └── utils/         # Week helpers, Validation, Cache
└── styles/            # Global CSS
```

### `packages/shared`
Shared utilities for future mobile apps
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
