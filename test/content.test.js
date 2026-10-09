const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../seal-core.js");
const messages = require("../seal-messages.js").ja;
const db = require("../data/db.json");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("serial assumption is a boolean, not a truthy string", () => {
  const copy = structuredClone(db);
  copy.seals[0].meta.hasSerial = "false";
  assert.equal(core.validateDatabase(copy), false);
});
test("each trace and prerequisite has a readable label", () => {
  for (const item of db.inspections) for (const key of item.detects) assert.ok(messages[key], key);
  for (const key of ["materialDependent", "serialNotProof", "noSerial", "baselineRequired", "transmissionRequired", "opaqueSurface", "uvNotThermal"]) assert.ok(messages[key], key);
});
test("all shipped references are safe and belong to reviewed primary sources", () => {
  const hosts = new Set(["www.lintec.co.jp", "digital.library.unt.edu", "oem.flir.com"]);
  for (const group of ["scenes", "seals", "attacks", "inspections", "scenarios"]) for (const item of db[group]) {
    for (const ref of item.refs) {
      assert.ok(core.safeReference(ref.url), ref.url);
      assert.ok(hosts.has(new URL(ref.url).hostname));
      assert.ok(ref.title);
    }
    for (const image of item.images) {
      assert.ok(core.safeImage(image.src));
      assert.ok(fs.existsSync(path.join(__dirname, "..", image.src)));
    }
  }
});
test("rendering uses text nodes instead of HTML or script execution sinks", () => {
  assert.doesNotMatch(read("script.js"), /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new Function/);
  assert.doesNotMatch(read("script.js"), /\.style\./);
});
test("CSP allows local scripts and styles only and does not claim header-only protection", () => {
  const html = read("index.html");
  assert.match(html, /script-src 'self'; style-src 'self';/);
  assert.match(html, /object-src 'none'; base-uri 'none';/);
  assert.doesNotMatch(html, /unsafe-inline|unsafe-eval|frame-ancestors|http-equiv="X-Frame-Options"|http-equiv="X-Content-Type-Options"/);
});
test("educational limitations are explicit", () => {
  assert.match(messages.modelNotice, /実測.*ありません/);
  assert.match(messages.modelNotice, /検知率、成功率を判定するものではありません/);
  assert.match(messages.finalLimit, /未開封を証明できません/);
  assert.match(messages.serialNotProof, /番号の一致は未開封の証明になりません/);
  assert.match(messages.uvNotThermal, /過去の加熱履歴は分かりません/);
});
test("classic script dependencies precede application", () => {
  const html = read("index.html");
  assert.ok(html.indexOf('src="seal-core.js"') < html.indexOf('src="script.js"'));
  assert.ok(html.indexOf('src="seal-messages.js"') < html.indexOf('src="script.js"'));
});
test("reduced motion and touch targets are provided", () => {
  assert.match(read("style.css"), /prefers-reduced-motion: reduce/);
  assert.match(read("style.css"), /\.chip \.x\s*\{\s*min-width: 44px;\s*min-height: 44px;/);
});

test("README illustrative table matches every database rating", () => {
  const names = ["完全除去", "同一シール再貼付", "温風で剥がし再接着", "部分カット", "溶剤で糊を緩める", "下地偽装"];
  const rows = read("README.md").split("\n");
  db.attacks.forEach((attack, index) => {
    const row = rows.find(line => line.startsWith("| " + names[index] + " |"));
    assert.ok(row, attack.id);
    assert.deepEqual(row.split("|").slice(2, 6).map(x => Number(x.trim())),
      ["cost", "time", "skill", "traces"].map(key => attack.characteristics[key]));
  });
});
test("README local links and screenshot exist", () => {
  for (const match of read("README.md").matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(?:https?:|#)/.test(match[1])) continue;
    assert.ok(fs.existsSync(path.join(__dirname, "..", match[1])), match[1]);
  }
});
test("README states actual limits and unsupported file protocol", () => {
  const doc = read("README.md");
  for (const phrase of ["検知率・成功率を判定しません", "教材上の仮定", "番号の一致は未開封の証明になりません", "ファイルを直接開く`file://`には対応していません", "Safari、スマートフォン実機"]) assert.ok(doc.includes(phrase), phrase);
});

test("dynamic Japanese messages are separated from UI logic", () => {
  const withoutComments = read("script.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(withoutComments, /[ぁ-ゖァ-ヺ一-龯]/);
});
test("all root screenshots are referenced by README", () => {
  for (const file of fs.readdirSync(path.join(__dirname, "../assets"))) {
    if (file.endsWith(".png")) assert.ok(read("README.md").includes("assets/" + file), file);
  }
});
