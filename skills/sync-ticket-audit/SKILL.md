---
name: sync-ticket-audit
description: Use when the user asks to audit, groom or clean up Sync by RedPumpkin tickets — "which tickets are stale", "audit the backlog", "check ticket quality", tickets with outdated descriptions, missing dates, or status that does not match the work.
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Reviews tickets for stale descriptions, missing criteria, dates or milestones, and mismatched status, and lists findings with suggested fixes. Read-only."
  example: "Audit my tickets in project GTN"
  chat: "true"
argument-hint: "[project-key-or-search]"
effort: low
---

# sync-ticket-audit

Finds what is wrong with tickets and says how to fix it. It writes nothing; the user decides what to fix, and fixes go through `sync-tickets` (grooming) or `sync-timeline` (dates).

Sync tools may carry a client prefix; this skill uses bare names. If they are not listed, search for them first.

## Steps

1. **Scope:** the user's tickets (assignee from `get_profile`) in the project or search the user names. Others' tickets only when named.
2. **Read** each ticket with `get_ticket` and `list_ticket_comments`.
3. **Check** each ticket against this list:

   | Check | Severity |
   |---|---|
   | Status contradicts evidence (work finished but IN_REVIEW; started but BACKLOG) | high |
   | Description holds stale phrases ("schedule TBD", "temporary PIC") | high |
   | No acceptance criteria | medium |
   | No start or end date; no milestone | medium |
   | IN_REVIEW or DONE with no `[DONE]` comment (fix: post the structured `[DONE]` via sync-complete-ticket or a comment from sync-tickets) | medium |
   | Comment without a tag (`[START]`, `[PLAN]`, `[DONE]`, `[UPDATE]`, `[BLOCKED]`, `[HANDOFF]`) | low |
   | Comment body not in the user's language | low |

4. **Report** findings grouped by ticket, each with severity and the suggested fix, then a one-line count per severity. Say plainly when a ticket is clean.
5. **Offer** to apply the fixes via `sync-tickets` or `sync-timeline`. Do not apply them from here.
