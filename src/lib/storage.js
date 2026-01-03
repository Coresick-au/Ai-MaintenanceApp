const KEY = "ai-maintenanceapp:jobsheet:v1";
const SETTINGS_KEY = "ai-maintenanceapp:jobsheet:settings:v1";

export function loadJobSheet() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveJobSheet(rows) {
    localStorage.setItem(KEY, JSON.stringify(rows));
}

export function clearJobSheet() {
    localStorage.removeItem(KEY);
}

export function loadJobSheetSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveJobSheetSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
