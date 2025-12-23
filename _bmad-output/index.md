# Project Documentation Index

**Project:** Ai-MaintenanceApp
**Generated:** 2025-12-20

## Project Overview

- **Type:** Monolith (Hybrid Web/Desktop)
- **Primary Language:** JavaScript (React)
- **Architecture:** Service-Repository Pattern
- **State:** Active / In-Maintenance

### Quick Reference

- **Tech Stack:** React 19, Vite, Tailwind, Firebase, Electron
- **Entry Point:** `src/main.jsx` / `electron-main.cjs`
- **Key Pattern:** UI -> Service -> Repo -> Firestore

## Documentation Map

### Core Documentation
- [Project Overview](./project-overview.md) - High-level summary of the application.
- [Architecture](./architecture.md) - Diagram and explanation of the Service-Repository pattern.
- [Source Tree Analysis](./source-tree-analysis.md) - Annotated guide to the `src/` directory.

### Technical Detail
- [Data Models](./data-models.md) - Schema definitions for Firestore and Forms.
- [API Contracts](./api-contracts.md) - Documentation of the Internal Service Layer functions.

### Existing Documentation (Legacy)
- [Agents Wiki](../docs/AGENTS_WIKI.md)
- [Error Index](../docs/ERROR_INDEX.md)
- [Project Map](../docs/PROJECT_MAP.md)

## Getting Started

1.  **Install Dependencies:** `npm install`
2.  **Dev Server:** `npm run dev`
3.  **Build Web:** `npm run build`
4.  **Desktop Build:** `npm run electron:build` (check package.json scripts)

## Maintenance Notes
- **Updating Data:** Always use `inventoryService` for stock changes to ensure audit logs are created.
- **Validation:** Check `src/utils/validation.ts` before modifying form logic.
