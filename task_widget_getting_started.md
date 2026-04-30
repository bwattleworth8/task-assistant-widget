# Trello Focus Widget Getting Started

## Current Product Direction

The Trello Focus Widget is now an Electron desktop app for Windows. It is no longer planned as a Python/Flask prototype.

The app helps with three related workflows:

- **Plan:** review Trello tasks, filter the task list, and curate local Today and This Week queues.
- **Organize:** keep a personal ordering of work without changing the Trello board.
- **Focus:** choose one active task, track time, take local notes, and avoid returning to Trello unless needed.

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

## Current Features

### Plan Mode

- Full dashboard view.
- Sidebar navigation for Focus, Today, This Week, and All Tasks.
- Settings, refresh, pin-on-top, and theme controls.
- Filter controls for all, due, overdue, and no due date.
- Local Today Queue and This Week Queue.
- Drag-and-drop queue ordering.
- Move This Week tasks into Today.
- All Tasks excludes tasks already in Focus, Today, or This Week.

### Focus Mode

- Compact left-side rail.
- Electron window anchors to the left edge of the active display.
- Shows only the focus workflow:
  - Current task.
  - Metadata.
  - Timer.
  - Complete/Open/Clear Focus actions.
  - Local notes.
  - Exit Focus Mode button.

### Time Tracking

- Timer is a count-up stopwatch.
- Saved time writes to Trello custom field `Time Spent (mins)`.
- The timer uses JetBrains Mono and tabular numbers for stable display.

### Focus Notes

- Focus notes are currently local-only.
- Notes are stored by Trello card ID in `localStorage`.
- The next planned decision is how to write notes back to Trello, likely as card comments or description updates.

### Trello Card Filtering

- Completed cards are excluded.
- Template cards are excluded.
- Cards in `Done`, `Complete`, or `Completed` lists are hidden.
- Open, incomplete cards remain available for planning.

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
- Trello credentials.

Credentials use Electron `safeStorage` when available.

Focus notes currently use renderer `localStorage` and are not part of the settings store yet.

## Trello Writes

The widget currently writes to Trello only for explicit user actions:

- Complete task: sets `dueComplete=true`.
- Save elapsed focus time: updates `Time Spent (mins)`.

Local queues, local notes, theme, window mode, and view preferences do not modify Trello.

## Near-Term Plan

1. Finish validating the left-rail Focus Mode.
2. Decide and implement Trello sync behavior for focus notes.
3. Add a daily time summary.
4. Add task cleanup signals.
5. Add Pomodoro presets.
6. Add status adjustment.
7. Add quick task creation from a template.
