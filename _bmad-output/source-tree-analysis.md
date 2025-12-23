# Source Tree Analysis

## Critical Directory Structure

```
c:/Users/Brad/Documents/~AppProjects/Ai-MaintenanceApp
├── src/
│   ├── apps/               # Feature Modules (The "Apps" within the App)
│   │   ├── CustomerPortal/ # Client-facing portal
│   │   ├── quoting/        # Quoting system module
│   │   ├── employees/      # Staff management
│   │   ├── InventoryApp.jsx # Inventory module entry
│   │   └── MaintenanceWrapper.jsx # Maintenance module entry
│   │
│   ├── repositories/       # Data Access Layer (Firestore)
│   │   ├── BaseRepository.js # Generic CRUD wrapper
│   │   ├── CustomerRepository.js
│   │   ├── QuoteRepository.js
│   │   └── ...
│   │
│   ├── services/           # Domain Logic Layer
│   │   ├── inventoryService.js # Complex inventory transactions
│   │   ├── categoryService.js
│   │   └── ...
│   │
│   ├── context/            # Global State (React Context)
│   ├── components/         # Reusable UI Library
│   ├── utils/              # Shared Utilities (Validation, formatting)
│   ├── hooks/              # Custom React Hooks
│   ├── constants/          # Static configuration
│   └── data/               # Static data / Mock data
│
├── electron-main.cjs       # Electron Main Process
├── firebase.json           # Firebase Hosting/Function config
└── package.json            # Dependencies and Scripts
```

## Structural Analysis

### Service-Repository Pattern
The project strictly enforces access patterns:
1.  **Apps/Components** call **Services** for complex operations (e.g., `adjustStockQuantity`).
2.  **Services** use **Repositories** or direct Firestore transactions.
3.  **Repositories** handle raw CRUD and data mapping.

This separation ensures that UI code does not contain raw Firestore queries, making the application maintable and testable.

### Feature Modules (`src/apps`)
The application is segmented into distinct feature areas located in `src/apps`. This suggests a "modular monolith" approach where different business domains are kept logically distinct even if they share the same codebase.
