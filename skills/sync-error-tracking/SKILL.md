---
name: sync-error-tracking
description: Use when the user wants to add error tracking or crash reporting to a repo with Sync by RedPumpkin, connect a project's Sentry SDK to Sync, move an app from sentry.io or GlitchTip to Sync, or asks whether a language, framework or client app (Flutter, browser, mobile) can report errors to Sync.
# Shown on Settings → MCP → Skills in Sync; not used for triggering.
metadata:
  summary: "Connects a repo to Sync error tracking with the official Sentry SDK: DSN from the environment, errors only, no uploads, readable stack traces."
  example: "Add Sync error tracking to this Flutter app"
argument-hint: "[platform-or-framework]"
effort: medium
---

# sync-error-tracking

Sync receives errors over the Sentry protocol. This skill adds the official Sentry SDK for the repo's language and points it at Sync, so errors become Sync issues and alerts and the fix agent gets readable stack traces. Any official Sentry SDK that sends envelopes works, client-only apps included (Flutter, browser, React Native, iOS, Android).

Paths are relative to the skills folder. Shared rules are in `../_shared/conventions.md` (`_shared/conventions.md` in a ZIP upload).

| Read | When |
|---|---|
| `references/contract.md` | Always, before choosing options: what Sync accepts and what it drops. |
| `references/steps.md` | Always: the integration steps and the report. |
| `references/platforms.md` | For the notes on the repo's platform. |

## The DSN

Each Sync repository has its own DSN: `https://<public-key>@sync.redpumpkin.ai/ingest/<project-id>`. Someone allowed to manage repositories copies it from the repository's Error tracking settings in the Sync app. It is a public project key, not a password, but it still belongs in environment or build configuration, never in source. Without a DSN, wire the environment variable, leave it empty, and say who must provide the value.

## Flow

1. If the repo works with Sync tickets, start from a ticket (`sync-start-ticket`) and finish with `sync-complete-ticket`.
2. Read the repo's own instruction files; they win where they are stricter.
3. Follow `references/steps.md` step by step, then report as it describes.

## Rules

- Never send anything to sentry.io: no Sentry wizard, sentry.io account, auth token or `sentry-cli`, and no source map, ProGuard, dSYM or debug-symbol upload. Sync has no upload API. Switch off a framework wrapper's default upload.
- No DSN, no reporting: the SDK stays off and the app runs normally when the DSN is unset.
- Errors only: tracing, profiling, replay, session tracking, client reports and attachments stay off, because Sync drops them.
- One initialisation and one capture helper. Extend what the repo already has.
- No personal data: default PII off, no request bodies, cookies or user identity.
- Tests mock the SDK and send nothing over the network. The live check sends one test error only when the user allows it, and the trigger is removed afterwards.
- Do not obfuscate, minify or strip more than the repo already does, and report what will stay unreadable in Sync.
