const state = {
  settings: null,
  tasks: [],
  activeFilter: "all",
  workspaceView: "dashboard",
  selectedListIds: new Set(),
  focusTask: null,
  nextSuggestion: null,
  timer: {
    isRunning: false,
    startedAt: null,
    elapsedMs: 0,
    intervalId: null
  },
  refreshTimer: null,
  knownBoards: [],
  queueDrag: {
    queueName: null,
    cardId: null
  }
};

const FOCUS_NOTES_STORAGE_KEY = "trello-focus-widget:focus-notes";
const FOCUS_NOTES_MAX_LENGTH = 1000;
const DUE_SOON_DAYS = 3;

const elements = {
  setupPanel: document.querySelector("#setupPanel"),
  settingsForm: document.querySelector("#settingsForm"),
  settingsButton: document.querySelector("#settingsButton"),
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
  focusHeaderOpenButton: document.querySelector("#focusHeaderOpenButton"),
  focusEmpty: document.querySelector("#focusEmpty"),
  focusActive: document.querySelector("#focusActive"),
  nextSuggestion: document.querySelector("#nextSuggestion"),
  nextSuggestionTitle: document.querySelector("#nextSuggestionTitle"),
  nextSuggestionMeta: document.querySelector("#nextSuggestionMeta"),
  acceptNextButton: document.querySelector("#acceptNextButton"),
  dismissNextButton: document.querySelector("#dismissNextButton"),
  focusTitle: document.querySelector("#focusTitle"),
  focusMeta: document.querySelector("#focusMeta"),
  focusTimer: document.querySelector("#focusTimer"),
  focusTimeTotal: document.querySelector("#focusTimeTotal"),
  startTimerButton: document.querySelector("#startTimerButton"),
  stopTimerButton: document.querySelector("#stopTimerButton"),
  clearFocusButton: document.querySelector("#clearFocusButton"),
  completeFocusButton: document.querySelector("#completeFocusButton"),
  openFocusButton: document.querySelector("#openFocusButton"),
  focusNotesInput: document.querySelector("#focusNotesInput"),
  focusNotesCount: document.querySelector("#focusNotesCount"),
  focusNoteFormatButtons: [...document.querySelectorAll("[data-note-format]")],
  todayQueueCount: document.querySelector("#todayQueueCount"),
  todayQueueEmpty: document.querySelector("#todayQueueEmpty"),
  todayQueueList: document.querySelector("#todayQueueList"),
  weekQueueCount: document.querySelector("#weekQueueCount"),
  weekQueueEmpty: document.querySelector("#weekQueueEmpty"),
  weekQueueList: document.querySelector("#weekQueueList"),
  sidebarTodayCount: document.querySelector("#sidebarTodayCount"),
  sidebarWeekCount: document.querySelector("#sidebarWeekCount"),
  sidebarAllTasksCount: document.querySelector("#sidebarAllTasksCount"),
  sidebarListFilter: document.querySelector("#sidebarListFilter"),
  clearListFiltersButton: document.querySelector("#clearListFiltersButton"),
  sidebarLinks: [...document.querySelectorAll(".sidebar-link")],
  workspaceTitle: document.querySelector("#workspaceTitle"),
  workspaceSubtitle: document.querySelector("#workspaceSubtitle"),
  taskCount: document.querySelector("#taskCount"),
  taskListTitle: document.querySelector("#taskListTitle"),
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
  elements.fetchBoardsButton.addEventListener("click", fetchBoards);
  elements.settingsForm.addEventListener("submit", saveSettings);
  elements.refreshButton.addEventListener("click", loadTasks);
  elements.topToggle.addEventListener("change", toggleAlwaysOnTop);
  elements.startTimerButton.addEventListener("click", startFocusTimer);
  elements.stopTimerButton.addEventListener("click", stopFocusTimerAndSave);
  elements.clearFocusButton.addEventListener("click", clearFocus);
  elements.completeFocusButton.addEventListener("click", () => completeTask(state.focusTask?.id));
  elements.openFocusButton.addEventListener("click", () => openTask(state.focusTask?.url));
  elements.focusHeaderOpenButton.addEventListener("click", () => openTask(state.focusTask?.url));
  elements.focusNotesInput.addEventListener("input", handleFocusNotesInput);
  for (const button of elements.focusNoteFormatButtons) {
    button.addEventListener("click", () => applyNoteFormat(button.dataset.noteFormat));
  }
  elements.acceptNextButton.addEventListener("click", acceptNextSuggestion);
  elements.dismissNextButton.addEventListener("click", dismissNextSuggestion);
  elements.clearListFiltersButton.addEventListener("click", clearListFilters);

  for (const button of elements.modeButtons) {
    button.addEventListener("click", () => setViewMode(button.dataset.viewMode));
  }

  for (const button of elements.themeButtons) {
    button.addEventListener("click", toggleTheme);
  }

  for (const button of elements.filterButtons) {
    button.addEventListener("click", () => {
      state.activeFilter = button.dataset.filter;
      state.workspaceView = "all";
      renderTasks();
    });
  }

  for (const link of elements.sidebarLinks) {
    link.addEventListener("click", () => handleSidebarLink(link));
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
  const focusModeEnabled = normalizedMode === "focus";

  document.body.classList.toggle("focus-mode", focusModeEnabled);
  document.body.classList.toggle("planning-mode", !focusModeEnabled);

  elements.topModeButton.dataset.viewMode = focusModeEnabled ? "planning" : "focus";
  elements.topModeButton.textContent = "Focus Mode";
  elements.topModeButton.title = focusModeEnabled ? "Exit focus mode" : "Enter focus mode";
  elements.topModeButton.setAttribute("aria-label", elements.topModeButton.title);
  elements.topModeButton.setAttribute("aria-pressed", String(focusModeEnabled));

  for (const button of elements.modeButtons) {
    if (button === elements.topModeButton) {
      button.classList.toggle("active", focusModeEnabled);
    } else {
      button.classList.toggle("active", button.dataset.viewMode === normalizedMode);
    }
  }
}

async function setViewMode(viewMode, showStatus = true) {
  const nextViewMode = viewMode === "focus" ? "focus" : "planning";
  state.workspaceView = nextViewMode === "focus" ? "focus" : "dashboard";

  try {
    state.settings = await window.taskWidget.setViewMode(viewMode);
    syncSettingsUi();
    renderTasks();

    if (showStatus) {
      setStatus(`${state.settings.viewMode === "focus" ? "Focus" : "Plan"} mode.`);
    }

    return true;
  } catch (error) {
    setStatus(error.message, true);
    return false;
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
    state.settings = await window.taskWidget.pruneQueues(state.tasks.map((task) => task.id));
    syncSettingsUi();
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
  applyWorkspaceViewClass();
  reconcileSelectedListFilters();

  for (const button of elements.filterButtons) {
    button.classList.toggle("active", button.dataset.filter === state.activeFilter);
  }

  reconcileFocusWithTasks();
  const tasks = getFilteredTasks();

  renderFocus(state.focusTask);
  renderQueues();
  renderTaskList(tasks);
  renderSidebar();
  renderWorkspaceHeader();

  elements.taskCount.textContent = String(tasks.length);
  elements.taskListTitle.textContent = getTaskListTitle();
  elements.emptyState.classList.toggle("hidden", tasks.length > 0);
  elements.boardName.textContent = state.settings?.boardName || "";
}

function renderWorkspaceHeader() {
  const copy = {
    dashboard: {
      title: "Home",
      subtitle: "Plan today, shape the week, and choose your next focus."
    },
    today: {
      title: "Today",
      subtitle: "Keep the day small enough to actually finish."
    },
    week: {
      title: "This Week",
      subtitle: "Shape the work before it becomes noise."
    },
    all: {
      title: "All Tasks",
      subtitle: "Review available Trello cards and pull the right ones forward."
    },
    focus: {
      title: "Focus",
      subtitle: "Stay with the active task."
    }
  };
  const current = copy[state.workspaceView] || copy.dashboard;

  elements.workspaceTitle.textContent = current.title;
  elements.workspaceSubtitle.textContent = current.subtitle;
}

function applyWorkspaceViewClass() {
  document.body.dataset.workspaceView = state.workspaceView;
}

function reconcileSelectedListFilters() {
  if (state.selectedListIds.size === 0) {
    return;
  }

  const activeListIds = new Set(state.tasks.map((task) => task.listId).filter(Boolean));

  for (const listId of [...state.selectedListIds]) {
    if (!activeListIds.has(listId)) {
      state.selectedListIds.delete(listId);
    }
  }
}

async function handleSidebarLink(link) {
  const workspaceView = link.dataset.workspace;

  if (!workspaceView) {
    return;
  }

  if (link.dataset.filter) {
    state.activeFilter = link.dataset.filter;
  }

  if (workspaceView === "focus") {
    await setViewMode("focus");
    return;
  }

  state.workspaceView = workspaceView;

  if (state.settings?.viewMode === "focus") {
    try {
      state.settings = await window.taskWidget.setViewMode("planning");
      syncSettingsUi();
    } catch (error) {
      setStatus(error.message, true);
      return;
    }
  }

  renderTasks();
  setStatus(`${getWorkspaceViewLabel(workspaceView)} view.`);
}

function reconcileFocusWithTasks() {
  if (!state.focusTask) {
    reconcileNextSuggestionWithTasks();
    return;
  }

  const freshTask = state.tasks.find((task) => task.id === state.focusTask.id);
  if (freshTask) {
    state.focusTask = freshTask;
    reconcileNextSuggestionWithTasks();
    return;
  }

  if (!state.timer.isRunning) {
    state.focusTask = null;
  }

  reconcileNextSuggestionWithTasks();
}

function reconcileNextSuggestionWithTasks() {
  if (!state.nextSuggestion) {
    return;
  }

  state.nextSuggestion = state.tasks.find((task) => task.id === state.nextSuggestion.id) || null;
}

function getQueueIds(queueName) {
  return state.settings?.queues?.[queueName] || [];
}

function isQueued(queueName, cardId) {
  return getQueueIds(queueName).includes(cardId);
}

function getTaskById(cardId) {
  return state.tasks.find((task) => task.id === cardId) || null;
}

function getQueuedTasks(queueName) {
  return getQueueIds(queueName).map(getTaskById).filter(Boolean);
}

function getVisibleQueuedTasks(queueName) {
  return applySelectedListFilter(getQueuedTasks(queueName));
}

function renderQueues() {
  renderQueue("today", elements.todayQueueList, elements.todayQueueEmpty, elements.todayQueueCount);
  renderQueue("week", elements.weekQueueList, elements.weekQueueEmpty, elements.weekQueueCount);
}

function renderQueue(queueName, listElement, emptyElement, countElement) {
  const tasks = getVisibleQueuedTasks(queueName);
  listElement.innerHTML = "";
  listElement.ondragover = (event) => handleQueueListDragOver(event, queueName, listElement);
  listElement.ondragleave = (event) => handleQueueListDragLeave(event, listElement);
  listElement.ondrop = (event) => handleQueueListDrop(event, queueName, listElement);
  emptyElement.classList.toggle("hidden", tasks.length > 0);
  countElement.textContent = String(tasks.length);

  for (const task of tasks) {
    listElement.append(renderQueueCard(queueName, task));
  }
}

function renderQueueCard(queueName, task) {
  const item = document.createElement("article");
  item.className = "task-item queue-card";
  item.draggable = true;
  item.classList.toggle("active-focus", task.id === state.focusTask?.id);
  item.addEventListener("dragstart", (event) =>
    handleQueueDragStart(event, queueName, task.id, item)
  );
  item.addEventListener("dragover", (event) =>
    handleQueueDragOver(event, queueName, task.id, item)
  );
  item.addEventListener("dragleave", () => clearQueueDropClasses(item));
  item.addEventListener("drop", (event) => handleQueueDrop(event, queueName, task.id, item));
  item.addEventListener("dragend", clearQueueDragState);

  const title = document.createElement("h3");
  title.textContent = task.name;

  const meta = document.createElement("div");
  meta.className = "task-meta";
  renderMeta(meta, task);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.addEventListener("mousedown", (event) => event.stopPropagation());

  const focusButton = createActionButton(
    task.id === state.focusTask?.id ? "Focused" : "Focus",
    "secondary-button",
    () => setFocusTask(task)
  );
  focusButton.disabled = state.timer.isRunning || state.timer.elapsedMs > 0;

  const openButton = createActionButton("Open", "secondary-button", () => openTask(task.url));
  const removeButton = createActionButton("Remove", "secondary-button", () =>
    removeQueuedTask(queueName, task.id)
  );
  const queueButtons =
    queueName === "week"
      ? [
          createActionButton("Move to Today", "secondary-button", () =>
            moveQueuedTaskToToday(task.id)
          )
        ]
      : [];

  actions.append(...queueButtons, focusButton, openButton, removeButton);
  item.append(title, meta, actions);
  return item;
}

function handleQueueDragStart(event, queueName, cardId, item) {
  if (event.target instanceof Element && event.target.closest("button")) {
    event.preventDefault();
    return;
  }

  state.queueDrag = { queueName, cardId };
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", cardId);
  window.requestAnimationFrame(() => item.classList.add("dragging"));
}

function handleQueueDragOver(event, queueName, targetCardId, item) {
  if (!canDropQueuedTask(queueName, targetCardId)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = "move";
  const placement = getQueueDropPlacement(event, item);
  item.classList.toggle("drag-over-before", placement === "before");
  item.classList.toggle("drag-over-after", placement === "after");
}

function handleQueueDrop(event, queueName, targetCardId, item) {
  if (!canDropQueuedTask(queueName, targetCardId)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const placement = getQueueDropPlacement(event, item);
  clearQueueDropClasses(item);
  reorderQueuedTask(queueName, state.queueDrag.cardId, targetCardId, placement);
}

function handleQueueListDragOver(event, queueName, listElement) {
  if (!canDropQueuedTask(queueName)) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  listElement.classList.add("drag-ready");
}

function handleQueueListDragLeave(event, listElement) {
  if (!listElement.contains(event.relatedTarget)) {
    listElement.classList.remove("drag-ready");
  }
}

function handleQueueListDrop(event, queueName, listElement) {
  if (!canDropQueuedTask(queueName)) {
    return;
  }

  if (event.target instanceof Element && event.target.closest(".queue-card")) {
    return;
  }

  event.preventDefault();
  listElement.classList.remove("drag-ready");
  reorderQueuedTask(queueName, state.queueDrag.cardId);
}

function canDropQueuedTask(queueName, targetCardId = null) {
  return Boolean(
    state.queueDrag.cardId &&
      state.queueDrag.queueName === queueName &&
      state.queueDrag.cardId !== targetCardId
  );
}

function getQueueDropPlacement(event, item) {
  const rect = item.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2 ? "after" : "before";
}

function clearQueueDropClasses(item) {
  item.classList.remove("drag-over-before", "drag-over-after");
}

function clearQueueDragState() {
  state.queueDrag = {
    queueName: null,
    cardId: null
  };

  for (const element of document.querySelectorAll(
    ".queue-card.dragging, .queue-card.drag-over-before, .queue-card.drag-over-after"
  )) {
    element.classList.remove("dragging", "drag-over-before", "drag-over-after");
  }

  for (const element of document.querySelectorAll(".queue-list.drag-ready")) {
    element.classList.remove("drag-ready");
  }
}

async function reorderQueuedTask(queueName, draggedCardId, targetCardId = null, placement = "after") {
  const currentIds = getQueueIds(queueName);

  if (!currentIds.includes(draggedCardId)) {
    return;
  }

  const nextIds = currentIds.filter((id) => id !== draggedCardId);
  let insertAt = nextIds.length;

  if (targetCardId) {
    const targetIndex = nextIds.indexOf(targetCardId);
    if (targetIndex === -1) {
      return;
    }

    insertAt = placement === "after" ? targetIndex + 1 : targetIndex;
  }

  nextIds.splice(insertAt, 0, draggedCardId);

  if (currentIds.length === nextIds.length && currentIds.every((id, index) => id === nextIds[index])) {
    return;
  }

  try {
    state.settings = await window.taskWidget.reorderQueue(queueName, nextIds);
    renderTasks();
    setStatus(`${getQueueLabel(queueName)} reordered.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

function getQueueLabel(queueName) {
  return queueName === "today" ? "Today Queue" : "This Week Queue";
}

function renderSidebar() {
  const todayCount = getVisibleQueuedTasks("today").length;
  const weekCount = getVisibleQueuedTasks("week").length;
  const allTasksCount = getVisibleAvailableTasks().length;

  elements.sidebarTodayCount.textContent = String(todayCount);
  elements.sidebarWeekCount.textContent = String(weekCount);
  elements.sidebarAllTasksCount.textContent = String(allTasksCount);

  for (const link of elements.sidebarLinks) {
    link.classList.toggle("active", link.dataset.workspace === state.workspaceView);
  }

  renderListFilters();
}

function getWorkspaceViewLabel(workspaceView) {
  if (workspaceView === "today") {
    return "Today";
  }

  if (workspaceView === "week") {
    return "This Week";
  }

  if (workspaceView === "all") {
    return "All Tasks";
  }

  if (workspaceView === "dashboard") {
    return "Home";
  }

  return "Focus";
}

function renderListFilters() {
  elements.sidebarListFilter.innerHTML = "";
  elements.clearListFiltersButton.classList.toggle("hidden", state.selectedListIds.size === 0);

  const lists = getSidebarLists();
  for (const [index, list] of lists.entries()) {
    const item = document.createElement("button");
    item.className = `list-filter-item list-color-${(index % 5) + 1}`;
    item.type = "button";
    item.setAttribute("aria-pressed", String(state.selectedListIds.has(list.id)));
    item.classList.toggle("active", state.selectedListIds.has(list.id));
    item.addEventListener("click", () => toggleListFilter(list.id, list.name));

    const name = document.createElement("span");
    name.className = "list-filter-name";
    name.textContent = list.name;

    const count = document.createElement("span");
    count.className = "list-filter-count";
    count.textContent = String(list.count);

    item.append(name, count);
    elements.sidebarListFilter.append(item);
  }

  if (lists.length === 0) {
    const empty = document.createElement("div");
    empty.className = "list-filter-empty";
    empty.textContent = "No lists yet";
    elements.sidebarListFilter.append(empty);
  }
}

function getSidebarLists() {
  const listsById = new Map();

  for (const task of state.tasks) {
    if (!task.listId || !task.listName) {
      continue;
    }

    const current = listsById.get(task.listId);
    if (current) {
      current.count += 1;
    } else {
      listsById.set(task.listId, {
        id: task.listId,
        name: task.listName,
        count: 1
      });
    }
  }

  return [...listsById.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function toggleListFilter(listId, listName) {
  if (state.selectedListIds.has(listId)) {
    state.selectedListIds.delete(listId);
  } else {
    state.selectedListIds.add(listId);
  }

  renderTasks();
  setStatus(
    state.selectedListIds.has(listId)
      ? `Filtering to ${listName}.`
      : `${listName} filter removed.`
  );
}

function clearListFilters() {
  if (state.selectedListIds.size === 0) {
    return;
  }

  state.selectedListIds.clear();
  renderTasks();
  setStatus("Showing all lists.");
}

function getTaskListTitle() {
  if (state.activeFilter === "due-soon") {
    return "Due Soon";
  }

  if (state.activeFilter === "overdue") {
    return "Overdue";
  }

  if (state.activeFilter === "none") {
    return "No Due Date";
  }

  return "All Tasks";
}

function createActionButton(label, className, onClick) {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

async function toggleQueuedTask(queueName, cardId) {
  const queueLabel = queueName === "today" ? "Today Queue" : "This Week Queue";

  try {
    state.settings = isQueued(queueName, cardId)
      ? await window.taskWidget.removeFromQueue(queueName, cardId)
      : await window.taskWidget.addToQueue(queueName, cardId);
    renderTasks();
    setStatus(`${isQueued(queueName, cardId) ? "Added to" : "Removed from"} ${queueLabel}.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function removeQueuedTask(queueName, cardId) {
  try {
    state.settings = await window.taskWidget.removeFromQueue(queueName, cardId);
    renderTasks();
    setStatus(`Removed from ${getQueueLabel(queueName)}.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function moveQueuedTaskToToday(cardId) {
  try {
    state.settings = await window.taskWidget.moveBetweenQueues("week", "today", cardId);
    renderTasks();
    setStatus("Moved to Today Queue.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function setNextSuggestionFromToday(excludedCardId) {
  const nextTask =
    getQueuedTasks("today").find((task) => task.id !== excludedCardId && task.id !== state.focusTask?.id) ||
    null;

  state.nextSuggestion = nextTask;
}

async function acceptNextSuggestion() {
  if (!state.nextSuggestion) {
    return;
  }

  await setFocusTask(state.nextSuggestion);
}

function dismissNextSuggestion() {
  state.nextSuggestion = null;
  renderFocus(state.focusTask);
  setStatus("Next task dismissed.");
}

async function setFocusTask(task) {
  if (state.timer.isRunning || state.timer.elapsedMs > 0) {
    setStatus("Save the current timer before changing focus.", true);
    return;
  }

  if (state.focusTask?.id && state.focusTask.id !== task.id) {
    setLoading(true);
    setStatus("Ending previous focus...");

    try {
      await syncFocusNoteToTrello(state.focusTask);
    } catch (error) {
      setStatus(error.message, true);
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  state.focusTask = task;
  state.nextSuggestion = null;
  resetTimer();
  renderTasks();
  setStatus(`Focused: ${task.name}`);
}

async function clearFocus() {
  if (state.timer.isRunning || state.timer.elapsedMs > 0) {
    setStatus("Save the current timer before clearing focus.", true);
    return;
  }

  if (!state.focusTask) {
    return;
  }

  const focusTask = state.focusTask;
  setLoading(true);
  setStatus("Clearing focus...");

  try {
    await syncFocusNoteToTrello(focusTask);
  } catch (error) {
    setStatus(error.message, true);
    setLoading(false);
    return;
  }

  const clearedTaskId = state.focusTask?.id;
  state.focusTask = null;
  resetTimer();
  setNextSuggestionFromToday(clearedTaskId);
  renderTasks();
  setStatus("Focus cleared.");
  setLoading(false);
}

async function startFocusTimer() {
  if (!state.focusTask || state.timer.isRunning) {
    return;
  }

  if (state.settings?.viewMode !== "focus") {
    const enteredFocusMode = await setViewMode("focus", false);
    if (!enteredFocusMode) {
      return;
    }
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
  elements.startTimerButton.textContent = hasElapsed && !state.timer.isRunning ? "Resume Focus" : "Start Focus";
  elements.stopTimerButton.disabled = !state.timer.isRunning && !hasElapsed;
  elements.stopTimerButton.textContent = state.timer.isRunning ? "Stop & Save" : "Save Elapsed";
  elements.clearFocusButton.disabled = state.timer.isRunning || hasElapsed;
  elements.completeFocusButton.disabled = state.timer.isRunning || hasElapsed;
}

function getFilteredTasks() {
  const tasks = getVisibleAvailableTasks();

  if (state.activeFilter === "all") {
    return tasks;
  }

  if (state.activeFilter === "due-soon") {
    return tasks.filter(isDueSoon);
  }

  if (state.activeFilter === "overdue") {
    return tasks.filter((task) => task.status === "overdue");
  }

  return tasks.filter((task) => !task.due);
}

function getVisibleAvailableTasks() {
  return applySelectedListFilter(getAvailableTasks());
}

function getAvailableTasks() {
  const plannedTaskIds = new Set([
    ...getQueueIds("today"),
    ...getQueueIds("week"),
    ...(state.focusTask?.id ? [state.focusTask.id] : [])
  ]);

  return state.tasks.filter((task) => !plannedTaskIds.has(task.id));
}

function applySelectedListFilter(tasks) {
  if (state.selectedListIds.size === 0) {
    return tasks;
  }

  return tasks.filter((task) => state.selectedListIds.has(task.listId));
}

function isDueSoon(task) {
  if (!task.due) {
    return false;
  }

  const dueDate = new Date(task.due);
  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const now = new Date();
  const dueSoonLimit = new Date(now);
  dueSoonLimit.setDate(now.getDate() + DUE_SOON_DAYS);

  return dueDate >= now && dueDate <= dueSoonLimit;
}

function renderFocus(task) {
  elements.focusEmpty.classList.toggle("hidden", Boolean(task));
  elements.focusActive.classList.toggle("hidden", !task);
  elements.focusHeaderOpenButton.disabled = !task?.url;
  renderFocusNotes(task);

  if (!task) {
    renderNextSuggestion();
    updateTimerDisplay();
    return;
  }

  elements.nextSuggestion.classList.add("hidden");
  elements.focusTitle.textContent = task.name;
  renderMeta(elements.focusMeta, task);
  elements.focusTimeTotal.textContent =
    task.timeSpentMins === null ? "Time spent: field not found" : `Time spent: ${task.timeSpentMins} mins`;
  updateTimerDisplay();
}

function renderNextSuggestion() {
  const task = state.nextSuggestion;
  elements.nextSuggestion.classList.toggle("hidden", !task);

  if (!task) {
    return;
  }

  elements.nextSuggestionTitle.textContent = task.name;
  renderMeta(elements.nextSuggestionMeta, task);
}

function renderFocusNotes(task) {
  if (!elements.focusNotesInput || !elements.focusNotesCount) {
    return;
  }

  elements.focusNotesInput.disabled = !task;
  for (const button of elements.focusNoteFormatButtons) {
    button.disabled = !task;
  }

  elements.focusNotesInput.value = task ? getFocusNote(task.id) : "";
  elements.focusNotesInput.placeholder = task
    ? "e.g. Things to look into, blockers, ideas..."
    : "Choose a focus task to start notes...";
  updateFocusNotesCount();
}

function applyNoteFormat(format) {
  const input = elements.focusNotesInput;
  if (!state.focusTask || !input || input.disabled) {
    return;
  }

  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const selectedText = input.value.slice(start, end);
  const formatted = getFormattedNoteText(format, selectedText);

  if (!formatted) {
    return;
  }

  const nextValue = `${input.value.slice(0, start)}${formatted.text}${input.value.slice(end)}`;
  if (nextValue.length > FOCUS_NOTES_MAX_LENGTH) {
    setStatus("Focus note is already at the character limit.", true);
    return;
  }

  input.value = nextValue;
  input.focus();
  input.setSelectionRange(start + formatted.selectionStart, start + formatted.selectionEnd);
  handleFocusNotesInput();
}

function getFormattedNoteText(format, selectedText) {
  if (format === "bold") {
    const text = selectedText || "bold text";
    return {
      text: `**${text}**`,
      selectionStart: 2,
      selectionEnd: 2 + text.length
    };
  }

  if (format === "italic") {
    const text = selectedText || "italic text";
    return {
      text: `*${text}*`,
      selectionStart: 1,
      selectionEnd: 1 + text.length
    };
  }

  if (format === "list") {
    if (!selectedText) {
      return {
        text: "- List item",
        selectionStart: 2,
        selectionEnd: 11
      };
    }

    const text = selectedText
      .split(/\r?\n/)
      .map((line) => (line.startsWith("- ") ? line : `- ${line}`))
      .join("\n");

    return {
      text,
      selectionStart: 0,
      selectionEnd: text.length
    };
  }

  if (format === "link") {
    const text = selectedText || "link text";
    return {
      text: `[${text}](url)`,
      selectionStart: text.length + 3,
      selectionEnd: text.length + 6
    };
  }

  return null;
}

function handleFocusNotesInput() {
  if (!state.focusTask) {
    elements.focusNotesInput.value = "";
    updateFocusNotesCount();
    return;
  }

  const note = elements.focusNotesInput.value.slice(0, FOCUS_NOTES_MAX_LENGTH);
  if (note !== elements.focusNotesInput.value) {
    elements.focusNotesInput.value = note;
  }

  saveFocusNote(state.focusTask.id, note);
  updateFocusNotesCount();
}

function updateFocusNotesCount() {
  const length = elements.focusNotesInput?.value.length || 0;
  elements.focusNotesCount.textContent = `${length} / ${FOCUS_NOTES_MAX_LENGTH}`;
}

function getFocusNote(cardId) {
  return loadFocusNotes()[cardId] || "";
}

function saveFocusNote(cardId, note) {
  const notes = loadFocusNotes();
  const normalizedNote = String(note || "");

  if (normalizedNote) {
    notes[cardId] = normalizedNote;
  } else {
    delete notes[cardId];
  }

  try {
    window.localStorage.setItem(FOCUS_NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    setStatus("Could not save focus note locally.", true);
  }
}

function deleteFocusNote(cardId) {
  const notes = loadFocusNotes();
  delete notes[cardId];

  try {
    window.localStorage.setItem(FOCUS_NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    setStatus("Could not clear the local focus note.", true);
  }
}

async function syncFocusNoteToTrello(task) {
  if (!task?.id) {
    return false;
  }

  const note = getFocusNote(task.id).trim();
  if (!note) {
    return false;
  }

  setStatus("Saving focus note to Trello...");
  await window.taskWidget.addComment(task.id, note);
  deleteFocusNote(task.id);

  if (state.focusTask?.id === task.id) {
    elements.focusNotesInput.value = "";
    updateFocusNotesCount();
  }

  return true;
}

function loadFocusNotes() {
  try {
    const notes = JSON.parse(window.localStorage.getItem(FOCUS_NOTES_STORAGE_KEY) || "{}");
    return notes && typeof notes === "object" && !Array.isArray(notes) ? notes : {};
  } catch {
    return {};
  }
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

    const todayButton = createActionButton(
      isQueued("today", task.id) ? "Remove Today" : "Add Today",
      "secondary-button",
      () => toggleQueuedTask("today", task.id)
    );

    const weekButton = createActionButton(
      isQueued("week", task.id) ? "Remove Week" : "Add Week",
      "secondary-button",
      () => toggleQueuedTask("week", task.id)
    );

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

    actions.append(todayButton, weekButton, focusButton, completeButton, openButton);
    item.append(title, meta, actions);
    elements.taskList.append(item);
  }
}

function renderMeta(container, task) {
  container.innerHTML = "";
  container.append(createPill(task.listName, "list-pill"));

  if (task.due) {
    container.append(createPill(formatDue(task), `due-pill ${task.status}`));
  } else {
    container.append(createPill("No due date", "no-date-pill"));
  }

  if (task.timeSpentMins !== null) {
    container.append(createPill(`${task.timeSpentMins} mins tracked`, "time-pill"));
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

  const completingFocusTask = cardId === state.focusTask?.id;

  if (completingFocusTask && (state.timer.isRunning || state.timer.elapsedMs > 0)) {
    setStatus("Save the current timer before completing this task.", true);
    return;
  }

  setLoading(true);
  setStatus(completingFocusTask ? "Completing focus..." : "Marking complete...");

  try {
    if (completingFocusTask) {
      await syncFocusNoteToTrello(state.focusTask);
      setStatus("Marking complete...");
    }

    const result = await window.taskWidget.completeCard(cardId);
    if (result?.settings) {
      state.settings = result.settings;
    }
    state.tasks = state.tasks.filter((task) => task.id !== cardId);
    if (completingFocusTask) {
      state.focusTask = null;
      resetTimer();
      setNextSuggestionFromToday(cardId);
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
