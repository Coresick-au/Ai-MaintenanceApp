# Finding Unused Code - Quick Start Guide

## 📍 Location
You're reading: `c:\Users\bradl\Documents\~AppProjects\Ai-MaintenanceApp\FIND-UNUSED-CODE.md`

---

## 🚀 Quick Start (Run These Commands)

Open your terminal in the project folder and run these commands one by one:

### Step 1: Run Knip (Most Important)
```bash
npx knip
```
**What it does:** Finds unused files, unused exports, and unused dependencies.

**What to look for:**
- "Unused files" - Files you created but never imported
- "Unused exports" - Components/functions that nothing uses
- "Unused dependencies" - npm packages you can remove

### Step 2: Check ESLint for Unused Variables
```bash
npm run lint
```
**What it does:** Shows imported components that aren't being used.

**What to look for:**
- "'MyComponent' is defined but never used"
- Any warnings about unused imports

### Step 3: Run Test Coverage
```bash
npm run test:coverage
```
**What it does:** Shows which files have 0% test coverage (often means they're orphaned).

**After running, open the report:**
```bash
start coverage/index.html
```

---

## 📝 Save Your Findings

Create a cleanup list:
```bash
echo "# Cleanup Tasks" > CLEANUP.md
notepad CLEANUP.md
```

In that file, note down:
- Files to delete
- Components to restore
- Dependencies to remove

---

## ⚠️ Before Deleting Anything

### Create a backup branch:
```bash
git checkout -b backup-before-cleanup
git add .
git commit -m "Backup before cleanup"
git push origin backup-before-cleanup
```

### Then create your cleanup branch:
```bash
git checkout -b cleanup-unused-code
```

---

## 🔍 VS Code Visual Check

1. Open VS Code Settings (`Ctrl + ,`)
2. Search for: `unused`
3. Enable: `Editor: Show Unused`
4. Open these files and look for greyed-out imports:
   - `src/App.jsx`
   - `src/Portal.jsx`
   - `src/main.jsx`

Any greyed-out import = not being used!

---

## 📊 Full Analysis Commands

If you want the complete picture, run all of these:

```bash
# 1. Find unused code
npx knip

# 2. Check for unused variables
npm run lint

# 3. TypeScript analysis
npx tsc --noEmit --allowJs --checkJs

# 4. Test coverage
npm run test:coverage

# 5. Open coverage report
start coverage/index.html
```

---

## 🎯 What to Do With Results

### Unused Files
- **Review first** - Make sure it's truly unused
- **Delete with git** - `git rm src/components/UnusedFile.jsx`
- **Test after** - Run `npm run dev` and check the app works

### Unused Exports
- Either use them somewhere, or
- Remove the export and the code

### Unused Dependencies
```bash
npm uninstall package-name
```

---

## 🛡️ Safety Tips

1. **Don't delete config files** - `vite.config.js`, `eslint.config.js`, etc.
2. **Don't delete CSS imports** - `import './styles.css'` might be flagged but is needed
3. **Test after each deletion** - Make sure app still works
4. **Keep the backup branch** - You can always recover

---

## 📂 Where to Find This File

This file is saved at:
```
c:\Users\bradl\Documents\~AppProjects\Ai-MaintenanceApp\FIND-UNUSED-CODE.md
```

You can also find the detailed plan at:
```
C:\Users\bradl\.gemini\antigravity\brain\b5d3bcbb-7b60-45a3-8108-6f76a52cf696\unused_code_detection_plan.md
```

---

## ⏱️ Estimated Time

- Quick scan (Steps 1-3): **15 minutes**
- Full analysis: **30 minutes**
- Cleanup: **1-2 hours** (depending on findings)

---

## 🆘 If Something Breaks

1. **Stop immediately**
2. **Check what you deleted:**
   ```bash
   git status
   git diff
   ```
3. **Restore if needed:**
   ```bash
   git checkout -- src/path/to/file.jsx
   ```
4. **Or switch back to backup:**
   ```bash
   git checkout backup-before-cleanup
   ```

---

## ✅ When You're Done

1. Test the app thoroughly
2. Commit your changes:
   ```bash
   git add .
   git commit -m "Clean up unused code"
   git push origin cleanup-unused-code
   ```
3. Create a pull request to review changes
4. Merge when confident

---

**Good luck! 🚀**
