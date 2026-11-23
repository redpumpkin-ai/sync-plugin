# Changelog

Changes to the Sync agent plugin. Each entry lists the Sync MCP tools the skills call
("Requires: tool MCP ..."); a server release must keep every listed tool available.

## 0.4.3 - belum dirilis

Requires: tool MCP add_ticket_comment, change_ticket_status, create_document, create_milestone, create_project, create_ticket, get_document, get_my_work_summary, get_profile, get_project_dates, get_ticket, get_ticket_branch_name, get_ticket_dates, link_repository, list_assignees, list_document_spaces, list_milestones, list_my_pending_reviews, list_projects, list_repositories, list_ticket_comments, post_project_update, publish_document, search_documents, search_tickets, update_document, update_project_dates, update_ticket, update_ticket_dates

- `sync-setup` offers an optional `pre-push` git hook (`references/commit-rules.md`) that rejects a ticket branch whose name is longer than 30 characters or is not lowercase `[type/]key-number[-slug]`, so a name an agent invented is stopped before the Sync server links it to the ticket. Install it like the commit-msg hook; `git push --no-verify` skips it.
- New skill `sync-error-tracking`: connects a repo to Sync error tracking with the official Sentry SDK for its language (client-only apps such as Flutter, browser and mobile included). It reads the DSN from the environment and reports nothing without one, sends errors only (tracing, sessions, replay and attachments off), never runs the Sentry wizard or an upload step, and marks the repo's own frames in-app. `references/` lists exactly what Sync ingest accepts, the steps and per-platform notes.

## 0.4.2 - 2026-11-18

Requires: tool MCP add_ticket_comment, change_ticket_status, create_document, create_milestone, create_project, create_ticket, get_document, get_my_work_summary, get_profile, get_project_dates, get_ticket, get_ticket_branch_name, get_ticket_dates, link_repository, list_assignees, list_document_spaces, list_milestones, list_my_pending_reviews, list_projects, list_repositories, list_ticket_comments, post_project_update, publish_document, search_documents, search_tickets, update_document, update_project_dates, update_ticket, update_ticket_dates

Needs the Sync server with sub-tasks and one repository per ticket: `create_ticket` accepts `parent` and a single `repository` (`repositories` is deprecated), `get_ticket` returns `parent` and `children`, and `change_ticket_status` refuses a parent whose status is computed from its children.

- One branch per ticket, in the shared conventions and the `sync-init` block: more work on a ticket (after a merge, a review follow-up, an addition) goes on the same branch as a new PR, never a second branch. Only the ticket's first PR moves its status, so a follow-up PR leaves a DONE ticket DONE.
- One ticket, one repository. Cross-repo work is a parent ticket without repository plus one child per repository; branches and PRs always use the child's key. Legacy multi-repo tickets keep the old behavior (the same branch name in each repo, one PR per repo) until they are split.
- New `sync-tickets/references/subtasks.md`: the parent/child rules (one level, parent without repository or links, status computed from children, no re-parenting over MCP) and how each skill works with them.
- `sync-start-ticket` checks `origin` against the ticket's single `repository` and stops on a parent ticket to pick a child; it still accepts a DONE ticket for more work on the same branch (merging `origin/<default>` first, or recreating a branch deleted after its merge).
- `sync-complete-ticket` opens a new PR when the branch's earlier PR is merged and no longer expects IN_REVIEW from a later PR; a parent is completed through its children, and the per-repo run remains only for legacy multi-repo tickets.
- `sync-tickets` and `sync-plan-from-doc` set a single `repository` on `create_ticket`; `sync-plan-from-doc` plans cross-repo work as one parent row without repository plus one child row per repo, parents created before children.
- `sync-run-ticket` skips a parent ticket with `[BLOCKED]`: nobody can pick a child unattended.
- `sync-projects` names `post_project_update` for the optional project update post (an explicit yes is required; progress is computed from tickets). The tool is now listed in compat.json.

## 0.4.1 - 2026-10-27

Requires: tool MCP add_ticket_comment, change_ticket_status, create_document, create_milestone, create_project, create_ticket, get_document, get_my_work_summary, get_profile, get_project_dates, get_ticket, get_ticket_branch_name, get_ticket_dates, link_repository, list_assignees, list_document_spaces, list_milestones, list_my_pending_reviews, list_projects, list_repositories, list_ticket_comments, publish_document, search_documents, search_tickets, update_document, update_project_dates, update_ticket, update_ticket_dates

- `sync-plan-from-doc` lists unlinked repositories with `list_repositories` without `project` or with a `query`, since the server now returns only linked repositories when given just a `project`.
- `sync-docs` reads a document with `includeContent:true` before update, publish and a 409 retry, so it keeps getting the Tiptap content once `get_document` defaults to plain text.
- A new SessionStart hook (`update-check`, `startup` only) tells you when `main` on GitHub has a newer plugin version, with the update commands for Claude Code and Codex. At most one request per 24 hours, failures cached, any folder, never calls Sync; `SYNC_HOOKS=off` disables it.

## 0.4.0 - 2026-10-23

Requires: tool MCP add_ticket_comment, change_ticket_status, create_document, create_milestone, create_project, create_ticket, get_document, get_my_work_summary, get_profile, get_project_dates, get_ticket, get_ticket_branch_name, get_ticket_dates, link_repository, list_assignees, list_document_spaces, list_milestones, list_my_pending_reviews, list_projects, list_repositories, list_ticket_comments, publish_document, search_documents, search_tickets, update_document, update_project_dates, update_ticket, update_ticket_dates

- Shared conventions for approval, language, tags and secrets live in `skills/_shared/conventions.md`; skills point to it instead of repeating the rules.
- New skill `sync-docs`: write, find, update and publish Sync Knowledge documents (hand-off note, ADR, PRD, runbook, postmortem, meeting notes, roadmap) from a template, linked to the ticket, published after you approve.
- New skill `sync-plan-from-doc`: read a PRD or project document and propose one approval table of project, milestones, tickets, assignees, repo and PRD document; nothing is created before you approve.
- New hooks (`hooks/sync-guard.mjs`): a SessionStart reminder to link the branch to a ticket and a Stop reminder, at most once per session, to document new commits. They run only in repos with the Sync block from `sync-init`; `SYNC_HOOKS=off` turns them off.
- New hook: after `change_ticket_status` moves a ticket to IN_REVIEW or DONE, the agent proposes up to three next tickets and waits for your pick; `SYNC_HOOKS=off` turns it off.
- `sync-tickets` is slimmer: shared rules moved to the conventions file.
- `sync-complete-ticket` offers a hand-off document after the ticket comment, then the same next-ticket suggestion (a status moved by GitHub skips the hook).
- New skill `sync-run-ticket`: carries tickets to a draft PR without supervision (`--queue` for your TODO tickets). At a grey area it posts a numbered `[QUESTION]` and skips the ticket; `--yolo` decides and logs a `[DECISION]` for each choice. Never merges or force-pushes; stops a ticket after two failed verifications. Claude Code and Codex locally are supported, a cloud routine is not yet verified, Codex cloud is not supported.
- Shared conventions: the "Unattended run" exception to approval (only `sync-run-ticket`), one rule for an unanswered `[QUESTION]`, and numbered questions.
- `sync-digest` lists tickets with an unanswered `[QUESTION]` under "Needs you now", since ticket comments notify nobody.
- The `sync` router lists the new skills.
- The plugin now lives in its own repository (`redpumpkin-ai/sync-plugin`) with CI checks, a release workflow, `compat.json` and an Apache-2.0 license.
- Long skills moved detail into `references/` without behavior change, and every skill now declares an `argument-hint`.
- `sync-complete-ticket` posts a structured `[DONE]` comment (Summary, Decisions, What changed, Verification, Not finished, How to continue, References, Written by) built from the ticket's commits and earlier decision comments.
- One commit and PR format in the shared conventions: `type(scope): subject`, the ticket key in a `Refs:` footer, the PR title without the key. The `sync-init` block carries the same rule.
- `sync-start-ticket` takes over an in-progress ticket whose branch already has commits, without a new branch or push.
- `sync-run-ticket` closes a shipped ticket with `[DONE]` and a stopped one with `[HANDOFF]`; the hand-off document is optional.
- `sync-ticket-audit` reports IN_REVIEW or DONE tickets that have no `[DONE]` comment.
- New skill `sync-setup`: commit-message rules per tool with an optional commit-msg hook, the skill flow, extra tools and companion skills.
- The commit and PR rule is now one text shared with the Sync app (Settings -> MCP and the Guide page), and the Guide explains the daily flow, comment tags, handover and skills.
- The skills assume the Sync server records commits on the ticket (Phase 6b) and fall back to `git log` when it does not.

## 0.3.0

Requires: tool MCP add_ticket_comment, change_ticket_status, create_milestone, create_ticket, get_profile, get_project_dates, get_ticket, get_ticket_branch_name, get_ticket_dates, list_assignees, list_milestones, list_my_pending_reviews, list_projects, list_ticket_comments, search_tickets, update_project_dates, update_ticket, update_ticket_dates

- The Sync MCP connection uses `https://sync.redpumpkin.ai/mcp` instead of the previous origin URL. Existing installs keep the old URL until the plugin is updated or the MCP server is added again.
- New skills: `sync-projects` (bring a project's ticket dates, descriptions and comments in line with a schedule, after a confirmed diff), `sync-timeline` and `sync-ticket-audit`.
- New `[UPDATE]` ticket comment template in `sync-tickets`.
- Tickets carry a type and branch names are limited to 30 characters.
