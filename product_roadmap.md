# Trello Focus Widget Product Roadmap

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
- Native window close quits the application.
- Hide/minimize behavior remains available through explicit app actions.

### Trello Task Display

- Fetches cards from the configured Trello board through the main process.
- Shows open, incomplete cards.
- Excludes completed cards and template cards.
- Hides cards in `Done`, `Complete`, or `Completed` lists.
- Sorts overdue cards first, then upcoming due cards, then no-date cards.
- Supports filters for all, due soon, overdue, and no due date.
- Opens Trello cards in the browser.

### Focus Task And Timer

- Current Focus starts empty.
- User explicitly selects a task to focus.
- Timer runs as an open-ended count-up session.
- Clicking **Start Focus** enters Focus Mode and begins the session.
- Stopped timer sessions write minutes to Trello custom field `Time Spent (mins)`.
- Saved timer sessions are recorded locally for the Plan Mode Daily Summary.
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
- Added dedicated light-mode styling for dashboard surfaces, task cards, controls, sidebar states, and Focus Mode.

### Planning Navigation And Filters

- Added Home navigation that returns to the full planning dashboard.
- Removed the redundant overflow hide button from the top app controls.
- Renamed the sidebar Projects area to Lists.
- Made Lists selectable as local multi-select filters for the planning panes.
- Replaced the broad Due filter with Due Soon for tasks due within the next 3 days.
- The left sidebar remains fixed while the planning workspace scrolls.
- The Lists section scrolls independently when there are many Trello lists.

### Daily Time Summary

- Plan Mode sidebar shows total focus time for the current day.
- Plan Mode sidebar shows the number of distinct tasks worked on today.
- Plan Mode sidebar shows the number of tasks completed today.
- Summary updates live while a focus timer is running.
- Saved sessions are recorded locally after Trello confirms the time save.
- Completed tasks are recorded locally after Trello confirms completion.

### Focus Notes Trello Comments

- Focus notes are editable in Focus Mode and stored locally while drafting.
- The **Bold**, **Italic**, **List**, and **Link** note toolbar controls insert Markdown-style formatting.
- When focus is cleared, completed, or replaced, non-empty notes are posted to the Trello card comments/activity section.
- Local notes are cleared only after Trello confirms the comment write.
- If the Trello comment write fails, the local note stays available and focus is not ended.

## Focus Mode Direction

Focus Mode uses a compact left-side rail:

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

Notes are stored by Trello card ID in browser `localStorage` while drafting. When focus is cleared, completed, or replaced, the note is written to Trello as a card comment and then cleared locally after Trello confirms the write.

## Trello Behavior

- Trello is the source of truth for cards.
- Board scope is the selected board only.
- Completion action updates `dueComplete=true`.
- Focus notes are written to Trello as card comments when focus ends.
- Time tracking writes to a number custom field named `Time Spent (mins)`.
- Queue membership, queue order, draft focus notes, theme, and view mode are local widget state.
- The widget should make Trello writes deliberate and visible.

## Roadmap Backlog

1. **Task Cleanup panel:** identify cards with missing due dates, missing labels, overdue state, or other planning gaps.
2. **Pomodoro presets:** add countdown sessions alongside the existing stopwatch.
3. **Status Adjuster:** update task status from the widget, likely through list moves, labels, or custom fields.
4. **Quick Add:** create a new Trello card from a configured template.
5. **Checklist / Definition Of Done:** show checklist progress in Focus Mode.

## Validation Plan

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
- Verify Plan Mode keeps the sidebar fixed while only the workspace scrolls.
- Verify the Lists section scrolls independently above the Daily Summary when many lists are present.
- Verify running and saving focus time update Daily Summary total time and distinct task count.
- Verify completing tasks updates the Daily Summary completed-task count for the current day.
- Verify light mode keeps dashboard, task cards, controls, sidebar, and Focus Mode surfaces legible.
- Verify focus note toolbar buttons format selected text or insert Markdown-style scaffolds.
- Verify clearing, completing, or replacing focus writes non-empty notes to Trello comments.
- Verify local focus notes are cleared only after Trello confirms the comment write.
- Verify local focus notes remain available if the Trello comment write fails.
- Verify clicking the native window **X** quits the app instead of minimizing or hiding it.

## Assumptions

- v1 targets Windows desktop behavior first.
- The selected Trello board contains the tasks to show.
- Existing Trello automation reacts to `dueComplete=true`.
- Local queue and focus note state are personal to this widget installation.
- General Trello editing, checklist editing, and multi-board aggregation remain future work.
