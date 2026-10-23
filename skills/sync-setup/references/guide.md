# Sync setup guide

Paths are relative to the skills folder. Three sections: the flow, the extra tools, the companion skills.

## The flow on one screen

```
sync-init            once per repo: the team's rules into AGENTS.md
sync-tickets         plan or create the ticket
sync-start-ticket    branch pushed -> IN_PROGRESS (also takes over an in-progress ticket without a new branch)
   work              every pushed commit is recorded on the ticket by the Sync server; nothing to run
sync-complete-ticket verify, commit, PR -> IN_REVIEW, structured [DONE]
```

The full walkthrough (daily flow, comment tags, handover, skills) is the Sync app's Guide page, section "Alur harian dengan Sync": `https://sync.redpumpkin.ai/guide#daily-flow`.

Commit recording needs the Sync server release with commit recording (Phase 6b); its deployment is belum diverifikasi. Until then the skills read the commits from `git log`.

Alongside: `sync-docs` (documents), `sync-run-ticket` (unattended, never merges), `sync-digest` (what is on my plate).

Status follows GitHub: push -> IN_PROGRESS, PR opened -> IN_REVIEW, approved -> APPROVED, merged -> DONE.

## Extra tools some skills need

| Skill | Tool | Reason | Status |
|---|---|---|---|
| sync-complete-ticket, sync-run-ticket | GitHub CLI `gh`, signed in | They run `gh pr view` and `gh pr create` (draft for the run) | Verified in the skill text |
| sync-digest | `gh` (read-only search) | PRs waiting for your review; otherwise the section says "GitHub not checked" | Verified in the skill text |
| sync-plan-from-doc | `gh` | Reads repo state and can create a private repo after approval | Verified in the skill text |
| sync-schedule-digest, cloud runs of sync-run-ticket | The claude.ai Sync connector | Cloud routines do not load plugins | Verified in README |
| Every other skill | None beyond the Sync MCP | | |

No skill calls a GitHub MCP server today. Whether an agent can substitute one for `gh` is belum diverifikasi. The list of extra MCP servers is still open with the user.

## Companion open-source skills

**The final list is pending from the user. Nothing here is a recommendation yet.**

| Sync skill | Companion | Use (as the user proposed it) | Source / install | Status |
|---|---|---|---|---|
| sync-run-ticket | `ponytail` | Planning and execution discipline for the run | Not recorded | belum diverifikasi |
| sync-docs, sync-plan-from-doc | `openspec` | Spec documents | Not recorded | belum diverifikasi |

Each entry needs its source and install method confirmed before it can leave "belum diverifikasi".
