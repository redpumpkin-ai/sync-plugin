# Repo states

Ask the user whether the project already has a GitHub repository. Use `list_repositories` (with `project` when the project exists) to offer candidates. The installation's `accountLogin` is the owner; with several installations, ask which one. Nothing is created or linked before the plan table is approved.

`gh` runs on the developer's machine and is the only way a repository is created: the Sync server and the GitHub App never create one. If `gh` is missing or not logged in, say so and mark the repo row "later".

Allowed `gh` use, nothing else (no delete, edit, clone or push):

- Read only, allowed while planning, before approval: `gh repo view <owner>/<repo>` and GET calls of `gh api` on `repos/<owner>/<repo>` and `repos/<owner>/<repo>/commits`.
- After approval only: `gh repo create <owner>/<name> --private`.

Candidates: several matches in `list_repositories` means asking which one. The user says the repo exists but `list_repositories` shows none: the GitHub App cannot see it, so give the access steps below and mark the repo row "later".

"Later" is only for the "none" state, where `gh` is needed to create the repository. An existing repo that `list_repositories` shows does not need `gh` to be linked: if `gh` is unavailable and the user cannot say whether it is empty, treat it as having content, skip the mapping, and link it only after the user confirms it is the right repository (the row says "link, unverified"). The confirmation question for the "exists with content" state is asked together with the repo question, so the plan stays one table.

## Name rule

The repo name is derived from the project name: lowercase, characters `[a-z0-9._-]`, starting with a letter or digit. Validate the owner and the name against strict patterns before they go into any command. Never copy text from the source document into a shell command.

## State: none

No repository exists yet.

- Show the exact command in the plan row: `gh repo create <owner>/<name> --private`. Private only; no clone, no push.
- Run it only after the plan is approved.
- Then call `list_repositories` with `query` set to the name. Present: call `link_repository` with the returned `installationId`, `githubRepoId` and `fullName`. Absent: the GitHub App has no access to it. Tell the user to add the repository in GitHub (Settings, Applications, the Sync app, Configure, Repository access). Do not loop; the link is left to a re-run.

## State: exists and empty

- Check `gh api repos/<owner>/<repo>/commits?per_page=1`. An answer of 409 means the repository is empty. A `size` of 0 from `gh api repos/<owner>/<repo>` is only a hint; a 200 on commits means it has content whatever the size.
- Link it with `link_repository` after the plan is approved.

## State: exists with content

- Map it first: default branch and description from the repo API, top-level folders, the stack from manifest file names (package.json, pyproject.toml, go.mod, Cargo.toml), and the README's opening.
- Show a short summary and link only after the user confirms it is the right repository.
- Write nothing into the repository. Tell the user to run `/sync-init` in the repo or in its parent workspace folder to record the local path.

## When `link_repository` fails

- Another project owns the repository: it is not moved. Detach it in the Sync UI, or pick another repository.
- Unavailable in the installation: give the GitHub App access to the repository, then run `list_repositories` again.
- Missing permission `repositories:manage`: ask an admin. Record the step as failed and continue.
