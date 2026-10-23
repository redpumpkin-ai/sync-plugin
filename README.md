# Sync agent plugin

Skills that make coding agents (Claude Code, Codex) follow the team's Sync by RedPumpkin workflow.

| Skill | Use it to |
|---|---|
| `sync` | List the Sync skills and which command to use. Does no work itself. |
| `sync-tickets` | Plan and create a ticket (with a duplicate check), log progress, phases, blockers and hand-offs as ticket comments, and groom tickets. Status is left to GitHub. |
| `sync-init` | Write the team's Sync rules into a repo's `AGENTS.md` and connect `CLAUDE.md` to it. Run once per repo, or again when the rules change. |
| `sync-start-ticket <KEY>` | Check out the ticket branch and push it. The push moves the ticket to IN_PROGRESS. It also takes over an in-progress ticket without a new branch. |
| `sync-complete-ticket [KEY]` | Verify, commit, push and open a PR (which moves the ticket to IN_REVIEW), then post a structured `[DONE]` comment on the ticket and offer the next ticket. You have to invoke it yourself. |
| `sync-run-ticket <KEY ...\|--queue> [--yolo]` | Carry tickets to a draft PR with nobody watching, e.g. overnight. It asks about grey areas in `[QUESTION]` comments and skips the ticket (`--yolo` lets the agent decide and log `[DECISION]`). Never merges or force-pushes. You have to invoke it yourself. |
| `sync-docs <handoff\|adr\|prd\|runbook\|postmortem\|meeting\|roadmap\|blank\|search\|update\|publish> [title-or-query] [--ticket KEY] [--project NAME]` | Write project docs in Sync Knowledge from a template, link them to the ticket, and publish after you approve. |
| `sync-plan-from-doc <path-or-doc-id> [--project NAME]` | Read a PRD or project doc, propose the project, milestones, tickets, assignees and repo, and create them after you approve. |
| `sync-digest` | Show what's on your plate: open tickets, overdue or due-soon tickets, incident reviews waiting on you, and PRs waiting for your review. Read-only. |
| `sync-projects` | Compare a project's tickets with a schedule or plan, show a before/after table, and apply dates, descriptions and comments after you confirm. |
| `sync-timeline` | Map a schedule onto ticket dates and flag conflicts with dependencies, milestones and the project dates. |
| `sync-ticket-audit` | Review tickets for stale descriptions, missing criteria, dates or milestones, and mismatched status. Read-only. |
| `sync-setup [commit-rules\|flow\|tools\|skills]` | Show commit-message rules per tool (with an optional commit-msg hook), the skill flow, extra tools some skills need and companion skills. Read-only. |
| `sync-schedule-digest ["weekdays 09:00"]` | Run `sync-digest` on a schedule as a Claude cloud routine, a Claude Desktop task or a Codex scheduled task. You have to invoke it yourself. |

In Claude Code, skills are prefixed with the plugin name, e.g. `/sync:sync-start-ticket SYN-29`.

## Setup (once per person)

The plugin ships both the skills and the Sync MCP server connection
(`https://sync.redpumpkin.ai/mcp`, OAuth client `sync-mcp-cli`). Installing the plugin is all
the setup there is. The first time it's used, you sign in with Keycloak.

### Step 1: Install the plugin

The marketplace is this repository.

```bash
# Claude Code
claude plugin marketplace add redpumpkin-ai/sync-plugin
claude plugin install sync@redpumpkin

# Codex
codex plugin marketplace add redpumpkin-ai/sync-plugin
codex plugin add sync@redpumpkin
```

### Step 2: Sign in to Sync (Keycloak)

- **Claude Code**: open `/mcp`, select `plugin:sync:sync` (it shows "needs authentication") and choose
  Authenticate.
- **Codex**: run `codex mcp login sync`, or follow the sign-in prompt the plugin shows.

The browser opens the RedPumpkin Keycloak login. After you sign in it redirects to `localhost:33418`,
and the agent is connected. Port 33418 must be free while you sign in.

**Check it worked**: ask the agent to "call get_profile from Sync". It should answer with your name.
If it doesn't, your Keycloak account isn't linked to a Sync user yet. Ask the admin.

<details>
<summary>Connect without the plugin (MCP only)</summary>

```bash
# Claude Code
claude mcp add --transport http --client-id sync-mcp-cli --callback-port 33418 sync https://sync.redpumpkin.ai/mcp

# Codex
codex mcp add sync --url https://sync.redpumpkin.ai/mcp --oauth-client-id sync-mcp-cli
# then in ~/.codex/config.toml, under [mcp_servers.sync.oauth]:
#   callback_url = "http://127.0.0.1:33418/callback"
#   callback_port = 33418
codex mcp login sync
```

claude.ai web/desktop uses a custom connector instead, with the same URL and OAuth Client ID
`sync-mcp-inspector-claude`. Claude Code also picks up that connector when you're signed in with the same
account. If you have both the connector and the plugin, the Sync tools appear twice. That's harmless, but
you can disable one in `/mcp`.
</details>

### Step 3: Set up each repo (once per repo, by one person)

1. Open the repo and run `sync-init`.
2. Confirm the Sync project key and verify command it proposes.
3. Review the `AGENTS.md` and `CLAUDE.md` changes, then commit and push them so the whole team gets the same rules.

## Daily flow

```
sync-start-ticket SYN-29      branch pushed           → ticket IN_PROGRESS
   … write code with the agent …
sync-complete-ticket          verify → commit → PR    → ticket IN_REVIEW
   reviewer approves the PR                           → ticket APPROVED
   reviewer merges the PR                             → ticket DONE
```

GitHub moves the ticket at every step, through the Sync GitHub App. Agents never set the status by hand, and they never merge.

1. **Start**: `sync-start-ticket SYN-29`. The agent checks the ticket, switches to the branch from Sync, pushes it, and summarises what the ticket asks for.
2. **Work**: code as usual. Ask "what's left on SYN-29?" whenever you like. Every pushed commit is recorded on the ticket by the Sync server (needs the server release with commit recording).
3. **Finish**: `sync-complete-ticket`. The ticket key is read from the branch name. The agent:
   1. runs the repo's verify command, and stops if it fails;
   2. commits as `feat(skills): add export` with a `Refs: SYN-29` footer (the key is in the footer, not the scope);
   3. pushes and opens or updates the PR (its title has the same form without the key);
   4. drafts the structured `[DONE]` ticket comment and posts it once you say yes.
4. **Review**: the reviewer approves and merges on GitHub.

## Hooks (reminders)

The plugin ships three hooks, all run by one small script (`hooks/sync-guard.mjs`):

- **SessionStart** adds the current branch and its ticket key to the agent's context. When the branch has no key it adds a reminder to run `/sync-tickets` or `/sync-start-ticket` instead. It also remembers the commit the session started at.
- **Stop** asks the agent, once per session, to document new commits when the session made commits but never called `add_ticket_comment`, `create_document` or `update_document`. The agent is pointed at `/sync-tickets` (`[UPDATE]`) and `/sync-docs`.
- **PostToolUse** (only for `change_ticket_status`) fires when that tool moves a ticket to IN_REVIEW or DONE. It asks the agent to call `get_my_work_summary`, propose up to three next tickets (highest priority first, then the same milestone, skipping tickets with an unanswered `[QUESTION]`) and wait for your pick. It does not fire when GitHub moves the status (PR opened or merged), which is why `sync-complete-ticket` ends with the same offer.

Things to know:

- SessionStart and Stop only run in a git repo whose root `AGENTS.md` has the Sync block written by `sync-init`. Everywhere else they print nothing. PostToolUse has no such condition: it fires only after the Sync status tool, which is itself proof of Sync use, and a condition would silence it in workspace folders that hold several repos.
- They never call Sync. They only add context or ask the agent to run the skills above. The reminder texts are in Indonesian.
- `node` (18 or newer) must be on `PATH`. Without it the client shows a hook error notice at session start; `SYNC_HOOKS=off` silences it.
- The hooks arrive with the next plugin release. The installed 0.3.0 does not have them; `claude --plugin-dir .` loads them for testing.

### Turn the hooks off

`SYNC_HOOKS=off` turns off all three hooks.

```bash
# bash or zsh, for one session
SYNC_HOOKS=off claude
```

```powershell
# PowerShell, for the current terminal
$env:SYNC_HOOKS = "off"
```

```json
// Claude Code settings.json, permanent
{ "env": { "SYNC_HOOKS": "off" } }
```

### Tool name the PostToolUse matcher sees

Checked on 2026-10-23 against the Claude Code and Codex hooks documentation, real Claude Code session transcripts and local Codex session logs.

| CLI | Tool name | Status |
|---|---|---|
| Claude Code, plugin server | `mcp__plugin_sync_sync__change_ticket_status` | Verified: the documented naming rule, and real transcripts show this call with `tool_input` `{ticket, status}` |
| Claude Code, claude.ai connector | `mcp__claude_ai_Sync_by_RP__change_ticket_status` | Verified: real transcripts show this call with the same `tool_input` |
| Codex, plugin server | `mcp__sync__change_ticket_status` | Not verified: only the documented `mcp__<server>__<tool>` pattern. Local logs show the plugin's calls under server `sync`, but no hook payload has been observed |
| Codex, connector | `mcp__codex_apps__sync_by_rp_change_ticket_status` | Not verified: seen in Codex tool declarations only, never as a hook payload. The script accepts the `sync_by_rp_` prefix for it |

Also not verified: the shape of `tool_response` for MCP tools (undocumented), the Codex `tool_input` shape, and whether a marketplace install runs plugin hooks in Codex. So the hook reads the new status from `tool_input.status` only and uses `tool_response` just to skip failed calls. The matcher in `hooks/hooks.json` is the tolerant suffix `change_ticket_status$` and the script checks the name again. If a CLI sends the status somewhere else, the hook stays silent and the `sync-complete-ticket` offer is the fallback.

### Codex

Codex has a hooks feature (checked against the Codex hooks documentation on 2026-10-22), but Codex's plugin build documentation lists lifecycle hooks only for manually installed desktop plugins. Whether a plugin installed from a marketplace runs these hooks is unverified. If hooks do run, Codex reads the same `hooks/hooks.json` from the plugin root and gives hook commands the plugin root as `PLUGIN_ROOT`, plus `CLAUDE_PLUGIN_ROOT` for compatibility. Codex skips plugin hooks until you review and trust them, so after installing the plugin run `/hooks` once.

The Codex side is untested on a real install, in particular on Windows, where the quoted `${CLAUDE_PLUGIN_ROOT}` in the hook command may not expand. The check that looks for Sync calls in the Codex transcript is a best effort; if it misses one, the worst case is one extra reminder per session.

### Limits

- A workspace folder that is not itself a git repository gets no reminders.
- Documentation done by a subagent is not seen; only the main transcript is read.
- The Stop hook blocks at most once per session, and never when it cannot read the transcript.
- Status changes made by GitHub events or by the Sync web app never reach the PostToolUse hook.

## Scheduling sync-run-ticket --queue

`sync-run-ticket` runs while you are away. There is no separate scheduler skill: you start it yourself in a session you leave running, or you schedule its prompt the way `sync-schedule-digest` schedules the digest.

| Runner | Status |
|---|---|
| Claude Code local, plugin installed | Supported: `/sync:sync-run-ticket --queue` |
| Codex local, plugin installed | Supported: `$sync-run-ticket --queue` |
| Claude Code routine (cloud) | belum diverifikasi — needs one live routine run. Plugins are not loaded there, so the prompt must stand alone (see below). |
| Codex cloud tasks | Not supported: nothing found on remote MCP with OAuth in cloud tasks, and this skill reads and writes tickets only through MCP. |
| Desktop local task / Codex scheduled task | Same mechanism as in `skills/sync-schedule-digest/references/platforms.md`, not verified with this skill. |

### Before you leave

- Pre-approve in your own permission settings what the run needs, because the skill grants none of it: `git push`, `gh pr create`, the Sync write tools and the repo's verify command. A prompt nobody answers stalls the night. Pre-approving `git push` is your decision; the skill never force-pushes.
- Sync does not notify anyone about comments. A `[QUESTION]` the run asked is visible in `sync-digest` under "Needs you now" or on the ticket. Answer with a plain comment and run again.

### Cloud routine (unverified)

The prompt must stand alone, like `skills/sync-schedule-digest/references/prompt.md`. Build it as this header followed by verbatim copies (copy, do not paraphrase) of the body of `skills/sync-run-ticket/SKILL.md`, `skills/sync-run-ticket/references/run.md`, the "Unattended run" and "Comment tags" parts of `skills/_shared/conventions.md`, and the steps files of `sync-start-ticket` and `sync-complete-ticket` plus `sync-docs/references/templates.md`.

Header: `Unattended scheduled run of sync-run-ticket --queue. Nobody is watching: never ask in chat, post questions as [QUESTION] ticket comments and skip the ticket, open draft PRs only, never merge.`

Use the claude.ai Sync connector (connector steps: `skills/sync-schedule-digest/references/platforms.md`) and pick the repo the tickets live in. Also unverified: that the connector is present in the run and its sign-in holds between runs, and that a routine may push a ticket branch.

## Permission prompts (Claude Code)

- Local git commands run without prompts.
- Sync tools prompt the first time they are used. Pick "Yes, don't ask again" for the read-only ones (`get_ticket`, `search_tickets`, ...).
- `git push`, `gh pr create` and every Sync write (comments, ticket changes) always prompt.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Keycloak shows `Invalid parameter: redirect_uri` | The CLI used a port other than 33418. Use `--callback-port 33418` / `callback_port = 33418`, and free the port. |
| Keycloak shows `Client not found` | Wrong OAuth client ID. The CLIs and plugin use `sync-mcp-cli`. claude.ai connectors use `sync-mcp-inspector-claude`. |
| The ticket stays BACKLOG after `sync-start-ticket` | The Sync GitHub App is not installed on this repo. Ask the admin. Don't set the status by hand. |
| The agent says the Sync tools are missing | Step 2 isn't done. Check `/mcp` (Claude Code) or `codex mcp list`. |
| The agent is asked to document or link a ticket at the start or end of every session | The hooks run in git repos whose root `AGENTS.md` has the Sync block, and the branch has no ticket key or the session has commits without a Sync comment. Link the branch to a ticket, document the work, or set `SYNC_HOOKS=off`. |

## Releases

Plugin releases are cut by one person and go through five steps:

1. If the release needs a server change, merge and deploy it first. `compat.json` and the top CHANGELOG entry list the Sync MCP tools the skills call; the server must already offer all of them.
2. Merge the plugin PR into `main`. It bumps the version in the five places (both `plugin.json`, the Claude `marketplace.json`, and the `X-Sync-Plugin` header in `.mcp.json` and `.codex-plugin/mcp.json`) and finishes the CHANGELOG entry (replace "belum dirilis" with the release date).
3. Push the tag `vX.Y.Z`. The release workflow checks that the tag equals the manifest version and that the CHANGELOG entry is finished, then creates the GitHub Release automatically.
4. A PR in the Sync app repository moves the plugin submodule pointer to the tagged commit. The compat check must be green and a human must read the plugin diff before approving.
5. Deploy after approval. If a `stable` ref is in use, move it to the new tag.

Rollback: revert the version bump in the Sync app repository, redeploy the previous image, and move `stable` back to the previous tag.

## Contributing

- Open a PR against `main`. Changes need a review from the code owner (`.github/CODEOWNERS`). Workflows from outside contributors need maintainer approval before they run.
- Before you push, run the same checks CI runs:

  ```bash
  node scripts/check.mjs
  node --test hooks/sync-guard.test.mjs
  node --test scripts/check.test.mjs
  ```

- Skill rules (enforced by `scripts/check.mjs`, no exceptions):
  - every `SKILL.md` has `name` (equal to its folder), a `description` that starts with "Use when", `metadata.summary` and an `argument-hint`;
  - every `SKILL.md` stays under 500 words, frontmatter included. Put heavy detail in the skill's `references/` folder and point to it from `SKILL.md`;
  - rules shared by several skills live only in `skills/_shared/conventions.md`;
  - the MCP tools the skills call are listed in `compat.json` and in the top CHANGELOG entry.
- Never commit application code, secrets or customer data. The check fails on internal names, secret shapes and URLs outside a short allowlist.

## Tags

Only `@MKMaarif` creates `v*` tags. A tag must equal the manifest version and have a finished CHANGELOG entry. Tags are never moved or deleted: to fix a release, publish a new version.

## License

Apache-2.0. See `LICENSE`.
