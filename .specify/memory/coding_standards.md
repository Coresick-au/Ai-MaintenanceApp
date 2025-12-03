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

## Date Selection Standardization

### Rule: Use UniversalDatePicker Component

**Directive:**
All date selection across the application must use the `UniversalDatePicker` component to ensure consistent styling and dark mode compliance.

**Pattern to Avoid:**
```javascript
// ❌ BAD: Using native input or raw DatePicker
<input type="date" />
<DatePicker />
```

**Correct Pattern:**
```javascript
// ✅ GOOD: Use the standardized component
import { UniversalDatePicker } from './UIComponents';

<UniversalDatePicker
  selected={date}
  onChange={setDate}
  placeholderText="Select Date"
/>
```

**Rationale:**
- Ensures consistent UI/UX across the application.
- Centralizes styling and dark mode logic.
- Simplifies maintenance and updates.

**When this was learned:** 2025-12-03 - Standardized date pickers for dark mode support.

---

### V. Cross-Feature Standardization & Audit Protocol (NON-NEGOTIABLE)

**Core Principle:** All critical UI interactions (Delete, Date Selection, Save/Close) MUST use the single, designated universal component.

**Required Audit Step:** When implementing or replacing a standard component (e.g., `<SecureDeleteButton />`, `<UniversalDatePicker />`), the agent MUST perform a repository-wide code search (`grep` or equivalent) to identify all historical, non-standard implementations (e.g., `window.confirm('Are you sure?')`, old delete buttons, old date pickers).

**Enforcement:** ALL non-standard instances must be replaced with the new universal component.

---

## Future Rules

Additional coding standards will be appended here as new patterns are discovered through build errors and lint warnings.
