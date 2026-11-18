# Subtasks (parent and children)

Read this when work spans several repositories, when a ticket should be split into subtasks, or when `get_ticket` returns `parent` or `children`. Paths are relative to the skill folder, not to references/.

## Server rules

- One level only: a parent ticket and its children. A child cannot itself be a parent.
- The parent has no repository, no branch/PR/commit link and no incident. It exists to group the children, not to carry work.
- `create_ticket` with `parent` (a ticket ID or key in the same project) creates a child. Create the parent first, without `repository`.
- Each ticket has at most one repository (`repository`). Cross-repo work: one parent without repository plus one child per repository.
- Branches and PRs always use the child's key (`get_ticket_branch_name` on the child). The parent never gets a branch.
- The parent's status is computed from its children. `change_ticket_status` refuses a parent; move a child instead.
- `get_ticket` returns `parent` (key, title, status) and `children` (key, title, status, repository, assignee).
- `update_ticket` cannot set `parent`: an existing ticket cannot be re-parented over MCP. Splitting a legacy multi-repo ticket is a manual decision in the Sync UI; until then it keeps the old multi-repo behavior ("One branch per ticket" in `../../_shared/conventions.md`).

## How the skills work with them

- Planning: `sync-plan-from-doc` plans one parent row without repository plus one child row per repo, and creates parents before children.
- Creating here: show the parent draft and each child draft (with its `repository` and `parent`) before `create_ticket`, as with any ticket.
- Starting: `sync-start-ticket` on a child. Given a parent, it stops and asks which child.
- Finishing: `sync-complete-ticket` per child; each child gets its own branch and PR, and the parent's status follows.
- Unattended: `sync-run-ticket` skips a parent with `[BLOCKED]` — nobody can pick a child.
- Grooming a parent: title, description, priority, assignee and milestone are editable; its status is not.