# Changelog

Changes to the Sync agent plugin. Each entry lists the Sync MCP tools the skills call
("Requires: tool MCP ..."); a server release must keep every listed tool available.

## 0.4.0 - belum dirilis

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
- The skills assume the Sync server records commits on the ticket (Phase 6b) and fall back to `git log` when it does not.

## 0.3.0

Requires: tool MCP add_ticket_comment, change_ticket_status, create_milestone, create_ticket, get_profile, get_project_dates, get_ticket, get_ticket_branch_name, get_ticket_dates, list_assignees, list_milestones, list_my_pending_reviews, list_projects, list_ticket_comments, search_tickets, update_project_dates, update_ticket, update_ticket_dates

- The Sync MCP connection uses `https://sync.redpumpkin.ai/mcp` instead of the previous origin URL. Existing installs keep the old URL until the plugin is updated or the MCP server is added again.
- New skills: `sync-projects` (bring a project's ticket dates, descriptions and comments in line with a schedule, after a confirmed diff), `sync-timeline` and `sync-ticket-audit`.
- New `[UPDATE]` ticket comment template in `sync-tickets`.
- Tickets carry a type and branch names are limited to 30 characters.
