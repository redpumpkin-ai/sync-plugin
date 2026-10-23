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
| Plan or create a ticket, log progress, comment, groom | `/sync:sync-tickets [ticket-key] [plan\|update\|blocked\|groom]` | `$sync-tickets [ticket-key] [plan\|update\|blocked\|groom]` |
| Start a ticket (branch → IN_PROGRESS) | `/sync:sync-start-ticket <KEY>` | `$sync-start-ticket <KEY>` |
| Finish a ticket (verify, commit, PR → IN_REVIEW) | `/sync:sync-complete-ticket [ticket-key]` | `$sync-complete-ticket [ticket-key]` |
| Let an agent carry tickets to a draft PR unattended, e.g. overnight | `/sync:sync-run-ticket <KEY ...\|--queue> [--yolo]` | `$sync-run-ticket <KEY ...\|--queue> [--yolo]` |
| Write, find or update project docs (hand-off, ADR, PRD, runbook, postmortem, meeting, roadmap) | `/sync:sync-docs <handoff\|adr\|prd\|runbook\|postmortem\|meeting\|roadmap\|blank\|search\|update\|publish> [title-or-query] [--ticket KEY] [--project NAME]` | `$sync-docs <handoff\|adr\|prd\|runbook\|postmortem\|meeting\|roadmap\|blank\|search\|update\|publish> [title-or-query] [--ticket KEY] [--project NAME]` |
| Turn a PRD or project doc into a project, repo, milestones and tickets | `/sync:sync-plan-from-doc <path-or-doc-id> [--project NAME]` | `$sync-plan-from-doc <path-or-doc-id> [--project NAME]` |
| Bring a project in line with a schedule or plan | `/sync:sync-projects [project-key] [schedule-or-plan-file]` | `$sync-projects [project-key] [schedule-or-plan-file]` |
| Set or check ticket dates | `/sync:sync-timeline [project-key] [schedule-file]` | `$sync-timeline [project-key] [schedule-file]` |
| Audit tickets for stale or missing content | `/sync:sync-ticket-audit [project-key-or-search]` | `$sync-ticket-audit [project-key-or-search]` |
| Get the digest on a schedule | `/sync:sync-schedule-digest ["weekdays 09:00"]` | `$sync-schedule-digest ["weekdays 09:00"]` |
| Set up a repo's Sync rules (once per repo) | `/sync:sync-init [repo-path ...]` | `$sync-init [repo-path ...]` |
| Learn how to use Sync after install (commit-message rules, skill flow, extra tools, companion skills) | `/sync:sync-setup [commit-rules\|flow\|tools\|skills]` | `$sync-setup [commit-rules\|flow\|tools\|skills]` |

Ticket status follows GitHub: push the branch → IN_PROGRESS, open the PR → IN_REVIEW, approve → APPROVED, merge → DONE.

If Sync tools are missing, the user still has to sign in: `/mcp` → `plugin:sync:sync` → Authenticate (Claude Code), or `codex mcp login sync`.
