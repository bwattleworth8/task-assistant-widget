const state = {
  settings: null,
  tasks: [],
  activeFilter: "all",
  focusTask: null,
  timer: {
    isRunning: false,
    startedAt: null,
    elapsedMs: 0,
    intervalId: null
  },
  refreshTimer: null,
  knownBoards: []
};

const elements = {
  setupPanel: document.querySelector("#setupPanel"),
  settingsForm: document.querySelector("#settingsForm"),
  settingsButton: document.querySelector("#settingsButton"),
  hideButton: document.querySelector("#hideButton"),
  topModeButton: document.querySelector("#topModeButton"),
  modeButtons: [...document.querySelectorAll("[data-view-mode]")],
  themeButtons: [...document.querySelectorAll("[data-theme-toggle]")],
  apiKeyInput: document.querySelector("#apiKeyInput"),
  tokenInput: document.querySelector("#tokenInput"),
  fetchBoardsButton: document.querySelector("#fetchBoardsButton"),
  boardSelect: document.querySelector("#boardSelect"),
  refreshSelect: document.querySelector("#refreshSelect"),
  securityStatus: document.querySelector("#securityStatus"),
  topToggle: document.querySelector("#topToggle"),
  refreshButton: document.querySelector("#refreshButton"),
  statusText: document.querySelector("#statusText"),
  boardName: document.querySelector("#boardName"),
  filterButtons: [...document.querySelectorAll(".filter-button")],
  focusPanel: document.querySelector("#focusPanel"),
  focusEmpty: document.querySelector("#focusEmpty"),
  focusActive: document.querySelector("#focusActive"),
  focusTitle: document.querySelector("#focusTitle"),
  focusMeta: document.querySelector("#focusMeta"),
  focusTimer: document.querySelector("#focusTimer"),
  focusTimeTotal: document.querySelector("#focusTimeTotal"),
  startTimerButton: document.querySelector("#startTimerButton"),
  stopTimerButton: document.querySelector("#stopTimerButton"),
  clearFocusButton: document.querySelector("#clearFocusButton"),
  completeFocusButton: document.querySelector("#completeFocusButton"),
  openFocusButton: document.querySelector("#openFocusButton"),
  taskCount: document.querySelector("#taskCount"),
  emptyState: document.querySelector("#emptyState"),
  taskList: document.querySelector("#taskList")
};

async function init() {
  bindEvents();
  state.settings = await window.taskWidget.getSettings();
  syncSettingsUi();

  if (!state.settings.hasCredentials || !state.settings.boardId) {
    if (state.settings.viewMode === "focus") {
      await setViewMode("planning", false);
    }
    showSetup(true);
    setStatus("Add Trello credentials and choose a board.");
    renderTasks();
    return;
  }

  await loadTasks();
  scheduleRefresh();
}

function bindEvents() {
  elements.settingsButton.addEventListener("click", () => showSetup(!isSetupVisible()));
  elements.hideButton.addEventListener("click", () => window.taskWidget.hide());
  elements.fetchBoardsButton.addEventListener("click", fetchBoards);
  elements.settingsForm.addEventListener("submit", saveSettings);
  elements.refreshButton.addEventListener("click", loadTasks);
  elements.topToggle.addEventListener("change", toggleAlwaysOnTop);
  elements.startTimerButton.addEventListener("click", startFocusTimer);
  elements.stopTimerButton.addEventListener("click", stopFocusTimerAndSave);
  elements.clearFocusButton.addEventListener("click", clearFocus);
  elements.completeFocusButton.addEventListener("click", () => completeTask(state.focusTask?.id));
  elements.openFocusButton.addEventListener("click", () => openTask(state.focusTask?.url));

  for (const button of elements.modeButtons) {
    button.addEventListener("click", () => setViewMode(button.dataset.viewMode));
  }

  for (const button of elements.themeButtons) {
    button.addEventListener("click", toggleTheme);
  }

  for (const button of elements.filterButtons) {
    button.addEventListener("click", () => {
      state.activeFilter = button.dataset.filter;
      renderTasks();
    });
  }

  window.taskWidget.onRefreshRequested(loadTasks);
  window.taskWidget.onOpenSettings(async () => {
    await setViewMode("planning", false);
    showSetup(true);
  });
  window.taskWidget.onViewModeChanged((settings) => {
    state.settings = {
      ...state.settings,
      ...settings
    };
    syncSettingsUi();
    renderTasks();
  });
  window.taskWidget.onThemeChanged((settings) => {
    state.settings = {
      ...state.settings,
      ...settings
    };
    syncSettingsUi();
  });
}

function syncSettingsUi() {
  elements.topToggle.checked = Boolean(state.settings.alwaysOnTop);
  elements.refreshSelect.value = String(state.settings.refreshMinutes || 5);
  elements.boardName.textContent = state.settings.boardName || "";
  elements.securityStatus.textContent = state.settings.encryptionAvailable
    ? "Credentials will be encrypted on this computer."
    : "Credentials stay on this computer; OS encryption is unavailable.";
  applyViewModeClass(state.settings.viewMode);
  applyThemeClass(state.settings.theme);
  hydrateBoardSelect();
}

function applyViewModeClass(viewMode) {
  const normalizedMode = viewMode === "focus" ? "focus" : "planning";

  document.body.classList.toggle("focus-mode", normalizedMode === "focus");
  document.body.classList.toggle("planning-mode", normalizedMode === "planning");

  elements.topModeButton.dataset.viewMode = normalizedMode === "focus" ? "planning" : "focus";
  elements.topModeButton.textContent = normalizedMode === "focus" ? "Plan Mode" : "Focus Mode";
  elements.topModeButton.title = normalizedMode === "focus" ? "Plan mode" : "Focus mode";
  elements.topModeButton.setAttribute(
    "aria-label",
    normalizedMode === "focus" ? "Plan mode" : "Focus mode"
  );

  for (const button of elements.modeButtons) {
    const buttonMode = button === elements.topModeButton ? normalizedMode : button.dataset.viewMode;
    button.classList.toggle("active", buttonMode === normalizedMode);
  }
}

async function setViewMode(viewMode, showStatus = true) {
  try {
    state.settings = await window.taskWidget.setViewMode(viewMode);
    syncSettingsUi();
    renderTasks();

    if (showStatus) {
      setStatus(`${state.settings.viewMode === "focus" ? "Focus" : "Plan"} mode.`);
    }
  } catch (error) {
    setStatus(error.message, true);
  }
}

function applyThemeClass(theme) {
  const normalizedTheme = theme === "light" ? "light" : "dark";

  document.body.classList.toggle("theme-light", normalizedTheme === "light");
  document.body.classList.toggle("theme-dark", normalizedTheme === "dark");

  for (const button of elements.themeButtons) {
    const nextTheme = normalizedTheme === "light" ? "dark" : "light";
    button.title = `Switch to ${nextTheme} mode`;
    button.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
  }
}

async function toggleTheme() {
  const nextTheme = state.settings?.theme === "light" ? "dark" : "light";

  try {
    state.settings = await window.taskWidget.setTheme(nextTheme);
    syncSettingsUi();
    setStatus(`${nextTheme === "light" ? "Light" : "Dark"} mode.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

function showSetup(visible) {
  elements.setupPanel.classList.toggle("hidden", !visible);
}

function isSetupVisible() {
  return !elements.setupPanel.classList.contains("hidden");
}

async function fetchBoards() {
  const apiKey = elements.apiKeyInput.value.trim();
  const token = elements.tokenInput.value.trim();

  if (!apiKey || !token) {
    setStatus("Enter both a Trello API key and token.", true);
    return;
  }

  setLoading(true);
  setStatus("Fetching boards...");

  try {
    state.knownBoards = await window.taskWidget.getBoards({ apiKey, token });
    hydrateBoardSelect();
    setStatus(`Found ${state.knownBoards.length} boards.`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setLoading(false);
  }
}

function hydrateBoardSelect() {
  elements.boardSelect.innerHTML = "";

  const boards = [...state.knownBoards];
  if (state.settings?.boardId && !boards.some((board) => board.id === state.settings.boardId)) {
    boards.unshift({
      id: state.settings.boardId,
      name: state.settings.boardName || "Saved board"
    });
  }

  if (boards.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Fetch boards to choose one";
    elements.boardSelect.append(option);
    return;
  }

  for (const board of boards) {
    const option = document.createElement("option");
    option.value = board.id;
    option.textContent = board.name;
    option.selected = board.id === state.settings?.boardId;
    elements.boardSelect.append(option);
  }
}

async function saveSettings(event) {
  event.preventDefault();
  const apiKey = elements.apiKeyInput.value.trim();
  const token = elements.tokenInput.value.trim();
  const selectedOption = elements.boardSelect.selectedOptions[0];
  const boardId = elements.boardSelect.value;

  if (!state.settings.hasCredentials && (!apiKey || !token)) {
    setStatus("Enter Trello credentials before saving.", true);
    return;
  }

  if (!boardId) {
    setStatus("Fetch boards and choose one before saving.", true);
    return;
  }

  setLoading(true);
  setStatus("Saving settings...");

  try {
    if (apiKey || token) {
      await window.taskWidget.saveCredentials({ apiKey, token });
      elements.apiKeyInput.value = "";
      elements.tokenInput.value = "";
    }

    state.settings = await window.taskWidget.saveSettings({
      boardId,
      boardName: selectedOption?.textContent || "",
      refreshMinutes: Number(elements.refreshSelect.value)
    });

    syncSettingsUi();
    showSetup(false);
    scheduleRefresh();
    await loadTasks();
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setLoading(false);
  }
}

async function toggleAlwaysOnTop() {
  try {
    state.settings = await window.taskWidget.setAlwaysOnTop(elements.topToggle.checked);
    syncSettingsUi();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadTasks() {
  if (!state.settings?.hasCredentials || !state.settings?.boardId) {
    showSetup(true);
    renderTasks();
    return;
  }

  setLoading(true);
  setStatus("Refreshing tasks...");

  try {
    state.tasks = await window.taskWidget.getCards();
    renderTasks();
    setStatus(`Updated ${formatTime(new Date())}.`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setLoading(false);
  }
}

function scheduleRefresh() {
  if (state.refreshTimer) {
    window.clearInterval(state.refreshTimer);
  }

  const minutes = Number(state.settings?.refreshMinutes || 5);
  state.refreshTimer = window.setInterval(loadTasks, Math.max(minutes, 1) * 60 * 1000);
}

function renderTasks() {
  for (const button of elements.filterButtons) {
    button.classList.toggle("active", button.dataset.filter === state.activeFilter);
  }

  const tasks = getFilteredTasks();
  reconcileFocusWithTasks();

  renderFocus(state.focusTask);
  renderTaskList(tasks);

  elements.taskCount.textContent = `${tasks.length} shown`;
  elements.emptyState.classList.toggle("hidden", tasks.length > 0);
  elements.boardName.textContent = state.settings?.boardName || "";
}

function reconcileFocusWithTasks() {
  if (!state.focusTask) {
    return;
  }

  const freshTask = state.tasks.find((task) => task.id === state.focusTask.id);
  if (freshTask) {
    state.focusTask = freshTask;
    return;
  }

  if (!state.timer.isRunning) {
    state.focusTask = null;
  }
}

function setFocusTask(task) {
  if (state.timer.isRunning || state.timer.elapsedMs > 0) {
    setStatus("Save the current timer before changing focus.", true);
    return;
  }

  state.focusTask = task;
  resetTimer();
  renderTasks();
  setStatus(`Focused: ${task.name}`);
}

function clearFocus() {
  if (state.timer.isRunning || state.timer.elapsedMs > 0) {
    setStatus("Save the current timer before clearing focus.", true);
    return;
  }

  state.focusTask = null;
  resetTimer();
  renderTasks();
  setStatus("Focus cleared.");
}

function startFocusTimer() {
  if (!state.focusTask || state.timer.isRunning) {
    return;
  }

  state.timer.isRunning = true;
  state.timer.startedAt = Date.now();
  state.timer.intervalId = window.setInterval(updateTimerDisplay, 1000);
  renderFocus(state.focusTask);
  setStatus("Timer running.");
}

async function stopFocusTimerAndSave() {
  if (!state.focusTask) {
    return;
  }

  const elapsedMs = getTimerElapsedMs();

  if (state.timer.isRunning) {
    window.clearInterval(state.timer.intervalId);
    state.timer.isRunning = false;
    state.timer.startedAt = null;
    state.timer.intervalId = null;
    state.timer.elapsedMs = elapsedMs;
  }

  if (elapsedMs <= 0) {
    renderFocus(state.focusTask);
    return;
  }

  const minutes = Math.max(1, Math.ceil(elapsedMs / 60000));
  setLoading(true);
  setStatus(`Saving ${minutes} mins to Trello...`);

  try {
    const result = await window.taskWidget.addTimeSpent(state.focusTask.id, minutes);
    applyTimeSpentUpdate(result.cardId, result.totalMinutes);
    resetTimer();
    renderTasks();
    setStatus(`Added ${result.minutesAdded} mins to Trello.`);
  } catch (error) {
    state.timer.elapsedMs = elapsedMs;
    renderFocus(state.focusTask);
    setStatus(error.message, true);
  } finally {
    setLoading(false);
  }
}

function applyTimeSpentUpdate(cardId, totalMinutes) {
  state.tasks = state.tasks.map((task) =>
    task.id === cardId ? { ...task, timeSpentMins: totalMinutes } : task
  );

  if (state.focusTask?.id === cardId) {
    state.focusTask = {
      ...state.focusTask,
      timeSpentMins: totalMinutes
    };
  }
}

function resetTimer() {
  if (state.timer.intervalId) {
    window.clearInterval(state.timer.intervalId);
  }

  state.timer = {
    isRunning: false,
    startedAt: null,
    elapsedMs: 0,
    intervalId: null
  };
  updateTimerDisplay();
}

function getTimerElapsedMs() {
  if (!state.timer.isRunning) {
    return state.timer.elapsedMs;
  }

  return state.timer.elapsedMs + (Date.now() - state.timer.startedAt);
}

function updateTimerDisplay() {
  elements.focusTimer.textContent = formatDuration(getTimerElapsedMs());

  if (!state.focusTask) {
    return;
  }

  const hasElapsed = getTimerElapsedMs() > 0;
  elements.startTimerButton.disabled = state.timer.isRunning;
  elements.startTimerButton.textContent = hasElapsed && !state.timer.isRunning ? "Resume timer" : "Start timer";
  elements.stopTimerButton.disabled = !state.timer.isRunning && !hasElapsed;
  elements.stopTimerButton.textContent = state.timer.isRunning ? "Stop & save" : "Save elapsed";
  elements.clearFocusButton.disabled = state.timer.isRunning || hasElapsed;
  elements.completeFocusButton.disabled = state.timer.isRunning || hasElapsed;
}

function getFilteredTasks() {
  if (state.activeFilter === "all") {
    return state.tasks;
  }

  if (state.activeFilter === "due") {
    return state.tasks.filter((task) => task.due);
  }

  if (state.activeFilter === "overdue") {
    return state.tasks.filter((task) => task.status === "overdue");
  }

  return state.tasks.filter((task) => !task.due);
}

function renderFocus(task) {
  elements.focusEmpty.classList.toggle("hidden", Boolean(task));
  elements.focusActive.classList.toggle("hidden", !task);

  if (!task) {
    updateTimerDisplay();
    return;
  }

  elements.focusTitle.textContent = task.name;
  renderMeta(elements.focusMeta, task);
  elements.focusTimeTotal.textContent =
    task.timeSpentMins === null ? "Time spent: field not found" : `Time spent: ${task.timeSpentMins} mins`;
  updateTimerDisplay();
}

function renderTaskList(tasks) {
  elements.taskList.innerHTML = "";

  for (const task of tasks) {
    const item = document.createElement("article");
    item.className = "task-item";
    item.classList.toggle("active-focus", task.id === state.focusTask?.id);

    const title = document.createElement("h3");
    title.textContent = task.name;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    renderMeta(meta, task);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const completeButton = document.createElement("button");
    completeButton.className = "primary-button";
    completeButton.type = "button";
    completeButton.textContent = "Complete";
    completeButton.disabled =
      task.id === state.focusTask?.id && (state.timer.isRunning || state.timer.elapsedMs > 0);
    completeButton.addEventListener("click", () => completeTask(task.id));

    const focusButton = document.createElement("button");
    focusButton.className = "secondary-button";
    focusButton.type = "button";
    focusButton.textContent = task.id === state.focusTask?.id ? "Focused" : "Focus";
    focusButton.disabled = state.timer.isRunning || state.timer.elapsedMs > 0;
    focusButton.addEventListener("click", () => setFocusTask(task));

    const openButton = document.createElement("button");
    openButton.className = "secondary-button";
    openButton.type = "button";
    openButton.textContent = "Open";
    openButton.addEventListener("click", () => openTask(task.url));

    actions.append(focusButton, completeButton, openButton);
    item.append(title, meta, actions);
    elements.taskList.append(item);
  }
}

function renderMeta(container, task) {
  container.innerHTML = "";
  container.append(createPill(task.listName));

  if (task.due) {
    container.append(createPill(formatDue(task), task.status));
  } else {
    container.append(createPill("No due date"));
  }

  if (task.timeSpentMins !== null) {
    container.append(createPill(`${task.timeSpentMins} mins tracked`));
  }

  for (const label of task.labels) {
    container.append(createPill(label.name, `label-pill ${label.color}`));
  }
}

function createPill(text, extraClass = "") {
  const pill = document.createElement("span");
  pill.className = extraClass.startsWith("label-pill")
    ? extraClass
    : `meta-pill ${extraClass}`.trim();
  pill.textContent = text;
  return pill;
}

function formatDue(task) {
  const due = new Date(task.due);
  const date = due.toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });
  const time = due.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  if (task.status === "overdue") {
    return `Overdue ${date}, ${time}`;
  }

  if (task.status === "today") {
    return `Today, ${time}`;
  }

  return `${date}, ${time}`;
}

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

async function completeTask(cardId) {
  if (!cardId) {
    return;
  }

  if (cardId === state.focusTask?.id && (state.timer.isRunning || state.timer.elapsedMs > 0)) {
    setStatus("Save the current timer before completing this task.", true);
    return;
  }

  setLoading(true);
  setStatus("Marking complete...");

  try {
    await window.taskWidget.completeCard(cardId);
    state.tasks = state.tasks.filter((task) => task.id !== cardId);
    if (state.focusTask?.id === cardId) {
      state.focusTask = null;
      resetTimer();
    }
    renderTasks();
    setStatus("Marked complete.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setLoading(false);
  }
}

async function openTask(url) {
  if (!url) {
    return;
  }

  try {
    await window.taskWidget.openExternal(url);
  } catch (error) {
    setStatus(error.message, true);
  }
}

function setLoading(isLoading) {
  document.body.classList.toggle("loading", isLoading);
}

function setStatus(message, isError = false) {
  elements.statusText.textContent = message;
  elements.statusText.style.color = isError ? "var(--danger)" : "var(--muted)";
}

init();
