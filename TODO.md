# Project To-Do List

## ✅ Completed
- [x] **Linting & Code Quality**
    - Resolved `no-unused-vars` and `useEffect` dependency issues in `App.jsx`, `UIComponents.jsx`, `AssetAnalytics.jsx`.
    - Fixed `react-hooks/refs` violation in `AppHistoryModal.jsx`.
    - Removed unused code and imports.
- [x] **PDF Extraction**
    - Improved `pdfParser.js` to insert newlines before numbered items in comments.
    - Refined footer detection for cleaner extraction.
- [x] **UI Adjustments**
    - Removed "Throughput" from Report Details.
    - Moved "Belt Speed" to Calibration Metrics.
- [x] **Features**
    - Implemented Calendar-Asset linking (clicking a due item highlights the asset).
    - Added automatic weather lookup using Open-Meteo API.

## 📝 Pending / Next Steps
- [ ] **Testing**
    - Verify PDF upload with various report formats.
    - Test Calendar interaction on different screen sizes.
    - Check "Help" modal functionality.
- [x] **Refactoring**
    - Split `App.jsx` into `SiteContext`, `FilterContext`, and `UIContext`.
    - Standardized error handling across all modals using `ErrorBoundary`.
- [ ] **Features**
    - Add user authentication (if needed).
    - Implement data export/backup improvements.
- [ ] **Documentation**
    - Update `README.md` with new feature instructions.


Notes by BRAD

History doesn't work for the assets
still no line/paragraph after the comments
I want the app to collect a list of technician names as it reads them when uploading reports. Eventually I want to use this as a drop down for entries in fields. it should find any fields that ask for initials or name and change it to that drop down with the names collected. it should also allow for the user to add names to the list.


remove the light mode from the front page, its not needed.

create a simple how to guide for the app. Maybe when hitting help it opens a modal with the guide or a pdf.
