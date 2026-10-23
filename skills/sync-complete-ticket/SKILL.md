---
name: sync-complete-ticket
description: Use when the user says work on a Sync by RedPumpkin ticket is finished and should go to review — "/sync-complete-ticket", "wrap up SYN-29", "ship this ticket", "open the PR for my ticket". Commits, pushes and opens a PR, so it runs only when the user invokes it.
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Runs the verify command, commits, pushes and opens a PR (ticket moves to IN_REVIEW), then posts a structured [DONE] comment after you approve it."
argument-hint: "[ticket-key]"
effort: medium
disable-model-invocation: true
# Claude Code only. git push, gh pr create and Sync writes are deliberately
# absent so they keep their permission prompt. Sync MCP tools are not listed:
# each user names their server, so the mcp__<server>__ prefix is unknowable.
allowed-tools:
  - Read
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git show *)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(git switch *)
  - Bash(git stash *)
  - Bash(git fetch *)
  - Bash(git symbolic-ref *)
  - Bash(gh pr view *)
  - Bash(git -C * status *)
  - Bash(git -C * diff *)
  - Bash(git -C * log *)
  - Bash(git -C * show *)
  - Bash(git -C * add *)
  - Bash(git -C * commit *)
  - Bash(git -C * switch *)
  - Bash(git -C * stash *)
  - Bash(git -C * fetch *)
  - Bash(git -C * symbolic-ref *)
---

# sync-complete-ticket

Opening the PR is what moves the ticket to IN_REVIEW (Sync GitHub App). Merging is a human decision. So: no `change_ticket_status`, no merge, no auto-merge.

## Steps

Read `references/steps.md` first; it holds the full text of each step, the PR body shape and the `[DONE]` drafting flow. In order: 1 identify the ticket and its repo, 2 be on the ticket branch (never commit to the default branch), 3 load the rules, 4 check the work against the ticket, 5 run the verify command (if it fails, stop: no commit, push or PR), 6 commit, 7 catch up with the remote branch, 8 push, 9 open or reuse the PR, 10 confirm the move, 11 gather the commits and decisions, draft the structured `[DONE]` and post it only after the user agrees.

## Report

Ticket key and status after the PR, commit hash(es), PR URL (new or updated), verify result, whether the `[DONE]` was posted (or skipped because one exists), and anything that needs the user.

End the reply with offers, never runs. In an interactive session, and only when the change altered system behaviour (new endpoint, permission, data flow or config), offer `/sync-docs handoff --ticket <KEY>`; offer `/sync-docs adr` instead when the work settled an architecture decision.

Then offer the next ticket, following "Next-ticket suggestion" in `../_shared/conventions.md` (`_shared/conventions.md` in a ZIP upload). Opening the PR moves the ticket through GitHub, which the Sync hook never sees, so the offer belongs here.
