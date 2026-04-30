# Trello Focus Widget

A lightweight Electron desktop widget for keeping one Trello board visible while you work.

## Setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Start the widget:

   ```powershell
   npm start
   ```

3. In the app settings, enter a Trello API key and token, fetch boards, and select the board that contains your tasks.

## Trello Credentials

- API key: https://trello.com/power-ups/admin
- In Trello Power-Up Admin, create or open a Power-Up and generate an API key.
- Copy the generated **API Key**, not the API Secret.
- Token: use the Token link beside that same generated API key.

Credentials are saved locally. When Electron's `safeStorage` encryption is available, credentials are encrypted before being written to the app settings file.

## Behavior

- Shows open, incomplete cards from the selected Trello board.
- Sorts overdue cards first, then upcoming due dates, then cards without due dates.
- Keeps the Current Focus pane empty until you choose a task card.
- Adds local Today Queue and This Week Queue sections for personal planning without changing Trello cards.
- Lets This Week tasks be promoted into the Today Queue from inside the widget.
- Suggests the next Today Queue task when you clear or complete the current focus task.
- Tracks focused work with a count-up timer and writes stopped sessions to a Trello number custom field named `Time Spent (mins)`.
- Supports Focus Mode for a compact, low-intrusion window and Plan Mode for filtering, settings, and task selection.
- Persists a Dark Mode / Light Mode preference with an in-app icon toggle.
- Lets you mark a card complete by setting `dueComplete=true`, allowing Trello automation to handle follow-up actions.
- Supports always-on-top mode, manual refresh, and automatic refresh.
