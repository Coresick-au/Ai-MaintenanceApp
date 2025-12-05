# [PROJECT_NAME] Constitution
<!-- Example: Spec Constitution, TaskFlow Constitution, etc. -->

## Tech Stack Principles (MANDATORY)

### I. Core Framework
- MUST use **React** version 19.2.0
- MUST use **React DOM** version 19.2.0
- MUST use React 19 patterns (no deprecated APIs like `ReactDOM.render`)

### II. Desktop Application
- MUST use **Electron** version 39.2.4
- MUST use **electron-builder** version 26.0.12 for packaging
- MUST use `.cjs` extension for Electron main process and preload scripts
- Build target is Windows (NSIS installer)

### III. Build System
- MUST use **Vite** version 7.2.4 as build system
- MUST use **@vitejs/plugin-react** version 5.1.1
- Project uses ES Modules (`"type": "module"`)

### IV. Testing Framework
- MUST use **Vitest** version 4.0.15 for testing (NOT Jest)
- MUST use **@testing-library/react** version 16.3.0
- MUST use **jsdom** version 27.2.0 for DOM simulation

### V. Styling
- MUST use **TailwindCSS** version 3.4.17 for styling
- SHOULD NOT use inline styles
- MUST use **PostCSS** version 8.5.6

### VI. Linting
- MUST use **ESLint** version 9.39.1
- MUST use **eslint-plugin-react-hooks** version 7.0.1

### VII. UI Libraries
- MUST import icons from `lucide-react` via centralized `Icons` object in `src/constants/icons.jsx`
- MUST use **Recharts** version 3.5.1 for charts
- MUST use **react-datepicker** version 8.10.0 for date inputs

### VIII. Document Generation
- MUST use **jsPDF** version 3.0.4 for PDF generation
- MUST use **docx** version 9.5.1 for Word documents
- MUST use **xlsx** version 0.18.5 for Excel files
- MUST use **pdfjs-dist** version 5.4.394 for PDF parsing

### IX. Utilities
- MUST use **date-fns** version 4.1.0 for date manipulation
- SHOULD NOT introduce new dependencies without justification

## Core Principles

### [PRINCIPLE_1_NAME]
<!-- Example: I. Library-First -->
[PRINCIPLE_1_DESCRIPTION]
<!-- Example: Every feature starts as a standalone library; Libraries must be self-contained, independently testable, documented; Clear purpose required - no organizational-only libraries -->

### [PRINCIPLE_2_NAME]
<!-- Example: II. CLI Interface -->
[PRINCIPLE_2_DESCRIPTION]
<!-- Example: Every library exposes functionality via CLI; Text in/out protocol: stdin/args → stdout, errors → stderr; Support JSON + human-readable formats -->

### [PRINCIPLE_3_NAME]
<!-- Example: III. Test-First (NON-NEGOTIABLE) -->
[PRINCIPLE_3_DESCRIPTION]
<!-- Example: TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced -->

### [PRINCIPLE_4_NAME]
<!-- Example: IV. Integration Testing -->
[PRINCIPLE_4_DESCRIPTION]
<!-- Example: Focus areas requiring integration tests: New library contract tests, Contract changes, Inter-service communication, Shared schemas -->

### IV. The Expert Advisor Protocol (Proactive Suggestions)

**Rule**: You are an Expert Senior Engineer, not just a code generator.

**Trigger**: If the user's request is technically valid but effectively outdated, risky, or misses a modern industry standard (e.g., using `npm run dev` instead of HMR, or manual testing instead of Playwright), you MUST:

1. **Pause**: Do not implement the suboptimal solution immediately.
2. **Suggest**: Briefly propose the "Modern/Best Practice" alternative (e.g., "I recommend using Vitest over Jest for this Vite app because...").
3. **Ask**: "Would you like to proceed with your original request, or switch to this better approach?"

### V. UI Compliance Directive

**Rule**: New UI elements, modals, and components must automatically inherit or be manually configured to comply with the existing dark/light mode aesthetic of the application.

**Rationale**: To maintain a cohesive and professional user experience, all interface elements must respect the user's theme preference without exception.

## [SECTION_2_NAME]
<!-- Example: Additional Constraints, Security Requirements, Performance Standards, etc. -->

[SECTION_2_CONTENT]
<!-- Example: Technology stack requirements, compliance standards, deployment policies, etc. -->

## [SECTION_3_NAME]
<!-- Example: Development Workflow, Review Process, Quality Gates, etc. -->

[SECTION_3_CONTENT]
<!-- Example: Code review requirements, testing gates, deployment approval process, etc. -->

## Governance
<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

[GOVERNANCE_RULES]
<!-- Example: All PRs/reviews must verify compliance; Complexity must be justified; Use [GUIDANCE_FILE] for runtime development guidance -->

**Version**: [CONSTITUTION_VERSION] | **Ratified**: [RATIFICATION_DATE] | **Last Amended**: [LAST_AMENDED_DATE]
<!-- Example: Version: 2.1.1 | Ratified: 2025-06-13 | Last Amended: 2025-07-16 -->

## React Coding Standards & Negative Constraints

### 1. Fast Refresh Compliance
* **Rule**: Never export constants, helper functions, or variables from the same file as a React Component.
* **Why**: This breaks Vite/Next.js Fast Refresh.
* **Solution**: Move constants to `src/constants/` and helpers to `src/utils/`. Only `export default` or named component exports are allowed in `.jsx` files.

### 2. useEffect Safety
* **Rule**: Do not call `setState` (or `setX`) synchronously inside a `useEffect`.
* **Exception**: Only allowed inside async data fetching or event listeners.
* **Solution**:
    * If calculating state based on props: Use **Derived State** (calculate it during render).
    * If initializing state: Pass the logic to `useState(initialValue)`.

### 3. Linting Strictness
* **Rule**: No unused variables are allowed.
* **Process**: Before marking a task complete, run the linter and auto-fix or manually remove unused imports/variables.