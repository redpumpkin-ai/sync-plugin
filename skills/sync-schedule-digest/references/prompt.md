# sync-schedule-digest: the prompt

Read this at step 3: the prompt to use for each platform. Paths in this file are relative to the skill folder, not to references/.

- **Desktop local task** → `/sync:sync-digest`
- **Codex** → `$sync-digest`
- **Cloud routine** → plugin skills aren't loaded there, so the prompt must stand alone. Read `../sync-digest/SKILL.md` and copy its **Collect** and **Output** sections verbatim under this header:

  ```
  Unattended scheduled run: produce the Sync digest below. Do not ask questions and do not change anything; Sync and GitHub are read-only here. If `gh` is unavailable, write "GitHub not checked".
  The user's timezone is <IANA zone, e.g. Asia/Jakarta>. The machine clock may be UTC: take today's date as `TZ=<zone> date`.
  ```

  Fill in the zone you read in step 2. Cloud containers run in UTC, so without it a run scheduled before 07:00 WIB would date the digest as yesterday.

  Copy, don't paraphrase. The digest skill is the single source of truth, so its updates reach new routines.
