# sync-start-ticket steps

Read this before step 1: the full text of all 8 steps, including the status table. For an IN_PROGRESS ticket whose branch already has commits, read `handover.md` too.

1. **Read the ticket**: `get_ticket` with the key, ID or title the user gave. If the title matches several tickets, ask which one.

2. **Check it is startable**, by status:

   | Status | Action |
   |---|---|
   | BACKLOG, TODO | Continue. |
   | IN_PROGRESS | If the branch already has commits, follow `handover.md` instead of steps 5-7. Otherwise reuse the branch (step 5). |
   | IN_REVIEW, APPROVED | A PR is open. Continue only to address review; reuse its branch. Tell the user. |
   | DONE, CANCELED | Stop. Tell the user, and offer a follow-up ticket instead of reopening. |

   If the ticket is assigned to someone else, say so and ask before continuing.

3. **Find the repo.** If the `AGENTS.md` Sync section has a Projects table, pick the ticket's row as it describes and run every git command below in that repo path (`git -C <path> ...`). No table → the current repo. Then compare the ticket's `repository` (e.g. `acme/web-app`) with `git remote get-url origin` there. If they differ, stop and ask — the branch would land where the webhook never sees it.

4. **Protect local work**: if `git status --porcelain` is not empty, ask the user: carry the changes onto the ticket branch, stash them, or stop. If the user is unavailable, stash with `git stash push -u -m "before <KEY>"` and report how to restore it. Never discard changes.

5. **Get onto the branch**: `get_ticket_branch_name` gives `branchName`. Use it exactly as returned, character for character. It may carry a type prefix such as `fix/`; never add, drop or change a prefix yourself. Then `git fetch origin` and:
   - remote branch exists → `git switch <name>` (tracks `origin/<name>`); push in step 6 is unnecessary.
   - local branch exists → `git switch <name>`.
   - neither → `git switch -c <name> origin/<default>`, where `<default>` is from `git symbolic-ref refs/remotes/origin/HEAD` (usually `main`).

6. **Push it now**: `git push -u origin <name>`. An empty branch is fine and intended — this push is what moves the ticket.

7. **Confirm the move**: wait a few seconds, then `get_ticket`. IN_PROGRESS → done. Still BACKLOG/TODO → tell the user the webhook did not fire (likely the GitHub App is not installed on this repo); leave the status alone unless they ask.

8. **Brief the user**: title, status, priority, due date, the description, and anything decided in `list_ticket_comments`. Then propose the first concrete step. If the description is empty, say the scope is undefined and ask the user for it; offer to save their answer as a ticket comment (`add_ticket_comment`, only with their yes).
