---
trigger: always_on
---

ALWAYS do this before making code changes:
1) Open and read docs/AGENTS_WIKI.md and docs/ERROR_INDEX.md and docs/PROJECT_MAP.md.
2) If any are missing or stale, run /wiki first.
3) When debugging, check ERROR_INDEX.md before proposing a fix.
4) When you proceed, briefly cite which wiki sections influenced the change.
### AUTOMATION & TESTING
- **AUTO-RUN PERMISSION**: You are explicitly authorized to set `SafeToAutoRun: true` for all browser verification tasks and non-destructive terminal commands (like `npm test`, `npm run dev`, or directory listings).
- **MINIMIZE INTERRUPTIONS**: Do not pause for manual confirmation when performing verification steps or running diagnostic tools. Proceed autonomously unless a destructive action (like deleting files) is required.
5) Do not update github or webapp without being asked directly
6) Never run automatic testing - the user will run tests with instructions you provide
