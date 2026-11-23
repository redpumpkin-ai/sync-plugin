# Steps

## 1. Look first

Find the language, the framework and every runtime the repo ships (server, browser, edge, mobile, desktop, worker), and how it loads configuration and secrets. Check whether Sentry, GlitchTip or another Sentry-compatible host is already set up. If so, change the DSN and the options below in the existing setup. Do not add a second initialisation or a second error helper.

## 2. Pick the SDK

Use the official Sentry SDK for the framework, at a current stable version: for example `@sentry/nextjs`, `@sentry/react`, `sentry_flutter`, `sentry-sdk` with the Django extra, `sentry-go`, the Spring Boot starter, `sentry-laravel`, `sentry-rails` or `Sentry.AspNetCore`. Install it with the repo's package manager. Do not run the Sentry wizard or any setup that signs in to sentry.io.

## 3. DSN from the environment

- Server code: `SENTRY_DSN`, plus `SENTRY_ENVIRONMENT` and `SENTRY_RELEASE`.
- Client bundles: the framework's build-time variable, for example `NEXT_PUBLIC_SENTRY_DSN`, `VITE_SENTRY_DSN`, `--dart-define=SENTRY_DSN=...` or a mobile build config field.
- When the DSN is unset or empty, do not initialise the SDK and do not fail. Local development and tests run without it.
- Add the variables, without values, to the repo's example env file or configuration docs.

## 4. Options

Use each SDK's own spelling.

- `environment` and `release`. The release names the build (git SHA or version) so Sync can tell which deploy introduced an error.
- Default PII off (`sendDefaultPii: false`, `send_default_pii=False`).
- Error sample rate stays 1.0.
- Tracing off: no traces sample rate or sampler, and no tracing integration. Profiling off. Replay off.
- Automatic session tracking off.
- Client reports off where the SDK has the option.
- Screenshots, view hierarchy and other attachments off.
- Compression: if the SDK may use Brotli, force gzip (see `platforms.md`).
- Keep the default error integrations: unhandled exceptions, unhandled promise rejections, framework request errors, and the logging integration if the repo already logs errors.

## 5. Readable stack traces

This is the main point: the fix agent reads these frames.

- Mark the repo's own code in-app and dependencies not in-app (Python `in_app_include` and `project_root`, Java `inAppIncludes`, .NET `InAppInclude`, the Go module path). Frame paths should resolve to files in this repo.
- Keep source context, the server SDKs' default.
- Add no upload step: no `sentry-cli`, no source map plugin, no Gradle plugin uploads, no Dart symbol plugin, no dSYM build phase. If the framework wrapper uploads by default (Next.js `withSentryConfig`, for example), disable it explicitly.
- Minified, obfuscated or stripped builds arrive unreadable. Leave existing obfuscation in place and name it in the report.

## 6. Handled errors

Where code catches an exception and only logs it (request handlers, jobs, queue consumers), also report it through one shared capture helper; reuse the repo's error or logging helper if it has one. Keep the existing behaviour after reporting. Add tags such as the job or feature name, never personal data. Do not wrap every function.

## 7. Tests

Cover what you own:

- the SDK is not initialised without a DSN;
- with a DSN it is initialised with the options above;
- the capture helper calls the SDK.

Mock the SDK. Run the repo's full verify or test command and keep it green.

## 8. Live check

Only when the user allows network use: set the real DSN, send one test error (`captureException` with a test error, or the SDK's test helper) with SDK debug logging on, and confirm a 200 with an event id. Remove the trigger afterwards. On an error status, use the table in `contract.md`; do not retry blindly. If you could not run it, say so.

## Report

- Files changed, one line each.
- The environment variables the app reads, and where each must be set (deployment environment, CI build variable, mobile build config).
- The options set, and any the SDK lacks.
- Test results, and the live check result or why it was skipped.
- What will stay unreadable in Sync (minified bundles, obfuscation, native crashes), and any SDK that did not fit `contract.md`.
