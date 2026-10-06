(function(root) {
  "use strict";
  const GROUPS = ["scenes", "seals", "attacks", "inspections", "scenarios"];
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const text = value => typeof value === "string" && value.length > 0 && value.length <= 5000;
  const list = value => Array.isArray(value) && value.length <= 100;
  const strings = value => list(value) && value.every(text);

  function validateDatabase(db) {
    if (!db || typeof db !== "object" || Array.isArray(db)) return false;
    for (const group of GROUPS) {
      if (!list(db[group]) || (group !== "scenarios" && !db[group].length)) return false;
      const ids = new Set();
      for (const item of db[group]) {
        if (!item || typeof item !== "object" || !/^[a-z][a-z0-9-]{0,79}$/.test(item.id || "") || ids.has(item.id)) return false;
        ids.add(item.id);
        if (!text(item[group === "scenarios" ? "title" : "name"])) return false;
        for (const key of ["description", "summary", "howto", "lesson", "expected_effect", "common_uses", "notes"]) {
          if (own(item, key) && !text(item[key])) return false;
        }
        for (const key of ["strengths", "weaknesses", "detects"]) {
          if (own(item, key) && !strings(item[key])) return false;
        }
        for (const key of ["refs", "images"]) {
          if (own(item, key) && (!list(item[key]) || item[key].some(x => !x || typeof x !== "object" || Array.isArray(x)))) return false;
        }
        if (item.characteristics && ["cost", "time", "skill", "traces"].some(key =>
          !Number.isInteger(item.characteristics[key]) || item.characteristics[key] < 1 || item.characteristics[key] > 5)) return false;
        if (own(item, "meta") && (!item.meta || typeof item.meta !== "object" || Array.isArray(item.meta))) return false;
      }
    }
    for (const scenario of db.scenarios) {
      if (!db.scenes.some(x => x.id === scenario.scene) || !db.seals.some(x => x.id === scenario.seal) || !text(scenario.lesson)) return false;
      for (const [key, group] of [["attackSequence", "attacks"], ["recommendedInspections", "inspections"]]) {
        if (!strings(scenario[key]) || !scenario[key].length || new Set(scenario[key]).size !== scenario[key].length ||
            scenario[key].some(id => !db[group].some(x => x.id === id))) return false;
      }
    }
    return true;
  }

  function normalizeState(db, source = {}) {
    const s = source && typeof source === "object" ? source : {};
    const single = (group, id) => db[group].some(x => x.id === id) ? id : "";
    const multiple = (group, ids) => [...new Set(Array.isArray(ids) ? ids : [])].filter(id => db[group].some(x => x.id === id));
    return { sceneId: single("scenes", s.sceneId), sealId: single("seals", s.sealId),
      attacks: multiple("attacks", s.attacks), inspections: multiple("inspections", s.inspections) };
  }

  function missingSelections(state) {
    return [!state.sceneId && "scene", !state.sealId && "seal", !state.attacks.length && "attacks",
      !state.inspections.length && "inspections"].filter(Boolean);
  }

  function canEnter(state, step) {
    if (!Number.isInteger(step) || step < 1 || step > 5) return false;
    return step === 1 || Boolean(state.sceneId && (step === 2 || state.sealId &&
      (step === 3 || state.attacks.length && (step === 4 || state.inspections.length))));
  }

  function buildGuide(db, input) {
    if (!validateDatabase(db)) return { error: "invalidDatabase", missing: [], complete: false };
    const state = normalizeState(db, input);
    const missing = missingSelections(state);
    const result = { error: null, missing, complete: !missing.length, state };
    if (missing.length) return result;
    const byId = (group, id) => db[group].find(item => item.id === id);
    result.scene = byId("scenes", state.sceneId);
    result.seal = byId("seals", state.sealId);
    result.attacks = state.attacks.map(id => byId("attacks", id));
    result.inspections = state.inspections.map(id => {
      const item = byId("inspections", id);
      let condition = "materialDependent";
      if (id === "insp-serial-check") condition = result.seal.meta?.hasSerial ? "serialNotProof" : "noSerial";
      if (id === "insp-baseline-compare") condition = "baselineRequired";
      if (id === "insp-transmitted") condition = state.sceneId === "scene-envelope" ? "transmissionRequired" : "opaqueSurface";
      if (id === "insp-uv") condition = "uvNotThermal";
      return { item, condition };
    });
    result.scenarios = db.scenarios.filter(s => s.scene === state.sceneId && s.seal === state.sealId &&
      s.attackSequence.length === state.attacks.length && s.attackSequence.every(id => state.attacks.includes(id)))
      .map(item => ({ item, additionalInspections: item.recommendedInspections.filter(id => !state.inspections.includes(id)) }));
    return result;
  }

  function safeReference(value) {
    if (typeof value !== "string" || /[\s<>"'\\]/.test(value)) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password ||
          /(^|\.)(example\.(com|org|net)|localhost)$/.test(url.hostname)) return null;
      return url.href;
    } catch { return null; }
  }

  function safeImage(value) {
    return typeof value === "string" && /^assets\/[A-Za-z0-9_-]+\.(?:png|jpg|jpeg|webp)$/.test(value) ? value : null;
  }

  const api = Object.freeze({ validateDatabase, normalizeState, missingSelections, canEnter, buildGuide, safeReference, safeImage });
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SealCore = api;
})(typeof globalThis === "object" ? globalThis : this);
