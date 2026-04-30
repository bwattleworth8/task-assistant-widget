# Trello Focus Widget Plan

## Product Goal

Build a local Windows desktop widget that helps plan, organize, and focus on Trello tasks without constantly opening Trello. The widget should make it easy to choose what matters now, stay with the current task, and move back into planning only when needed.

## Current Architecture

- **Electron main process:** owns the desktop window, tray, always-on-top state, view-mode sizing, settings persistence, and Trello API calls.
- **Preload bridge:** exposes a narrow `window.taskWidget` API to the renderer.
- **Renderer UI:** handles planning views, focus views, queues, filters, timer interactions, and local notes.
- **Settings store:** persists local app settings in Electron user data, including queue state, selected board, theme, view mode, window bounds, and credentials.
- **Trello client:** fetches board cards, marks cards complete, and updates `Time Spent (mins)`.

## Implemented Milestones

### Initial Electron Widget

- Created the Electron app scaffold.
- Added setup/settings flow for Trello API key, token, board fetch, and board selection.
- Added encrypted local credential storage when Electron `safeStorage` is available.
- Added tray actions for show, refresh, settings, mode switching, always-on-top, theme, and quit.
- Added hide-to-taskbar behavior.

### Trello Task Display

- Fetches cards from the configured Trello board through the main process.
- Shows open, incomplete cards.
- Excludes completed cards and template cards.
- Hides cards in `Done`, `Complete`, or `Completed` lists.
- Sorts overdue cards first, then upcoming due cards, then no-date cards.
- Supports filters for all, due, overdue, and no due date.
- Opens Trello cards in the browser.

### Focus Task And Timer

- Current Focus starts empty.
- User explicitly selects a task to focus.
- Timer runs as an open-ended count-up session.
- Stopped timer sessions write minutes to Trello custom field `Time Spent (mins)`.
- Focus task can be opened, cleared, or completed.
- Completing a task sets Trello `dueComplete=true`.

### Local Planning Queues

- Added local-only Today Queue and This Week Queue.
- Queue membership is stored locally by Trello card ID and does not modify Trello.
- A task can be in Today, This Week, both, or neither.
- Queues are manually ordered with drag and drop.
- This Week cards can be promoted to Today.
- Completed cards are removed from local queues after Trello confirms completion.
- Stale queue IDs are pruned only after a successful Trello refresh.
- Clearing or completing focus suggests the next Today Queue task without auto-focusing it.

### Stylistic Overhaul

- Reworked the app into a modern dark dashboard layout.
- Added a left navigation pane for Focus, Today, This Week, and All Tasks.
- Added actionable sidebar sections:
  - Focus enters Focus Mode.
  - Today shows only Today Queue.
  - This Week shows only This Week Queue.
  - All Tasks shows the general filtered task list.
- Updated typography:
  - Primary UI: Inter.
  - Headings/accent: Satoshi.
  - Timer: JetBrains Mono with tabular numbers.
- Added light/dark theme support.

## Current Focus Mode Direction

Focus Mode is being refined into a compact left-side rail:

- The Electron window anchors to the left edge of the active display.
- Planning dashboard, sidebar, filters, and queue sections are hidden.
- The focus rail shows only:
  - App identity.
  - Focus Mode label.
  - Current task.
  - Timer controls.
  - Complete/Open/Clear Focus controls.
  - Local notes for the active task.
  - A dedicated **Exit Focus Mode** button.

Notes are local-only in this milestone. They are stored by Trello card ID in browser `localStorage`. Writing notes back to Trello is intentionally deferred.

## Trello Behavior

- Trello is the source of truth for cards.
- Board scope is the selected board only.
- Completion action updates `dueComplete=true`.
- Time tracking writes to a number custom field named `Time Spent (mins)`.
- Queue membership, queue order, focus notes, theme, and view mode are local widget state.
- The widget should make Trello writes deliberate and visible.

## Next Feature Candidates

1. **Focus notes Trello sync:** write local notes to the Trello card as a comment or append them to the description.
2. **Task Cleanup panel:** identify cards with missing due dates, missing labels, overdue state, or other planning gaps.
3. **Daily Time Summary:** show total focus time and distinct tasks worked today.
4. **Pomodoro presets:** add countdown sessions alongside the existing stopwatch.
5. **Status Adjuster:** update task status from the widget, likely through list moves, labels, or custom fields.
6. **Quick Add:** create a new Trello card from a configured template.
7. **Checklist / Definition Of Done:** show checklist progress in Focus Mode.

## Planning UI Follow-Up Notes

- **Remove overflow hide button:** remove the `...` button in the top-right app controls. It currently minimizes/hides the window, but this is redundant with the native window minimize control.
- **Add Home navigation:** add a **Home** item at the top of the left navigation with a sleek modern house icon. Home should return the user to the main dashboard view where Focus, Today, This Week, and All Tasks panes are all visible.
- **Rename Projects to Lists:** the current Projects section looks good visually, but it does not have a function yet. Rename it to **Lists** so it maps clearly to Trello lists.
- **Make Lists functional:** each item in the Lists section should be selectable with a checkbox-style active state. Selected lists should filter the panes on the right so only cards from those Trello lists are shown. Multiple selected lists should be allowed.
- **Clarify due filtering:** replace the current **Due** filter with **Due Soon**. Due Soon should include tasks with a due date in the next 3 days. Keep **All** and **Overdue** as currently understood.

## Test Plan

- Run `npm run check`.
- Verify setup rejects missing or invalid credentials.
- Verify board selection persists after restart.
- Verify completed and template cards are excluded.
- Verify Today and This Week queues persist after restart.
- Verify queue drag-and-drop order persists.
- Verify queue actions do not call Trello write APIs.
- Verify the same task can appear in Today and This Week.
- Verify completed cards are removed from queues after Trello confirms completion.
- Verify stale queue IDs are pruned only after successful refresh.
- Verify clearing/completing focus shows the next Today Queue suggestion without auto-focusing it.
- Verify Focus Mode anchors to the left side and can exit back to full Plan Mode.
- Verify local focus notes persist per task and do not write to Trello yet.

## Assumptions

- v1 targets Windows desktop behavior first.
- The selected Trello board contains the tasks to show.
- Existing Trello automation reacts to `dueComplete=true`.
- Local queue and focus note state are personal to this widget installation.
- Full Trello editing, comments, checklist editing, and multi-board aggregation remain future work.
