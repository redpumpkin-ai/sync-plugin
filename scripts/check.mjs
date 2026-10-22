#!/usr/bin/env node
/**
 * Pemeriksaan tunggal repo plugin Sync. Dipakai apa adanya oleh ci.yml, release.yml dan
 * dijalankan lokal, supaya aturan tidak pernah berbeda antara CI dan mesin pengembang.
 *
 *   node scripts/check.mjs [--root DIR] [--only g1,g2] [--skip-hook-tests]
 *   node scripts/check.mjs --release vX.Y.Z [--notes-out FILE]
 *
 * Kenapa satu skrip tanpa dependensi: repo ini publik dan sengaja tidak punya package.json
 * atau node_modules, jadi tidak ada rantai pasok yang perlu dipercaya. Node 18+ cukup.
 *
 * Tidak ada berkas pengecualian dan tidak ada ratchet: aturan berlaku sama untuk semua skill.
 * Kalau sebuah aturan terasa terlalu ketat, ubah aturannya di PR sendiri, bukan lewat
 * pengecualian diam-diam.
 *
 * Grup: json, version, skills, compat, changelog, workflow, leak, hooks.
 * Kode keluar 1 bila ada FAIL. Keluaran hanya PASS/FAIL/WARN per baris dengan tag [grup];
 * WARN disediakan untuk saran non-aturan dan repo yang dirilis tidak boleh menghasilkannya.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Daftar yang sengaja dibuat eksplisit (L-10). Menambah isi daftar ini harus lewat PR dengan
// alasan tercatat; apa pun di luar daftar membuat grup leak gagal.
// ---------------------------------------------------------------------------

/** Client id OAuth publik (tanpa secret) yang memang diketik pengguna. */
export const ALLOWED_CLIENT_IDS = ["sync-mcp-cli", "sync-mcp-inspector-claude"];

/** Host URL yang boleh muncul di berkas repo. */
export const ALLOWED_URL_HOSTS = [
  "sync.redpumpkin.ai",
  "github.com",
  "agent-plugins.org",
  "127.0.0.1",
  "localhost",
  "example.com",
];

/** Berkas yang dikecualikan dari aturan host URL karena teks bakunya bukan buatan kita. */
const URL_HOST_EXEMPT_FILES = ["LICENSE"];

const MAX_SKILL_WORDS = 500;
const TOOL_VERB_PREFIXES = ["list", "search", "get", "create", "update", "publish", "post", "add", "change", "link"];
const ALL_GROUPS = ["json", "version", "skills", "compat", "changelog", "workflow", "leak", "hooks"];

// Jarum dirakit dari potongan agar skrip ini dan test-nya tidak memuat string terlarang
// secara harfiah (tanpa daftar pengecualian untuk diri sendiri).
const APP_REPO_NAME = ["ticketing", "orch"].join("-");
const APP_DB_FOLDER = ["pri", "sma/"].join("");
const PRIVATE_KEY_HEADER = ["-----BEGIN ", "[A-Z ]*PRIVATE KEY"].join("");

const LEAK_RULES = [
  { name: "nama-repo-aplikasi", re: new RegExp(APP_REPO_NAME, "i") },
  { name: "folder-database-aplikasi", re: new RegExp(APP_DB_FOLDER.replace("/", "\\/"), "i") },
  { name: "path-profil-windows", re: /[A-Za-z]:[\\/]+Users[\\/]/ },
  { name: "token-github", re: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,})/ },
  { name: "token-slack", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: "kunci-akses-aws", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "header-private-key", re: new RegExp(PRIVATE_KEY_HEADER) },
  { name: "jwt", re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/ },
  { name: "kunci-gaya-sk", re: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { name: "kunci-api-google", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  {
    name: "assignment-rahasia",
    re: /\b(?:api[_-]?key|secret|token|password)\b["']?\s*[:=]\s*["'][A-Za-z0-9_\-+/=.]{12,}["']/i,
  },
];

// ---------------------------------------------------------------------------
// Utilitas
// ---------------------------------------------------------------------------

/** Daftar berkas relatif (dengan "/") di bawah dir, melewati .git dan node_modules. */
export function walk(root, dir = root, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(root, full, out);
    else if (entry.isFile()) out.push(path.relative(root, full).split(path.sep).join("/"));
  }
  return out;
}

function readText(root, rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function readJson(root, rel) {
  return JSON.parse(readText(root, rel));
}

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

/**
 * Frontmatter dibaca dengan aturan yang sama seperti pembaca skill di aplikasi Sync:
 * key: value tingkat atas, satu level di bawah `metadata`, baris komentar dilewati.
 * Disalin (bukan diimpor) karena kode aplikasi tidak ada di repo ini.
 */
export function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const top = {};
  const metadata = {};
  let inMetadata = false;
  for (const line of (match ? match[1] : "").split(/\r?\n/)) {
    const nested = line.match(/^\s+([\w-]+):\s*(.*)$/);
    if (inMetadata && nested) {
      metadata[nested[1]] = unquote(nested[2]);
      continue;
    }
    const field = line.match(/^([\w-]+):\s*(.*)$/);
    if (!field) continue;
    inMetadata = field[1] === "metadata";
    if (!inMetadata) top[field[1]] = unquote(field[2]);
  }
  return { top, metadata, found: Boolean(match) };
}

export function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Entri CHANGELOG: heading `## x.y.z` atau `## x.y.z - keterangan`, urut dari atas. */
export function parseChangelog(text) {
  const entries = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^## (\d+\.\d+\.\d+)(?:\s+-\s+(.*))?\s*$/);
    if (heading) {
      current = { version: heading[1], suffix: heading[2] || "", lines: [], heading: line };
      entries.push(current);
      continue;
    }
    if (current) current.lines.push(line);
  }
  for (const e of entries) {
    const body = e.lines.join("\n");
    const req = body.match(/^Requires: tool MCP (.+)$/m);
    e.requires = req ? req[1].split(",").map((s) => s.trim()).filter(Boolean) : null;
    e.requiresRaw = req ? req[1] : null;
    e.body = body.replace(/^\n+/, "").replace(/\s+$/, "") + "\n";
  }
  return entries;
}

function sameSet(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
}

// ---------------------------------------------------------------------------
// Pelapor hasil
// ---------------------------------------------------------------------------

function makeReporter() {
  const results = [];
  const add = (level, group, message) => results.push({ level, group, message });
  return {
    results,
    pass: (group, message) => add("PASS", group, message),
    fail: (group, message) => add("FAIL", group, message),
    warn: (group, message) => add("WARN", group, message),
    /** Satu kondisi: PASS bila ok, FAIL bila tidak. */
    expect(group, ok, passMessage, failMessage) {
      add(ok ? "PASS" : "FAIL", group, ok ? passMessage : failMessage);
      return ok;
    },
  };
}

// ---------------------------------------------------------------------------
// Grup pemeriksaan
// ---------------------------------------------------------------------------

function checkJson(root, r) {
  const files = walk(root).filter((f) => f.endsWith(".json"));
  let allOk = true;
  const parsed = {};
  for (const f of files) {
    try {
      parsed[f] = JSON.parse(readText(root, f));
    } catch (error) {
      allOk = false;
      r.fail("json", `${f} bukan JSON valid: ${error.message}`);
    }
  }
  if (allOk) r.pass("json", `${files.length} berkas JSON valid`);

  const claudeMarket = parsed[".claude-plugin/marketplace.json"];
  if (claudeMarket) {
    const p = (claudeMarket.plugins || [])[0] || {};
    r.expect(
      "json",
      claudeMarket.name === "redpumpkin" && p.name === "sync" && p.source === "./",
      "marketplace Claude: redpumpkin / sync / source ./",
      'marketplace Claude harus bernama "redpumpkin" dengan plugin "sync" dan source "./"',
    );
  } else r.fail("json", ".claude-plugin/marketplace.json tidak ada atau tidak valid");

  const agentsMarket = parsed[".agents/plugins/marketplace.json"];
  if (agentsMarket) {
    const p = (agentsMarket.plugins || [])[0] || {};
    r.expect(
      "json",
      p.name === "sync" && p.source && p.source.path === "./",
      "marketplace Codex: plugin sync, path ./",
      'marketplace Codex harus memuat plugin "sync" dengan source.path "./"',
    );
  } else r.fail("json", ".agents/plugins/marketplace.json tidak ada atau tidak valid");

  for (const f of [".claude-plugin/plugin.json", ".codex-plugin/plugin.json"]) {
    const m = parsed[f];
    r.expect("json", Boolean(m) && m.name === "sync", `${f}: name sync`, `${f}: name harus "sync"`);
  }
}

const SEMVER = /^\d+\.\d+\.\d+$/;

/** Mengembalikan versi manifest bila konsisten, kalau tidak null (dan melapor). */
function readVersions(root) {
  const sources = {};
  const tryRead = (label, fn) => {
    try {
      sources[label] = fn();
    } catch (error) {
      sources[label] = `(gagal dibaca: ${error.message})`;
    }
  };
  tryRead(".claude-plugin/plugin.json", () => readJson(root, ".claude-plugin/plugin.json").version);
  tryRead(".codex-plugin/plugin.json", () => readJson(root, ".codex-plugin/plugin.json").version);
  tryRead(".claude-plugin/marketplace.json", () => readJson(root, ".claude-plugin/marketplace.json").plugins[0].version);
  const headerOf = (file, prefix) => () => {
    const header = readJson(root, file).mcpServers.sync.headers["X-Sync-Plugin"];
    if (typeof header !== "string" || !header.startsWith(prefix)) throw new Error(`header harus diawali ${prefix}`);
    return header.slice(prefix.length);
  };
  tryRead(".mcp.json (X-Sync-Plugin)", headerOf(".mcp.json", "claude-code/"));
  tryRead(".codex-plugin/mcp.json (X-Sync-Plugin)", headerOf(".codex-plugin/mcp.json", "codex/"));
  return sources;
}

function checkVersion(root, r) {
  const sources = readVersions(root);
  const entries = Object.entries(sources);
  const detail = entries.map(([k, v]) => `${k}=${v}`).join("; ");
  const plain = entries.every(([, v]) => typeof v === "string" && SEMVER.test(v));
  if (!r.expect("version", plain, "semua versi berbentuk x.y.z polos", `versi harus x.y.z polos tanpa awalan atau akhiran: ${detail}`)) return;
  const same = new Set(entries.map(([, v]) => v)).size === 1;
  r.expect("version", same, `versi sama di ${entries.length} tempat: ${entries[0][1]}`, `versi tidak sama: ${detail}`);
}

function manifestVersion(root) {
  try {
    return readJson(root, ".claude-plugin/plugin.json").version;
  } catch {
    return null;
  }
}

function listSkillDirs(root) {
  const dir = path.join(root, "skills");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "_shared")
    .map((e) => e.name)
    .sort();
}

function checkSkills(root, r) {
  const names = listSkillDirs(root);
  if (!names.length) r.fail("skills", "tidak ada skill di skills/");
  for (const name of names) {
    const rel = `skills/${name}/SKILL.md`;
    if (!fs.existsSync(path.join(root, rel))) {
      r.fail("skills", `${name}: SKILL.md tidak ada`);
      continue;
    }
    const text = readText(root, rel);
    const { top, metadata, found } = parseFrontmatter(text);
    const problems = [];
    if (!found) problems.push("frontmatter tidak ditemukan");
    if (top.name !== name) problems.push(`name "${top.name}" harus sama dengan nama folder "${name}"`);
    if (!/^Use when/.test(top.description || "")) problems.push('description harus diawali "Use when"');
    if (!top["argument-hint"]) problems.push("argument-hint wajib ada dan tidak kosong");
    if (!metadata.summary) problems.push("metadata.summary wajib ada dan tidak kosong");
    const words = countWords(text);
    if (words >= MAX_SKILL_WORDS) {
      problems.push(`${words} kata, batasnya di bawah ${MAX_SKILL_WORDS}; pindahkan detail ke references/`);
    }
    if (problems.length) r.fail("skills", `${name}: ${problems.join("; ")}`);
    else r.pass("skills", `${name}: frontmatter lengkap, ${words} kata`);
  }
}

/** Token snake_case dalam backtick di seluruh skills/ (SKILL.md, references, assets). */
function backtickedTokens(root) {
  const tokens = new Set();
  const files = walk(root).filter((f) => f.startsWith("skills/") && /\.(md|ya?ml)$/.test(f));
  for (const f of files) {
    for (const m of readText(root, f).matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)) tokens.add(m[1]);
  }
  return tokens;
}

function readCompat(root) {
  try {
    const data = readJson(root, "compat.json");
    return Array.isArray(data.requiresMcpTools) ? data : null;
  } catch {
    return null;
  }
}

function checkCompat(root, r) {
  const data = readCompat(root);
  if (!data) {
    r.fail("compat", "compat.json harus berupa objek dengan array requiresMcpTools");
    return;
  }
  const list = data.requiresMcpTools;
  const sorted = [...list].sort();
  r.expect(
    "compat",
    list.every((n, i) => n === sorted[i]) && new Set(list).size === list.length,
    "requiresMcpTools terurut dan unik",
    "requiresMcpTools harus terurut abjad dan tanpa duplikat",
  );
  const bad = list.filter((n) => !/^[a-z]+(_[a-z]+)+$/.test(n));
  r.expect("compat", bad.length === 0, "semua nama tool berbentuk snake_case", `nama tool tidak valid: ${bad.join(", ")}`);

  const used = backtickedTokens(root);
  const stale = list.filter((n) => !used.has(n));
  r.expect("compat", stale.length === 0, "tidak ada nama basi di compat.json", `compat.json memuat tool yang tidak dipakai skill mana pun: ${stale.join(", ")}`);
  const missing = [...used].filter((n) => TOOL_VERB_PREFIXES.includes(n.split("_")[0]) && !list.includes(n));
  r.expect("compat", missing.length === 0, "semua tool yang dipanggil skill tercatat", `skill memanggil tool yang belum ada di compat.json: ${missing.sort().join(", ")}`);
}

function checkChangelog(root, r) {
  if (!fs.existsSync(path.join(root, "CHANGELOG.md"))) {
    r.fail("changelog", "CHANGELOG.md tidak ada");
    return;
  }
  const entries = parseChangelog(readText(root, "CHANGELOG.md"));
  const version = manifestVersion(root);
  if (!entries.length) {
    r.fail("changelog", "CHANGELOG.md tidak punya entri versi (## x.y.z)");
    return;
  }
  r.expect("changelog", entries.some((e) => e.version === version), `ada entri untuk versi manifest ${version}`, `CHANGELOG.md tidak punya entri untuk versi manifest ${version}`);
  const noRequires = entries.filter((e) => !e.requires).map((e) => e.version);
  r.expect("changelog", noRequires.length === 0, "setiap entri punya baris Requires", `entri tanpa baris "Requires: tool MCP ...": ${noRequires.join(", ")}`);
  const compat = readCompat(root);
  const top = entries[0];
  if (compat && top.requires) {
    r.expect(
      "changelog",
      sameSet(top.requires, compat.requiresMcpTools),
      `Requires entri teratas (${top.version}) sama dengan compat.json`,
      `Requires entri teratas (${top.version}) berbeda dari compat.json`,
    );
  }
}

function checkWorkflow(root, r) {
  const dir = ".github/workflows";
  const files = walk(root).filter((f) => f.startsWith(dir + "/") && /\.ya?ml$/.test(f));
  if (!files.length) {
    r.fail("workflow", "tidak ada workflow di .github/workflows");
    return;
  }
  // Dirakit dari potongan agar skrip ini tidak memuat pemicu terlarang secara harfiah.
  const forbiddenTrigger = ["pull_request", "target"].join("_");
  const forbiddenRunner = ["self", "hosted"].join("-");
  for (const f of files) {
    const text = readText(root, f);
    const problems = [];
    if (text.includes(forbiddenTrigger)) problems.push(`pemicu ${forbiddenTrigger} dilarang`);
    if (text.includes(forbiddenRunner)) problems.push(`runner ${forbiddenRunner} dilarang`);
    const runners = [...text.matchAll(/^\s*runs-on:\s*(.+?)\s*$/gm)].map((m) => m[1]);
    if (!runners.length) problems.push("tidak ada runs-on");
    for (const runner of runners) if (runner !== "ubuntu-latest") problems.push(`runs-on "${runner}" harus ubuntu-latest`);
    if (!/^permissions:/m.test(text)) problems.push("blok permissions tingkat atas wajib ada");
    for (const m of text.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)) {
      const ref = m[1];
      if (ref.startsWith("./")) continue;
      if (!/@[0-9a-f]{40}$/.test(ref)) problems.push(`action "${ref}" harus dipin ke SHA commit penuh`);
    }
    if (problems.length) r.fail("workflow", `${f}: ${problems.join("; ")}`);
    else r.pass("workflow", `${f}: sesuai kebijakan`);
  }
}

function isTextBuffer(buffer) {
  return !buffer.includes(0);
}

function checkLeak(root, r) {
  const files = walk(root);
  const findings = [];
  let scanned = 0;
  for (const f of files) {
    const buffer = fs.readFileSync(path.join(root, f));
    if (buffer.length > 2_000_000 || !isTextBuffer(buffer)) continue;
    scanned++;
    const lines = buffer.toString("utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      const where = `${f}:${i + 1}`;
      for (const rule of LEAK_RULES) if (rule.re.test(line)) findings.push(`${where} [${rule.name}]`);
      for (const m of line.matchAll(/\bsync-mcp-[a-z0-9-]*[a-z0-9]/g)) {
        if (!ALLOWED_CLIENT_IDS.includes(m[0])) findings.push(`${where} [client-id-tidak-terdaftar]`);
      }
      if (!URL_HOST_EXEMPT_FILES.includes(f)) {
        for (const m of line.matchAll(/https?:\/\/([^\s/)`"'<>\]\\]+)/g)) {
          const host = m[1].replace(/^.*@/, "").replace(/:\d+$/, "").toLowerCase();
          if (!ALLOWED_URL_HOSTS.includes(host)) findings.push(`${where} [host-url-tidak-terdaftar]`);
        }
      }
    });
  }
  if (findings.length) {
    for (const finding of findings) r.fail("leak", finding);
  } else r.pass("leak", `${scanned} berkas teks bersih dari nama internal, rahasia, client id dan host tak terdaftar`);
}

function checkHooks(root, r) {
  const result = spawnSync(process.execPath, ["--test", "hooks/sync-guard.test.mjs"], { cwd: root, encoding: "utf8", timeout: 240_000 });
  if (result.status === 0) r.pass("hooks", "node --test hooks/sync-guard.test.mjs lulus");
  else {
    const tail = `${result.stdout || ""}${result.stderr || ""}`.split("\n").slice(-12).join("\n");
    r.fail("hooks", `test hook gagal (kode ${result.status})\n${tail}`);
  }
}

// ---------------------------------------------------------------------------
// Mode rilis
// ---------------------------------------------------------------------------

function checkRelease(root, r, tag, notesOut) {
  const g = "release";
  if (!/^v\d+\.\d+\.\d+$/.test(tag || "")) {
    r.fail(g, `tag "${tag}" harus berbentuk vX.Y.Z`);
    return;
  }
  const version = manifestVersion(root);
  if (!r.expect(g, tag === `v${version}`, `tag ${tag} sama dengan versi manifest`, `tag ${tag} berbeda dari versi manifest ${version}`)) return;
  const entries = fs.existsSync(path.join(root, "CHANGELOG.md")) ? parseChangelog(readText(root, "CHANGELOG.md")) : [];
  const entry = entries.find((e) => e.version === version);
  if (!r.expect(g, Boolean(entry), `CHANGELOG punya entri ${version}`, `CHANGELOG.md tidak punya entri untuk ${version}`)) return;
  r.expect(g, entries[0] === entry, "entri rilis adalah entri teratas", `entri ${version} bukan entri teratas CHANGELOG.md`);
  r.expect(
    g,
    !/belum dirilis/i.test(entry.suffix),
    "entri CHANGELOG sudah final",
    `heading entri ${version} masih bertanda "belum dirilis"; isi tanggal rilis sebelum membuat tag`,
  );
  const compat = readCompat(root);
  r.expect(
    g,
    Boolean(compat) && Boolean(entry.requires) && sameSet(entry.requires, compat.requiresMcpTools),
    "Requires entri rilis sama dengan compat.json",
    "Requires entri rilis berbeda dari compat.json",
  );
  if (notesOut && !r.results.some((x) => x.level === "FAIL")) {
    fs.writeFileSync(notesOut, entry.body);
    r.pass(g, `catatan rilis ditulis ke ${notesOut}`);
  }
}

// ---------------------------------------------------------------------------
// Entri
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { root: null, only: null, skipHookTests: false, release: null, notesOut: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") opts.root = argv[++i];
    else if (a === "--only") opts.only = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--skip-hook-tests") opts.skipHookTests = true;
    else if (a === "--release") opts.release = argv[++i];
    else if (a === "--notes-out") opts.notesOut = argv[++i];
    else throw new Error(`argumen tidak dikenal: ${a}`);
  }
  return opts;
}

export function run(argv) {
  const opts = parseArgs(argv);
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(opts.root || path.join(here, ".."));
  const r = makeReporter();

  if (opts.release !== null) {
    checkRelease(root, r, opts.release, opts.notesOut);
  } else {
    const groups = opts.only || ALL_GROUPS;
    const unknown = groups.filter((x) => !ALL_GROUPS.includes(x));
    if (unknown.length) throw new Error(`grup tidak dikenal: ${unknown.join(", ")}`);
    const table = {
      json: checkJson,
      version: checkVersion,
      skills: checkSkills,
      compat: checkCompat,
      changelog: checkChangelog,
      workflow: checkWorkflow,
      leak: checkLeak,
      hooks: opts.skipHookTests ? null : checkHooks,
    };
    for (const g of ALL_GROUPS) if (groups.includes(g) && table[g]) table[g](root, r);
  }

  const lines = r.results.map((x) => `${x.level} [${x.group}] ${x.message}`);
  const fails = r.results.filter((x) => x.level === "FAIL").length;
  const warns = r.results.filter((x) => x.level === "WARN").length;
  const passes = r.results.filter((x) => x.level === "PASS").length;
  lines.push(`Total: ${passes} lulus, ${fails} gagal, ${warns} peringatan`);
  return { output: lines.join("\n"), code: fails ? 1 : 0 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    const { output, code } = run(process.argv.slice(2));
    console.log(output);
    process.exit(code);
  } catch (error) {
    console.error(`FAIL [args] ${error.message}`);
    process.exit(1);
  }
}
