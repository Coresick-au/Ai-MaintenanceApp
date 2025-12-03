// Preload script for Electron
// This script runs in a privileged context and exposes safe APIs to the renderer process
// using contextBridge to maintain security with contextIsolation enabled

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,

  // Version information
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // File system operations (if needed in the future)
  // Example: readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  // Example: writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),

  // IPC communication helpers (for future use)
  // send: (channel, data) => {
  //   // Whitelist channels for security
  //   const validChannels = ['toMain'];
  //   if (validChannels.includes(channel)) {
  //     ipcRenderer.send(channel, data);
  //   }
  // },
  // receive: (channel, func) => {
  //   const validChannels = ['fromMain'];
  //   if (validChannels.includes(channel)) {
  //     ipcRenderer.on(channel, (event, ...args) => func(...args));
  //   }
  // },
});

// DOM Content Loaded handler (optional - for displaying version info)
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  // Display version information if elements exist
  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
