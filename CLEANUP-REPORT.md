# Unused Code Detection Report
**Generated**: December 12, 2025  
**Tool**: Knip v5.73.3  
**Status**: ✅ Analysis Complete

---

## Summary

| Category | Count | Action Required |
|----------|-------|-----------------|
| Unused Files | 9 | Review & Delete |
| Unused Dependencies | 5 | Uninstall |
| Unused Dev Dependencies | 2 | Uninstall |
| Unused Exports | 47 | Review & Remove |
| Unused Exported Types | 4 | Remove |
| Duplicate Exports | 9 | Fix |
| Unlisted Dependencies | 1 | Add to package.json |
| Unlisted Binaries | 1 | Add to package.json |

**Total Issues**: 78

---

## 🗑️ Unused Files (9)

### High Priority - Safe to Delete

1. **`src/App.css`**
   - Empty or unused stylesheet
   - **Action**: Delete

2. **`src/components/AppHistoryModal.jsx`**
   - Likely replaced by `AppHistorySidePanel`
   - **Action**: Verify then delete

3. **`src/components/DatabaseSettingsModal.jsx`**
   - Database settings functionality may have moved
   - **Action**: Verify then delete

4. **`src/components/ErrorBoundary.jsx`**
   - Error boundary component not being used
   - **Action**: Either use it or delete it

5. **`src/components/PDFImportComponent.jsx`**
   - PDF import functionality
   - **Action**: Verify not needed, then delete

6. **`src/components/PDFImportModal.jsx`**
   - PDF import modal
   - **Action**: Verify not needed, then delete

### Medium Priority - Review First

7. **`public/pdf.worker.min.js`**
   - PDF.js worker file
   - **Action**: Check if PDF functionality still works without it

8. **`src/types/index.ts`**
   - TypeScript type definitions
   - **Action**: Check if types are used elsewhere

9. **`src/types/inventory.ts`**
   - Inventory type definitions
   - **Action**: Check if inventory module uses these

---

## 📦 Unused Dependencies (5)

Remove these from `package.json`:

```bash
npm uninstall framer-motion html2canvas jimp jspdf tailwind-merge
```

### Details:

1. **`framer-motion`** (line 28)
   - Animation library
   - **Savings**: ~600KB

2. **`html2canvas`** (line 29)
   - Screenshot library
   - **Savings**: ~200KB

3. **`jimp`** (line 30)
   - Image processing
   - **Savings**: ~1.5MB

4. **`jspdf`** (line 31)
   - PDF generation
   - **Savings**: ~200KB

5. **`tailwind-merge`** (line 38)
   - Tailwind utility merger
   - **Savings**: ~20KB

**Total Potential Savings**: ~2.5MB

---

## 🛠️ Unused Dev Dependencies (2)

Remove these from `package.json`:

```bash
npm uninstall --save-dev @testing-library/user-event vite-plugin-react-inspector
```

### Details:

1. **`@testing-library/user-event`** (line 67)
   - User event testing utilities
   - Not being used in tests

2. **`vite-plugin-react-inspector`** (line 82)
   - React component inspector
   - Not configured in Vite

---

## ⚠️ Unlisted Dependencies (2)

Add these to `package.json`:

```bash
npm install --save-dev @vitest/coverage-v8
npm install firebase-tools
```

### Details:

1. **`@vitest/coverage-v8`**
   - Used in: `vitest.config.js`
   - **Action**: Add to devDependencies

2. **`firebase`** (binary)
   - Firebase CLI
   - **Action**: Add to devDependencies or install globally

---

## 🔧 Unused Exports (47)

### Critical - Likely Dead Code

#### PDF Parser (`src/utils/pdfParser.js`)
- `parseServiceReport` (line 216)
  - **Action**: Delete if PDF import is removed

#### Site Health (`src/utils/siteHealth.js`)
- `getSiteHealthStyling` (line 58)
  - **Action**: Review usage, likely can be removed

#### Mock Data (`src/data/mockData.js`)
- `initialSites` (line 401)
  - **Action**: Delete if no longer using mock data

#### Firebase (`src/firebase.js`)
- `auth` (line 41)
- `default` export (line 42)
  - **Action**: Review if auth is needed

### Employee Utils (`src/utils/employeeUtils.js`)

Multiple unused helper functions:
- `getDaysUntilExpiry` (line 23)
- `getEmployeeComplianceStatus` (line 33)
- `filterEmployeesByStatus` (line 51)
- `sortEmployeesByExpiry` (line 60)
- `getComplianceSummary` (line 84)

**Action**: These might be useful for future features. Consider keeping or moving to a "future" folder.

### PDF Components

All PDF preview/export components have duplicate exports:
- `FullDashboardPDFPreview.jsx`
- `ScheduleChartPDFPreview.jsx`
- `AssetSpecsPDFPreview.jsx`
- `MasterListPDFPreview.jsx`
- `FullDashboardPDF.tsx`
- `ScheduleChartPDF.tsx`
- `AssetSpecsPDF.tsx`
- `MaintenanceReportPDF.tsx`

**Action**: Fix duplicate exports (named + default)

### Validation Utils (`src/utils/validation.ts`)

Many validation functions unused:
- `validateEmail`
- `validatePhone`
- `validateDate`
- `validateRequired`
- `validateNumber`
- `validateAssetCode`
- `validateAssetForm`
- `validateReportForm`
- `sanitizeAssetName`
- `sanitizeNotes`

**Action**: Keep these - they're utility functions that may be needed

### Repository Exports (`src/repositories/index.js`)

Unused repository exports:
- `QuoteRepository`
- `CustomerRepository`
- `SiteRepository`
- `EmployeeRepository`
- `BaseRepository`

**Action**: These are exported from index but imported directly. Fix the imports to use the index file.

### Data Utils (`src/utils/dataUtils.js`)
- `loadSitesFromStorage` (line 27)
- `loadSelectedSiteIdFromStorage` (line 41)

**Action**: Delete if localStorage sync is no longer used

### Inventory Service (`src/services/inventoryService.js`)
- `deletePart` (line 57)
- `getStockByLocation` (line 408)
- `getSerializedAssetsByPart` (line 419)
- `bulkImportParts` (line 434)

**Action**: Review inventory module usage

### Quoting App (`src/apps/quoting/`)
- `getDuration` (logic.ts, line 3)
- `DEFAULT_RATES` (hooks/useQuote.ts, line 10)
- `getTaxYearForDate` (utils/taxYearUtils.ts, line 17)
- `createTaxYear` (utils/taxYearUtils.ts, line 73)
- `getMonthsInTaxYear` (utils/taxYearUtils.ts, line 87)

**Action**: Review quoting module - these may be future features

---

## 📝 Unused Exported Types (4)

TypeScript interfaces not being used:

```typescript
// src/utils/validation.ts
interface ValidationResult  // line 2
interface SiteFormData      // line 7
interface AssetFormData     // line 20
interface ReportFormData    // line 28
```

**Action**: Either use these types or remove them

---

## ⚠️ Duplicate Exports (9)

Fix these files to have either named OR default export, not both:

```javascript
// Bad:
export const MyComponent = () => { ... }
export default MyComponent;

// Good (choose one):
export default function MyComponent() { ... }
// OR
export const MyComponent = () => { ... }
```

**Files to fix**:
1. `src/components/FullDashboardPDFPreview.jsx`
2. `src/components/ScheduleChartPDFPreview.jsx`
3. `src/components/AssetSpecsPDFPreview.jsx`
4. `src/components/MasterListPDFPreview.jsx`
5. `src/components/FullDashboardPDF.tsx`
6. `src/components/ScheduleChartPDF.tsx`
7. `src/components/AssetSpecsPDF.tsx`
8. `src/App.jsx`
9. `src/components/MaintenanceReportPDF.tsx`

---

## 🎯 Recommended Action Plan

### Phase 1: Quick Wins (30 minutes)

1. **Remove unused dependencies**:
   ```bash
   npm uninstall framer-motion html2canvas jimp jspdf tailwind-merge
   npm uninstall --save-dev @testing-library/user-event vite-plugin-react-inspector
   ```

2. **Add unlisted dependencies**:
   ```bash
   npm install --save-dev @vitest/coverage-v8
   ```

3. **Delete obviously unused files**:
   ```bash
   git rm src/App.css
   git rm src/components/PDFImportComponent.jsx
   git rm src/components/PDFImportModal.jsx
   ```

### Phase 2: Careful Review (1 hour)

4. **Review and delete modal files**:
   - Check if `AppHistoryModal` is truly replaced
   - Check if `DatabaseSettingsModal` is needed
   - Delete if confirmed unused

5. **Fix duplicate exports**:
   - Update all PDF component files
   - Update `App.jsx`

6. **Review employee utils**:
   - Decide if keeping for future use
   - Move to `/future` folder or delete

### Phase 3: Deep Clean (2 hours)

7. **Clean up validation utils**:
   - Either use them or remove them
   - Update TypeScript types

8. **Review repository exports**:
   - Fix import paths to use index
   - Or remove unused exports

9. **Audit inventory and quoting modules**:
   - Confirm which features are active
   - Remove dead code

### Phase 4: Testing (30 minutes)

10. **Test the application**:
    ```bash
    npm run dev
    npm run build
    npm run test
    ```

11. **Verify all features work**:
    - Customer Portal
    - AIMM Dashboard
    - Service Quoter
    - Team Management

---

## 💾 Before You Start

```bash
# Create backup
git checkout -b backup-before-cleanup-2025-12-12
git add .
git commit -m "Backup before cleanup"
git push origin backup-before-cleanup-2025-12-12

# Create cleanup branch
git checkout -b cleanup-unused-code-2025-12-12
```

---

## ✅ Success Criteria

- [ ] All unused dependencies removed
- [ ] All unused files deleted
- [ ] All duplicate exports fixed
- [ ] App builds without errors
- [ ] All features tested and working
- [ ] Bundle size reduced by ~2.5MB
- [ ] No console errors

---

## 📊 Expected Impact

**Before Cleanup**:
- Dependencies: 40+
- Unused files: 9
- Unused exports: 47
- Bundle size: ~5MB (estimated)

**After Cleanup**:
- Dependencies: 33
- Unused files: 0
- Unused exports: <10
- Bundle size: ~2.5MB (estimated)

**Improvement**: ~50% reduction in unused code

---

**Next Steps**: Review this report and start with Phase 1 (Quick Wins)
