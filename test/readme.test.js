const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const seal = require("../seal-core.js");
const sealDb = require("../data/db.json");

test("README の「このツールならではの使い方」の前提とガイドを計算部で再計算（日英）", () => {
  const readmeJa = read("README.md");
  const readmeEn = read("README.en.md");
  assert.deepEqual(seal.buildGuide(sealDb, {}).missing, ["scene", "seal", "attacks", "inspections"]);
  assert.equal(seal.canEnter(seal.normalizeState(sealDb, { sceneId: "scene-envelope", sealId: "seal-void" }), 4), false);
  assert.equal(seal.canEnter(seal.normalizeState(sealDb, { sceneId: "scene-envelope", sealId: "seal-void", attacks: [sealDb.attacks[0].id] }), 4), true);
  const noSerial = seal.buildGuide(sealDb, { sceneId: "scene-envelope", sealId: "seal-clear-tape", attacks: [sealDb.attacks[0].id], inspections: ["insp-serial-check"] });
  assert.equal(noSerial.inspections[0].condition, "noSerial");
  const opaque = seal.buildGuide(sealDb, { sceneId: "scene-cardboard", sealId: "seal-void", attacks: [sealDb.attacks[0].id], inspections: ["insp-transmitted"] });
  assert.equal(opaque.inspections[0].condition, "opaqueSurface");
  assert.deepEqual(sealDb.inspections.find(i => i.id === "insp-serial-check").detects, ["serial_mismatch", "unexpected_batch"]);
  for (const md of [readmeJa, readmeEn]) {
    assert.ok(md.includes("noSerial") && md.includes("opaqueSurface"));
    assert.ok(md.includes("serial_mismatch") && md.includes("unexpected_batch"));
  }
});
