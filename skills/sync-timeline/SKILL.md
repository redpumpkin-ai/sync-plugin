---
name: sync-timeline
description: Use when the user asks to set or check ticket dates in Sync by RedPumpkin — "set the timeline", "are the ticket dates consistent", "does anything run past the project end", dependency or milestone date conflicts.
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Maps a schedule onto ticket start and end dates, flags conflicts with dependencies, milestones and the project dates, and writes dates after you confirm."
  example: "Check whether the GTN ticket dates are consistent"
  chat: "true"
argument-hint: "[project-key] [schedule-file]"
effort: medium
---

# sync-timeline

Keeps ticket dates coherent with the project and with each other. Read-only until the user confirms.

Sync tools may carry a client prefix; this skill uses bare names. If they are not listed, search for them first.

## Steps

1. **Resolve the project** with `list_projects`. Read `get_project_dates`, `list_milestones`, then `search_tickets` and `get_ticket_dates` for every ticket in scope (the user's own tickets by default).
2. **Source:** when the user supplies a schedule (file or text), map each row to `startDate` / `endDate`. A ticket the source does not mention keeps its dates; do not invent any.
3. **Check:**
   - dependency order: if ticket A must finish before B starts, A's end is before B's start (dependencies come from the source or the ticket descriptions; Sync has no dependency field)
   - each ticket inside the project's start and end dates
   - each ticket inside its milestone's span, where the milestone has dates
   - end not before start
4. **Report** a table (ticket, start, end, source row) and a list of conflicts, each with a recommendation. Example: the project ends 18 Dec but a ticket ends 30 Dec → extend the project, shorten the ticket, or accept the gap; that choice is the user's.
5. **Write** with `update_ticket_dates` only after the user confirms, and only the tickets they approved. `update_project_dates` only when the user says to change the project.

Tickets of other assignees are listed in the report but left unchanged unless the user names them.
