---
name: sync-digest
description: Use when the user asks what is on their plate in Sync by RedPumpkin — "my digest", "what's on my plate", "anything overdue or waiting on me", "what should I work on", morning check-ins — and when a scheduled Sync digest runs. Read-only.
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Shows what's on your plate: open, overdue and due-soon tickets, incident reviews and PRs waiting for you. Read-only."
  example: "What's on my plate today?"
  chat: "true"
argument-hint: "[no arguments]"
effort: low
# Claude Code only. Only gh read commands are pre-approved. Sync MCP tools are not listed:
# each user names their server, so the mcp__<server>__ prefix is unknowable.
allowed-tools:
  - Bash(gh search prs *)
  - Bash(date *)
---

# sync-digest

Read-only; "mine" is the signed-in account. Background and the tool-prefix note: `references/background.md`.

## Collect

1. `get_profile` → the user's `email`. Today's date and timezone come from the system clock (`date`). Never infer them from ticket timestamps.
2. `search_tickets` with `assignee` = that **email** and `status` = BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, APPROVED, `limit` 50. Filter by email, not name: the filter matches substrings, so a name can pull in other people's tickets. Every count in the digest comes from this one result.
3. `list_my_pending_reviews`: incident investigations and remediation proposals waiting on the user. If the tool is missing, the Sync server is older than this skill; write "not available on this Sync server" in that section.
4. `gh search prs --review-requested=@me --state=open --json url,title,repository,createdAt`: PRs waiting for the user's review. If `gh` is missing or not signed in, write "GitHub not checked" in that section.

Compute due-date buckets from `dueDate` against today: **overdue** (before today), **due soon** (today through +2 days). Ages ("for 7 days") are computed from timestamps against today.

## Output

Use exactly this shape. Omit a section only when the template says so. Keep each item to one line: `KEY title — status, detail` with a link.

```
**Sync digest · <weekday, date>** — <N> open tickets: <x> in progress, <y> in review, <z> backlog/todo

**Needs you now**
- <overdue tickets>, <due-soon tickets>, <pending incident reviews / remediation approvals>, <PRs awaiting your review>
- (or "Nothing urgent.")

**In progress** — IN_PROGRESS tickets, oldest update first; flag any untouched for 5+ days
**In review** — IN_REVIEW / APPROVED tickets; flag any waiting 5+ days
**Up next** — top 3 TODO/BACKLOG by priority, then due date, then ticket key (write "+<n> more" if longer)

**Next step:** <one concrete action, e.g. "Start GTN-3: /sync:sync-start-ticket GTN-3">
```

Copy ticket titles exactly as Sync returns them, without translating or rewording them. Leave out anything that is not the user's Sync work or a review request (other repos' stale PRs, general GitHub activity). Do not add advice beyond the single next step.
