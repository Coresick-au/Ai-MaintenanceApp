# PROJECT_MAP.md

**Last updated:** 2025-12-17T08:54+10:00

## Overview

AI-MaintenanceApp is a multi-app React 19 application built with Vite, backed by Firebase (Firestore, Auth, Storage). It hosts several sub-applications for industrial maintenance, quoting, inventory, and customer management.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | React 19, Vite 7 |
| Language | TypeScript + JavaScript (mixed) |
| Styling | Tailwind CSS 3.4 |
| Backend | Firebase (Firestore, Auth, Storage) |
| Testing | Vitest (unit), Playwright (E2E) |
| Hosting | Firebase Hosting |
| Package Manager | npm |

---

## Run Commands

```bash
# Development
npm run dev          # Start Vite dev server (port 5173)

# Build & Deploy
npm run build        # Build for production
npm run deploy       # Build + Firebase hosting deploy
npm run preview      # Preview production build

# Testing
npm run test         # Run Vitest unit tests
npm run test:watch   # Watch mode for unit tests
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Playwright with UI

# Linting
npm run lint         # ESLint
```

---

## Environment Variables

Create `.env` from `.env.example`. All Firebase config uses `VITE_` prefix:

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain (e.g., `project.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics measurement ID |

> **Note:** Fallback hardcoded values exist in `src/firebase.js` for demo/testing.

---

## Entry Points

```
index.html
  └── src/main.jsx              # React entry point
        └── Portal.jsx          # App router/selector
              └── App.jsx       # Maintenance App (main)
              └── apps/quoting/QuotingWrapper.tsx
              └── apps/CustomerPortal/CustomerApp.jsx
              └── apps/InventoryApp.jsx
              └── apps/employees/*
```

---

## Module Map

```
src/
├── main.jsx                    # React bootstrap (AuthProvider → GlobalDataProvider → Portal)
├── Portal.jsx                  # Top-level app selector (routes between apps)
├── App.jsx                     # Maintenance App (~127KB, main app)
├── firebase.js                 # Firebase initialization & config
├── index.css                   # Global styles + Tailwind
│
├── apps/                       # Sub-applications
│   ├── quoting/                # Quoting tool (TypeScript)
│   │   ├── QuotingWrapper.tsx  # Entry wrapper
│   │   ├── hooks/useQuote.ts   # Main state hook
│   │   ├── logic.ts            # Pure calculation functions
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── components/         # UI components
│   │   └── utils/              # Helpers
│   ├── CustomerPortal/         # Customer management
│   ├── employees/              # Employee management
│   └── InventoryApp.jsx        # Inventory tracking
│
├── context/                    # React Context providers
│   ├── GlobalDataContext.jsx   # Customers, Sites, Employees (Firebase sync)
│   ├── AuthContext.jsx         # Authentication state
│   ├── SiteContext.jsx         # Active site state
│   ├── FilterContext.jsx       # Filter state
│   ├── UIContext.jsx           # UI state (modals, panels)
│   └── UndoContext.jsx         # Undo/redo stack
│
├── repositories/               # Data access layer (Repository Pattern)
│   ├── BaseRepository.js       # Base CRUD operations
│   ├── CustomerRepository.js   # Customer operations
│   ├── SiteRepository.js       # Site operations
│   ├── EmployeeRepository.js   # Employee operations
│   ├── QuoteRepository.js      # Quote operations
│   └── index.js                # Exports all repositories
│
├── components/                 # Shared components
│   ├── UIComponents.jsx        # Common UI elements
│   ├── SiteModals.jsx          # Site-related modals
│   ├── AssetModals.jsx         # Asset-related modals
│   ├── reports/                # PDF report generators
│   └── admin/                  # Admin components
│
├── hooks/                      # Custom React hooks
├── utils/                      # Utility functions
├── services/                   # External service integrations
└── data/                       # Static data files
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/firebase.js` | Firebase app initialization |
| `src/context/GlobalDataContext.jsx` | Central data store (customers, sites, employees) |
| `src/repositories/BaseRepository.js` | Base CRUD for Firestore |
| `src/apps/quoting/hooks/useQuote.ts` | Quote management state/logic |
| `src/apps/quoting/types.ts` | TypeScript type definitions |
| `firebase.json` | Firebase hosting config |
| `vite.config.js` | Vite build configuration |
| `tailwind.config.js` | Tailwind CSS configuration |

---

## Firestore Collections

| Collection | Repository | Description |
|------------|------------|-------------|
| `customers` | `CustomerRepository` | Customer profiles, contacts, managed sites |
| `sites` | `SiteRepository` | Sites with AIMM profiles |
| `employees` | `EmployeeRepository` | Employee records |
| `quotes` | `QuoteRepository` | Quote documents |
