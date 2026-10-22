# sync-init steps 8-10 and final checks

Read this before step 8 (writing the files) and again before reporting. Paths in this file are relative to the skill folder, not to references/.

8. **Write `AGENTS.md`.** Render `assets/sync-section.md`, replacing `{{PROJECT_ROWS}}` with one line per row: `` | SYN | <id> | `web-app` | acme/web-app | `npm test` | ``.
   - Block exists → replace everything from `<!-- sync:begin -->` to `<!-- sync:end -->` in place.
   - File exists, no block → append the block after a blank line.
   - No file → create it as `# <folder name>`, a blank line, then the block.

   Leave every line outside the markers untouched.

9. **Connect `CLAUDE.md`.**
   - Symlink to `AGENTS.md` → leave it.
   - Missing → create it containing only `@AGENTS.md`.
   - Exists without an `@AGENTS.md` line → insert `@AGENTS.md` and a blank line at the top. Keep the rest as is.
   - Contains its own `sync:begin` block → delete that block; the rules now come through the import.

   If `CLAUDE.md` holds general project rules (not Claude-specific), Codex cannot see them. Mention this and offer to move them into `AGENTS.md`, but move nothing without a yes — those rules belong to the team.

10. **Report**: files changed, the table written, and whether it was confirmed or defaulted. Repo mode: do not commit; suggest `chore: add Sync agent rules`. Workspace mode: the folder is not in git, so these files stay on this machine; suggest running `sync-init` inside each repo too so teammates get the rules.

## Quick checks before reporting

- `AGENTS.md` has exactly one `sync:begin`/`sync:end` pair, and no `{{` left in it.
- Every repo path in the table resolves with `git -C <path> rev-parse --show-toplevel`.
- `CLAUDE.md` contains `@AGENTS.md` exactly once (or is the symlink).
- Repo mode: `git status` shows changes only in `AGENTS.md` and `CLAUDE.md`.
