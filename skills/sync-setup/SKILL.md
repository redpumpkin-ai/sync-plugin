---
name: sync-setup
description: Use when the user asks how to use Sync by RedPumpkin after installing it — "sync setup", how to make AI-written commit messages follow the Sync format, what the Sync skill flow is, which extra tools or companion skills help, or onboarding a teammate. Guidance only; sync-init is what sets up a repo.
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Shows commit-message rules per tool, the Sync skill flow, extra tools and companion skills. Writes nothing."
  example: "How do I make my AI commits follow the Sync format?"
argument-hint: "[commit-rules|flow|tools|skills]"
effort: low
---

# sync-setup

Guidance for using Sync after the plugin is installed: where the commit-message rule goes in each tool, the order the Sync skills are used in, which extra tools some skills need, and which companion skills may help. It is not `sync-init`, which writes a repo's rules, and it does not connect any tool to Sync.

Paths are relative to the skills folder. Shared rules are in `../_shared/conventions.md` (`_shared/conventions.md` in a ZIP upload).

| Argument or question | Open |
|---|---|
| `commit-rules`: commit messages, PR titles, per-tool setting, commit-msg hook | `references/commit-rules.md` |
| `flow`: which skill comes when | `references/guide.md`, "The flow on one screen" |
| `tools`: extra tools some skills need | `references/guide.md`, "Extra tools some skills need" |
| `skills`: companion open-source skills | `references/guide.md`, "Companion open-source skills" |

No argument: show the flow section, list the four topics and ask which to open.

## Rules

- Read and explain only. Install nothing, edit nothing, and offer the optional hook without installing it.
- Per-tool MCP install tutorials are not here. Point to Settings -> MCP in the Sync app (`https://sync.redpumpkin.ai/settings/mcp`), where each tool has its steps (Claude Code, Codex, Qoder, agy, Trae, VSCode).
- Keep every "belum diverifikasi" marker when relaying a table row.
- Never invent a tool, a source or an install command that the references do not hold.
