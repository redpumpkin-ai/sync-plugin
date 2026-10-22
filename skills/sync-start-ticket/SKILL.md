---
name: sync-start-ticket
description: Use when the user wants to start, pick up or begin working on a Sync by RedPumpkin ticket (a key like SYN-29, a ticket ID or title) — "start SYN-29", "I'm taking this ticket", "set me up for <ticket>", "/sync-start-ticket". Use it whenever coding work on a Sync ticket is about to begin, even if the user only asks for the branch.
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Checks out the ticket branch and pushes it, which moves the ticket to IN_PROGRESS."
  example: "Start working on SYN-29"
argument-hint: <ticket-key>
effort: low
# Claude Code only. git push is deliberately absent: it leaves the machine,
# so it keeps its permission prompt. Sync MCP tools are not listed: each user
# names their server, so the mcp__<server>__ prefix is unknowable.
allowed-tools:
  - Bash(git status *)
  - Bash(git fetch *)
  - Bash(git switch *)
  - Bash(git stash *)
  - Bash(git symbolic-ref *)
  - Bash(git remote *)
  - Bash(git -C * status *)
  - Bash(git -C * fetch *)
  - Bash(git -C * switch *)
  - Bash(git -C * stash *)
  - Bash(git -C * symbolic-ref *)
  - Bash(git -C * remote *)
---

# sync-start-ticket

Gets a ticket ready to work on: the right branch, pushed so Sync shows the ticket as IN_PROGRESS, and a short brief of what the ticket asks for.

**Pushing the branch is how the ticket moves.** The Sync GitHub App sees the new branch and moves the ticket from BACKLOG or TODO to IN_PROGRESS. So push the branch right away, before any commit, and do not call `change_ticket_status` — a manual status write duplicates the webhook and leaves a misleading `mcp` entry in the status history. Both BACKLOG and TODO tickets move on push; no TODO step is needed first.

Sync tools may carry a client prefix (e.g. `mcp__sync__get_ticket`); this skill uses bare names.

## Steps

Read `references/steps.md` first. It holds the full text of each step and the status table. In order: 1 read the ticket, 2 check it is startable by status (DONE or CANCELED: stop; assigned to someone else: ask first), 3 find the repo (if the ticket's repository differs from `origin`, stop and ask), 4 protect local work (never discard changes), 5 get onto the branch (use the name from `get_ticket_branch_name` exactly), 6 push it now, 7 confirm the move, 8 brief the user.

## Report

End with: ticket key and status after the push, branch name, what happened to local changes (if any), and the first step you propose.
