# sync-run-ticket steps

Read this before step 1. The git and PR mechanics are reused from `../sync-start-ticket/references/steps.md` and `../sync-complete-ticket/references/steps.md` (paths relative to the skills folder; `sync-complete-ticket` is user-only, so its steps are followed here, not invoked). Tool names have no client prefix.

## Setup (once per run)

1. `get_profile` for the signed-in user. Read the repo's `AGENTS.md` Sync section for the verify command and the Projects table (run git for a ticket in its row's repo, as the sibling steps files describe). No Sync section: stop the run and tell the user to run `sync-init`; without a verify command nothing can be shipped.
2. Pick the tickets. Keys given: `get_ticket` for each. `--queue`: `get_my_work_summary`, keep the TODO tickets in the order returned, call `list_ticket_comments` for each and drop any with an unanswered `[QUESTION]` (rule: shared conventions, Comment tags).
3. Drop, and name in the report, any ticket that is DONE, CANCELED, IN_REVIEW or APPROVED, or whose assignee is someone other than the signed-in user.

Then run steps 1-7 for one ticket at a time. Before the next ticket, switch back to the default branch so work never stacks on another ticket's branch.

## 1. Gather (about 10 tool calls)

`get_ticket` (description, repository, type, links), `list_ticket_comments` (answers to earlier `[QUESTION]`s, `[DECISION]` and `[BLOCKED]` notes), `search_documents` for documents linked to or naming the ticket, then read the repo read-only: `AGENTS.md`, the README, the folders the ticket touches. Do not create a branch, edit a file or push yet.

## 2. List grey areas

Write down every point where a reasonable developer could build something different: an ambiguous requirement, a design choice with impact (data model, public API, permissions, UX), data or access the ticket assumes but you cannot see. A point already answered in the comments or a linked document is not grey. No grey areas: go to step 4.

## 3. Ask or decide

- Default mode: post ONE `[QUESTION]` comment (shared template) with numbered questions, each with options and your recommended one, and `Blocking:` what cannot proceed. Then skip the ticket: no branch, no commit, no push, no status call. A later run reads the answers in the thread and continues. An answer is a decision: build as answered; if it opens a new grey area, ask again.
- `--yolo`: choose the smallest reversible option that fits the ticket and the repo's conventions. Post one `[DECISION]` per choice before building (Decision, Why, Rejected, `By: agent (--yolo, unattended)`), so the record exists even if the run dies. What no decision can supply (a credential, access, data that does not exist) gets a `[BLOCKED]` and the ticket is skipped.

## 4. Implement

1. Run the verify command once on the checkout as it is and note the result. Already failing: post `[BLOCKED]` (Blocked on: red baseline; your own breakage could not be told apart from it), do step 7 only if something was started, and take the next ticket.
2. Start the ticket as `../sync-start-ticket/references/steps.md` says (branch name exactly from `get_ticket_branch_name`, pushed so the GitHub App shows IN_PROGRESS). Nobody can be asked, so a dirty tree is stashed (`git stash push -u -m "before <KEY>"`, never discarded) and a repository that differs from `origin` is a `[BLOCKED]` skip.
3. Build only what the ticket and the recorded answers or decisions ask for. Commit on the ticket branch as `type(KEY): subject`, in English, where type is the ticket's `type` in lower case (pick a Conventional Commit type only when it has none).

## 5. Verify

Run the verify command. Failure 1: fix the cause and run it again. Failure 2 on the same ticket: stop. Do not push this work. Post `[BLOCKED]` (Blocked on: verification failing twice, with the command and the last lines of its output; Needed: a person to look at it; Impact), keep the work on the local ticket branch, go to step 7. Never skip, weaken or delete a test to make it pass.

## 6. Draft PR

Follow steps 6-10 of `../sync-complete-ticket/references/steps.md` (commit, catch up with the remote branch, push, open or reuse the PR, confirm the move) with these changes: open the PR with `gh pr create --draft`; never force-push (a rebase conflict is a `[BLOCKED]` stop, then step 7); if the ticket did not reach IN_REVIEW, say so in the hand-off and leave the status alone. Skip its step 11 (the ticket comment) and its closing offers (hand-off, next ticket): there is nobody to answer.

## 7. Close

This is the only place the hand-off is defined. For every ticket the run started, shipped or stopped, write the document with the `handoff` template: follow the Create steps of `../sync-docs/SKILL.md` and `../sync-docs/references/templates.md`, skipping the wait for agreement (shared conventions, "Unattended run"), then add its `[DOC]` comment. A hand-off for this ticket already exists: update it, never create a second. A ticket skipped with only a `[QUESTION]` gets no document.

Content, only from what you observed: what was built; decisions taken (or "none"); verification: the command and its real result, "not verified" for anything not run; the draft PR url, or why there is none (say if the work is unpushed); what to check first in the morning; how to resume (branch, file, step); open `[QUESTION]`s.

## After the last ticket

Give the report from SKILL.md and state how many `[QUESTION]`s are waiting: ticket comments notify nobody, so the user finds them in `sync-digest`.
