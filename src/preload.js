const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("taskWidget", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  saveCredentials: (credentials) => ipcRenderer.invoke("credentials:save", credentials),
  getBoards: (credentials) => ipcRenderer.invoke("trello:boards", credentials),
  getCards: () => ipcRenderer.invoke("trello:cards"),
  completeCard: (cardId) => ipcRenderer.invoke("trello:complete", cardId),
  addTimeSpent: (cardId, minutes) => ipcRenderer.invoke("trello:addTimeSpent", cardId, minutes),
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke("window:alwaysOnTop", enabled),
  setViewMode: (viewMode) => ipcRenderer.invoke("window:viewMode", viewMode),
  setTheme: (theme) => ipcRenderer.invoke("settings:theme", theme),
  hide: () => ipcRenderer.invoke("window:hide"),
  onRefreshRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("tasks:refresh", listener);
    return () => ipcRenderer.removeListener("tasks:refresh", listener);
  },
  onOpenSettings: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("settings:open", listener);
    return () => ipcRenderer.removeListener("settings:open", listener);
  },
  onViewModeChanged: (callback) => {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on("viewMode:changed", listener);
    return () => ipcRenderer.removeListener("viewMode:changed", listener);
  },
  onThemeChanged: (callback) => {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on("theme:changed", listener);
    return () => ipcRenderer.removeListener("theme:changed", listener);
  }
});
