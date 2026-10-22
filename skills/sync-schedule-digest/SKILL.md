---
name: sync-schedule-digest
description: Use when the user wants their Sync by RedPumpkin digest delivered on a schedule — "send me my Sync digest every morning", "schedule a daily task summary", "remind me what's on my plate each weekday". Creates a recurring task, so it runs only when the user invokes it.
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Runs sync-digest on a schedule as a Claude routine, Claude Desktop task or Codex scheduled task."
argument-hint: "[\"weekdays 09:00\"]"
effort: medium
disable-model-invocation: true
# Claude Code only. Creating the schedule is left to prompt: it is standing configuration.
allowed-tools:
  - Read
  - Bash(date *)
---

# sync-schedule-digest

Sets up a recurring run of the `sync-digest` skill. Scheduling lives in the agent client, not in Sync, so the digest arrives where that client shows scheduled runs. Nothing is pushed to chat or email.

## 1. Pick where it runs

Ask where it runs, offering only the options the user's client has: Claude cloud routine, Claude Desktop local task or Codex scheduled task. `references/platforms.md` has the table of what each one runs on and requires, and the connector steps for a cloud routine (it contains a stop gate: confirm the connector exists before going further).

## 2. Pick when

Use the argument if given, otherwise ask. Default: weekdays at 09:00. Read the user's timezone with `date` and state the resulting time explicitly, e.g. "09:00 WIB, Mon–Fri". Routines need an interval of at least one hour.

## 3. Build the prompt

Build the prompt for the chosen platform. The exact prompt for each one, including the header a cloud routine needs, is in `references/prompt.md`.

## 4. Create it

The creation steps for each platform are in `references/create.md`.

Show the user the final prompt and schedule, and create the task only after they confirm.

## 5. Test once

Trigger one run now ("Run now", or the client's equivalent) and check that the digest comes back with the expected sections. A run that says Sync is not connected means the requirement in step 1 is missing.

## Report

Where it runs, the schedule in the user's local time, where results appear, and how to pause or delete it (claude.ai/code/routines, the Desktop Routines page, or Codex **Scheduled**).
