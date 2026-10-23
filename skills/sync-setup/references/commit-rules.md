# Commit-message rules per tool

Paths are relative to the skills folder. The rule text is kept only in `../_shared/conventions.md`, section "Commit and PR format" (`_shared/conventions.md` in a ZIP upload). Paste that block; do not retype it here. The same section holds the pull-request rule (title and description); PR titles and descriptions follow that file too.

## Where the rule goes, per tool

| Tool | Where it goes | Status |
|---|---|---|
| Claude Code, Codex (agentic CLIs) | The Conventions block that `sync-init` writes into `AGENTS.md` already carries the rule. Re-run `sync-init` to refresh an older block. | Stated by this repo's own block asset |
| VSCode (Copilot) | Workspace Settings (JSON), key `github.copilot.chat.commitMessageGeneration.instructions`, value an array of objects with a `text` property. VS Code labels this setting Experimental. The Sync app's Settings -> MCP VSCode tab holds ready-to-paste JSON. | Verified 2026-10-23 |
| Trae | The rules docs section titled "Set rules for Git commit messages": Method 1 adds the rule to an existing rules file, Method 2 uses a `git-commit-message.md` file. | belum diverifikasi (only the section titles were readable; menu name and file location unconfirmed) |
| Qoder (CLI and Desktop) | No commit-message setting has been researched. If the tool's agent writes the commit, rely on the `AGENTS.md` block. | belum diverifikasi |
| agy | No commit-message setting has been researched. If the tool's agent writes the commit, rely on the `AGENTS.md` block. | belum diverifikasi |

The optional hook below catches a wrong format in any tool. Per-tool MCP install steps live in the Sync app at `https://sync.redpumpkin.ai/settings/mcp`.

## commit-msg hook (optional, format check only)

Offer this only when the user wants it. Never install it from the skill: ask first, show what it does, and let the user copy it. It uses no LLM and only checks the subject line: the type list, the `(scope)`, the 72-character limit. It warns, without failing, when the branch name holds a ticket key but the message has no `Refs:` footer.

```sh
#!/bin/sh
# commit-msg: checks the subject line format only
msg_file="$1"
first=$(head -n 1 "$msg_file")

case "$first" in
  "Merge "*|"Revert "*|"fixup! "*|"squash! "*) exit 0 ;;
esac

if ! printf '%s\n' "$first" | grep -Eq '^(feat|fix|refactor|docs|test|perf|build|ci|chore|revert)(\([a-z0-9._/-]+\))?!?: .+'; then
  echo "commit-msg: subject must look like type(scope): subject" >&2
  exit 1
fi

if [ "${#first}" -gt 72 ]; then
  echo "commit-msg: subject is longer than 72 characters" >&2
  exit 1
fi

branch=$(git symbolic-ref --short HEAD 2>/dev/null || true)
if printf '%s\n' "$branch" | grep -Eqi '[a-z]+-[0-9]+'; then
  if ! grep -Eq '^Refs: ' "$msg_file"; then
    echo "commit-msg: warning, no Refs: footer although the branch has a ticket key" >&2
  fi
fi
exit 0
```

Install: copy it to `.git/hooks/commit-msg` and make it executable, or point `core.hooksPath` at a shared folder. `.git/hooks` is not shared by cloning, so each developer installs it.
