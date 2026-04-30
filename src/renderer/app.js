const state = {
  settings: null,
  tasks: [],
  activeFilter: "all",
  workspaceView: "dashboard",
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
  todayQueueCount: document.querySelector("#todayQueueCount"),
  todayQueueEmpty: document.querySelector("#todayQueueEmpty"),
  todayQueueList: document.querySelector("#todayQueueList"),
  weekQueueCount: document.querySelector("#weekQueueCount"),
  weekQueueEmpty: document.querySelector("#weekQueueEmpty"),
  weekQueueList: document.querySelector("#weekQueueList"),
  sidebarTodayCount: document.querySelector("#sidebarTodayCount"),
  sidebarWeekCount: document.querySelector("#sidebarWeekCount"),
  sidebarAllTasksCount: document.querySelector("#sidebarAllTasksCount"),
  sidebarProjectList: document.querySelector("#sidebarProjectList"),
  sidebarLinks: [...document.querySelectorAll(".sidebar-link")],
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
  elements.acceptNextButton.addEventListener("click", acceptNextSuggestion);
  elements.dismissNextButton.addEventListener("click", dismissNextSuggestion);

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

  for (const button of elements.filterButtons) {
    button.classList.toggle("active", button.dataset.filter === state.activeFilter);
  }

  reconcileFocusWithTasks();
  const tasks = getFilteredTasks();

  renderFocus(state.focusTask);
  renderQueues();
  renderTaskList(tasks);
  renderSidebar();

  elements.taskCount.textContent = String(tasks.length);
  elements.taskListTitle.textContent = getTaskListTitle();
  elements.emptyState.classList.toggle("hidden", tasks.length > 0);
  elements.boardName.textContent = state.settings?.boardName || "";
}

function applyWorkspaceViewClass() {
  document.body.dataset.workspaceView = state.workspaceView;
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

function renderQueues() {
  renderQueue("today", elements.todayQueueList, elements.todayQueueEmpty, elements.todayQueueCount);
  renderQueue("week", elements.weekQueueList, elements.weekQueueEmpty, elements.weekQueueCount);
}

function renderQueue(queueName, listElement, emptyElement, countElement) {
  const tasks = getQueuedTasks(queueName);
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
  const todayCount = getQueuedTasks("today").length;
  const weekCount = getQueuedTasks("week").length;
  const allTasksCount = getAvailableTasks().length;

  elements.sidebarTodayCount.textContent = String(todayCount);
  elements.sidebarWeekCount.textContent = String(weekCount);
  elements.sidebarAllTasksCount.textContent = String(allTasksCount);

  for (const link of elements.sidebarLinks) {
    link.classList.toggle("active", link.dataset.workspace === state.workspaceView);
  }

  renderProjectList();
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

  return "Focus";
}

function renderProjectList() {
  elements.sidebarProjectList.innerHTML = "";

  const projects = getSidebarProjects();
  for (const [index, project] of projects.entries()) {
    const item = document.createElement("div");
    item.className = `project-item project-color-${(index % 5) + 1}`;
    item.textContent = project;
    elements.sidebarProjectList.append(item);
  }

  if (projects.length === 0) {
    const empty = document.createElement("div");
    empty.className = "project-item project-empty";
    empty.textContent = "No projects yet";
    elements.sidebarProjectList.append(empty);
  }
}

function getSidebarProjects() {
  const names = new Set();

  for (const task of state.tasks) {
    if (task.listName) {
      names.add(task.listName);
    }

    for (const label of task.labels || []) {
      names.add(label.name);
    }
  }

  return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b)).slice(0, 7);
}

function getTaskListTitle() {
  if (state.activeFilter === "due") {
    return "Due";
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

function acceptNextSuggestion() {
  if (!state.nextSuggestion) {
    return;
  }

  setFocusTask(state.nextSuggestion);
}

function dismissNextSuggestion() {
  state.nextSuggestion = null;
  renderFocus(state.focusTask);
  setStatus("Next task dismissed.");
}

function setFocusTask(task) {
  if (state.timer.isRunning || state.timer.elapsedMs > 0) {
    setStatus("Save the current timer before changing focus.", true);
    return;
  }

  state.focusTask = task;
  state.nextSuggestion = null;
  resetTimer();
  renderTasks();
  setStatus(`Focused: ${task.name}`);
}

function clearFocus() {
  if (state.timer.isRunning || state.timer.elapsedMs > 0) {
    setStatus("Save the current timer before clearing focus.", true);
    return;
  }

  const clearedTaskId = state.focusTask?.id;
  state.focusTask = null;
  resetTimer();
  setNextSuggestionFromToday(clearedTaskId);
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
  elements.startTimerButton.textContent = hasElapsed && !state.timer.isRunning ? "Resume Focus" : "Start Focus";
  elements.stopTimerButton.disabled = !state.timer.isRunning && !hasElapsed;
  elements.stopTimerButton.textContent = state.timer.isRunning ? "Stop & Save" : "Save Elapsed";
  elements.clearFocusButton.disabled = state.timer.isRunning || hasElapsed;
  elements.completeFocusButton.disabled = state.timer.isRunning || hasElapsed;
}

function getFilteredTasks() {
  const tasks = getAvailableTasks();

  if (state.activeFilter === "all") {
    return tasks;
  }

  if (state.activeFilter === "due") {
    return tasks.filter((task) => task.due);
  }

  if (state.activeFilter === "overdue") {
    return tasks.filter((task) => task.status === "overdue");
  }

  return tasks.filter((task) => !task.due);
}

function getAvailableTasks() {
  const plannedTaskIds = new Set([
    ...getQueueIds("today"),
    ...getQueueIds("week"),
    ...(state.focusTask?.id ? [state.focusTask.id] : [])
  ]);

  return state.tasks.filter((task) => !plannedTaskIds.has(task.id));
}

function renderFocus(task) {
  elements.focusEmpty.classList.toggle("hidden", Boolean(task));
  elements.focusActive.classList.toggle("hidden", !task);

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

  if (cardId === state.focusTask?.id && (state.timer.isRunning || state.timer.elapsedMs > 0)) {
    setStatus("Save the current timer before completing this task.", true);
    return;
  }

  setLoading(true);
  setStatus("Marking complete...");

  try {
    const result = await window.taskWidget.completeCard(cardId);
    if (result?.settings) {
      state.settings = result.settings;
    }
    state.tasks = state.tasks.filter((task) => task.id !== cardId);
    if (state.focusTask?.id === cardId) {
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
