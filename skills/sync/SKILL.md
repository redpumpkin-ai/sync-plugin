---
name: sync
description: Use when the user asks what the Sync by RedPumpkin plugin can do, which Sync command to use, or types /sync without saying what they want.
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Lists the Sync skills and tells you which one to use. Does no work itself."
  example: "What can the Sync plugin do?"
argument-hint: "[what-you-want-to-do]"
effort: low
---

# sync

Lists the Sync skills. It does no work itself: answer with the table below, pick the row that matches what the user asked (if anything), and tell them the exact command. Do not run the chosen workflow from here, so skills that only the user may start stay that way.

| Want to | Command (Claude Code) | Codex |
|---|---|---|
| See what's on my plate | `/sync:sync-digest` | `$sync-digest` |
| Plan or create a ticket, log progress, comment, groom | `/sync:sync-tickets` | `$sync-tickets` |
| Start a ticket (branch → IN_PROGRESS) | `/sync:sync-start-ticket <KEY>` | `$sync-start-ticket <KEY>` |
| Finish a ticket (verify, commit, PR → IN_REVIEW) | `/sync:sync-complete-ticket` | `$sync-complete-ticket` |
| Let an agent carry tickets to a draft PR unattended, e.g. overnight | `/sync:sync-run-ticket <KEY ...\|--queue> [--yolo]` | `$sync-run-ticket <KEY ...\|--queue> [--yolo]` |
| Write, find or update project docs (hand-off, ADR, PRD, runbook, postmortem, meeting, roadmap) | `/sync:sync-docs <template>` | `$sync-docs <template>` |
| Turn a PRD or project doc into a project, repo, milestones and tickets | `/sync:sync-plan-from-doc <path-or-doc-id>` | `$sync-plan-from-doc <path-or-doc-id>` |
| Bring a project in line with a schedule or plan | `/sync:sync-projects` | `$sync-projects` |
| Set or check ticket dates | `/sync:sync-timeline` | `$sync-timeline` |
| Audit tickets for stale or missing content | `/sync:sync-ticket-audit` | `$sync-ticket-audit` |
| Get the digest on a schedule | `/sync:sync-schedule-digest` | `$sync-schedule-digest` |
| Set up a repo's Sync rules (once per repo) | `/sync:sync-init` | `$sync-init` |

Ticket status follows GitHub: push the branch → IN_PROGRESS, open the PR → IN_REVIEW, approve → APPROVED, merge → DONE.

If Sync tools are missing, the user still has to sign in: `/mcp` → `plugin:sync:sync` → Authenticate (Claude Code), or `codex mcp login sync`.
