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

The optional hooks below catch a wrong format in any tool. Per-tool MCP install steps live in the Sync app at `https://sync.redpumpkin.ai/settings/mcp`.

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

## pre-push hook (optional, branch name check)

Offer this only when the user wants it, on the same terms as the commit-msg hook: ask first, show what it does, let the user copy it. It stops an agent or a person from pushing a ticket branch whose name an agent made up instead of taking it from `get_ticket_branch_name`: longer than 30 characters, uppercase, or not `[type/]key-number[-slug]`. Branches with no ticket key (`main`, `release/v1.2`), branch deletions and tags pass. The Sync server links a pushed branch to its ticket by the key, and a linked branch is then what the ticket keeps, so a long name is best stopped before the push.

```sh
#!/bin/sh
# pre-push: checks the name of every ticket branch being pushed
# shortcut: 30 is the Sync server's branch cap; change it here when the server changes it
bad=0
while read -r _ local_sha remote_ref _; do
  case "$remote_ref" in refs/heads/*) ;; *) continue ;; esac
  case "$local_sha" in *[!0]*) ;; *) continue ;; esac # all zeros: the branch is being deleted
  name=${remote_ref#refs/heads/}
  printf '%s\n' "$name" | grep -Eqi '^([a-z]+/)?[a-z][a-z0-9]*-[0-9]+(-|$)' || continue
  if [ "${#name}" -gt 30 ]; then
    echo "pre-push: branch '$name' is ${#name} characters, the limit is 30. Use the name from get_ticket_branch_name." >&2
    bad=1
  elif ! printf '%s\n' "$name" | grep -Eq '^([a-z]+/)?[a-z][a-z0-9]*-[0-9]+(-[a-z0-9]+)*$'; then
    echo "pre-push: branch '$name' must be lowercase [type/]key-number[-slug]. Use the name from get_ticket_branch_name." >&2
    bad=1
  fi
done
exit $bad
```

Install it like the commit-msg hook, as `.git/hooks/pre-push`. To fix a rejected branch locally: `git branch -m <new-name>`, then push again. `git push --no-verify` skips the hook, so it is a guardrail, not a lock.
