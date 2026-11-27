#!/usr/bin/env node
/**
 * headersHelper untuk server MCP Sync di Claude Code: mencetak header X-Sync-Plugin dengan versi
 * dari plugin.json. Versi sengaja tidak ditaruh di `headers` statis .mcp.json, karena Claude Code
 * menyimpan token OAuth dengan kunci hash dari {type, url, headers}; header yang berubah tiap
 * rilis membuat token lama tidak ditemukan dan user harus login ulang (SYN-215).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.CLAUDE_PLUGIN_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(readFileSync(path.join(root, ".claude-plugin", "plugin.json"), "utf8"));
process.stdout.write(JSON.stringify({ "X-Sync-Plugin": `claude-code/${version}` }));
