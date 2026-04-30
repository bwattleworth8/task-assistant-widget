# Trello Focus Widget

A lightweight Electron desktop widget for planning and focusing on tasks from one Trello board.

The app is designed to reduce context switching by giving you two working modes:

- **Plan Mode:** review tasks, curate Today and This Week queues, adjust filters, refresh Trello, and open settings.
- **Focus Mode:** use a compact left-side focus rail with the active task, timer, local notes, and a clear exit back to the full app.

## Setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Start the widget:

   ```powershell
   npm start
   ```

3. In app settings, enter a Trello API key and token, fetch boards, and select the board that contains your tasks.

## Trello Credentials

- API key: https://trello.com/power-ups/admin
- In Trello Power-Up Admin, create or open a Power-Up and generate an API key.
- Copy the generated **API Key**, not the API Secret.
- Token: use the Token link beside that same generated API key.

Credentials are saved locally. When Electron `safeStorage` encryption is available, credentials are encrypted before being written to the app settings file.

## Current Behavior

- Shows open, incomplete, non-template cards from the selected Trello board.
- Hides cards in `Done`, `Complete`, or `Completed` lists.
- Sorts overdue cards first, then upcoming due dates, then cards without due dates.
- Keeps Current Focus empty until you choose a task.
- Adds local Today Queue and This Week Queue sections for personal planning without changing Trello cards.
- Lets queued cards be reordered with drag and drop.
- Lets This Week tasks be promoted into the Today Queue.
- Excludes Focus, Today, and This Week cards from the All Tasks section.
- Suggests the next Today Queue task when you clear or complete the current focus task.
- Tracks focused work with a count-up timer.
- Writes stopped timer sessions to a Trello number custom field named `Time Spent (mins)`.
- Supports local focus notes while in Focus Mode. Notes are currently stored locally by Trello card ID and are not yet written back to Trello.
- Lets you mark a card complete by setting `dueComplete=true`, allowing Trello automation to handle follow-up actions.
- Supports always-on-top mode, hide-to-taskbar behavior, manual refresh, and automatic refresh.
- Supports a light/dark theme toggle.

## Focus Mode

Focus Mode is now intended to behave like a compact left rail:

- The Electron window moves to the left edge of the active display.
- The main dashboard/sidebar are hidden.
- The focus rail shows:
  - App title.
  - Focus Mode label.
  - Current task.
  - Timer.
  - Complete/Open/Clear Focus controls.
  - Local task notes.
  - Dedicated **Exit Focus Mode** button.

The focus notes field is a v1 local draft feature. A later milestone can write notes to the Trello card, likely as a card comment or description append.

## Scripts

```powershell
npm start
npm run check
```

`npm run check` performs syntax checks for the Electron main process, preload bridge, settings store, Trello client, and renderer script.
