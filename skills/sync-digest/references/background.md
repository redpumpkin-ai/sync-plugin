# sync-digest background

Read this when you need the purpose of the digest, how "mine" is decided, or how Sync tool names may be prefixed.

A short, same-shape-every-time summary of what the signed-in user owns in Sync and what is waiting on them. It is read-only: it never changes tickets, comments or PRs. The Sync MCP identifies the user through their OAuth login, so "mine" always means the signed-in account.

Sync tools may carry a client prefix (e.g. `mcp__sync__search_tickets`); this skill uses bare names. If they are not listed, search for them before concluding Sync is not connected.
