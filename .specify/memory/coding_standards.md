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

## Agent Directives
- **Map Generation**: After completing any code changes that affect `src/components/` structure, the agent MUST run `npm run map:generate` to update the visual map data.

---

## Electron/Context State Synchronization

### Rule: Explicitly Clear Dirty State on Persist

**Directive:**
Any action that successfully persists data MUST trigger an explicit `clearDirty()` or `setIsDirty(false)` call on the global application state to prevent exit warning regressions.

**Rationale:**
- Prevents "Unsaved Changes" warnings from appearing after a successful save.
- Ensures the application state accurately reflects the persistence status.
- Critical for correct window close behavior in Electron.

**When this was learned:** 2025-12-03 - Fixed persistent window exit bug (Issue #4).

---

## Protocol 1: Test-First Requirement

### Rule: Write Failing Tests Before Implementing Fixes

**Directive:**
For any fix involving data context (e.g., `SiteContext.jsx`), undo/redo logic, or complex UI state, the agent MUST write a failing Vitest unit test that reproduces the bug BEFORE implementing the fix.

**Scope:**
This protocol applies to:
- Data context modifications (`SiteContext.jsx`, `UndoContext.jsx`, `FilterContext.jsx`, etc.)
- Undo/redo logic and state management
- Complex UI state interactions
- Data persistence and synchronization logic
- Any bug fix where the behavior can be tested programmatically

**Required Workflow:**
1. **Reproduce the Bug**: Write a unit test that fails due to the current bug
2. **Verify Test Failure**: Run the test to confirm it fails for the expected reason
3. **Implement Fix**: Write the code to fix the bug
4. **Verify Test Success**: Run the test to confirm it now passes
5. **Success Condition**: The fix is only approved when the new unit test passes

**Example:**
To fix an asset delete failure in `SiteContext.jsx`:

```javascript
// Step 1: Write failing test in SiteContext.test.js
describe('SiteContext - Delete Asset', () => {
  it('should remove asset from site data when deleteAsset is called', () => {
    const { result } = renderHook(() => useSiteContext(), {
      wrapper: SiteProvider
    });
    
    // Add test asset
    act(() => {
      result.current.addAsset('site-1', { id: 'asset-1', name: 'Test Asset' });
    });
    
    // Delete asset
    act(() => {
      result.current.deleteAsset('site-1', 'asset-1');
    });
    
    // Verify asset is removed
    const site = result.current.sites.find(s => s.id === 'site-1');
    expect(site.assets).not.toContainEqual(expect.objectContaining({ id: 'asset-1' }));
  });
});

// Step 2: Run test - it should FAIL
// Step 3: Implement deleteAsset function in SiteContext.jsx
// Step 4: Run test - it should PASS
```

**Rationale:**
- Ensures bugs are properly understood before attempting fixes
- Creates regression tests that prevent the bug from reoccurring
- Validates that the fix actually resolves the issue
- Builds a comprehensive test suite over time
- Forces clear thinking about expected behavior

**Test File Locations:**
- Context tests: `src/context/__tests__/[ContextName].test.js`
- Component tests: `src/components/__tests__/[ComponentName].test.jsx`
- Utility tests: `src/utils/__tests__/[utilName].test.js`

**When this was learned:** 2025-12-03 - Established test-first protocol for complex state management fixes.

---

## Protocol 2: Standardization Audit (Cross-Feature Check)

### Rule: Enforce Universal Component Adoption Across Entire Codebase

**Constraint:**
Whenever a universal component is created or modified (e.g., `<SecureDeleteButton />`, `<UniversalDatePicker />`, `<ArchiveButton />`), the agent MUST perform a full repository search of the `src/` directory to locate and replace ALL historical, non-standard implementations, regardless of file type or location.

**Scope:**
This protocol applies to:
- Universal UI components (`SecureDeleteButton`, `UniversalDatePicker`, etc.)
- Standardized buttons (Archive, Delete, Save, Cancel)
- Common form elements
- Confirmation dialogs and modals
- Any component designated as "universal" or "standard"

**Required Workflow:**
1. **Identify Universal Component**: Determine what component is being standardized
2. **Search Repository**: Use `grep_search` or equivalent to find all instances of:
   - Old component names
   - Inline implementations (e.g., `window.confirm()`, `<input type="date" />`)
   - Similar patterns that should use the universal component
3. **Document Findings**: List all files containing non-standard implementations
4. **Replace All Instances**: Update every occurrence to use the universal component
5. **Verify Consistency**: Ensure all instances have correct styling, behavior, and props

**Search Patterns to Check:**

For `SecureDeleteButton`:
```bash
# Search for old delete patterns
grep -r "window.confirm.*delete" src/
grep -r "onClick.*delete" src/ --exclude-dir=UIComponents.jsx
grep -r "button.*delete.*hold" src/
```

For `UniversalDatePicker`:
```bash
# Search for old date picker patterns
grep -r '<input type="date"' src/
grep -r '<DatePicker' src/ --exclude-dir=UIComponents.jsx
grep -r 'react-datepicker' src/
```

For Archive/Delete Button Separation:
```bash
# Search for combined archive/delete buttons
grep -r "ArchiveButton" src/
grep -r "archive.*delete" src/
grep -r "bg-orange.*delete" src/
```

**Example Scenario:**

**Task**: Standardize the Archive button to be orange and separate from Delete button

**Step 1 - Search for Old Patterns**:
```javascript
// Agent runs:
grep_search({
  SearchPath: "g:/Maintenanceapptesting_before_UI_overhaul/src",
  Query: "ArchiveButton",
  IsRegex: false,
  MatchPerLine: true
});

// Results:
// - AssetModals.jsx:156 (old combined button)
// - ReportModal.jsx:89 (old archive implementation)
// - SiteModals.jsx:234 (inline archive button)
```

**Step 2 - Document Findings**:
```
Found 3 non-standard archive button implementations:
1. AssetModals.jsx - Combined archive/delete button
2. ReportModal.jsx - Old ArchiveButton component
3. SiteModals.jsx - Inline archive button with wrong color
```

**Step 3 - Replace All Instances**:
```javascript
// Update AssetModals.jsx
<Button
  onClick={handleArchive}
  className="flex-1 justify-center bg-orange-600 hover:bg-orange-500"
>
  📦 Archive
</Button>

// Update ReportModal.jsx
<Button
  onClick={handleArchive}
  className="flex-1 justify-center bg-orange-600 hover:bg-orange-500"
>
  📦 Archive
</Button>

// Update SiteModals.jsx
<Button
  onClick={handleArchive}
  className="flex-1 justify-center bg-orange-600 hover:bg-orange-500"
>
  📦 Archive
</Button>
```

**Step 4 - Verify Consistency**:
- ✅ All archive buttons are orange (`bg-orange-600`)
- ✅ All archive buttons use 📦 icon
- ✅ All archive buttons are separate from delete buttons
- ✅ All archive buttons have confirmation dialogs

**Rationale:**
- Prevents inconsistent UI/UX across features
- Ensures all users see the same interaction patterns
- Reduces maintenance burden (one component to update)
- Catches forgotten legacy implementations
- Enforces design system compliance

**Files to Check:**
When standardizing a component, always search in:
- `src/components/*.jsx` - All component files
- `src/components/modals/*.jsx` - Modal components
- `src/pages/*.jsx` - Page components (if applicable)
- `src/features/**/*.jsx` - Feature-specific components
- Any file that might contain UI elements

**Exclusions:**
- `node_modules/` - Third-party code
- `dist/` or `build/` - Build artifacts
- Test files (unless testing the component itself)
- Documentation files

**Success Criteria:**
The standardization is only complete when:
1. ✅ Repository search returns NO non-standard implementations
2. ✅ All instances use the universal component
3. ✅ All instances have consistent styling and behavior
4. ✅ Documentation is updated (if applicable)

**When this was learned:** 2025-12-03 - Established standardization audit protocol to prevent inconsistent component usage.

---

## Protocol 3: Retrospective and Self-Correction

### Rule: Perform Root Cause Analysis and Update Standards for Regressions

**Directive:**
For any task that required fixing a regression (a bug caused by a previous agent change) or a recurrent bug (like the exit warning, duplicate imports, missing props), the agent MUST perform a brief root cause analysis and, if applicable, append a new constraint to this coding standards file.

**Scope:**
This protocol applies to:
- **Regressions**: Bugs introduced by previous agent changes
- **Recurrent Bugs**: Same type of bug appearing multiple times (e.g., missing imports, missing props, state synchronization issues)
- **Pattern Failures**: Bugs caused by not following existing standards
- **Standardization Failures**: Inconsistent implementations across features

**Required Workflow:**

**Step 1: Identify Regression or Recurrence**
- Determine if the bug is a regression (worked before, broken now)
- Determine if it's a recurrent pattern (happened before in different files)
- Check if it violates existing coding standards

**Step 2: Perform Root Cause Analysis**
Ask the following questions:
1. **What caused this bug?**
   - Missing import/export?
   - State synchronization issue?
   - Incomplete standardization?
   - Missing test coverage?

2. **Why wasn't it caught earlier?**
   - No test coverage?
   - No standardization audit?
   - No validation step?

3. **Has this happened before?**
   - Same bug in different files?
   - Same pattern of failure?
   - Same missing step in workflow?

4. **What standard or protocol was violated?**
   - Existing protocol not followed?
   - No protocol exists for this case?
   - Protocol exists but unclear?

**Step 3: Determine if New Constraint is Needed**
If the root cause is:
- ✅ **Failure of standardization** → Add standardization constraint
- ✅ **Synchronization issue** → Add synchronization constraint
- ✅ **Insufficient testing** → Add testing requirement
- ✅ **Missing validation** → Add validation step
- ✅ **Recurrent pattern** → Add pattern-specific constraint
- ❌ **One-time mistake** → No new constraint needed (just fix it)

**Step 4: Append New Constraint (if needed)**
- Add a new, specific constraint to this file
- Use clear, actionable language
- Include example of what to avoid and what to do instead
- Reference the bug that prompted the constraint

**Step 5: Update Documentation**
- Document the fix in walkthrough.md (APPEND, don't overwrite)
- Include root cause analysis
- Reference the new constraint (if added)

---

### Cumulative Documentation Requirement

**File Mode Directive (CRITICAL):**

For any files documenting changes (`walkthrough.md`, `changelog.md`, `task.md`, or similar feature logs), the agent MUST:

1. ✅ **APPEND** new content to the end of the existing file
2. ✅ **PRESERVE** all existing content
3. ✅ **MAINTAIN** cumulative history
4. ❌ **NEVER** overwrite or truncate these documentation files
5. ❌ **NEVER** use `Overwrite: true` for documentation files

**Correct Pattern:**
```javascript
// ✅ GOOD: Append to existing walkthrough
write_to_file({
  TargetFile: "walkthrough.md",
  Overwrite: false, // NEVER overwrite documentation
  CodeContent: `
---

## [Date] - [Task Name]

[New content here...]
`
});
```

**Incorrect Pattern:**
```javascript
// ❌ BAD: Overwrites entire walkthrough history
write_to_file({
  TargetFile: "walkthrough.md",
  Overwrite: true, // WRONG! Loses all history
  CodeContent: `[Only new content]`
});
```

**Exception:**
The ONLY time to overwrite is when creating the file for the first time, or when explicitly updating artifact metadata files like `implementation_plan.md` that are meant to be replaced.

---

### Example Scenarios

#### Scenario 1: Missing Import Regression

**Bug**: `UniversalDatePicker is not defined` in SiteIssueTracker.jsx

**Root Cause Analysis**:
1. What caused it? Missing import statement
2. Why wasn't it caught? No import validation, no test coverage
3. Has this happened before? Yes - same issue in SiteModals.jsx, AssetModals.jsx
4. What standard was violated? None - no standard exists for import validation

**Action**: Add new constraint
```markdown
### Rule: Validate All Component Imports

**Directive:**
When adding a component to a file, the agent MUST verify that all used components are imported at the top of the file.

**Pattern to Avoid:**
```javascript
// ❌ BAD: Using component without import
export const MyComponent = () => {
  return <UniversalDatePicker />; // Not imported!
};
```

**Correct Pattern:**
```javascript
// ✅ GOOD: Import before use
import { UniversalDatePicker } from './UIComponents';

export const MyComponent = () => {
  return <UniversalDatePicker />;
};
```

**When this was learned:** 2025-12-03 - Fixed recurrent missing import bugs in SiteIssueTracker, SiteModals, and AssetModals.
```

#### Scenario 2: State Synchronization Regression

**Bug**: Exit warning appears even after saving (isDirty not cleared)

**Root Cause Analysis**:
1. What caused it? `clearDirty()` not called after save
2. Why wasn't it caught? No test for save → clearDirty flow
3. Has this happened before? Yes - Issue #4 (persistent window exit bug)
4. What standard was violated? Electron/Context State Synchronization (now exists)

**Action**: Standard already exists, no new constraint needed. But document in walkthrough:
```markdown
---

## 2025-12-03 - Fixed Exit Warning Regression

**Bug**: Exit warning appeared after saving
**Root Cause**: `clearDirty()` not called in save handler
**Fix**: Added `clearDirty()` call after `localStorage.setItem()`
**Standard Violated**: Electron/Context State Synchronization
**Prevention**: Follow existing protocol - always call `clearDirty()` after persist
```

#### Scenario 3: Incomplete Standardization

**Bug**: Archive buttons have different colors across modals

**Root Cause Analysis**:
1. What caused it? Archive button standardized in AssetModals but not in other modals
2. Why wasn't it caught? No standardization audit performed
3. Has this happened before? Yes - similar issue with delete buttons
4. What standard was violated? Protocol 2: Standardization Audit (now exists)

**Action**: Standard exists, follow Protocol 2. Document in walkthrough:
```markdown
---

## 2025-12-03 - Completed Archive Button Standardization

**Bug**: Archive buttons inconsistent across modals
**Root Cause**: Standardization audit not performed after initial fix
**Fix**: Searched all modals, updated to orange buttons with confirmation
**Standard Violated**: Protocol 2: Standardization Audit
**Prevention**: Always run repository-wide search when standardizing components
**Files Updated**: AssetModals.jsx, SiteModals.jsx, ReportModal.jsx
```

---

### Documentation File Types

**MUST Append (Never Overwrite)**:
- `walkthrough.md` - Cumulative history of all changes
- `changelog.md` - Version history
- `task.md` - Task progress tracking
- `feature_log.md` - Feature development history
- Any file documenting historical changes

**MAY Overwrite (Single-Purpose)**:
- `implementation_plan.md` - Current plan (replaced per task)
- `README.md` - Current project documentation
- Configuration files (when updating settings)

---

### Rationale

**Why Root Cause Analysis?**
- Prevents same bug from recurring
- Identifies systemic issues
- Improves agent learning
- Creates better standards over time

**Why Cumulative Documentation?**
- Preserves complete project history
- Shows evolution of decisions
- Helps debug future issues
- Provides learning resource for new developers

**Why Append, Not Overwrite?**
- Losing history loses context
- Can't trace when bugs were introduced
- Can't see what was tried before
- Harder to identify patterns

---

### Success Criteria

**Regression Fix is Complete When:**
1. ✅ Bug is fixed
2. ✅ Root cause is identified
3. ✅ New constraint added (if applicable)
4. ✅ Walkthrough updated (APPENDED, not overwritten)
5. ✅ Related files checked for same issue
6. ✅ Test added (if Protocol 1 applies)

**Documentation is Complete When:**
1. ✅ All changes are documented
2. ✅ History is preserved (appended)
3. ✅ Root cause is explained
4. ✅ Prevention strategy is noted
5. ✅ Related standards are referenced

**When this was learned:** 2025-12-03 - Established self-correction protocol to prevent recurrent bugs and preserve project history.

## Future Rules

Additional coding standards will be appended here as new patterns are discovered through build errors and lint warnings.
