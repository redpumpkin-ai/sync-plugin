import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  NO_TICKET_REMINDER,
  STOP_REASON,
  TICKET_REF_PATTERN,
  buildSessionStartContext,
  decideStop,
  extractTicketKey,
  hasSyncBlock,
  isCommitSha,
  isHooksOff,
  sanitizeSessionId,
  stateFilePath,
  transcriptHasSyncWrite,
} from "./sync-guard.mjs";

/**
 * Pembanding kecil pengganti pustaka assertion: hanya matcher yang dipakai file ini.
 * Dibuat lokal supaya test jalan dengan `node --test` murni, tanpa node_modules.
 */
function expect(actual) {
  const make = (negate) => {
    const check = (ok, message) => assert.ok(negate ? !ok : ok, (negate ? "tidak " : "") + message);
    return {
      toBe: (expected) => (negate ? assert.notStrictEqual(actual, expected) : assert.strictEqual(actual, expected)),
      toBeNull: () => check(actual === null, "diharapkan null, dapat " + JSON.stringify(actual)),
      toContain: (item) => check(actual.includes(item), "diharapkan memuat " + JSON.stringify(item)),
      toEqual: (expected) => (negate ? assert.notDeepStrictEqual(actual, expected) : assert.deepStrictEqual(actual, expected)),
      toMatch: (re) => check(re.test(actual), "diharapkan cocok dengan " + re),
    };
  };
  return { ...make(false), not: make(true) };
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "sync-guard.mjs");

describe("sync-guard: fungsi murni", () => {
  describe("extractTicketKey", () => {
    it("mengambil key dari nama branch dan menjadikannya huruf besar", () => {
      expect(extractTicketKey("feat/syn-54-sync-plugin-v0-4")).toBe("SYN-54");
      expect(extractTicketKey("rpk-123-fix-bug")).toBe("RPK-123");
    });

    it("mengembalikan null bila tidak ada key", () => {
      expect(extractTicketKey("main")).toBeNull();
      expect(extractTicketKey("")).toBeNull();
      expect(extractTicketKey("(detached HEAD)")).toBeNull();
    });

    it("memakai kecocokan pertama bila ada dua key", () => {
      expect(extractTicketKey("fix/abc-1-and-def-2")).toBe("ABC-1");
    });

    it("tidak meminjam state regex global antar pemanggilan", () => {
      expect(extractTicketKey("syn-1")).toBe("SYN-1");
      expect(extractTicketKey("syn-1")).toBe("SYN-1");
    });
  });

  describe("pola ticket-ref", () => {
    it("pola dikunci sama dengan pola ticket-ref yang dipakai aplikasi Sync", () => {
      expect(TICKET_REF_PATTERN.source).toBe(String.raw`([A-Za-z]{2,10})-(\d+)`);
      expect(TICKET_REF_PATTERN.flags).toBe("g");
    });
  });

  describe("hasSyncBlock", () => {
    it("true bila ada penanda sync:begin", () => {
      expect(hasSyncBlock("a\n<!-- sync:begin -->\nx\n<!-- sync:end -->\n")).toBe(true);
      expect(hasSyncBlock("<!--   sync:begin   -->")).toBe(true);
    });

    it("false tanpa penanda, teks kosong, atau undefined", () => {
      expect(hasSyncBlock("# AGENTS\nbiasa saja")).toBe(false);
      expect(hasSyncBlock("")).toBe(false);
      expect(hasSyncBlock(undefined)).toBe(false);
    });
  });

  describe("isHooksOff", () => {
    it("hanya nilai off yang mematikan hook", () => {
      expect(isHooksOff({ SYNC_HOOKS: "off" })).toBe(true);
      expect(isHooksOff({ SYNC_HOOKS: "OFF" })).toBe(true);
      expect(isHooksOff({ SYNC_HOOKS: " off " })).toBe(true);
    });

    it("nilai lain atau kosong tetap menyala", () => {
      expect(isHooksOff({})).toBe(false);
      expect(isHooksOff({ SYNC_HOOKS: "" })).toBe(false);
      expect(isHooksOff({ SYNC_HOOKS: "on" })).toBe(false);
      expect(isHooksOff({ SYNC_HOOKS: "0" })).toBe(false);
      expect(isHooksOff({ SYNC_HOOKS: "false" })).toBe(false);
    });
  });

  describe("sanitizeSessionId dan stateFilePath", () => {
    it("menerima id yang aman", () => {
      expect(sanitizeSessionId("abc-123_X")).toBe("abc-123_X");
    });

    it("menolak id berbahaya atau salah bentuk", () => {
      expect(sanitizeSessionId("../x")).toBeNull();
      expect(sanitizeSessionId("a/b")).toBeNull();
      expect(sanitizeSessionId("")).toBeNull();
      expect(sanitizeSessionId(undefined)).toBeNull();
      expect(sanitizeSessionId(42)).toBeNull();
      expect(sanitizeSessionId("a".repeat(129))).toBeNull();
      expect(sanitizeSessionId("a".repeat(128))).toBe("a".repeat(128));
    });

    it("stateFilePath menyusun nama file dan menolak id tidak valid", () => {
      expect(stateFilePath("abc", "/tmp/x")).toBe(path.join("/tmp/x", "sync-guard-abc.json"));
      expect(stateFilePath("../x", "/tmp/x")).toBeNull();
    });

    it("stateFilePath memakai os.tmpdir() secara default", () => {
      expect(stateFilePath("abc")).toBe(path.join(os.tmpdir(), "sync-guard-abc.json"));
    });
  });

  describe("buildSessionStartContext", () => {
    it("dengan key menyebut branch dan ticket", () => {
      const text = buildSessionStartContext({
        branch: "feat/syn-54-x",
        ticketKey: "SYN-54",
      });
      expect(text).toBe('Sync: branch "feat/syn-54-x" terhubung ke ticket SYN-54.');
    });

    it("tanpa key memuat pengingat spec apa adanya", () => {
      const text = buildSessionStartContext({ branch: "main", ticketKey: null });
      expect(text).toContain('Sync: branch "main".');
      expect(text).toContain(NO_TICKET_REMINDER);
      expect(NO_TICKET_REMINDER).toBe(
        "Branch ini belum terhubung ke ticket Sync. Sebelum coding, jalankan `/sync-tickets` atau `/sync-start-ticket`.",
      );
    });

    it("branch kosong ditampilkan sebagai detached HEAD", () => {
      const text = buildSessionStartContext({ branch: "", ticketKey: null });
      expect(text).toContain("(detached HEAD)");
    });

    it("membersihkan karakter kontrol, tanda kutip dan backtick", () => {
      const text = buildSessionStartContext({
        branch: 'a\nb\u0000c"d`e',
        ticketKey: null,
      });
      expect(text).toContain("abc'd'e");
      expect(text).not.toMatch(/[\u0000-\u001f]/);
    });

    it("memotong nama branch sampai 100 karakter", () => {
      const text = buildSessionStartContext({
        branch: "x".repeat(300),
        ticketKey: null,
      });
      expect(text).toContain(`"${"x".repeat(100)}"`);
      expect(text).not.toContain("x".repeat(101));
    });
  });

  describe("transcriptHasSyncWrite", () => {
    const toolUse = (name) =>
      JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name }] } });

    it("true untuk tool_use penulisan dokumentasi Sync", () => {
      expect(transcriptHasSyncWrite(toolUse("mcp__plugin_sync_sync__add_ticket_comment"))).toBe(true);
      expect(transcriptHasSyncWrite(toolUse("create_document"))).toBe(true);
      expect(transcriptHasSyncWrite(toolUse("update_document"))).toBe(true);
    });

    it("true untuk function_call gaya Codex", () => {
      const line = JSON.stringify({
        type: "response_item",
        payload: { type: "function_call", name: "mcp__sync__create_document" },
      });
      expect(transcriptHasSyncWrite(line)).toBe(true);
    });

    it("true walau ada baris rusak di sebelah baris valid", () => {
      const text = ["{bukan json add_ticket_comment", toolUse("add_ticket_comment")].join("\n");
      expect(transcriptHasSyncWrite(text)).toBe(true);
    });

    it("false untuk teks kosong dan nama tool yang mirip", () => {
      expect(transcriptHasSyncWrite("")).toBe(false);
      expect(transcriptHasSyncWrite(toolUse("publish_document"))).toBe(false);
      expect(transcriptHasSyncWrite(toolUse("get_ticket"))).toBe(false);
      expect(transcriptHasSyncWrite(toolUse("add_ticket_comments"))).toBe(false);
      expect(transcriptHasSyncWrite(toolUse("mcp__x__not_add_ticket_comment"))).toBe(false);
    });

    it("false untuk penyebutan biasa, hasil tool dan entri penemuan tool", () => {
      const lines = [
        { type: "assistant", message: { content: [{ type: "text", text: "pakai add_ticket_comment nanti" }] } },
        { type: "user", message: { content: [{ type: "tool_result", content: "add_ticket_comment" }] } },
        { type: "user", message: { content: [{ type: "tool_reference", tool_name: "mcp__plugin_sync_sync__add_ticket_comment" }] } },
        { shape: { tools: [{ name: "mcp__plugin_sync_sync__add_ticket_comment" }] } },
        { attachment: { entries: [{ name: "mcp__plugin_sync_sync__add_ticket_comment" }] } },
      ].map((o) => JSON.stringify(o));
      expect(transcriptHasSyncWrite(lines.join("\n"))).toBe(false);
    });
  });

  describe("decideStop", () => {
    const base = {
      stopHookActive: false,
      state: { head: "a".repeat(40), root: "/r", blocked: false },
      newCommitCount: 2,
      documented: false,
    };

    it("memblokir dengan alasan spec bila ada commit baru tanpa dokumentasi", () => {
      expect(decideStop(base)).toEqual({ block: true, reason: STOP_REASON });
      expect(STOP_REASON).toBe(
        "Ada commit baru yang belum terdokumentasi di Sync. Jalankan /sync-tickets untuk [UPDATE] atau /sync-docs handoff sebelum selesai.",
      );
    });

    it("tidak memblokir pada kondisi lain", () => {
      expect(decideStop({ ...base, stopHookActive: true }).block).toBe(false);
      expect(decideStop({ ...base, state: null }).block).toBe(false);
      expect(decideStop({ ...base, state: { ...base.state, blocked: true } }).block).toBe(false);
      expect(decideStop({ ...base, newCommitCount: 0 }).block).toBe(false);
      expect(decideStop({ ...base, documented: true }).block).toBe(false);
      expect(decideStop({ ...base, documented: null }).block).toBe(false);
    });
  });

  describe("isCommitSha", () => {
    it("menerima sha hex huruf kecil 40 dan 64 karakter", () => {
      expect(isCommitSha("a".repeat(40))).toBe(true);
      expect(isCommitSha("0".repeat(64))).toBe(true);
    });

    it("menolak yang lain", () => {
      expect(isCommitSha("abc1234")).toBe(false);
      expect(isCommitSha("A".repeat(40))).toBe(false);
      expect(isCommitSha("--output=x")).toBe(false);
      expect(isCommitSha("")).toBe(false);
      expect(isCommitSha(undefined)).toBe(false);
    });
  });
});

describe("sync-guard: SessionStart (proses sungguhan)", () => {
  const cleanup = [];
  let stateDir;
  let counter = 0;

  before(() => {
    stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-guard-state-"));
    cleanup.push(stateDir);
  });

  after(() => {
    for (const dir of cleanup) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // best effort
      }
    }
  });

  const uniqueId = (prefix) => `${prefix}-${process.pid}-${Date.now()}-${counter++}`;

  const git = (cwd, args) =>
    spawnSync("git", args, { cwd, encoding: "utf8" });

  const commit = (repo) =>
    git(repo, [
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@example.com",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-q",
      "--allow-empty",
      "-m",
      "x",
    ]);

  const makeRepo = ({ branch, syncBlock }) => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "sync-guard-repo-"));
    cleanup.push(repo);
    git(repo, ["init", "-q", "-b", branch]);
    fs.writeFileSync(
      path.join(repo, "AGENTS.md"),
      syncBlock
        ? "# Repo\n<!-- sync:begin -->\naturan\n<!-- sync:end -->\n"
        : "# Repo\nbiasa saja\n",
    );
    commit(repo);
    return repo;
  };

  const run = (mode, input, { env = {} } = {}) => {
    const childEnv = {
      ...process.env,
      TMPDIR: stateDir,
      TEMP: stateDir,
      TMP: stateDir,
      ...env,
    };
    if (!("SYNC_HOOKS" in env)) delete childEnv.SYNC_HOOKS;
    return spawnSync(process.execPath, [SCRIPT, mode], {
      input: typeof input === "string" ? input : JSON.stringify(input),
      encoding: "utf8",
      timeout: 20_000,
      env: childEnv,
    });
  };

  const stateFile = (sessionId) => path.join(stateDir, `sync-guard-${sessionId}.json`);

  it("branch ber-key: konteks menyebut branch dan SYN-54, baseline HEAD tersimpan", () => {
    const repo = makeRepo({ branch: "feat/syn-54-x", syncBlock: true });
    const sessionId = uniqueId("key");
    const result = run("session-start", { session_id: sessionId, cwd: repo });

    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(out.hookSpecificOutput.additionalContext).toContain("feat/syn-54-x");
    expect(out.hookSpecificOutput.additionalContext).toContain("SYN-54");

    const state = JSON.parse(fs.readFileSync(stateFile(sessionId), "utf8"));
    expect(state.head).toMatch(/^[0-9a-f]{40}$/);
    expect(state.blocked).toBe(false);
  });

  it("branch tanpa key: konteks memuat pengingat", () => {
    const repo = makeRepo({ branch: "main", syncBlock: true });
    const result = run("session-start", { session_id: uniqueId("nokey"), cwd: repo });

    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(out.hookSpecificOutput.additionalContext).toContain(NO_TICKET_REMINDER);
  });

  it("folder bukan repo git: diam, exit 0, tanpa state file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-guard-nogit-"));
    cleanup.push(dir);
    const sessionId = uniqueId("nogit");
    const result = run("session-start", { session_id: sessionId, cwd: dir });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(fs.existsSync(stateFile(sessionId))).toBe(false);
  });

  it("repo tanpa blok Sync: diam dan tanpa state file", () => {
    const repo = makeRepo({ branch: "feat/syn-1-x", syncBlock: false });
    const sessionId = uniqueId("noblock");
    const result = run("session-start", { session_id: sessionId, cwd: repo });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(fs.existsSync(stateFile(sessionId))).toBe(false);
  });

  it("SYNC_HOOKS=off: diam walau repo valid", () => {
    const repo = makeRepo({ branch: "feat/syn-2-x", syncBlock: true });
    const sessionId = uniqueId("off");
    const result = run(
      "session-start",
      { session_id: sessionId, cwd: repo },
      { env: { SYNC_HOOKS: "off" } },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(fs.existsSync(stateFile(sessionId))).toBe(false);
  });

  it("stdin bukan JSON: diam dan exit 0", () => {
    const result = run("session-start", "ini bukan json");

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("SessionStart kedua pada sesi yang sama tidak menimpa baseline pertama", () => {
    const repo = makeRepo({ branch: "feat/syn-3-x", syncBlock: true });
    const sessionId = uniqueId("twice");
    run("session-start", { session_id: sessionId, cwd: repo });
    const first = JSON.parse(fs.readFileSync(stateFile(sessionId), "utf8")).head;

    commit(repo);
    run("session-start", { session_id: sessionId, cwd: repo, source: "resume" });
    const second = JSON.parse(fs.readFileSync(stateFile(sessionId), "utf8")).head;

    expect(second).toBe(first);
  });

  describe("Stop", () => {
    const startSession = (repo, sessionId) =>
      run("session-start", { session_id: sessionId, cwd: repo });

    const writeTranscript = (lines) => {
      const file = path.join(stateDir, `transcript-${uniqueId("t")}.jsonl`);
      fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n"));
      return file;
    };

    const syncWriteLine = {
      type: "assistant",
      message: {
        content: [{ type: "tool_use", name: "mcp__plugin_sync_sync__add_ticket_comment" }],
      },
    };
    const plainLine = {
      type: "assistant",
      message: { content: [{ type: "text", text: "selesai" }] },
    };

    const freshSession = (prefix) => {
      const repo = makeRepo({ branch: "feat/syn-9-x", syncBlock: true });
      const sessionId = uniqueId(prefix);
      startSession(repo, sessionId);
      return { repo, sessionId };
    };

    it("memblokir sekali pada commit tanpa dokumentasi, lalu diam", () => {
      const { repo, sessionId } = freshSession("block");
      commit(repo);
      const transcript = writeTranscript([plainLine]);
      const input = { session_id: sessionId, cwd: repo, transcript_path: transcript };

      const first = run("stop", input);
      expect(first.status).toBe(0);
      expect(JSON.parse(first.stdout)).toEqual({ decision: "block", reason: STOP_REASON });
      expect(JSON.parse(fs.readFileSync(stateFile(sessionId), "utf8")).blocked).toBe(true);

      const second = run("stop", input);
      expect(second.status).toBe(0);
      expect(second.stdout).toBe("");
    });

    it("stop_hook_active true: diam", () => {
      const { repo, sessionId } = freshSession("active");
      commit(repo);
      const transcript = writeTranscript([plainLine]);
      const result = run("stop", {
        session_id: sessionId,
        cwd: repo,
        transcript_path: transcript,
        stop_hook_active: true,
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("transkrip memuat add_ticket_comment: diam", () => {
      const { repo, sessionId } = freshSession("doc");
      commit(repo);
      const transcript = writeTranscript([plainLine, syncWriteLine]);
      const result = run("stop", {
        session_id: sessionId,
        cwd: repo,
        transcript_path: transcript,
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("tanpa commit baru: diam", () => {
      const { repo, sessionId } = freshSession("nocommit");
      const transcript = writeTranscript([plainLine]);
      const result = run("stop", {
        session_id: sessionId,
        cwd: repo,
        transcript_path: transcript,
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("sesi tanpa SessionStart (tanpa baseline): diam", () => {
      const repo = makeRepo({ branch: "feat/syn-9-x", syncBlock: true });
      commit(repo);
      const transcript = writeTranscript([plainLine]);
      const result = run("stop", {
        session_id: uniqueId("nobase"),
        cwd: repo,
        transcript_path: transcript,
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("SYNC_HOOKS=off: diam walau ada commit tanpa dokumentasi", () => {
      const { repo, sessionId } = freshSession("stopoff");
      commit(repo);
      const transcript = writeTranscript([plainLine]);
      const result = run(
        "stop",
        { session_id: sessionId, cwd: repo, transcript_path: transcript },
        { env: { SYNC_HOOKS: "off" } },
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("transcript_path hilang atau file tidak ada: diam", () => {
      const { repo, sessionId } = freshSession("notranscript");
      commit(repo);
      const missing = run("stop", { session_id: sessionId, cwd: repo });
      expect(missing.status).toBe(0);
      expect(missing.stdout).toBe("");

      const nofile = run("stop", {
        session_id: sessionId,
        cwd: repo,
        transcript_path: path.join(stateDir, "tidak-ada.jsonl"),
      });
      expect(nofile.status).toBe(0);
      expect(nofile.stdout).toBe("");
    });

    it("state file dengan head bukan sha hex (dirusak): diam", () => {
      const { repo, sessionId } = freshSession("tamper");
      commit(repo);
      fs.writeFileSync(
        stateFile(sessionId),
        JSON.stringify({ head: "--output=x", root: repo, branch: "b", blocked: false }),
      );
      const transcript = writeTranscript([plainLine]);
      const result = run("stop", {
        session_id: sessionId,
        cwd: repo,
        transcript_path: transcript,
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe("");
    });
  });
});
