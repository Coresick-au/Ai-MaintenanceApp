// Type declarations for Electron API exposed via contextBridge
// This provides TypeScript autocomplete and type safety for window.electronAPI

export interface ElectronAPI {
    // Platform information
    platform: NodeJS.Platform;

    // Version information
    versions: {
        node: string;
        chrome: string;
        electron: string;
    };

    // File system operations (commented out - add when needed)
    // readFile: (filePath: string) => Promise<string>;
    // writeFile: (filePath: string, data: string) => Promise<void>;

    // IPC communication helpers (commented out - add when needed)
    // send: (channel: string, data: any) => void;
    // receive: (channel: string, func: (...args: any[]) => void) => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
