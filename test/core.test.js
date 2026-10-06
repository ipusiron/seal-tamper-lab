const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../seal-core.js");
const db = require("../data/db.json");
const state = { sceneId: "scene-envelope", sealId: "seal-void", attacks: ["atk-full-remove", "atk-same-reapply"], inspections: ["insp-oblique"] };
test("shipped database shape and inventory", () => {
  assert.equal(core.validateDatabase(db), true);
  assert.deepEqual([db.scenes.length, db.seals.length, db.attacks.length, db.inspections.length, db.scenarios.length], [3, 5, 6, 6, 4]);
});
for (const value of [null, [], {}, { ...db, scenes: [] }, { ...db, seals: "bad" }]) {
  test("reject invalid database " + JSON.stringify(value).slice(0, 30), () => assert.equal(core.validateDatabase(value), false));
}
for (const mutate of [
  d => d.scenes.push(d.scenes[0]),
  d => d.scenes[0].name = null,
  d => d.seals[0].weaknesses = "invalid",
  d => d.attacks[0].characteristics.cost = 0,
  d => d.attacks[0].characteristics.time = 6,
  d => d.inspections[0].refs = [null],
  d => d.scenarios[0].attackSequence = ["unknown"],
  d => d.scenarios[0].recommendedInspections = [],
  d => d.scenarios[0].scene = "unknown"
]) test("database rejects malformed field " + mutate.toString(), () => {
  const copy = structuredClone(db); mutate(copy); assert.equal(core.validateDatabase(copy), false);
});
test("normalization does not mutate input and removes unknown/duplicate IDs", () => {
  const input = { ...state, attacks: ["atk-full-remove", "unknown", "atk-full-remove"] };
  assert.deepEqual(core.normalizeState(db, input).attacks, ["atk-full-remove"]);
  assert.equal(input.attacks.length, 3);
});
test("all missing prerequisites are returned", () => assert.deepEqual(core.buildGuide(db, {}).missing, ["scene", "seal", "attacks", "inspections"]));
test("cannot skip prerequisites through a later step", () => {
  const empty = core.normalizeState(db, { inspections: ["insp-oblique"] });
  assert.deepEqual([1, 2, 3, 4, 5].map(n => core.canEnter(empty, n)), [true, false, false, false, false]);
  assert.equal(core.buildGuide(db, empty).complete, false);
});
test("step bounds are strict", () => [-1, 0, 6, 1.5, "2"].forEach(n => assert.equal(core.canEnter(state, n), false)));
for (const scenario of db.scenarios) test("exact authored scenario " + scenario.id, () => {
  const result = core.buildGuide(db, { sceneId: scenario.scene, sealId: scenario.seal,
    attacks: [...scenario.attackSequence].reverse(), inspections: scenario.recommendedInspections });
  assert.deepEqual(result.scenarios.map(s => s.item.id), [scenario.id]);
  assert.deepEqual(result.scenarios[0].additionalInspections, []);
});
test("extra attack or different scene does not match authored lesson", () => {
  assert.equal(core.buildGuide(db, { ...state, attacks: [...state.attacks, "atk-partial-cut"] }).scenarios.length, 0);
  assert.equal(core.buildGuide(db, { ...state, sceneId: "scene-device" }).scenarios.length, 0);
});
test("additional inspections are suggestions not detected evidence", () => {
  const result = core.buildGuide(db, state);
  assert.deepEqual(result.scenarios[0].additionalInspections, ["insp-baseline-compare", "insp-macro"]);
  assert.equal("probability" in result, false);
  assert.equal("score" in result, false);
});
for (const [sealId, sceneId, id, expected] of [
  ["seal-clear-tape", "scene-envelope", "insp-serial-check", "noSerial"],
  ["seal-serial-tape", "scene-envelope", "insp-serial-check", "serialNotProof"],
  ["seal-paper", "scene-device", "insp-transmitted", "opaqueSurface"],
  ["seal-paper", "scene-envelope", "insp-transmitted", "transmissionRequired"],
  ["seal-paper", "scene-envelope", "insp-baseline-compare", "baselineRequired"],
  ["seal-paper", "scene-envelope", "insp-uv", "uvNotThermal"]
]) test("inspection prerequisite " + expected, () => {
  assert.equal(core.buildGuide(db, { ...state, sealId, sceneId, inspections: [id] }).inspections[0].condition, expected);
});
test("only safe HTTPS references are accepted", () => {
  assert.equal(core.safeReference("https://www.lintec.co.jp/topics/newsrelease/171017_a.html"), "https://www.lintec.co.jp/topics/newsrelease/171017_a.html");
  for (const value of [null, "javascript:alert(1)", "data:text/html,x", "http://site.test", "https://example.com/a", "https://a.example.org/", "//host/x", 'https://host/"onerror="x', "https://user:password@host/", "https://host\\x"]) assert.equal(core.safeReference(value), null);
});
test("only local images without traversal are accepted", () => {
  assert.equal(core.safeImage("assets/screenshot.png"), "assets/screenshot.png");
  for (const value of [null, "https://host/x.png", "assets/../x.png", "assets/x.svg", "/assets/x.png", "assets/x.png?y"]) assert.equal(core.safeImage(value), null);
});
test("classic-script loading exposes same result", () => {
  const context = vm.createContext({ URL });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../seal-core.js"), "utf8"), context);
  assert.equal(context.SealCore.buildGuide(db, state).complete, true);
});
