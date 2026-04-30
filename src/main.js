const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, nativeTheme, screen, shell } = require("electron");
const path = require("node:path");
const {
  getPublicSettings,
  loadCredentials,
  loadSettings,
  saveCredentials,
  saveSettings
} = require("./settingsStore");
const { TrelloClient } = require("./trelloClient");

let mainWindow;
let tray;

const APP_ICON_DATA_URL =
  "data:image/png;base64,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";

const WINDOW_MODES = {
  focus: {
    width: 420,
    height: 880,
    minWidth: 380,
    minHeight: 560
  },
  planning: {
    width: 720,
    height: 780,
    minWidth: 320,
    minHeight: 420
  }
};

function createAppIcon(size) {
  const icon = nativeImage.createFromDataURL(APP_ICON_DATA_URL);
  return size ? icon.resize({ width: size, height: size }) : icon;
}

function createWindow() {
  const settings = loadSettings();
  applyNativeTheme(settings.theme);
  const viewMode = normalizeViewMode(settings.viewMode);
  const bounds = getWindowBoundsForMode(settings, viewMode);
  const modeConfig = WINDOW_MODES[viewMode];

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: modeConfig.minWidth,
    minHeight: modeConfig.minHeight,
    alwaysOnTop: Boolean(settings.alwaysOnTop),
    title: "Trello Focus Widget",
    icon: createAppIcon(),
    autoHideMenuBar: true,
    backgroundColor: getWindowBackgroundColor(settings.theme),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/trello\.com\//.test(String(url))) {
      shell.openExternal(url);
    }

    return { action: "deny" };
  });

  mainWindow.on("close", () => {
    saveWindowBounds();
  });

  mainWindow.on("resize", saveWindowBounds);
  mainWindow.on("move", saveWindowBounds);
}

function saveWindowBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const settings = loadSettings();
  const viewMode = normalizeViewMode(settings.viewMode);
  const bounds = mainWindow.getBounds();

  saveSettings({
    windowBounds: bounds,
    windowBoundsByMode: {
      [viewMode]: bounds
    }
  });
}

function normalizeViewMode(viewMode) {
  return viewMode === "focus" ? "focus" : "planning";
}

function normalizeTheme(theme) {
  return theme === "light" ? "light" : "dark";
}

function applyNativeTheme(theme) {
  nativeTheme.themeSource = normalizeTheme(theme);
}

function getWindowBackgroundColor(theme) {
  return normalizeTheme(theme) === "light" ? "#f4f7fb" : "#11161d";
}

function getWindowBoundsForMode(settings, viewMode, currentBounds = {}) {
  const modeConfig = WINDOW_MODES[viewMode];
  const savedBounds = settings.windowBoundsByMode?.[viewMode] || {};
  const legacyBounds = viewMode === "planning" ? settings.windowBounds || {} : {};

  if (viewMode === "focus") {
    const workArea = getDisplayWorkArea(currentBounds, savedBounds);
    const margin = 8;
    const availableWidth = Math.max(1, workArea.width - margin * 2);
    const availableHeight = Math.max(1, workArea.height - margin * 2);
    const width = Math.max(
      Math.min(modeConfig.width, availableWidth),
      Math.min(modeConfig.minWidth, availableWidth)
    );

    return {
      x: workArea.x + margin,
      y: workArea.y + margin,
      width,
      height: availableHeight
    };
  }

  const bounds = {
    ...modeConfig,
    ...legacyBounds,
    ...savedBounds
  };

  return {
    x: bounds.x ?? currentBounds.x,
    y: bounds.y ?? currentBounds.y,
    width: Math.max(bounds.width || modeConfig.width, modeConfig.minWidth),
    height: Math.max(bounds.height || modeConfig.height, modeConfig.minHeight)
  };
}

function getDisplayWorkArea(currentBounds = {}, savedBounds = {}) {
  const displayBounds = {
    x: currentBounds.x ?? savedBounds.x ?? 0,
    y: currentBounds.y ?? savedBounds.y ?? 0,
    width: currentBounds.width ?? savedBounds.width ?? WINDOW_MODES.focus.width,
    height: currentBounds.height ?? savedBounds.height ?? WINDOW_MODES.focus.height
  };

  return screen.getDisplayMatching(displayBounds).workArea;
}

function resizeWindowForMode(viewMode) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const modeConfig = WINDOW_MODES[viewMode];
  const currentBounds = mainWindow.getBounds();
  const nextBounds = getWindowBoundsForMode(loadSettings(), viewMode, currentBounds);

  mainWindow.setMinimumSize(modeConfig.minWidth, modeConfig.minHeight);
  mainWindow.setBounds(
    {
      ...nextBounds,
      x: nextBounds.x ?? currentBounds.x,
      y: nextBounds.y ?? currentBounds.y
    },
    true
  );
}

function createTray() {
  const trayIcon = createAppIcon(16);

  tray = new Tray(trayIcon);
  tray.setTitle("Trello");
  tray.setToolTip("Trello Focus Widget");
  tray.setContextMenu(buildTrayMenu());
  tray.on("click", () => {
    showMainWindow();
  });
}

function buildTrayMenu() {
  const settings = loadSettings();

  return Menu.buildFromTemplate([
    {
      label: "Show Widget",
      click: showMainWindow
    },
    {
      label: "Refresh Tasks",
      click: () => {
        showMainWindow();
        mainWindow?.webContents.send("tasks:refresh");
      }
    },
    {
      label: "Settings",
      click: () => {
        setViewMode("planning");
        showMainWindow();
        mainWindow?.webContents.send("settings:open");
      }
    },
    { type: "separator" },
    {
      label: "Focus Mode",
      type: "radio",
      checked: normalizeViewMode(settings.viewMode) === "focus",
      click: () => {
        setViewMode("focus");
      }
    },
    {
      label: "Plan Mode",
      type: "radio",
      checked: normalizeViewMode(settings.viewMode) === "planning",
      click: () => {
        setViewMode("planning");
      }
    },
    {
      label: "Always on Top",
      type: "checkbox",
      checked: Boolean(settings.alwaysOnTop),
      click: (item) => {
        setAlwaysOnTop(item.checked);
      }
    },
    {
      label: "Light Mode",
      type: "checkbox",
      checked: normalizeTheme(settings.theme) === "light",
      click: (item) => {
        setTheme(item.checked ? "light" : "dark");
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
}

function showMainWindow() {
  if (!mainWindow) {
    return;
  }

  mainWindow.show();
  mainWindow.focus();
}

function setAlwaysOnTop(enabled) {
  saveSettings({
    alwaysOnTop: Boolean(enabled)
  });

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(Boolean(enabled), "floating");
  }

  if (tray) {
    tray.setContextMenu(buildTrayMenu());
  }

  return getPublicSettings();
}

function setViewMode(viewMode) {
  const nextViewMode = normalizeViewMode(viewMode);

  if (mainWindow && !mainWindow.isDestroyed()) {
    saveWindowBounds();
  }

  saveSettings({
    viewMode: nextViewMode
  });

  resizeWindowForMode(nextViewMode);

  const publicSettings = getPublicSettings();
  mainWindow?.webContents.send("viewMode:changed", publicSettings);

  if (tray) {
    tray.setContextMenu(buildTrayMenu());
  }

  return publicSettings;
}

function setTheme(theme) {
  const nextTheme = normalizeTheme(theme);
  saveSettings({
    theme: nextTheme
  });
  applyNativeTheme(nextTheme);
  mainWindow?.setBackgroundColor(getWindowBackgroundColor(nextTheme));

  const publicSettings = getPublicSettings();
  mainWindow?.webContents.send("theme:changed", publicSettings);

  if (tray) {
    tray.setContextMenu(buildTrayMenu());
  }

  return publicSettings;
}

function normalizeQueueName(queueName) {
  if (queueName === "today" || queueName === "week") {
    return queueName;
  }

  throw new Error("Unknown queue.");
}

function normalizeCardId(cardId) {
  const normalizedCardId = String(cardId || "").trim();

  if (!normalizedCardId) {
    throw new Error("Missing Trello card id.");
  }

  return normalizedCardId;
}

function dedupeQueue(ids) {
  return [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
}

function updateQueue(queueName, updater) {
  const normalizedQueueName = normalizeQueueName(queueName);
  const settings = loadSettings();
  const currentQueue = dedupeQueue(settings.queues?.[normalizedQueueName] || []);
  const nextQueue = dedupeQueue(updater(currentQueue));

  saveSettings({
    queues: {
      ...settings.queues,
      [normalizedQueueName]: nextQueue
    }
  });

  return getPublicSettings();
}

function addCardToQueue(queueName, cardId) {
  const normalizedCardId = normalizeCardId(cardId);
  return updateQueue(queueName, (queue) =>
    queue.includes(normalizedCardId) ? queue : [...queue, normalizedCardId]
  );
}

function removeCardFromQueue(queueName, cardId) {
  const normalizedCardId = normalizeCardId(cardId);
  return updateQueue(queueName, (queue) => queue.filter((id) => id !== normalizedCardId));
}

function moveCardInQueue(queueName, cardId, direction) {
  const normalizedCardId = normalizeCardId(cardId);
  const offset = Number(direction) < 0 ? -1 : 1;

  return updateQueue(queueName, (queue) => {
    const currentIndex = queue.indexOf(normalizedCardId);
    if (currentIndex === -1) {
      return queue;
    }

    const nextIndex = currentIndex + offset;
    if (nextIndex < 0 || nextIndex >= queue.length) {
      return queue;
    }

    const nextQueue = [...queue];
    [nextQueue[currentIndex], nextQueue[nextIndex]] = [nextQueue[nextIndex], nextQueue[currentIndex]];
    return nextQueue;
  });
}

function moveCardBetweenQueues(sourceQueueName, targetQueueName, cardId) {
  const normalizedSourceQueueName = normalizeQueueName(sourceQueueName);
  const normalizedTargetQueueName = normalizeQueueName(targetQueueName);
  const normalizedCardId = normalizeCardId(cardId);
  const settings = loadSettings();
  const sourceQueue = dedupeQueue(settings.queues?.[normalizedSourceQueueName] || []);
  const targetQueue = dedupeQueue(settings.queues?.[normalizedTargetQueueName] || []);
  const nextQueues = {
    ...settings.queues,
    [normalizedSourceQueueName]: sourceQueue.filter((id) => id !== normalizedCardId),
    [normalizedTargetQueueName]: targetQueue.includes(normalizedCardId)
      ? targetQueue
      : [...targetQueue, normalizedCardId]
  };

  saveSettings({
    queues: nextQueues
  });

  return getPublicSettings();
}

function reorderQueue(queueName, cardIds) {
  if (!Array.isArray(cardIds)) {
    throw new Error("Queue order must be an array.");
  }

  return updateQueue(queueName, () => cardIds);
}

function pruneQueues(validCardIds) {
  const validCardIdSet = new Set((validCardIds || []).map((id) => String(id || "").trim()).filter(Boolean));
  const settings = loadSettings();

  saveSettings({
    queues: {
      today: dedupeQueue(settings.queues?.today || []).filter((id) => validCardIdSet.has(id)),
      week: dedupeQueue(settings.queues?.week || []).filter((id) => validCardIdSet.has(id))
    }
  });

  return getPublicSettings();
}

function removeCardFromAllQueues(cardId) {
  const normalizedCardId = normalizeCardId(cardId);
  const settings = loadSettings();

  saveSettings({
    queues: {
      today: dedupeQueue(settings.queues?.today || []).filter((id) => id !== normalizedCardId),
      week: dedupeQueue(settings.queues?.week || []).filter((id) => id !== normalizedCardId)
    }
  });

  return getPublicSettings();
}

function getConfiguredClient() {
  return new TrelloClient(loadCredentials());
}

function registerIpcHandlers() {
  ipcMain.handle("settings:get", () => getPublicSettings());

  ipcMain.handle("settings:save", (_event, settings) => {
    const saved = saveSettings({
      boardId: settings.boardId || "",
      boardName: settings.boardName || "",
      refreshMinutes: Number(settings.refreshMinutes) || 5
    });

    return {
      ...getPublicSettings(),
      boardId: saved.boardId,
      boardName: saved.boardName
    };
  });

  ipcMain.handle("credentials:save", (_event, credentials) => {
    const apiKey = String(credentials?.apiKey || "").trim();
    const token = String(credentials?.token || "").trim();

    if (!apiKey || !token) {
      throw new Error("Enter both a Trello API key and token.");
    }

    saveCredentials({ apiKey, token });
    return getPublicSettings();
  });

  ipcMain.handle("trello:boards", async (_event, credentials) => {
    const client = credentials
      ? new TrelloClient({
          apiKey: String(credentials.apiKey || "").trim(),
          token: String(credentials.token || "").trim()
        })
      : getConfiguredClient();

    return client.getBoards();
  });

  ipcMain.handle("trello:cards", async () => {
    const settings = loadSettings();
    const client = getConfiguredClient();
    return client.getBoardCards(settings.boardId);
  });

  ipcMain.handle("trello:complete", async (_event, cardId) => {
    const client = getConfiguredClient();
    await client.completeCard(cardId);
    return {
      ok: true,
      settings: removeCardFromAllQueues(cardId)
    };
  });

  ipcMain.handle("trello:addTimeSpent", async (_event, cardId, minutes) => {
    const settings = loadSettings();
    const client = getConfiguredClient();
    return client.addTimeSpent(settings.boardId, cardId, minutes);
  });

  ipcMain.handle("trello:addComment", async (_event, cardId, text) => {
    const client = getConfiguredClient();
    await client.addCardComment(cardId, text);
    return {
      ok: true,
      cardId
    };
  });

  ipcMain.handle("shell:openExternal", (_event, url) => {
    if (!/^https:\/\/trello\.com\//.test(String(url))) {
      throw new Error("Only Trello links can be opened from the widget.");
    }

    return shell.openExternal(url);
  });

  ipcMain.handle("window:alwaysOnTop", (_event, enabled) => setAlwaysOnTop(enabled));

  ipcMain.handle("window:viewMode", (_event, viewMode) => setViewMode(viewMode));

  ipcMain.handle("settings:theme", (_event, theme) => setTheme(theme));

  ipcMain.handle("queues:add", (_event, queueName, cardId) => addCardToQueue(queueName, cardId));

  ipcMain.handle("queues:remove", (_event, queueName, cardId) =>
    removeCardFromQueue(queueName, cardId)
  );

  ipcMain.handle("queues:move", (_event, queueName, cardId, direction) =>
    moveCardInQueue(queueName, cardId, direction)
  );

  ipcMain.handle("queues:moveBetween", (_event, sourceQueueName, targetQueueName, cardId) =>
    moveCardBetweenQueues(sourceQueueName, targetQueueName, cardId)
  );

  ipcMain.handle("queues:reorder", (_event, queueName, cardIds) => reorderQueue(queueName, cardIds));

  ipcMain.handle("queues:prune", (_event, validCardIds) => pruneQueues(validCardIds));

  ipcMain.handle("window:hide", () => {
    mainWindow?.minimize();
  });
}

app.whenReady().then(() => {
  app.setName("Trello Focus Widget");
  app.setAppUserModelId("com.local.trello-focus-widget");
  applyNativeTheme(loadSettings().theme);
  Menu.setApplicationMenu(null);
  registerIpcHandlers();
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showMainWindow();
    }
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
  saveWindowBounds();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
