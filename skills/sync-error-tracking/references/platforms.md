# Platform notes

The steps apply everywhere. These notes cover what differs per platform. Confirm option names against the installed SDK version.

| Platform | Notes |
|---|---|
| Browser JS (React, Vue, Angular, Svelte, plain) | Posts directly; CORS is open. Stack traces stay minified because there is no source map upload. Remove the browser tracing, replay and browser session integrations. |
| Next.js, Nuxt, SvelteKit, Remix | Initialise every runtime the framework has (server, client, edge) through its documented files. Disable the build plugin's source map upload. Keep Node-only modules out of edge code. |
| Node.js, Bun, Deno servers | Frames are readable when the server code is not bundled. Flush before a short-lived process exits. |
| Flutter, Dart | `sentry_flutter` with `SentryFlutter.init` and `appRunner`. Pass the DSN with `--dart-define`. Set the traces sample rate to null or 0 and `enableAutoSessionTracking`, `attachScreenshot` and `attachViewHierarchy` to false. Do not add the Dart symbol upload plugin. Flutter web posts directly. Builds with `--obfuscate` or `--split-debug-info` give unreadable frames, and native Android or iOS crashes arrive without symbols. |
| React Native | Turn tracing and sessions off. Remove the Metro, Gradle and Xcode upload steps. JavaScript frames stay bundled. |
| Android (Kotlin, Java) | Do not apply the Sentry Gradle plugin's uploads (ProGuard mapping, native symbols, source context bundle). R8 or ProGuard frames stay obfuscated. |
| iOS, macOS (Swift, Objective-C) | Do not add the dSYM upload build phase. Crash frames arrive as addresses without function names. |
| Python (Django, Flask, FastAPI, Celery) | The SDK compresses with Brotli when the `brotli` package is installed, and Sync answers 415. Force gzip: in sentry-python 2.x, `_experiments={"transport_compression_algo": "gzip"}`. Set `in_app_include` to the repo's packages. |
| Go | Use a current `sentry-go` and check with debug logging that it posts to `/envelope/`. Call `sentry.Flush` before exit. |
| Java, Kotlin servers (Spring Boot) | Set `inAppIncludes` to the base package. |
| .NET (ASP.NET Core, workers) | Set `InAppInclude`. Keep `SendDefaultPii` false. |
| PHP (Laravel, Symfony), Ruby (Rails) | Use the framework package. Keep request bodies and user data off. |
| Rust, Elixir, others | Use the official SDK if it sends envelopes. If it only supports `/store/`, stop and report. |
| C, C++, Unity native, Electron main process | Native crash reports (minidumps) are not supported. Report managed or script errors only, and say so. |
