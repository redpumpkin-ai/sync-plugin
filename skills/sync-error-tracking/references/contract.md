# What Sync error ingest accepts

Sync implements a small part of the Sentry protocol. Do not assume more than this page lists.

## Endpoint and auth

- DSN: `https://<public-key>@sync.redpumpkin.ai/ingest/<project-id>`. The `/ingest` path prefix is part of the DSN and the SDK keeps it.
- The SDK derives the only endpoint from the DSN: `POST /ingest/api/<project-id>/envelope/`.
- Not available: the legacy `/store/` endpoint, the minidump endpoint, and the `/api/0/...` management API that `sentry-cli`, source map, ProGuard and dSYM uploads use.
- Auth: `sentry_key` in the query string or in the `X-Sentry-Auth` header. Both work.

## Browsers

CORS is open (`Access-Control-Allow-Origin: *`, preflight answered), so browser and Flutter web SDKs post directly. No tunnel or proxy route is needed.

## Body

- Compression: none, `gzip` or `deflate`. Brotli (`br`) or any other encoding gets 415 and the event is lost.
- Size: at most 1 MB per request as sent, 5 MB after decompression, and 100 items per envelope. A larger envelope gets 413 and is dropped whole.

## What becomes an issue

- Only `event` items: errors, exceptions and captured messages.
- Accepted but thrown away: transactions and spans, profiles, replays, sessions, check-ins, client reports and attachments. They only cost bandwidth and storage operations.
- Sync groups events by the SDK fingerprint, else by the in-app stack frames (module or file, and function), else by the message.

## Privacy

Sync removes auth and cookie headers, request bodies, query strings and user identity fields on its side. Do not rely on that: keep them out of the event.

## No symbolication

Sync cannot de-minify, de-obfuscate or symbolicate. It shows the frames exactly as the SDK sends them.

## Responses

| Status | Meaning | What to do |
|---|---|---|
| 200 `{"id": "<event id>"}` | Stored | Done |
| 401 | Wrong key, or the project id does not match the key | Check the DSN |
| 403 | The browser origin is not allowed for this project | Ask a Sync admin to allow the origin |
| 404 | Wrong path, often an old SDK posting to `/store/` | Upgrade the SDK |
| 413 | Envelope too large | Turn attachments off and keep extra data small |
| 415 | Unsupported compression | Force gzip (see `platforms.md`) |
| 429 | Rate limited; the SDK honours `Retry-After` | Nothing; lower the error volume if it is constant |
| 503 | Ingest is switched off for the project, or Sync is unavailable | Ask a Sync admin |
