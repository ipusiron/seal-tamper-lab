const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../data/db.json");

const FIELDS = {
  scenes: ["name", "description", "notes"],
  seals: ["name", "summary", "strengths", "weaknesses", "common_uses"],
  attacks: ["name", "description", "expected_effect"],
  inspections: ["name", "howto"],
  scenarios: ["title", "lesson"]
};

test("日本語の各テキストに対応する英語 *_en がある", () => {
  for (const [group, fields] of Object.entries(FIELDS)) {
    for (const item of db[group]) {
      for (const f of fields) {
        if (item[f] == null) continue;
        assert.ok(item[f + "_en"] != null, `${group}/${item.id}/${f}_en が無い`);
        if (Array.isArray(item[f])) {
          assert.equal(item[f].length, item[f + "_en"].length, `${group}/${item.id}/${f} の要素数が違う`);
        }
      }
    }
  }
});
