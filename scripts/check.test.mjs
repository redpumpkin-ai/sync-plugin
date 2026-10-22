/**
 * Test mutasi untuk scripts/check.mjs: setiap aturan harus MERAH pada salinan sementara yang
 * sengaja dirusak, dan HIJAU pada salinan utuh. Repo asli tidak pernah diubah.
 *
 * Kenapa salinan di os.tmpdir: pemeriksaan membaca seluruh repo, jadi cara paling jujur untuk
 * membuktikan ia gagal adalah merusak repo sungguhan versi salinan lalu menjalankannya.
 * String terlarang (nama repo aplikasi, token palsu, host asing) dirakit saat runtime supaya
 * berkas ini sendiri lolos pemeriksaan tanpa pengecualian.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, "..");
const CHECK = path.join(HERE, "check.mjs");

const tmpDirs = [];
let template;

before(() => {
  template = fs.mkdtempSync(path.join(os.tmpdir(), "sync-check-template-"));
  fs.cpSync(REPO, template, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      return base !== ".git" && base !== "node_modules";
    },
  });
  tmpDirs.push(template);
});

after(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

/** Salinan baru dari repo; fn(dir) merusaknya; mengembalikan hasil menjalankan check.mjs. */
function mutate(fn, extraArgs = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-check-case-"));
  tmpDirs.push(dir);
  fs.cpSync(template, dir, { recursive: true });
  if (fn) fn(dir);
  return runCheck(["--root", dir, "--skip-hook-tests", ...extraArgs]);
}

function runCheck(args) {
  const result = spawnSync(process.execPath, [CHECK, ...args], { encoding: "utf8" });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), "utf8");
const write = (dir, rel, text) => fs.writeFileSync(path.join(dir, rel), text);
const edit = (dir, rel, fn) => write(dir, rel, fn(read(dir, rel)));

function expectRed(result, group, fragment) {
  assert.equal(result.code, 1, `harus exit 1, dapat ${result.code}\n${result.out}`);
  const lines = result.out.split("\n").filter((l) => l.startsWith(`FAIL [${group}]`));
  assert.ok(lines.length > 0, `harus ada baris FAIL [${group}]\n${result.out}`);
  if (fragment) assert.ok(lines.some((l) => l.includes(fragment)), `FAIL [${group}] harus memuat "${fragment}"\n${lines.join("\n")}`);
}

// Rakitan runtime: tidak ada string terlarang secara harfiah di berkas ini.
const APP_NAME = ["ticketing", "orch"].join("-");
const FAKE_GH_TOKEN = ["gh", "p_", "a".repeat(36)].join("");
const FOREIGN_HOST = ["https://", "evil", ".example.net", "/x"].join("");
const FAKE_CLIENT_ID = ["sync", "mcp", "other"].join("-");
const BAD_TRIGGER = ["pull_request", "target"].join("_");
const BAD_RUNNER = ["self", "hosted"].join("-");

const firstSkill = (dir) => fs.readdirSync(path.join(dir, "skills")).filter((n) => n !== "_shared").sort()[0];

describe("check.mjs: repo utuh", () => {
  it("hijau tanpa baris WARN", () => {
    const r = mutate(null);
    assert.equal(r.code, 0, r.out);
    assert.ok(!/^WARN/m.test(r.out), r.out);
  });
});

describe("check.mjs: versi", () => {
  it("merah bila header X-Sync-Plugin Claude beda versi", () => {
    const r = mutate((d) => edit(d, ".mcp.json", (t) => t.replace(/claude-code\/\d+\.\d+\.\d+/, "claude-code/9.9.9")));
    expectRed(r, "version", "versi tidak sama");
  });

  it("merah bila versi bukan x.y.z polos", () => {
    const r = mutate((d) => edit(d, ".claude-plugin/plugin.json", (t) => t.replace(/"version": "[^"]+"/, '"version": "0.3"')));
    expectRed(r, "version", "x.y.z polos");
    const r2 = mutate((d) => edit(d, ".claude-plugin/plugin.json", (t) => t.replace(/"version": "[^"]+"/, '"version": "0.3.0-beta"')));
    expectRed(r2, "version", "x.y.z polos");
  });
});

describe("check.mjs: skill", () => {
  it("merah bila argument-hint dihapus (tidak ada mekanisme pengecualian)", () => {
    const r = mutate((d) => {
      const name = firstSkill(d);
      edit(d, `skills/${name}/SKILL.md`, (t) => t.replace(/^argument-hint:.*\n/m, ""));
    });
    expectRed(r, "skills", "argument-hint");
  });

  it("merah bila skill melewati 500 kata", () => {
    const r = mutate((d) => {
      const name = firstSkill(d);
      edit(d, `skills/${name}/SKILL.md`, (t) => t + "\n" + "kata ".repeat(520) + "\n");
    });
    expectRed(r, "skills", "kata");
  });

  it('merah bila description tidak diawali "Use when"', () => {
    const r = mutate((d) => {
      const name = firstSkill(d);
      edit(d, `skills/${name}/SKILL.md`, (t) => t.replace(/^description: .*$/m, "description: Berguna untuk sesuatu."));
    });
    expectRed(r, "skills", "Use when");
  });

  it("merah bila name beda dari nama folder", () => {
    const r = mutate((d) => {
      const name = firstSkill(d);
      edit(d, `skills/${name}/SKILL.md`, (t) => t.replace(/^name: .*$/m, "name: nama-lain"));
    });
    expectRed(r, "skills", "nama folder");
  });
});

describe("check.mjs: leak", () => {
  it("merah bila ada nama repo aplikasi", () => {
    const r = mutate((d) => {
      const name = firstSkill(d);
      edit(d, `skills/${name}/SKILL.md`, (t) => t + `\nLihat ${APP_NAME} untuk detail.\n`);
    });
    expectRed(r, "leak", "nama-repo-aplikasi");
  });

  it("merah bila ada token GitHub palsu", () => {
    const r = mutate((d) => edit(d, "README.md", (t) => t + `\n${FAKE_GH_TOKEN}\n`));
    expectRed(r, "leak", "token-github");
    assert.ok(!r.out.includes(FAKE_GH_TOKEN), "isi token tidak boleh dicetak");
  });

  it("merah bila ada client id sync-mcp-* di luar daftar", () => {
    const r = mutate((d) => edit(d, "README.md", (t) => t + `\nclient ${FAKE_CLIENT_ID}\n`));
    expectRed(r, "leak", "client-id-tidak-terdaftar");
  });

  it("merah bila ada URL dengan host di luar daftar", () => {
    const r = mutate((d) => edit(d, "README.md", (t) => t + `\n${FOREIGN_HOST}\n`));
    expectRed(r, "leak", "host-url-tidak-terdaftar");
  });

  it("client id yang terdaftar dan host yang terdaftar tetap lolos", () => {
    const r = mutate(null, ["--only", "leak"]);
    assert.equal(r.code, 0, r.out);
  });
});

describe("check.mjs: compat", () => {
  it("merah bila compat.json kurang satu tool yang dipanggil skill", () => {
    const r = mutate((d) => {
      const data = JSON.parse(read(d, "compat.json"));
      data.requiresMcpTools = data.requiresMcpTools.filter((n) => n !== "get_ticket");
      write(d, "compat.json", JSON.stringify(data, null, 2) + "\n");
    });
    expectRed(r, "compat", "get_ticket");
  });

  it("merah bila compat.json memuat tool basi yang tidak dipakai skill", () => {
    const r = mutate((d) => {
      const data = JSON.parse(read(d, "compat.json"));
      data.requiresMcpTools = [...data.requiresMcpTools, "zzz_tool_basi"].sort();
      write(d, "compat.json", JSON.stringify(data, null, 2) + "\n");
    });
    expectRed(r, "compat", "zzz_tool_basi");
  });
});

describe("check.mjs: changelog", () => {
  it("merah bila baris Requires entri teratas berbeda dari compat.json", () => {
    const r = mutate((d) => edit(d, "CHANGELOG.md", (t) => t.replace(/^(Requires: tool MCP )[a-z_]+, /m, "$1")));
    expectRed(r, "changelog", "berbeda dari compat.json");
  });
});

describe("check.mjs: workflow", () => {
  it("merah bila ada pemicu pull request versi _target", () => {
    const r = mutate((d) => edit(d, ".github/workflows/ci.yml", (t) => t.replace("  pull_request:\n", `  ${BAD_TRIGGER}:\n`)));
    expectRed(r, "workflow", "dilarang");
  });

  it("merah bila ada runner self-hosted", () => {
    const r = mutate((d) => edit(d, ".github/workflows/ci.yml", (t) => t.replace("runs-on: ubuntu-latest", `runs-on: ${BAD_RUNNER}`)));
    expectRed(r, "workflow", "dilarang");
  });

  it("merah bila action tidak dipin ke SHA penuh", () => {
    const r = mutate((d) => edit(d, ".github/workflows/ci.yml", (t) => t.replace(/actions\/checkout@[0-9a-f]{40}/, "actions/checkout@v7")));
    expectRed(r, "workflow", "SHA commit penuh");
  });
});

describe("check.mjs: mode rilis", () => {
  const version = () => JSON.parse(fs.readFileSync(path.join(REPO, ".claude-plugin/plugin.json"), "utf8")).version;

  /** Salinan dengan entri 0.3.0 dijadikan entri teratas yang final, supaya rilis bisa lulus. */
  function releaseRoot(fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-check-rel-"));
    tmpDirs.push(dir);
    fs.cpSync(template, dir, { recursive: true });
    const compat = JSON.parse(read(dir, "compat.json")).requiresMcpTools.join(", ");
    write(dir, "CHANGELOG.md", `# Changelog\n\n## ${version()} - 2026-10-30\n\nRequires: tool MCP ${compat}\n\n- Isi rilis uji.\n`);
    if (fn) fn(dir);
    return dir;
  }

  it("lulus bila tag sama dengan versi, entri final, dan menulis catatan rilis", () => {
    const dir = releaseRoot();
    const notes = path.join(dir, "notes.md");
    const r = runCheck(["--root", dir, "--release", `v${version()}`, "--notes-out", notes]);
    assert.equal(r.code, 0, r.out);
    assert.ok(read(dir, "notes.md").includes("Isi rilis uji."));
    assert.ok(!read(dir, "notes.md").includes("## "), "catatan rilis tanpa heading");
  });

  it("merah bila tag berbeda dari versi manifest", () => {
    const dir = releaseRoot();
    const r = runCheck(["--root", dir, "--release", "v9.9.9"]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /berbeda dari versi manifest/);
  });

  it('merah bila heading CHANGELOG masih "belum dirilis"', () => {
    const dir = releaseRoot((d) => edit(d, "CHANGELOG.md", (t) => t.replace(/ - 2026-10-30/, " - belum dirilis")));
    const r = runCheck(["--root", dir, "--release", `v${version()}`]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /belum dirilis/);
  });

  it("merah bila entri CHANGELOG untuk versi itu tidak ada", () => {
    const dir = releaseRoot((d) => edit(d, "CHANGELOG.md", (t) => t.replace(`## ${version()}`, "## 8.8.8")));
    const r = runCheck(["--root", dir, "--release", `v${version()}`]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /tidak punya entri/);
  });
});
