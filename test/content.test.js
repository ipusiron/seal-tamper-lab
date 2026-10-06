const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../seal-core.js");
const messages = require("../seal-messages.js");
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
