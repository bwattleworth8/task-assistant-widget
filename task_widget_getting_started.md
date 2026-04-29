# Trello Desktop Widget (Lightweight Local App)

## Context
User wants a simple, low-friction way to surface Trello tasks on Windows as a persistent “widget” to improve focus and task visibility.

---

## Initial Recommendation Summary

There is no native Trello Windows widget. Viable approaches:

1. Browser-based pseudo-widget (fastest)
2. Rainmeter (complex, API-driven)
3. Sync to Microsoft To Do (loses Trello structure)
4. Custom lightweight app (recommended for control)

We proceeded with option #4.

---

## Solution: Local Trello “Focus Widget”

### Overview
A minimal Python + Flask app that:
- Pulls assigned Trello cards via API
- Sorts by urgency
- Displays a “current focus” task
- Supports filtering (all / due / overdue / no due date)
- Auto-refreshes

---

## Full Implementation

### File: `trello_focus_widget_app.py`

```python
# (full code from canvas — paste exactly as provided)