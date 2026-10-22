# Plan table

The one table the user approves before anything is written. Every row says what will happen and whether it already exists.

Language: the table, ticket titles and ticket descriptions use the language the user is chatting in. The PRD document keeps the source's language, because it is converted faithfully.

## Shape

One table, one row per object. Columns: Kind, Name or title, Details, Assignee, Dates, Action.

| Kind | Name or title | Details | Assignee | Dates | Action |
|---|---|---|---|---|---|
| project | VER Verifier Agent | priority HIGH, lead Sam | Sam | 2026-11-01 to 2027-01-15 | create |
| repo | acme/verifier-agent | `gh repo create acme/verifier-agent --private`, then link | | | create |
| document | PRD: Verifier Agent | template prd, published after approval | | | create |
| milestone | M1 Foundations | from section 6, Implementation Plan | | to 2026-11-15 | create |
| ticket | Add verifier config schema | goal, scope, acceptance, type FEAT, priority NORMAL, milestone M1 | Sam (caller, source names nobody) | | create |
| ticket | Wire webhook intake | milestone M1 | Alex | | reuse SYN-12 |

Under the table, list open questions from the source. Sources that are not tasks (goals, open questions, risks) are not tickets unless the user says so.

## Row rules

- **project**: name is the source's own title. Key is 2-10 uppercase letters: the initials of the name's significant words when that gives 2 or more letters, else the first 3-5 letters of the single word; checked against `list_projects`; on a clash, propose another and let the user pick. Short description; priority NORMAL unless the source says otherwise; lead is the caller (`get_profile`, flagged in the table) when the source names nobody, members only from `list_assignees`; start and end dates only if the source states them. Existing project: Action reuse, no other change.
- **repo**: filled in from repo-states.md. Show the exact `gh` command when one will run. If `gh` is missing, the row says "later".
- **document**: title taken from the source's own title; template `prd`; content is the source converted faithfully, not rewritten into the four template sections; published after approval. The Details cell gives the size (headings and characters) and the Knowledge space state (see "Knowledge space" in execution-and-rerun.md). Approving this row is the user's agreement to publish that converted content as it stands; anything left out (secrets) or flagged (instruction-like text) is listed under the table. When the source is itself a Knowledge document, the row is that document (reuse): nothing is created or published, the tickets are only linked to it.
- **milestone**: from the source's own milestone, phase or implementation-plan headings (the sample PRD's section 6 gives M1 to M5). None found: ask the user.
- **ticket granularity**: one ticket per deliverable or task item the source itself lists under a milestone, with its own acceptance criteria. Do not split below the source's granularity and do not merge items from different milestones. A milestone with no itemised tasks becomes one ticket per stated goal.
- **draft sources**: a source marked Draft, or with undecided questions, is still ticketed. List each open question under the table and ask whether to continue before writing; tickets that depend on an open decision say so in Notes.
- **ticket**: title at most 200 characters, imperative, unique in the project. Description is Goal, Scope, Acceptance criteria and Notes, as in `sync-tickets`, plus a last line with the PRD document title and URL. The URL line is a deliberate choice: the document is created before the tickets, and one irreversible comment per ticket would only add noise. Type is an uppercase Conventional Commit type; priority defaults to NORMAL; milestone from the milestone rows; dates only from the source.
- **assignee**: `create_ticket` requires one. Take it from `list_assignees`; when the source names nobody, default to the caller from `get_profile` and flag that in the table. Never invent a name.

## What cannot be set over MCP

- Status: new tickets are BACKLOG.
- A ticket's own repository: the repo is shown once at project level. Ticket-level repository stays a choice in the Sync UI.
- A link from a ticket to a document at creation: see "Why the link is last" in execution-and-rerun.md.

## Limits

At most 50 tickets per run, because a document links at most 50 tickets. More than that: ask the user to split the work into runs.
