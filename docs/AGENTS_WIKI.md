# AGENTS_WIKI.md

**Last updated:** 2025-12-17T08:54+10:00

## Coding Standards

### Language Mix
- **Quoting app:** TypeScript (`.ts`, `.tsx`)
- **Everything else:** JavaScript (`.js`, `.jsx`)
- Always add `@ts-ignore` when importing JS modules into TS files

### File Naming
- React components: `PascalCase.jsx` or `PascalCase.tsx`
- Hooks: `useCamelCase.ts` or `.js`
- Utilities: `camelCase.js`
- Context: `NameContext.jsx`
- Repositories: `NameRepository.js`

### Import Order
1. React/React-DOM
2. External libraries (firebase, lucide-react, date-fns)
3. Context providers
4. Repositories
5. Components
6. Hooks
7. Utils
8. Types
9. Styles

### UI Styling (Dark Theme)

**Rule:** All new UI components and PDF reports must match the app's dark theme:

| Purpose | Color | Tailwind Class |
|---------|-------|----------------|
| Page background | `#0f172a` | `bg-slate-900` or `bg-bg-app` |
| Card background | `#1e293b` | `bg-slate-800` or `bg-bg-surface` |
| Border | `#334155` | `border-slate-700` |
| Primary text | `#f1f5f9` | `text-slate-100` |
| Secondary text | `#94a3b8` | `text-slate-400` |
| Accent | `#06b6d4` | `text-cyan-500` or `text-accent` |
| Critical | `#ef4444` | `text-red-500` or `text-danger` |
| Warning | `#f59e0b` | `text-amber-500` or `text-warning` |
| Healthy | `#10b981` | `text-emerald-500` or `text-success` |

### Form Input Styling (CRITICAL)

**NEVER use default browser input styles!** All inputs, selects, and textareas MUST have:

```jsx
// ✅ CORRECT: Dark theme input styling
<input 
  className="bg-bg-tertiary text-slate-200 border border-slate-700 
             focus:ring-2 focus:ring-accent rounded-lg p-2
             hover:border-accent placeholder:text-slate-500"
/>

// ❌ WRONG: No background class = white/light mode inputs
<input className="border p-2" />
```

**Required classes for form elements:**
| Element | Required Classes |
|---------|-----------------|
| Input/Select | `bg-bg-tertiary text-slate-200 border-slate-700` |
| Textarea | `bg-bg-tertiary text-slate-200 border-slate-700` |
| Checkbox | `accent-accent` |
| Disabled state | Add `opacity-50 text-slate-400` |
| Focus state | `focus:ring-2 focus:ring-accent outline-none` |

**PDFs:** Use these same colors in `@react-pdf/renderer` stylesheets. See `FullDashboardPDF.tsx` for reference.

---

## Architecture Patterns

### Context Provider Hierarchy

```jsx
<AuthProvider>           // Authentication
  <GlobalDataProvider>   // Firebase sync (customers, sites, employees)
    <Portal>             // App Router
      <SiteContext>      // Active site state (within Maintenance App)
```

### Repository Pattern

All Firestore operations go through repositories (`src/repositories/`):

```javascript
// BaseRepository provides:
getById(id)
getAll()
create(id, data)
update(id, data)
delete(id)
subscribe(queryConstraints, callback, errorCallback)
```

**Rule:** Never call Firestore directly from components. Always use repositories via `GlobalDataContext`.

### Data Flow

```
Component
    ↓ calls
useGlobalData() hook (from GlobalDataContext)
    ↓ calls
Repository method (e.g., customerRepository.update())
    ↓ writes to
Firestore
    ↓ triggers subscription
GlobalDataContext updates state
    ↓ React re-renders
Component
```

---

## Conventions

### State Management

| Scope | Solution |
|-------|----------|
| Global app data | `GlobalDataContext` (customers, sites, employees) |
| Authentication | `AuthContext` |
| Active site | `SiteContext` |
| Quote state | `useQuote` hook (local + Firebase sync) |
| UI state | `UIContext` (modals, sidebars) |
| Local component | `useState` |

### Firestore Data Sanitization

**CRITICAL:** Firestore does not accept `undefined` values. Always sanitize before saving:

```typescript
// Use removeUndefined helper in useQuote.ts
const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    if (typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => [k, removeUndefined(v)])
        );
    }
    return obj;
};
```

### Handling Optional Nested Properties (Arrays)

When mapping objects with optional properties (like `rates` on sites), build objects conditionally:

```typescript
// DON'T - creates undefined values
managedSites.map(site => ({
    ...site,
    rates: site.rates ? { ...DEFAULT_RATES, ...site.rates } : undefined  // ❌ BAD
}))

// DO - conditionally add properties
managedSites.map(site => {
    const siteData: any = { id: site.id, name: site.name };
    if (site.rates) {
        siteData.rates = { ...DEFAULT_RATES, ...site.rates };  // ✅ GOOD
    }
    return siteData;
})
```

### Default Values

When working with `Rates` type, always spread `DEFAULT_RATES` to ensure all fields exist:

```typescript
// In useQuote.ts
const rates = { ...DEFAULT_RATES, ...(customer.rates || {}) };
```

### Type Definitions

All quoting types are in `src/apps/quoting/types.ts`:

| Type | Purpose |
|------|---------|
| `Rates` | Pricing rates with all required fields |
| `Customer` | Customer with contacts, rates, managed sites |
| `Quote` | Full quote document |
| `Shift` | Single shift entry |
| `JobDetails` | Job metadata |

---

## Where Things Live

### To add a new feature to Quoting:
1. Types → `src/apps/quoting/types.ts`
2. State/Logic → `src/apps/quoting/hooks/useQuote.ts`
3. Pure calculations → `src/apps/quoting/logic.ts`
4. UI → `src/apps/quoting/components/`

### To add a new Firestore collection:
1. Create repository → `src/repositories/NewRepository.js`
2. Export from → `src/repositories/index.js`
3. Add sync in → `src/context/GlobalDataContext.jsx`

### To add a new app:
1. Create folder → `src/apps/NewApp/`
2. Create wrapper → `src/apps/NewApp/NewAppWrapper.jsx`
3. Add route in → `src/Portal.jsx`

### PDF Reports:
- Components → `src/components/reports/`
- Uses `@react-pdf/renderer`

---

## Testing

### Unit Tests (Vitest)
- Location: `src/test/` and `**/__tests__/`
- Run: `npm run test`

### E2E Tests (Playwright)
- Location: `tests/`
- Config: `playwright.config.ts`
- Run: `npm run test:e2e`

---

## Deployment

```bash
# Full deploy
npm run deploy

# Preview channel
npm run deploy:preview
```

Hosting URL: `https://accurate-industries-database.web.app`
