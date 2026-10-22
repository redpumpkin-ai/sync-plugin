---
name: sync-docs
description: Use when the user wants to write, find, read, update or publish documentation in Sync by RedPumpkin Knowledge — a hand-off note, decision record (ADR), PRD, runbook, postmortem, meeting notes or roadmap for a project or ticket — or when a hook says work in this session is undocumented.
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Writes project docs in Sync Knowledge from a template, links them to the ticket, and publishes after you approve."
  example: "Write a hand-off note for SYN-29"
argument-hint: "<handoff|adr|prd|runbook|postmortem|meeting|roadmap|blank|search|update|publish> [title-or-query] [--ticket KEY] [--project NAME]"
effort: medium
---

# sync-docs

Writes project documentation in Sync Knowledge, the wiki, so hand-overs and decisions live where teammates search, not in chat or a local file. Tools are named without client prefix.

Read `../_shared/conventions.md` (`_shared/conventions.md` in a ZIP upload) for tags, approval, wiki and secrets rules. Templates, edge rules: `references/templates.md`.

## Arguments

A template name (handoff, adr, prd, runbook, postmortem, meeting, roadmap, blank) creates. `search`, `update`, `publish` act on an existing document. The rest is a title or query, `--ticket KEY`, `--project NAME`. `search`: `search_documents` by query, project or ticket; list titles and URLs; `get_document` reads one.

## Resolve, never guess

- Ticket: `--ticket`, else the key in the current branch name. `get_ticket` gives its `id`; `ticketIds` takes that id, not the key. None found: ask, offer `/sync-tickets`; only if the user says there is none, create it unlinked, skip the DOC comment and say so.
- Project: `--project`, else this repo's row in the AGENTS.md Sync section (Project ID column; the older single-line form is one row), else the ticket's project. `list_projects` gives ids.
- Space: `list_document_spaces` with that project id. None, or only VIEW role: tell the user and stop.
- Anything ambiguous: ask.

## Create

1. `search_documents` in the space by ticket or title. A close match: show it; the user may pick update.
2. Build the content from this session, never an empty template: branch commits and short diff against the default branch (`git log`, `git diff --stat`), `get_ticket`, `list_ticket_comments`, following the template. Ask for missing facts, never invent.
3. Show the draft and wait for the user's agreement.
4. `create_document` (spaceId, title, template, content, ticketIds); `publish_document` with the returned version; `add_ticket_comment` with the DOC comment.
5. Report title, URL, ticket. If publish failed after create, say the draft exists and offer `/sync-docs publish`; never create it twice.

## Update and publish

- update: `get_document`, change only what is stale, show it, wait for agreement. `update_document` with expectedVersion and ticketIds = all linked `tickets[].id` plus the new one (the list is replaced). Then `publish_document` with the returned version only if status was PUBLISHED, then a DOC comment on what changed.
- publish: `get_document`, show what readers will see, agreement, `publish_document`. An ARCHIVED document is refused (restore it in the Sync UI).

## Conflicts

Stale version or 409: `get_document` again, re-apply the change on the new content, never retry the same call.
