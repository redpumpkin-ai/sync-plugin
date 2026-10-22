---
name: sync-projects
description: Use when the user wants a Sync by RedPumpkin project brought in line with an external source — "update project X in Sync", "sync Sync with the schedule/plan", "refresh the tickets from this doc" — touching ticket dates, descriptions and progress comments in bulk.
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Compares a project's tickets with a schedule or plan you provide, shows a before/after table, and applies dates, descriptions and comments after you confirm."
  example: "Update project GTN in Sync from docs/SCHEDULE.md"
  chat: "true"
argument-hint: "[project-key] [schedule-or-plan-file]"
effort: medium
---

# sync-projects

Turns a schedule or plan into one reviewed batch of ticket updates. Nothing is written until the user has seen the diff table.

Sync tools may carry a client prefix (e.g. `mcp__sync__update_ticket`); this skill uses bare names. If they are not listed, search for them before concluding Sync is not connected. With two Sync servers listed, use the connected one.

## Inputs

- **Project key** (e.g. `GTN`). Ask if missing; resolve it with `list_projects`.
- **Source of truth:** a file path the user names, a file you find in the repo that the user confirms, or text pasted in the conversation. No source → ask. Never fill a field from a guess.
- **Scope:** tickets assigned to the user (`get_profile` against the assignee). Tickets of others only when the user names them.

## Steps

1. **Read Sync:** `get_project_dates`, `list_milestones`, `search_tickets` for the project, then `get_ticket`, `get_ticket_dates` and `list_ticket_comments` for each ticket in scope.
2. **Read the source** and map each source row to one ticket. An unmatched row or ticket goes on the skipped list with the reason.
3. **Build the diff table**, one row per ticket: dates, description, proposed comment, before → after. Leave a date empty when the source gives none. Run the `sync-timeline` checks on the proposed dates and list conflicts under the table.
4. **Lint** every text you will write (see Rules).
5. **Show the table and wait** for the user's go-ahead. Changes the user strikes out are dropped.
6. **Apply:** `update_ticket_dates`, `update_ticket` (the description is overwritten, so keep what should survive), `add_ticket_comment`.
7. **Report:** what changed, what was skipped and why, what needs a decision, and the UI-only fields below.

## Rules

Comments, status, project-update post and lint rules are in `references/rules.md`; read it before step 3. It contains these gates: a comment cannot be edited or deleted, a project update post needs an explicit yes, and status is not changed here.

## UI-only fields

UI-only fields: `references/ui-only-fields.md` lists what the tools cannot set and how to end the report with paste-ready blocks.
