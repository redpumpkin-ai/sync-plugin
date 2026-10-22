---
name: sync-tickets
description: Use when the user wants to plan work into a Sync by RedPumpkin ticket, create a ticket before coding, log progress or a finished phase on a ticket, add a comment, record a blocker or a hand-off, split a ticket into phases, or groom a ticket (title, description, priority, assignee, milestone, backlog clean-up).
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Plans and creates a ticket (with a duplicate check), logs progress, phases, blockers and hand-offs as comments, and grooms tickets."
  example: "Plan this work into a Sync ticket"
  chat: "true"
argument-hint: "[ticket-key] [plan|update|blocked|groom]"
effort: low
---

# sync-tickets

Keeps the Sync ticket an honest record of what is planned and done. Sync tools may carry a client prefix (e.g. `mcp__sync__create_ticket`); this skill uses bare names. If they are not listed, search for them before concluding Sync is not connected.

Tags, templates, approval, language, secrets and progress-comment rules live in `../_shared/conventions.md` (`_shared/conventions.md` in a ZIP upload). Read it before writing a comment.

| Need | Use |
|---|---|
| What's on my plate | `sync-digest` |
| Start work: branch, ticket → IN_PROGRESS | `sync-start-ticket <KEY>` |
| Finish: verify, PR, ticket → IN_REVIEW | `sync-complete-ticket` |

Ticket status follows GitHub; nothing here moves it past BACKLOG or TODO.

## Defaults

- **Assignee:** the user, by the name `get_profile` returns.
- **Project:** the row of the repo in the `AGENTS.md` Projects table; else `list_projects` (not CLOSED), ask if unclear. Never invent project, milestone or assignee names.
- **Priority:** NORMAL unless the work says otherwise.
- **Type:** uppercase Conventional Commit type (FEAT, FIX, REFACTOR, PERF, TEST, DOCS, STYLE, BUILD, CI, CHORE). It prefixes the branch name, so set it on create.

## Plan and create

1. Plan in the conversation: goal, approach, what done looks like.
2. `search_tickets` for duplicates; if something is close, show it and ask whether to reuse it.
3. Place it: project as above; milestone only when the plan clearly belongs to one.
4. Show the draft: title, project, milestone, priority, type, assignee, and a description with Goal, Scope (in and out), Acceptance criteria, Notes.
5. `create_ticket`. New tickets land in BACKLOG.
6. Tell the user to run `sync-start-ticket <KEY>`.

Continuing a ticket: `get_ticket` and `list_ticket_comments` first.

## Progress and phases

Comment at start, at each phase boundary and when blocked. Keep one ticket: `[PLAN]` lists phases, `[PHASE k/N DONE]` closes each. `sync-complete-ticket` posts `[DONE]`.

## Blocked or stopping

- Blocked: `[BLOCKED]` per conventions. Never cancel, reassign or re-scope the ticket to get around it.
- Stopping on unfinished work: run `/sync-docs handoff`.

## Grooming

1. `search_tickets`, then `get_ticket` for current fields.
2. Show before → after, then `update_ticket`. An omitted field stays; `null` clears assignee, milestone or type.
3. A description is overwritten, so keep what should survive.

`update_ticket` cannot change status or project; a wrong project means a new ticket.
