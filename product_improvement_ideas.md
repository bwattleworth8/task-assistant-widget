# Product Improvement Ideas

## Purpose

This backlog captures feature ideas for evolving the Trello Focus Widget into a planning, organizing, and focus assistant. The goal is to reduce context switching and context drift by helping the user decide what to work on, stay with the chosen task, and quickly return to the right task after interruptions.

## Current Direction

- **Plan Mode** should support task review, cleanup, queue building, and Trello task-management actions.
- **Focus Mode** should stay compact and non-invasive, showing only the current task, timer, and minimal next-step controls.
- Trello remains the source of truth for tasks, while the widget can keep lightweight personal planning state locally when that avoids changing the shared Trello board.

## Curated Improvement List

### Today Queue

- Let the user add tasks to work on today.
- Queue membership should not affect the actual Trello board.
- Tasks live inside the widget and naturally feed into Focus Mode as current focus tasks are finished or removed from focus.
- This queue should be manually ordered so the user can decide the intended work sequence.

### This Week Queue

- Similar to Today Queue, but for items to work on before the end of the week.
- Acts as a broader planning lane separate from Today Queue.
- This is manually curated rather than automatically calendar-filtered.

### Task Cleanup

- Identify tasks that need attention before they can be planned or focused.
- Useful cleanup signals:
  - Not completed.
  - Missing important fields.
  - Overdue.
  - No due date.
  - No assigned owner.
  - Missing labels/status metadata.

### Daily Time Summary

- Show total focus time for the current day.
- Show the number of distinct tasks worked on that day.
- Bring this summary into Focus Mode so the user can see daily effort without opening Trello.

### Pomodoro Presets

- Add preset countdown modes alongside the current stopwatch mode.
- Possible presets:
  - 25 minute focus session.
  - 50 minute focus session.
  - Custom countdown duration.
- Keep the current open-ended stopwatch mode for flexible work sessions.

### Status Adjuster

- Allow the user to change a task’s status from inside the widget as work progresses.
- This could map to Trello lists, labels, or custom fields depending on the board setup.
- Candidate statuses:
  - Not started.
  - In progress.
  - Waiting.
  - Blocked.
  - Done.

### Quick Add for New Tasks

- Let the user add a new Trello task from the widget.
- Use a configured task template so new cards have consistent structure.
- Avoid forcing the user to open Trello during a focus session just to capture a new task.

## Additional Ideas To Consider Later

### Focus Queue Handoff

- After finishing or clearing the current task, suggest the next Today Queue item.
- The user should explicitly accept the suggestion rather than the app auto-switching focus.

### Distraction Parking Lot

- Provide a fast capture field for thoughts or tasks that come up during focus.
- Captured items can become Trello cards later or remain local until reviewed.

### Estimate vs. Time Spent

- Add support for an `Estimate (mins)` custom field.
- Compare estimates against `Time Spent (mins)`.
- Highlight tasks that are running long or need replanning.

### Session Notes

- Let the user add a short note when stopping a timer.
- Optionally post the note to the Trello card as a comment along with the focused minutes.

### Checklist / Definition Of Done

- Show Trello checklist progress in the widget.
- In Focus Mode, show the checklist or a compact “definition of done” panel so the user knows what finished means.

### Context Tags

- Help batch work by context, such as:
  - Deep work.
  - Admin.
  - Reporting.
  - Meetings.
  - Waiting.
  - Quick wins.
- These could map to Trello labels or local-only metadata.

### End-Of-Day Review

- Summarize:
  - Tasks completed.
  - Focus time.
  - Distinct tasks worked.
  - Tasks carried forward.
  - Captured distractions or quick-add tasks.

## Suggested Build Order

1. **Queues:** Today Queue and This Week Queue.
2. **Focus Handoff:** Suggest next Today Queue item after clear/complete.
3. **Task Cleanup:** Add a cleanup panel for missing fields, overdue cards, and unassigned cards.
4. **Daily Time Summary:** Show focus time and distinct task count for the day.
5. **Pomodoro Presets:** Add countdown modes.
6. **Status Adjuster:** Add controlled Trello status updates.
7. **Quick Add:** Add template-based new card creation.

## Guiding Principles

- Keep Focus Mode quiet and compact.
- Keep planning controls in Plan Mode.
- Avoid changing Trello board structure unless the feature explicitly requires it.
- Prefer local-only personal planning state when the feature is about attention management rather than team workflow.
- Make all Trello writes deliberate and visible.
