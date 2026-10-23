/**
 * sync-guard: hook plugin Sync (Claude Code dan Codex) yang mengingatkan agen untuk
 * menghubungkan pekerjaan ke ticket Sync saat sesi dimulai (SessionStart), meminta
 * agen mendokumentasikan commit sebelum berhenti (Stop), dan menawarkan ticket berikutnya
 * setelah sebuah ticket dipindah ke IN_REVIEW atau DONE (PostToolUse).
 *
 * Kenapa ada: tim sering lupa membuat ticket dan mendokumentasikan pekerjaan, sehingga
 * serah terima menjadi sulit; dan pengembang yang bekerja lewat agen berhenti begitu satu
 * ticket selesai. Hook ini lokal dan deterministik: tidak pernah memanggil MCP, hanya
 * menambah konteks atau meminta agen menjalankan `/sync-tickets` atau `/sync-docs`.
 *
 * Aturan keselamatan: setiap jalur gagal keluar dengan kode 0 dan tanpa output, supaya
 * hook tidak pernah merusak sesi (kode keluar selain 0 muncul sebagai galat di setiap
 * sesi, kode 2 memblokir). SessionStart dan Stop hanya aktif di repo git yang
 * `AGENTS.md`-nya punya blok Sync dari `sync-init`; di tempat lain diam. PostToolUse
 * sengaja tanpa syarat repo: pemicunya panggilan tool status Sync yang eksplisit, itu
 * sendiri sudah bukti Sync dipakai, dan syarat repo akan membisukannya di folder
 * workspace berisi banyak repo yang didukung `sync-init` (PLAN-SyncPlugin-v0.4 Phase 5b).
 * `SYNC_HOOKS=off` mematikan ketiganya.
 *
 * Skrip ini Node murni tanpa dependensi (hanya modul `node:`), jalan di Node 18+.
 * `TICKET_REF_PATTERN` harus tetap sama dengan pola ticket-ref yang dipakai aplikasi
 * Sync (kode aplikasi tidak bisa diimpor dari repo plugin ini); test yang mengunci pola
 * itu di `sync-guard.test.mjs` menjaganya.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const TICKET_REF_PATTERN = /([A-Za-z]{2,10})-(\d+)/g;

export const NO_TICKET_REMINDER =
  "Branch ini belum terhubung ke ticket Sync. Sebelum coding, jalankan `/sync-tickets` atau `/sync-start-ticket`.";

const BRANCH_LABEL_MAX = 100;

/**
 * Key ticket pertama (huruf besar) yang ditemukan di nama branch, atau null.
 * Memakai matchAll agar state `lastIndex` regex global tidak bocor antar pemanggilan.
 */
export function extractTicketKey(branch) {
  if (typeof branch !== "string") return null;
  for (const match of branch.matchAll(TICKET_REF_PATTERN)) {
    return `${match[1]}-${match[2]}`.toUpperCase();
  }
  return null;
}

/** True bila teks AGENTS.md memuat penanda awal blok Sync dari sync-init. */
export function hasSyncBlock(text) {
  return typeof text === "string" && /<!--\s*sync:begin\s*-->/.test(text);
}

/** Satu-satunya nilai yang mematikan hook adalah `off` (tanpa peduli huruf besar/spasi). */
export function isHooksOff(env) {
  const value = env?.SYNC_HOOKS;
  return typeof value === "string" && value.trim().toLowerCase() === "off";
}

/**
 * session_id dipakai sebagai bagian nama file di folder temp, jadi dibatasi ketat agar
 * tidak bisa keluar dari folder itu (path traversal). Mengembalikan null bila tidak aman.
 */
export function sanitizeSessionId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : null;
}

export function stateFilePath(sessionId, dir = os.tmpdir()) {
  const safe = sanitizeSessionId(sessionId);
  return safe ? path.join(dir, `sync-guard-${safe}.json`) : null;
}

/**
 * Konteks yang disuntikkan ke model saat sesi mulai. Nama branch berasal dari repo yang
 * tidak tepercaya, jadi karakter kontrol dibuang, tanda kutip dan backtick diganti
 * apostrof, dan panjangnya dibatasi, agar tidak bisa dipakai menyisipkan instruksi.
 */
export function buildSessionStartContext({ branch, ticketKey }) {
  const cleaned = String(branch ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/["`]/g, "'")
    .slice(0, BRANCH_LABEL_MAX);
  const label = cleaned === "" ? "(detached HEAD)" : cleaned;
  if (ticketKey) {
    return `Sync: branch "${label}" terhubung ke ticket ${ticketKey}.`;
  }
  return `Sync: branch "${label}". ${NO_TICKET_REMINDER}`;
}

export const STOP_REASON =
  "Ada commit baru yang belum terdokumentasi di Sync. Jalankan /sync-tickets untuk [UPDATE] atau /sync-docs handoff sebelum selesai.";

export const SYNC_WRITE_TOOLS = ["add_ticket_comment", "create_document", "update_document"];

const SYNC_WRITE_PREFILTER = new RegExp(SYNC_WRITE_TOOLS.join("|"));

/** Sha commit penuh (SHA-1 40 atau SHA-256 64 hex huruf kecil); mencegah injeksi opsi ke git. */
export function isCommitSha(value) {
  return typeof value === "string" && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value);
}

function isSyncWriteName(name) {
  if (typeof name !== "string") return false;
  // Akhiran nama tool harus didahului awal string atau pemisah (`__`, `.`, `:`, `/`),
  // supaya `not_add_ticket_comment` tidak dihitung.
  return SYNC_WRITE_TOOLS.some((tool) => {
    if (!name.endsWith(tool)) return false;
    const before = name.slice(0, name.length - tool.length);
    return before === "" || /(?:__|[.:/])$/.test(before);
  });
}

const CALL_TYPES = new Set(["tool_use", "function_call", "custom_tool_call"]);

function containsSyncCall(value) {
  if (Array.isArray(value)) return value.some(containsSyncCall);
  if (!value || typeof value !== "object") return false;
  if (CALL_TYPES.has(value.type) && (isSyncWriteName(value.name) || isSyncWriteName(value.tool))) {
    return true;
  }
  return Object.values(value).some(containsSyncCall);
}

/**
 * True bila transkrip JSONL memuat pemanggilan tool penulisan Sync. Hanya objek bertipe
 * `tool_use` (Claude Code) atau `function_call` / `custom_tool_call` (Codex, best effort)
 * yang dihitung. Nama tool yang sama juga muncul tanpa ada panggilan (`tool_reference`
 * hasil ToolSearch, `shape.tools[]`, `attachment.entries[]`; terverifikasi di transkrip
 * nyata), jadi memindai kunci `name` apa saja akan membisukan hook hanya karena tool
 * ditemukan. Transkrip bisa puluhan MB, maka tiap baris disaring murah dulu sebelum
 * JSON.parse.
 */
export function transcriptHasSyncWrite(text) {
  if (typeof text !== "string" || text === "") return false;
  for (const line of text.split("\n")) {
    if (line === "" || !SYNC_WRITE_PREFILTER.test(line)) continue;
    try {
      if (containsSyncCall(JSON.parse(line))) return true;
    } catch {
      // baris rusak/terpotong: lewati
    }
  }
  return false;
}

/**
 * Aturan blokir Stop, urut: stop_hook_active (sedang lanjut karena hook, jangan loop),
 * tanpa baseline, sudah pernah memblokir, tanpa commit baru, sudah terdokumentasi, atau
 * transkrip tak terbaca (documented null): semuanya diam (fail open).
 */
export function decideStop({ stopHookActive, state, newCommitCount, documented }) {
  if (stopHookActive === true) return { block: false };
  if (!state || state.blocked === true) return { block: false };
  if (!(newCommitCount > 0)) return { block: false };
  if (documented !== false) return { block: false };
  return { block: true, reason: STOP_REASON };
}

const CHANGE_STATUS_TOOL = "change_ticket_status";

/** Hanya dua status ini yang memicu tawaran ticket berikutnya (himpunan tertutup). */
const NEXT_TICKET_STATUSES = new Set(["IN_REVIEW", "DONE"]);

/**
 * True bila nama tool adalah tool status Sync. Matcher di hooks.json sengaja longgar
 * (`change_ticket_status$`) karena hanya nama Claude Code yang terverifikasi; di sini
 * nama dicek ulang dengan batas, agar `not_change_ticket_status` tidak dihitung
 * (PLAN-SyncPlugin-v0.4 Phase 5b).
 */
export function isChangeStatusTool(name) {
  if (typeof name !== "string" || !name.endsWith(CHANGE_STATUS_TOOL)) return false;
  const before = name.slice(0, name.length - CHANGE_STATUS_TOOL.length);
  return before === "" || /(?:__|[.:/])$/.test(before);
}

/**
 * Teks tetap yang disuntikkan setelah ticket pindah ke `status`. `status` selalu berasal
 * dari himpunan tertutup IN_REVIEW/DONE; tidak ada isi `tool_input` (judul ticket bisa
 * teks bebas, vektor injeksi) yang ikut disalin. Aturan yang sama ditulis dalam bahasa
 * Inggris di `skills/_shared/conventions.md` ("Next-ticket suggestion"); test mengunci
 * teks ini.
 */
export function nextTicketContext(status) {
  return (
    "Sync: ticket baru dipindah ke " +
    status +
    ". Tawarkan ticket berikutnya: panggil `get_my_work_summary`, pilih 1-3 ticket selain yang baru dipindah " +
    "(prioritas tertinggi dulu, utamakan milestone yang sama dengan ticket tadi, lewati ticket yang punya " +
    "[QUESTION] belum terjawab di `list_ticket_comments`), tampilkan key, judul, prioritas dan milestone, " +
    "lalu tunggu user memilih. Jangan mulai mengerjakan ticket apa pun sebelum user memilih."
  );
}

/**
 * Keputusan PostToolUse. Status baru dibaca dari `tool_input.status` saja: bentuk
 * `tool_response` untuk tool MCP tidak terdokumentasi di kedua CLI, jadi hanya
 * `isError === true` yang diperiksa (panggilan gagal tidak memindahkan apa pun).
 * Bentuk lain tidak pernah mengubah keputusan dan tidak pernah melempar.
 */
export function decideNextTicket({ toolName, toolInput, toolResponse } = {}) {
  if (!isChangeStatusTool(toolName)) return { suggest: false };
  if (toolResponse?.isError === true) return { suggest: false };
  const raw = toolInput?.status;
  if (typeof raw !== "string") return { suggest: false };
  const status = raw.trim().toUpperCase();
  if (!NEXT_TICKET_STATUSES.has(status)) return { suggest: false };
  return { suggest: true, context: nextTicketContext(status) };
}

// ---------------------------------------------------------------------------
// I/O (tidak diekspor)
// ---------------------------------------------------------------------------

/** Jalankan git tanpa shell, dengan timeout; null pada galat apa pun. */
function git(cwd, args) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
  } catch {
    return null;
  }
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function readState(sessionId) {
  const file = stateFilePath(sessionId);
  if (!file) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Tulis state; `exclusive` = penulisan pertama menang (flag wx), galat ditelan. */
function writeState(sessionId, state, { exclusive }) {
  const file = stateFilePath(sessionId);
  if (!file) return;
  try {
    fs.writeFileSync(file, JSON.stringify(state), {
      mode: 0o600,
      flag: exclusive ? "wx" : "w",
    });
  } catch {
    // sengaja diam: paling buruk satu pengingat terlewat atau berlebih
  }
}

function resolveCwd(input) {
  return typeof input.cwd === "string" && input.cwd !== "" ? input.cwd : process.cwd();
}

function handleSessionStart(input) {
  if (isHooksOff(process.env)) return;

  const root = git(resolveCwd(input), ["rev-parse", "--show-toplevel"]);
  if (!root) return;

  let agentsText;
  try {
    agentsText = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
  } catch {
    return;
  }
  if (!hasSyncBlock(agentsText)) return;

  const branch = git(root, ["branch", "--show-current"]) ?? "";
  const head = git(root, ["rev-parse", "HEAD"]) ?? "";

  // Resume, clear dan compact memicu SessionStart lagi pada sesi yang sama; baseline
  // pertama harus bertahan, makanya penulisan eksklusif.
  writeState(input.session_id, { head, root, branch, blocked: false }, { exclusive: true });

  const additionalContext = buildSessionStartContext({
    branch,
    ticketKey: extractTicketKey(branch),
  });
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext },
    }),
  );
}

function readTranscript(transcriptPath) {
  if (typeof transcriptPath !== "string" || transcriptPath === "") return null;
  try {
    return fs.readFileSync(transcriptPath, "utf8");
  } catch {
    return null;
  }
}

async function handleStop(input) {
  if (isHooksOff(process.env)) return;
  // Sebelum kerja git/file apa pun: Claude Code sedang lanjut karena hook Stop (spec).
  if (input.stop_hook_active === true) return;

  const state = readState(input.session_id);
  if (!state || state.blocked === true) return;
  if (typeof state.root !== "string" || state.root === "") return;
  // head dari file temp tidak tepercaya: harus sha hex penuh sebelum menyentuh git.
  if (state.head !== "" && !isCommitSha(state.head)) return;

  const range = state.head === "" ? "HEAD" : `${state.head}..HEAD`;
  const countText = git(state.root, ["rev-list", "--count", range]);
  const newCommitCount = Number.parseInt(countText ?? "", 10);
  if (!(newCommitCount > 0)) return;

  let text = readTranscript(input.transcript_path);
  const documentedOf = (t) => (t === null ? null : transcriptHasSyncWrite(t));

  const decide = (t) =>
    decideStop({
      stopHookActive: false,
      state,
      newCommitCount,
      documented: documentedOf(t),
    });

  if (!decide(text).block) return;

  // Transkrip ditulis asinkron dan bisa tertinggal dari giliran sekarang, jadi panggilan
  // tool Sync terakhir mungkin belum ter-flush. Tunggu sebentar dan baca sekali lagi
  // sebelum memblokir.
  await new Promise((resolve) => setTimeout(resolve, 400));
  text = readTranscript(input.transcript_path);
  const decision = decide(text);
  if (!decision.block) return;

  // Tandai sudah memblokir SEBELUM mencetak: blokir paling banyak sekali per sesi.
  writeState(input.session_id, { ...state, blocked: true }, { exclusive: false });
  process.stdout.write(JSON.stringify({ decision: "block", reason: decision.reason }));
}

/** Tanpa git, state file, atau syarat repo: lihat JSDoc di kepala file. */
function handlePostToolUse(input) {
  if (isHooksOff(process.env)) return;

  const decision = decideNextTicket({
    toolName: input.tool_name,
    toolInput: input.tool_input,
    toolResponse: input.tool_response,
  });
  if (!decision.suggest) return;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: decision.context },
    }),
  );
}

async function main() {
  try {
    const mode = process.argv[2];
    let input;
    try {
      input = JSON.parse(await readStdin());
    } catch {
      return;
    }
    if (!input || typeof input !== "object") return;

    if (mode === "session-start") handleSessionStart(input);
    else if (mode === "stop") await handleStop(input);
    else if (mode === "post-tool-use") handlePostToolUse(input);
  } catch {
    // jangan pernah merusak sesi
  } finally {
    process.exitCode = 0;
  }
}

// Jangan bandingkan import.meta.url dengan argv[1]: huruf drive Windows berbeda kapitalisasi.
if (
  process.argv[2] === "session-start" ||
  process.argv[2] === "stop" ||
  process.argv[2] === "post-tool-use"
) {
  await main();
}
