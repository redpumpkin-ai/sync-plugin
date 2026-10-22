---
name: sync-init
description: Use when a repository or a workspace folder holding several repos needs its agent instructions (AGENTS.md, CLAUDE.md) set up or refreshed for Sync by RedPumpkin ticketing — "sync init", onboarding a repo to Sync, connecting a repo or folder to a Sync project, mapping which local repo a project's tickets live in, or after the team's Sync rules changed. Use it even if the user only mentions one of the two files.
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Writes the team's Sync rules and the project → repo path map into AGENTS.md and links CLAUDE.md to it. Run once per repo or workspace folder."
  example: "Set up Sync in this repo"
argument-hint: "[repo-path ...]"
effort: low
# Claude Code only. Pre-approves local tools. Sync MCP tools are not listed:
# each user names their server, so the mcp__<server>__ prefix is unknowable.
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash(git rev-parse *)
  - Bash(git remote *)
  - Bash(git status *)
  - Bash(git -C * rev-parse *)
  - Bash(git -C * remote *)
---

# sync-init

Puts the team's Sync rules into a folder so every coding agent follows them: Codex reads `AGENTS.md`, Claude Code reads `CLAUDE.md`. `AGENTS.md` holds the rules once; `CLAUDE.md` imports it with `@AGENTS.md`, so there is one copy and no symlink (symlinks break on Windows checkouts).

The rules themselves live in `assets/sync-section.md`. They encode team decisions an agent cannot infer from the Sync tools alone — chiefly that GitHub events, not `change_ticket_status`, move ticket status. Copy that section verbatim apart from its placeholders; rewording it drifts repos apart.

## Steps

Read `references/steps.md` before step 1: it explains why the Projects table exists and holds the full text of steps 1-6. In order: 1 pick the mode (repo or workspace), 2 read the current state, 3 get the repo paths (workspace mode: from the user, never guessed), 4 read each repo's GitHub repo, 5 pick the Sync project for each row, 6 pick each row's verify command.

7. **Confirm the whole table with the user in one question.** If the user is unavailable, proceed with the proposals in repo mode and say so in the final report; in workspace mode stop, because the paths must come from the user.

Steps 8-10 and the closing checks are in `references/write-and-report.md`; read it before step 8. In order: 8 write `AGENTS.md`, 9 connect `CLAUDE.md` (it contains a confirmation gate: nothing moves between files without the user's yes), 10 report.
