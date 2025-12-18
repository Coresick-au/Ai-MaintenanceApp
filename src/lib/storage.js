const KEY = "ai-maintenanceapp:jobsheet:v1";

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
