# Sorting Options Guide

## Current Sorting Capabilities

### Main Dashboard Table (Service Schedule / Roller Replacement)

The main asset table now supports sorting by clicking on column headers:

#### Available Sort Columns:
1. **Name** - Alphabetical sort by asset name
2. **Code** - Alphabetical sort by asset code (e.g., CV-101, CV-102)
3. **Last Cal** - Sort by last calibration date
4. **Freq** - Sort by calibration frequency (days)
5. **Cal Due** - Sort by next calibration due date
6. **Days** - Sort by days remaining until calibration
7. **Op Status** ⭐ **NEW** - Sort by operational status with priority:
   - **Down** (Critical - appears first)
   - **Warning** (Moderate)
   - **Operational** (Healthy - appears last)

### Site Selection View

Sort customer sites by:
1. **Risk Level** (Default) - Sites with most critical assets first
2. **Site Name** - Alphabetical by site name
3. **Customer** - Alphabetical by customer name

## How to Use

### Sorting in Tables
- **Click any column header** to sort by that column
- **Click again** to reverse the sort direction (ascending ↔ descending)
- Sort indicators (↑↓) show current sort column and direction

### Op Status Sorting (NEW)
The Op Status column is now clickable and sorts assets by severity:
- **Descending** (default): Down → Warning → Operational
- **Ascending**: Operational → Warning → Down

This is particularly useful for:
- **Troubleshooting**: Quickly identify all broken equipment
- **Prioritization**: Focus on critical assets first
- **Workflow**: Group similar status assets together

## Recommended Future Enhancements

### 1. Sort by Location/Area (Walk Order)
**Status**: Not yet implemented
**Use Case**: Group assets by physical location for efficient site walks
**Implementation**: Would require adding an "Area" or "Location" field to assets

### 2. Report History Sorting
**Status**: Not yet implemented  
**Location**: Asset Analytics → Report History
**Use Case**: Find reports with highest calibration errors
**Proposed Options**:
- Date (Newest) - Current default
- Error % (Highest) - Show worst calibration results first
- Zero Error (Highest)
- Span Error (Highest)

### 3. Master List Enhancements
The Master List modal already supports sorting by:
- Asset Name
- Code
- Last Cal
- Cal Due

Consider adding Op Status sorting here as well for consistency.

## Technical Notes

### Sort Implementation
- Sorting logic is centralized in `src/utils/filterUtils.js`
- Op Status uses weighted values: Down=3, Warning=2, Operational=1
- Date fields are converted to timestamps for accurate chronological sorting
- All sorts maintain stability (equal values keep original order)

### Performance
- Sorting is client-side and instant for typical dataset sizes
- Filtered data is sorted after filtering for efficiency
- Sort state is maintained in FilterContext for consistency across views
