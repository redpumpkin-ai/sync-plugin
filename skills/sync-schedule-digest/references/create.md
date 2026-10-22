# sync-schedule-digest: creating the task

Read this at step 4: how to create the task on each platform.

- **Cloud routine**: run `/schedule` with the prompt and schedule. Include the Sync connector, and only that one. If the form requires a repository, pick any repo the user can access; the digest doesn't read code.
- **Desktop local task**: in a Claude Desktop session, ask Claude to create a scheduled task with the prompt and schedule, or use the Routines page → local task. From the CLI, hand the user these exact values.
- **Codex**: create the scheduled task from the Codex/ChatGPT desktop chat. For a custom cadence, use an RRULE such as `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=9;BYMINUTE=0`. If the current client can't create it, hand the user the values.
