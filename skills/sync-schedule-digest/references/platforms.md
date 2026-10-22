# sync-schedule-digest: where it runs

Read this at step 1: the platform options, and the connector steps a cloud routine needs.

Ask the user, offering only the options their client has:

| Option | Runs when | Results appear in | Requires |
|---|---|---|---|
| **Claude cloud routine** | Laptop off too (min. hourly) | claude.ai/code session list (no notification) | Sync added as a **claude.ai connector**. Routines don't load plugins, so the plugin's Sync connection is not available there |
| **Claude Desktop local task** | App open and machine awake | Claude Desktop | The `sync` plugin installed |
| **Codex scheduled task** | ChatGPT/Codex desktop app running | the **Scheduled** inbox | The `sync` plugin installed |

For a cloud routine, confirm the connector exists before going further. If it doesn't, give these steps and stop:
1. Open claude.ai/customize/connectors and add a custom connector.
2. Set the URL to `https://sync.redpumpkin.ai/mcp`.
3. Set the OAuth Client ID to `sync-mcp-inspector-claude` and leave the secret empty.
4. Sign in with Keycloak.
