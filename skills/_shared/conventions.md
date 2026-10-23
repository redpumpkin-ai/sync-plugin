# Sync conventions

Shared rules for every Sync skill: comment tags, templates, approval, the wiki and ticket keys. Skills link here instead of copying. From a skill folder read it as `../_shared/conventions.md`; when the skill was uploaded as a ZIP, as `_shared/conventions.md`.

## Ticket keys

- Format `<PROJECT>-<number>`, e.g. `SYN-12`. The project key is 2-10 letters, written upper-case.
- A reference that matches more than one ticket: ask the user which one.
- Never invent project, milestone, assignee or chat destination names. Resolve them with `list_projects`, `list_milestones` and `list_assignees`.

## Language and secrets

- Tags and template labels (`[START]`, `Done:`, `Next:`) stay in English because digests and tools read them. Write everything else in the user's language.
- Comments are plain text: line breaks and `-` bullets, no markdown.
- Never put secrets, tokens, passwords, connection strings or customer data in a comment, a ticket description or a document.

## Comment tags

Start every comment with its tag.

| Tag | Use when |
|---|---|
| `[START]` | Work on the ticket begins. |
| `[PLAN]` | Multi-phase work: lists the phases. |
| `[PHASE k/N DONE]` | A phase finished. |
| `[UPDATE]` | Schedule or scope changed outside a phase. |
| `[BLOCKED]` | Work cannot proceed; says what is needed and from whom. |
| `[HANDOFF]` | Stopping on unfinished work so the next session can resume. |
| `[DONE]` | The agent's work is finished. Posted by `sync-complete-ticket` once the PR is open. |
| `[DOC]` | A document was created or updated; points to it. |
| `[QUESTION]` | The agent needs an answer before it can go on. |
| `[DECISION]` | A decision was made and should be on record. |

`[DONE]` means the agent's work is done. The ticket status still comes from the PR (IN_REVIEW until it is merged).

A `[QUESTION]` is **unanswered** until a later comment on the ticket does not start with a tag from the table above. Everything an agent posts starts with a tag, so a later untagged comment is a person's reply. `sync-digest`, `sync-run-ticket --queue` and the next-ticket suggestion share this one rule.

## Templates

Keep each comment readable in under a minute. Omit any line with nothing real to say.

### [START]

```
[START]
Plan: <one or two sentences on the approach>
Branch: <branch name from get_ticket_branch_name>
```

### [PLAN] (multi-phase work)

```
[PLAN]
Phase 1/3: <goal>
Phase 2/3: <goal>
Phase 3/3: <goal>
```

### [PHASE k/N DONE]

```
[PHASE 1/3 DONE]
Done:
- <what was built or changed, concretely>
- <files, endpoints or behaviour>
Next: Phase 2/3, <goal>
```

### [UPDATE] (schedule or scope change outside a phase)

Used by `sync-projects` when a ticket's plan or dates changed. Read the thread first; skip if an equivalent comment exists.

```
[UPDATE]
Changed: <dates, scope or owner, before → after>
Reason: <source of the change>
Next: <next step>
```

### Test section (only when the user asked for it)

Manual steps for a person. Add it to a `[PHASE k/N DONE]` or `[DONE]` comment.

```
Test (manual):
1. <step the person performs>
   Expect: <what they should see>
2. <step>
   Expect: <result>
Needs: <accounts, test data or environment, if any>
```

Say plainly what the agent verified and what is left for the person, e.g. "Not run by the agent; steps are for manual checking."

### [BLOCKED]

```
[BLOCKED]
Blocked on: <what>
Needed: <decision, access or input, and from whom>
Impact: <what cannot proceed until then>
```

### [HANDOFF]

```
[HANDOFF]
State: <where the work stands>
Left: <remaining items>
Resume: branch <name>, start at <file or step>
Open questions: <if any>
```

### [DONE]

```
[DONE]
PR: <PR url>
Summary: <one or two sentences>
Verification: <verify command> passed
Follow-ups: <anything left open, or "none">
```

### [DOC]

```
[DOC]
<document title> <document url>
Note: <what changed, on an update>
```

### [QUESTION]

```
[QUESTION]
Question: <what the agent needs answered>
Options: <the choices; say which one you recommend, if any>
Blocking: <what cannot proceed until it is answered>
```

With several questions, number them (`Question 1:`, `Question 2:`), each with its own `Options:` line, so one reply can answer "Q1 b, Q2 a".

### [DECISION]

```
[DECISION]
Decision: <what was decided>
Why: <the reason>
Rejected: <alternatives that were considered and dropped>
By: <who agreed>
```

## Progress comment content

A progress comment says what was done concretely (files, endpoints, behaviour), what changed for the user or the system, and the next step or blocker. Its facts come from this session or from the user. When you do not know what a phase actually delivered, ask the user before posting: comments cannot be edited or deleted, and one rebuilt from the `[PLAN]` reads as a record of work.

Manual test steps are opt-in. Add a `Test (manual):` section only when the user asked for it, and never claim a test ran unless it did.

## Approval

Show the plan or the exact content, wait for the user's agreement, then write. The single exception is an unattended run (below).

- `create_ticket` and `update_ticket`: the client prompt guards the write. Show the draft in your message, then make the call, without a separate "shall I proceed?" round.
- Comments cannot be edited or deleted, so show every draft first. Post `[BLOCKED]`, `[HANDOFF]`, `[DONE]`, `[QUESTION]` and `[DECISION]` only after the user agrees (an unattended run excepted). Post `[START]`, `[PLAN]`, `[PHASE k/N DONE]`, `[UPDATE]` and `[DOC]` right after showing them.
- Documents (create, update, publish) always wait for the user's agreement on the content (the hand-off document of an unattended run excepted).
- Ask before writing only when something is ambiguous: a title matches several tickets, or the project or milestone is unclear.

### Unattended run (`sync-run-ticket` only)

The user starts `sync-run-ticket` and leaves, so nobody can agree to a draft. Inside that skill, and nowhere else, the run writes without waiting:

- `[QUESTION]`, `[DECISION]` and `[BLOCKED]` comments;
- the run's hand-off document (create, publish) and its `[DOC]` comment.

`--yolo` only decides what happens at a grey area. Without it the run posts a `[QUESTION]` and skips the ticket. With it the agent chooses and posts a `[DECISION]` for each choice.

Not lifted by `--yolo` or by the user saying "don't ask me": merging or auto-merging, force-pushing, marking a PR ready (draft only), touching a ticket assigned to someone else, calling `change_ticket_status`, and putting secrets in a comment or document. Every other skill keeps the approval rules above.

## Wiki

- Every document an agent writes is linked to its ticket through `ticketIds` when it is created, and gets a `[DOC]` comment on that ticket.
- A draft is invisible to everyone else. After the user approves the content, call `publish_document` so teammates can find it through `search_documents`.
- `update_document` `ticketIds` replaces the whole link list. Pass the existing ids plus the new one.
- Run `search_documents` before creating, to avoid duplicates.
- Templates: blank, prd, meeting, roadmap, runbook, postmortem, handoff, adr.

## Next-ticket suggestion

When a ticket reaches IN_REVIEW or DONE, offer what to work on next. Offer only: start nothing until the user picks.

1. Call `get_my_work_summary`.
2. Sort `nextTickets` without the ticket that was just moved: highest priority first (URGENT, HIGH, NORMAL, LOW), the same milestone as that ticket breaking ties. Walk down the sorted list and call `list_ticket_comments` for each ticket; skip any whose thread has an unanswered `[QUESTION]`, and keep walking until you have 3 that qualify or the list ends.
3. Show key, title, priority and milestone for each, then wait for the user's pick. If nothing qualifies, say so plainly.

Two things trigger this: the `sync-guard` PostToolUse hook after `change_ticket_status` moves a ticket to IN_REVIEW or DONE (its Indonesian message in `hooks/sync-guard.mjs` must say the same thing), and the end of `sync-complete-ticket`, because a status that moves through GitHub never reaches that hook. Do not offer twice for the same ticket in one session.
