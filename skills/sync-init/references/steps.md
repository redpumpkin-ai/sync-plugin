# sync-init steps 1-6

Read this before step 1: why the Projects table exists, then the full text of steps 1-6.

The section also maps each Sync project to the local repo its tickets are coded in. Other Sync skills read that map to know where to branch, commit and open PRs, which matters when the agent runs in a parent folder holding several repos (e.g. `D:\work` containing `web-app/`).

Sync tools may carry a client prefix (e.g. `mcp__sync__list_projects`); this skill uses bare names.

1. **Pick the mode.** `git rev-parse --show-toplevel`:
   - Succeeds → **repo mode**. The target folder is the repo root, and it has one row with repo path `.`.
   - Fails (not a git repo) → **workspace mode**. The target folder is the current folder.

2. **Read current state** in the target folder: `AGENTS.md`, `CLAUDE.md`, and whether `CLAUDE.md` is a symlink to `AGENTS.md`. If either file has a `<!-- sync:begin -->` block, read its Projects table — on a re-run its rows are the defaults. (An older block has `Sync project:` and `Verify command:` lines instead; treat them as one row with path `.`.)

3. **Get the repo paths** (workspace mode). The user must name each folder whose tickets are tracked in Sync: paths passed as arguments count as that answer; otherwise ask. Do not pick them yourself. You may list subfolders that contain `.git` as hints. Check every path:
   - `git -C <path> rev-parse --show-toplevel` must point at that folder. If it does not, say what it points at and ask again.
   - Store the path relative to the target folder, with `/` separators, so it works on teammates' machines.

4. **Read each repo's GitHub repo**: `git -C <path> remote get-url origin`, reduced to `owner/name` (from `git@github.com:owner/name.git` or `https://github.com/owner/name`). No `origin` → `-`, and warn that Sync's GitHub App cannot move its tickets.

5. **Pick the Sync project for each row.** Existing value wins. Otherwise call `list_projects` with the repo name and propose the match. Record both the key (`SYN`) and the `id` — the key is for people, the id stays stable if the key is renamed. No match → `NONE` with id `-` in repo mode (agents will ask per ticket); in workspace mode ask, since a row without a project maps nothing.

6. **Pick each row's verify command** — the command that must pass before a PR. Existing value wins. Otherwise derive it from what that repo already runs, combining lint, typecheck and test where they exist:

   | Repo has | Example |
   |---|---|
   | `package.json` scripts | `pnpm lint && pnpm typecheck && pnpm test` (package manager from the lockfile) |
   | `Makefile` targets | `make lint && make test` |
   | `pyproject.toml` + `uv.lock` | `uv run pytest` |
   | `go.mod` | `go vet ./... && go test ./...` |
   | `Cargo.toml` | `cargo clippy && cargo test` |

   Use only scripts and targets that exist. The command runs from the repo path.
