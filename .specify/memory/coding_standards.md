# Coding Standards

This document contains coding standards and patterns learned from build errors and lint warnings encountered during development.

## React Fast Refresh

### Rule: Separate Non-Component Exports from Component Files

**Pattern to Avoid:**
```javascript
// ❌ BAD: Exporting constants/helpers alongside components
export const formatDate = (date) => { /* ... */ };
export const Icons = { /* ... */ };
export const MyComponent = () => { /* ... */ };
```

**Correct Pattern:**
```javascript
// ✅ GOOD: Import helpers from separate utility files
import { formatDate } from '../utils/helpers';
import { Icons } from '../constants/icons';

// Re-export for backward compatibility if needed
export { formatDate, Icons };

export const MyComponent = () => { /* ... */ };
```

**Rationale:**
- Fast Refresh only works reliably with files that export React components
- Mixing component and non-component exports causes Fast Refresh warnings
- Separating concerns improves code organization and maintainability

**When this was learned:** 2025-12-03 - Fixed Fast Refresh warnings in UIComponents.jsx

---

## Future Rules

Additional coding standards will be appended here as new patterns are discovered through build errors and lint warnings.
