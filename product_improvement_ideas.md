# Product Improvement Ideas

## Purpose

This backlog captures ideas for evolving the Trello Focus Widget into a planning, organizing, and focus assistant. The goal is to reduce context switching and context drift by helping the user decide what to work on, stay with the chosen task, and quickly recover after interruptions.

## Product Principles

- Keep Focus Mode quiet, compact, and task-centered.
- Keep planning controls in Plan Mode.
- Use Trello as the source of truth for task data.
- Prefer local-only personal planning state when the feature is about attention management.
- Make all Trello writes deliberate and visible.

## Implemented

### Today Queue

- User can add tasks to a local Today Queue.
- Queue membership does not affect Trello.
- Today Queue is manually ordered.
- Queue order persists locally.
- Today Queue can suggest the next task after focus is cleared or completed.

### This Week Queue

- User can add tasks to a local This Week Queue.
- This Week Queue is independent from Today Queue.
- A task can appear in Today, This Week, both, or neither.
- This Week tasks can be moved into Today.
- Queue order persists locally.

### Drag-And-Drop Queue Ordering

- Today and This Week queues support drag-and-drop reordering.
- Explicit up/down controls were removed in favor of direct manipulation.

### Focus Task Selection

- Current Focus starts empty.
- User chooses which task becomes the active focus.
- Focus cannot be changed while unsaved timer time exists.

### Focus Handoff

- When focus is cleared or completed, the widget suggests the next item from Today Queue.
- The suggestion is not automatically accepted.
- Empty Today Queue returns Focus Mode to an empty state gracefully.

### Time Tracking

- Focus timer supports open-ended count-up sessions.
- Clicking **Start Focus** enters Focus Mode automatically.
- Stopped sessions are saved to Trello custom field `Time Spent (mins)`.
- Timer UI uses JetBrains Mono with tabular numbers.

### Daily Time Summary

- Plan Mode sidebar shows total saved focus time for the current day.
- Plan Mode sidebar shows the number of distinct tasks worked on today.
- Summary is based on locally recorded timer sessions after Trello confirms the time save.

### Task Filtering

- Completed tasks are excluded.
- Template cards are excluded.
- Cards in `Done`, `Complete`, or `Completed` lists are hidden.
- All Tasks excludes anything already in Focus, Today, or This Week.

### Modern Dashboard Styling

- Plan Mode uses a modern dashboard layout with a left navigation pane.
- Sidebar items for Focus, Today, This Week, and All Tasks are actionable.
- Light and dark themes are supported.
- Typography has been tuned around Inter, Satoshi, and JetBrains Mono.

### Left-Rail Focus Mode

- Focus Mode uses a compact left-side rail.
- The Electron window anchors to the left edge of the active display.
- The rail shows the current task, timer, minimal actions, notes, and a dedicated **Exit Focus Mode** button.
- This replaces the older focus-mode toggle while in the focused view.

### Focus Notes Trello Comments

- Focus Mode includes a notes field for the active task.
- Notes are stored locally by Trello card ID while drafting.
- The **Bold**, **Italic**, **List**, and **Link** toolbar buttons insert Markdown-style formatting.
- Notes are written into the Trello card comments/activity section when focus is cleared, completed, or replaced.
- If the Trello comment write fails, local notes should remain available instead of being discarded.

## Planned

### Window Close Behavior

- Clicking the native window **X** should quit the application.
- Hide/minimize behavior should remain available only through explicit taskbar or tray actions.
- Tray quit should continue to exit the app cleanly.

### Light Mode Styling Pass

- Improve light mode legibility across the dashboard and Focus Mode.
- Replace remaining dark-mode surfaces or low-contrast text that appear in light mode.
- Tune light-mode colors for task cards, metadata pills, buttons, borders, and sidebar states.

### Task Cleanup

- Identify tasks that need attention before they can be planned or focused.
- Useful cleanup signals:
  - Missing due date.
  - Overdue.
  - Missing labels.
  - Missing owner.
  - Missing status metadata.
  - Missing estimate.

### Pomodoro Presets

- Add countdown options alongside the current stopwatch.
- Candidate presets:
  - 25 minute focus session.
  - 50 minute focus session.
  - Custom countdown duration.
- Preserve the current open-ended stopwatch mode.

### Status Adjuster

- Let the user change task status from inside the widget.
- Possible mappings:
  - Trello list moves.
  - Trello labels.
  - Trello custom fields.
- Candidate statuses:
  - Not started.
  - In progress.
  - Waiting.
  - Blocked.
  - Done.

### Quick Add For New Tasks

- Let the user create a new Trello card from the widget.
- Use a configured template to keep new cards consistent.
- Keep quick capture available without forcing the user into Trello.

### Checklist / Definition Of Done

- Show Trello checklist progress in the widget.
- In Focus Mode, show a compact checklist or definition-of-done area.

### Estimate Vs. Time Spent

- Add support for an `Estimate (mins)` custom field.
- Compare estimate against `Time Spent (mins)`.
- Highlight tasks that are running long or may need replanning.

### Distraction Parking Lot

- Provide a fast local capture field for thoughts or new work that appears during focus.
- Review parked items later in Plan Mode.
- Optionally convert parked items into Trello cards.

### End-Of-Day Review

- Summarize:
  - Tasks completed.
  - Focus time.
  - Distinct tasks worked.
  - Tasks carried forward.
  - Captured distractions or quick-add tasks.

## Suggested Build Order From Here

1. Make native window **X** quit the app instead of minimizing or hiding it.
2. Fix light mode styling and legibility.
3. Add Task Cleanup panel.
4. Add Pomodoro presets.
5. Add Status Adjuster.
6. Add Quick Add.
