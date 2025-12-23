---
stepsCompleted: [1, 2, 3, 4, 7, 8, 9, 10, 11]
inputDocuments:
  - "c:/Users/Brad/Documents/~AppProjects/Ai-MaintenanceApp/_bmad-output/index.md"
  - "c:/Users/Brad/Documents/~AppProjects/Ai-MaintenanceApp/_bmad-output/project-overview.md"
  - "c:/Users/Brad/Documents/~AppProjects/Ai-MaintenanceApp/_bmad-output/architecture.md"
  - "c:/Users/Brad/Documents/~AppProjects/Ai-MaintenanceApp/_bmad-output/data-models.md"
  - "c:/Users/Brad/Documents/~AppProjects/Ai-MaintenanceApp/_bmad-output/api-contracts.md"
  - "c:/Users/Brad/Documents/~AppProjects/Ai-MaintenanceApp/_bmad-output/source-tree-analysis.md"
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 6
workflowType: 'prd'
lastStep: 0
project_name: 'Ai-MaintenanceApp'
user_name: 'Brad'
date: '2025-12-20'
---

# Product Requirements Document - Ai-MaintenanceApp

**Author:** Brad
**Date:** 2025-12-20

## Executive Summary

The **Ai-MaintenanceApp** is evolving from a simple site overview tool into a comprehensive **Business Operation System (BOS)**. The primary goal is to stabilize the expanding codebase, consolidate fragmented reporting features into a unified **Asset Reporting Module**, and enforce a **Stability-First Deployment** pipeline.

The system serves as the central nervous system for the business, managing CRM, Assets, Operations, and Finance. A critical objective is resolving technical debt in **Asset Reporting**, replacing 5 fragmented legacy implementations with a single, validated Source of Truth.

### What Makes This Special

*   **Unified Dashboard Experience**: Seamlessly combining Site Overview and Customer Assets to reduce navigation friction.
*   **Safe Theming Engine**: A robust styling architecture that allows user customization (Dark/Light modes) *without* breaking critical functional outputs like PDF generation.
*   **Operational Fluidity**: Moving from a "precarious" state to a stable, web-ready platform where updates can be deployed with confidence.

## Project Classification

**Technical Type:** SaaS / B2B Platform
**Domain:** Business Operations
**Complexity:** High (Monolith Stabilization, 5x Refactoring, Hybrid Deployment)
**Project Context:** Brownfield - Extending & Stabilizing

## Success Criteria

### User Success
*   **Confidence**: Admin can deploy new features/fixes without breaking existing workflows (Zero Regression).
*   **Proactivity**: Managers are notified *before* staff inductions/qualifications expire.
*   **Contextual Theming**: Dark Mode applies *only* where it makes sense (UI). Output-focused elements like **PDFs remain print-friendly** (light/white background). System should flag if dark mode is being applied to non-sensical elements (e.g., printable documents, exports).

### Business Success
*   **Compliance**: Reduction in overdue staff inductions/qualifications.
*   **Efficiency**: Asset Reports generated from a single, reliable source of truth.

### Technical Success
*   **Debt Reduction**: 5 reporting implementations → 1 unified module.
*   **Quality Assurance**: Automated regression tests for critical flows.

### Measurable Outcomes
*   **Web Deployment**: 0 critical bugs in first week post-deployment.
*   **Reporting**: 100% of asset reports via new unified module.

## Product Scope

### MVP - Minimum Viable Product (The "Stabilization" Release)
1.  Unified Asset Reporting Module.
2.  Proactive Staff Management (alerts for qualifications/inductions).
3.  Stable, Contextual Dark Mode (UI only, print stays light).
4.  Regression Safety Net (automated tests).
5.  **Job Sheet Color Accessibility**: Fix dark status row colors for better readability.
6.  **CSV Data Persistence Fix**: Ensure imported CSV data is properly saved to Firestore.

### Growth Features (Post-MVP)
*   **Master Overview Dashboard**: "What needs attention" hub showing all items due soon or overdue across all sites (inductions, calibrations, jobs). First stop for daily operational review.
*   **Offline Mode with Auto-Sync**: Work without network connectivity and auto-sync changes when back online.
*   **Advanced Theme Engine**: User-customizable themes.
*   **AI Maintenance Suggestions**: Predictive maintenance alerts.
*   **Xero Integration**: CSV import/export compatibility for accounting data.

### Vision (Future)
*   Fully Autonomous Operations: System predicts needs before humans notice.

## User Journeys

### Journey 1: Lisa the Operations Manager - "Catching Overdue Items Before They Become Problems"
Lisa arrives Monday morning and opens the app. Instead of digging through spreadsheets, she sees a clear "Attention Required" section. Four staff inductions are expiring this week. She assigns renewal tasks to HR with one click. Later, she checks the Asset Overview and notices a calibration due in 5 days at Site C. She flags it for the technician's next visit. By 9 AM, she's caught two potential compliance issues that would have slipped through the cracks.

**Requirements Revealed:** Proactive Alerts, Quick Action Assignments, Cross-Module Visibility.

---

### Journey 2: Brad the Admin - "Deploying Updates Without Fear"
Brad has fixed a bug in the Job Sheet module. Before, deploying meant praying nothing else broke. Now, he runs the automated regression tests. Green across the board. He pushes the update to production. The next morning, no frantic calls—the system runs smoothly. He opens the dashboard and sees the new feature is being used correctly. No side effects.

**Requirements Revealed:** Automated Regression Tests, Stable Deployment Pipeline, Confidence Metrics.

---

### Journey 3: Mike the Technician - "Getting His Job Done On-Site"
Mike is at a customer site using the desktop Electron app on his laptop. He pulls up his assigned Job Sheet. All the PO details, asset info, and previous notes are there. He completes the maintenance, adds his notes, and marks the job "Complete." The office immediately sees the update. When he moves to the next site, he's already prepared instead of calling the office for details.

**Requirements Revealed:** Read-Only Technician View, Job Sheet Integration, Status Updates, Desktop App Focus.

---

### Journey Requirements Summary

| Capability | Source Journey | Priority |
|------------|----------------|----------|
| Proactive Alert System | Lisa (Manager) | MVP |
| Quick Action Assignment | Lisa (Manager) | MVP |
| Automated Regression Tests | Brad (Admin) | MVP |
| Stable Deployment Pipeline | Brad (Admin) | MVP |
| Read-Only Role View | Mike (Technician) | MVP |
| Job Sheet Integration | Mike (Technician) | MVP |
| Offline Mode with Auto-Sync | Mike (Technician) | Growth |

## SaaS/B2B Specific Requirements

### Project-Type Overview
Single-tenant internal business operations platform. Not a multi-tenant SaaS product for external sale. Focus is on Role-Based Access Control (RBAC) and robust data export.

### Permission Model (RBAC)
| Role | Access Level | Key Capabilities |
|------|--------------|------------------|
| **Admin** | Full | System config, deployments, all data |
| **Management** | Read/Write | Workflows, staff, reporting, assets |
| **Technician** | Read-Only | View assigned Job Sheets, mark complete |

### Integration Considerations
| System | Priority | Notes |
|--------|----------|-------|
| **Xero (Accounting)** | Growth | CSV import/export compatibility for invoicing data |
| **PDF Export** | MVP | Primary output. Must remain print-friendly (light mode). |
| **Excel Export** | MVP | Secondary export format for reports/data. |

### Technical Architecture Considerations
*   **Desktop-First**: Electron wrapper for Windows. Web-accessible via Firebase Hosting.
*   **Real-Time Data**: Firestore subscriptions for live updates.
*   **Existing Pattern**: Service-Repository architecture must be respected.

### Implementation Considerations
*   **Export Engine Safety**: PDF/Excel generation should be isolated from theming logic to prevent dark mode leakage.
*   **Role Enforcement**: Server-side (Firestore Rules) and client-side checks.

## Functional Requirements

### Asset Reporting
- FR1: User can generate asset reports from a unified module.
- FR2: User can view asset reports linked to Site Overview and Customer Assets.
- FR3: User can export asset reports as PDF (print-friendly, light mode).
- FR4: User can export asset reports as Excel.

### Staff Management
- FR5: Manager can view staff qualifications and inductions with expiry dates.
- FR6: Manager can receive proactive alerts before qualifications/inductions expire.
- FR7: Manager can assign renewal tasks to HR.

### Job Sheets
- FR8: Office staff can create and edit job sheets with PO, quote, and invoice data.
- FR9: Technician can view assigned job sheets (read-only).
- FR10: Technician can mark job sheets as complete.
- FR11: System displays job sheet row colors with accessible status indicators.

### Data Import/Export
- FR12: User can import data from CSV files.
- FR13: System persists imported CSV data to Firestore correctly.
- FR14: User can export data to CSV for Xero compatibility (Growth).

### Theming & UI
- FR15: User can toggle Dark Mode for UI elements.
- FR16: System ensures PDF/Excel exports remain print-friendly (light mode).
- FR17: System flags if dark mode is applied to non-sensical elements.

### Regression & Testing
- FR18: Admin can run automated regression tests before deployment.
- FR19: System provides confidence metrics on test results.

### Role-Based Access
- FR20: Admin can access all system areas and deployment functions.
- FR21: Manager can access workflows, staff, reporting, and assets.
- FR22: Technician can only view assigned job sheets and mark complete.

## Non-Functional Requirements

### Performance
- NFR1: User actions (navigation, form submission) complete within 2 seconds.
- NFR2: Report generation (PDF/Excel) completes within 5 seconds for typical datasets.

### Security
- NFR3: All data is protected via Firebase Authentication.
- NFR4: Role-based access enforced server-side (Firestore Security Rules).
- NFR5: No sensitive data exposed in client-side code.

### Accessibility
- NFR6: Status indicators use color *and* text/icons (not color alone).
- NFR7: UI elements meet WCAG AA contrast ratios.

### Reliability
- NFR8: Core flows (Job Sheets, Invoices) covered by automated regression tests.
- NFR9: Deployment pipeline fails on test failure (zero-regression enforcement).

### Usability
- NFR10: Navigation pattern is consistent throughout the entire application (unified sidebar/menu structure).
