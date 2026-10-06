const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const ja = read("README.md").replace(/<!--[\s\S]*?-->/g, "");
const en = read("README.en.md");
const db = require("../data/db.json");
function headings(text) {
  let fence = null;
  return text.split(/\r?\n/).flatMap(line => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (fence === marker[1][0]) fence = null;
      return [];
    }
    return !fence && /^#{1,6} /.test(line) ? [line.match(/^#+/)[0]] : [];
  });
}
const links = text => [...text.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
const commands = text => [...text.matchAll(/```(?:sh|bash)\r?\n([\s\S]*?)```/g)]
  .map(match => match[1].replace(/\r\n/g, "\n").trim());
const tableNumbers = text => text.split(/\r?\n/).filter(line => /^\|/.test(line))
  .map(line => line.match(/\d[\d,.]*/g) || []).filter(row => row.length);

test("English README has reciprocal links and the complete Japanese heading hierarchy", () => {
  assert.match(ja, /\[English\]\(README\.en\.md\)/);
  assert.match(en, /\[日本語\]\(README\.md\)/);
  assert.deepEqual(headings(en), headings(ja));
  assert.ok(headings(en).length >= 20);
  assert.match(en, /interface.*Japanese/i);
  assert.match(en, /Japanese interface/i);
});

test("English README preserves source links and every local target exists", () => {
  const comparable = text => links(text).filter(target => !/^README(?:\.en)?\.md$/.test(target)).sort();
  assert.deepEqual(comparable(en), comparable(ja));
  for (const target of links(en)) {
    if (/^(?:https?:|#)/.test(target)) continue;
    assert.ok(fs.existsSync(path.join(root, target.split("#")[0])), target);
  }
});

test("English README preserves runnable commands and numerical table values", () => {
  assert.deepEqual(commands(en), commands(ja));
  assert.deepEqual(tableNumbers(en), tableNumbers(ja));
  assert.match(en, /npm test/);
});

test("all six English illustrative rating rows match the shipped database", () => {
  const rows = en.split("\n").filter(line => /^\|[^|]+\|(?: \d \|){4}/.test(line));
  assert.equal(rows.length, 6);
  rows.forEach((row, index) => {
    assert.deepEqual(row.split("|").slice(2, 6).map(value => Number(value.trim())),
      ["cost", "time", "skill", "traces"].map(key => db.attacks[index].characteristics[key]));
  });
});

test("English README retains non-proof, non-scoring, and inspection limitations", () => {
  for (const phrase of [
    "does not inspect real objects", "not measurements, product ratings, or probabilities",
    "not used to score results", "does not prove that an item is unopened",
    "cannot determine their cause, timing, or the person responsible",
    "cannot measure temperature distribution", "not supported", "have not been tested on actual devices"
  ]) assert.ok(en.includes(phrase), phrase);
});
