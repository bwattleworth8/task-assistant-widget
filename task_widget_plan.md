# Trello Desktop Focus Widget Plan

## Summary

Build a local Electron desktop widget for Windows that shows tasks from one configured Trello board, can stay always on top, auto-refreshes, and lets you mark a Trello card complete by setting `dueComplete=true` so existing Trello automation handles the rest.

## Key Changes

- Create a new Electron app in this repo with a main process, preload bridge, and renderer UI.
- Use Electron `BrowserWindow` for the widget shell with:
  - Always-on-top toggle.
  - Remembered window size and position.
  - Tray/menu actions for show, hide, refresh, settings, and quit.
- Add an in-app setup/settings flow:
  - Enter Trello API key and token.
  - Fetch available boards.
  - Select one Trello board.
  - Store credentials locally using Electron encrypted storage when available.
- Fetch open cards from the selected board through the Electron main process, not directly from the UI.
- Display:
  - Current focus task as the top-ranked card.
  - Task list below it.
  - Filters for all, due, overdue, and no due date.
  - Due date, labels, list name, and Trello link.
- Sort tasks due-date first:
  - Overdue cards first.
  - Then due today / upcoming by soonest due date.
  - Then cards without due dates.
  - Exclude cards already marked `dueComplete=true`.

## Trello Behavior

- Use Trello REST API with the configured API key/token.
- Board scope is the selected board only.
- Completion action updates the card with `dueComplete=true`.
- Opening a task launches the card URL in the browser.
- Refresh runs manually and on a timer, with visible loading/error states.

## Test Plan

- Verify setup flow rejects missing/invalid Trello credentials with a clear error.
- Verify board selection persists after app restart.
- Verify card fetching excludes closed and completed cards.
- Verify due-date sorting for overdue, today, future, and no-date cards.
- Verify filters show the correct subsets.
- Verify "complete" calls Trello with `dueComplete=true` and removes the card after refresh.
- Verify always-on-top toggle works and persists.
- Verify window position/size persists.
- Run app locally with `npm start`; add package scripts for lint/build once the scaffold is in place.

## Assumptions

- v1 targets Windows desktop behavior first.
- The selected Trello board contains the tasks to show.
- Existing Trello automation reacts to `dueComplete=true`.
- v1 will not support full Trello editing, comments, checklist editing, or multi-board aggregation.
