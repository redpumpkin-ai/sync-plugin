# sync-complete-ticket steps

Read this before step 1: the intro on the `AGENTS.md` conventions, then the full text of all 11 steps, the PR body shape and the [DONE] comment shape.

Takes finished work on a Sync ticket to an open PR and tells the ticket about it. The repo's `AGENTS.md` Sync section (written by `sync-init`) holds the verify command and the commit, branch and status conventions; follow it. This skill adds the steps those rules leave out: syncing with the remote branch, reusing an existing PR, linking the ticket, and reporting back to Sync.

Sync tools may carry a client prefix (e.g. `mcp__sync__get_ticket`); this skill uses bare names.

1. **Identify the ticket and its repo.** If the `AGENTS.md` Sync section has a Projects table, the repo is the ticket's row as that section describes; run every git command below there (`git -C <path> ...`) and pass `--repo <GitHub repo>` to `gh`. No table → the current repo. Use the argument if given. Otherwise derive the key from the repo's branch (with several rows and no argument, ask which repo): `syn-29-skills-for-sync-mcp` or `feat/syn-29-skills-for-sync-mcp` → `SYN-29`. Call `get_ticket` and note its `type` (may be null). DONE or CANCELED → stop and tell the user.

2. **Be on the ticket branch.** Compare with `get_ticket_branch_name`.
   - On the default branch with uncommitted work → `git stash push -u`, switch to the ticket branch (create it from `origin/<default>` if missing), `git stash pop`. Never commit to the default branch.
   - On a different ticket's branch → stop and ask.

3. **Load the rules.** Read the verify command from the ticket's row in the `AGENTS.md` Sync section (an older section has a `Verify command:` line instead) and run it from the repo path. If there is no Sync section, ask the user for the verify command and suggest running `sync-init`.

4. **Check the work against the ticket.** Read `git diff` / `git status` next to the ticket description. If the change looks unfinished (stubs, TODOs, an acceptance item untouched), say what is missing and ask before shipping.

5. **Run the verify command.** If it fails: stop. Show the failing output and the likely cause. Do not commit, push or open a PR, and do not weaken a test to make it pass — that is the user's call.

6. **Commit.** Stage the files that belong to this ticket by name (never `.env` or other secrets). Message: `<type>(<KEY>): <summary>`, e.g. `feat(SYN-29): add sync-init skill`. When the ticket has a `type`, `<type>` is that type lowercased (`FIX` → `fix`), so the branch prefix, commits and PR title share one type. Choose the Conventional Commit type yourself only when the ticket has no type.

7. **Catch up with the remote branch.** `git fetch origin <branch>`. If `origin/<branch>` has commits you lack, `git pull --rebase origin <branch>`. On conflicts, stop and hand over to the user.

8. **Push**: `git push -u origin <branch>`.

9. **Open or reuse the PR.** `gh pr view <branch> --json url,state`:
   - OPEN → the push already updated it; keep that PR.
   - MERGED or CLOSED → stop and ask.
   - none (`gh` exits 1 with "no pull requests found": expected, not an error) → `gh pr create --base <default> --head <branch> --title "<type>(<KEY>): <summary>" --body <body>`, with the same `<type>` as the commits (step 6), body shaped as:

     ```
     ## Summary
     - <what changed, 1-3 bullets>

     ## Verification
     - `<verify command>` passed

     Ticket: [<KEY>](<ticket url from get_ticket>)
     ```

10. **Confirm the move.** Wait a few seconds, `get_ticket`. Expect IN_REVIEW for a new PR. If it did not move, tell the user (the GitHub App may not cover this repo); leave the status alone.

11. **Report to the ticket.** Draft a short plain-text comment and show it; post it with `add_ticket_comment` once the user agrees. Keep the tag and labels in English and write the rest in the user's language:

    ```
    [DONE]
    PR: <PR url>
    Summary: <one or two sentences>
    Verification: <verify command> passed
    Follow-ups: <anything left open, or "none">
    ```

    For an updated existing PR, use `[PR UPDATED]` as the tag instead.
