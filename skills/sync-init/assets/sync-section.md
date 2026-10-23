<!-- sync:begin -->
## Sync by RedPumpkin

Work in this repo is tracked in Sync through the Sync MCP server. This section is managed by the `sync-init` skill; re-run it to change anything between the markers.

### Projects and repos

| Sync project | Project ID | Repo path | GitHub repo | Verify command |
|---|---|---|---|---|
{{PROJECT_ROWS}}

Repo paths are relative to this file. Run git and `gh` for a ticket in its row's repo (`git -C <path>`, `gh --repo <GitHub repo>`): the row whose GitHub repo matches the ticket's `repository`, else the row whose project matches the ticket key prefix (`SYN-12` → `SYN`). No matching row → ask the user. A new ticket goes to the project of the repo being worked in; `NONE` means ask the user.

### Ticket status follows GitHub

The Sync GitHub App moves tickets when git events happen, so an agent moves a ticket by doing the git step:

| Git event | Ticket status |
|---|---|
| Ticket branch pushed | IN_PROGRESS |
| PR opened | IN_REVIEW |
| PR approved | APPROVED |
| PR merged | DONE |
| PR closed without merge | TODO |

`change_ticket_status` is only for moves git cannot express (BACKLOG, TODO, CANCELED), and only when the user asks for it.

### Conventions

- Branch: exactly the name returned by `get_ticket_branch_name`, character for character. It may include a type prefix such as `fix/`.
- Commits: Conventional Commits in English. Subject `type(scope): subject` with type one of feat, fix, refactor, docs, test, perf, build, ci, chore, revert; imperative, 72 characters at most; the scope is the code area, never the ticket key. Body: one `- path/to/file: what changed and why` bullet per file (group by area above 12 files). Footer: `Refs: SYN-12`, the key taken from the branch name.
- PR: the title has the same `type(scope): subject` form without the key, and the description ends with `Refs: SYN-12`.
- An agent's work on a ticket ends at an open PR. Merging is a human decision.
- Run the repo's verify command before opening a PR. If it fails, fix the cause or stop; a red PR is not done.
- Write commit messages and PR descriptions in English. Write ticket text and comments in the user's language, keeping comment tags such as `[START]` and `[DONE]` in English.
- Resolve project, milestone, assignee and chat destination names with `list_projects`, `list_milestones` and `list_assignees`. If a ticket reference matches more than one ticket, ask the user.
- Before `create_ticket`, run `search_tickets` for duplicates, show the draft ticket to the user, and set its `type` (the Conventional Commit type of the work, uppercase such as `FIX`; it prefixes the branch name in lowercase).

### Sync skills

| Want to | Skill |
|---|---|
| See what's on my plate | `sync-digest` |
| Plan or create a ticket, log progress, groom | `sync-tickets` |
| Start a ticket (branch → IN_PROGRESS) | `sync-start-ticket <KEY>` |
| Finish a ticket (PR → IN_REVIEW) | `sync-complete-ticket` |
| Bring a project in line with a schedule or plan | `sync-projects` |
| Set or check ticket dates | `sync-timeline` |
| Audit tickets for stale or missing content | `sync-ticket-audit` |
| Get the digest on a schedule | `sync-schedule-digest` |
<!-- sync:end -->
