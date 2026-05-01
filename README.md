# Trello Focus Widget

A lightweight Electron desktop widget for planning, organizing, and focusing on tasks from one Trello board.

The app is built for three related workflows:

- **Plan:** review Trello tasks, filter the task list, and curate local Today and This Week queues.
- **Organize:** keep a personal ordering of work without changing the Trello board.
- **Focus:** choose one active task, track time, take notes, and avoid returning to Trello unless needed.

## How To Run Locally

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Start the Electron app:

   ```powershell
   npm start
   ```

3. Run syntax checks:

   ```powershell
   npm run check
   ```

## Trello Setup

1. Go to https://trello.com/power-ups/admin.
2. Create or open a Power-Up.
3. Generate an API key.
4. Use the generated **API Key**, not the API Secret.
5. Use the Token link beside that API key to generate a Trello token.
6. Enter the API key and token in the widget settings.
7. Fetch boards and select the board that contains the tasks to display.

Credentials are saved locally. When Electron `safeStorage` encryption is available, credentials are encrypted before being written to the app settings file.

## Plan Mode

- Full dashboard view.
- Sidebar navigation for Home, Focus, Today, This Week, and All Tasks.
- Selectable Lists filters that narrow the visible planning panes to chosen Trello lists.
- Settings, refresh, pin-on-top, and theme controls.
- Filter controls for all, due soon, overdue, and no due date.
- Native window close quits the app; hide/minimize behavior remains explicit.
- Local Today Queue and This Week Queue.
- Drag-and-drop queue ordering.
- Move This Week tasks into Today.
- Quick Add creates a Trello card from a configured template, sets today's start date and `Status=To do`, prompts for label, priority, due date, and assignee, then routes it to Focus, Today, This Week, or All Tasks.
- All Tasks excludes tasks already in Focus, Today, or This Week.
- Sidebar Daily Summary shows today's focus time, distinct tasks worked, and completed tasks.

## Focus Mode

- Compact left-side rail.
- Electron window anchors to the left edge of the active display.
- Clicking **Start Focus** enters Focus Mode automatically.
- Shows only the focus workflow:
  - Current task.
  - Metadata.
  - Stopwatch or Pomodoro timer.
  - Complete/Open/End Focus Session actions.
  - Notes.
  - Exit Focus Mode button.

## Time Tracking

- Timer supports a count-up stopwatch plus 25 minute, 50 minute, and custom Pomodoro countdown sessions.
- Saved time writes to Trello custom field `Time Spent (mins)`.
- Saved sessions are recorded locally for the Plan Mode Daily Summary after Trello confirms the time save.
- Completed tasks are recorded locally for the Plan Mode Daily Summary after Trello confirms completion.
- The timer uses JetBrains Mono and tabular numbers for stable display.

## Focus Notes

- Focus notes are available in the Plan Mode current-focus pane and Focus Mode rail.
- Focus notes are stored by Trello card ID in `localStorage` while drafting.
- Non-empty notes are written as Trello card comments when focus is cleared, completed, or replaced.
- Local notes are cleared only after Trello confirms the comment write.
- If Trello rejects the comment write, the local note remains available and focus is not ended.
- The **Bold**, **Italic**, **List**, and **Link** toolbar buttons insert Markdown-style note formatting.

## Trello Card Filtering

- Completed cards are excluded.
- Template cards are excluded.
- Cards in `Done`, `Complete`, or `Completed` lists are hidden.
- Open, incomplete cards remain available for planning.
- Cards sort with overdue cards first, then upcoming due dates, then cards without due dates.

## Local State

The widget stores local state in Electron user data:

- Selected board.
- Refresh interval.
- View mode.
- Theme.
- Always-on-top preference.
- Window bounds by mode.
- Today Queue card IDs.
- This Week Queue card IDs.
- Quick Add template card.
- Trello credentials.

Credentials use Electron `safeStorage` when available. Focus notes currently use renderer `localStorage` and are not part of the settings store yet.

## Trello Writes

The widget currently writes to Trello only for explicit user actions:

- Complete task: sets `dueComplete=true`.
- Save elapsed focus time: updates `Time Spent (mins)`.
- End focus with notes: adds a Trello card comment.
- Quick Add: creates a new card by copying the configured template into the selected list, setting today's start date and `Status=To do`, with optional label, priority, due date, and assignee.

Local queues, draft notes, theme, window mode, and view preferences do not modify Trello.

See [product_roadmap.md](product_roadmap.md) for planned product work and validation notes.

## Scripts

```powershell
npm start
npm run check
```

`npm run check` performs syntax checks for the Electron main process, preload bridge, settings store, Trello client, and renderer script.
