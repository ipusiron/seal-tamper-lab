/* Seal Tamper Lab - vertical accordion (light mode) */
/* データは data/db.json から読み込み。無い場合は空状態でガイドのみ表示。 */

const state = {
  db: null,
  sceneId: "",
  sealId: "",
  attacks: [],
  inspections: [],
};
const t = key => SealMessages[key];
let resultGenerated = false;

const els = {
  stepper: () => document.querySelectorAll(".stepper li"),
  accHeaders: () => document.querySelectorAll(".acc-header"),
  panels: () => document.querySelectorAll(".acc-panel"),
  guide: () => document.getElementById("starter-guide"),

  sceneCards: () => document.getElementById("scene-cards"),
  sealCards: () => document.getElementById("seal-cards"),
  attackCards: () => document.getElementById("attack-cards"),
  inspectionCards: () => document.getElementById("inspection-cards"),

  chipsAttack: () => document.getElementById("attack-chips"),
  chipsInspection: () => document.getElementById("inspection-chips"),
  sealExtras: () => document.getElementById("seal-extras"),

  sumScene: () => document.getElementById("summary-scene"),
  sumSeal: () => document.getElementById("summary-seal"),
  sumAttacks: () => document.getElementById("summary-attacks"),
  sumInspections: () => document.getElementById("summary-inspections"),
  sumResult: () => document.getElementById("summary-result"),

  resultBody: () => document.getElementById("result-body"),
  resultActions: () => document.getElementById("result-actions"),
  inlineRefs: () => document.getElementById("inline-refs"),
  inlineImages: () => document.getElementById("inline-images"),
};

async function boot(){
  attachAccordion();
  attachNav();
  document.getElementById("retry-load").addEventListener("click", loadDatabase);
  document.getElementById("reset-all").addEventListener("click", () => {
    Object.assign(state, { sceneId: "", sealId: "", attacks: [], inspections: [] });
    renderAttackChips();
    renderInspectionChips();
    renderSealExtras();
    updateSummaries();
    setAccordion(document.getElementById("step-1"), true);
    document.getElementById("app-status").textContent = t("reset");
    document.querySelector(".scene-card")?.focus();
  });
  
  // 初期状態でボタンを無効化
  updateNavButtons();
  await loadDatabase();
}

async function loadDatabase() {
  const status = document.getElementById("app-status");
  const retry = document.getElementById("retry-load");
  retry.hidden = true;
  if (location.protocol === "file:") {
    status.textContent = t("fileUnsupported");
    return;
  }
  status.textContent = t("loading");

  // DB 読み込み
  try {
    const res = await fetch("data/db.json", {
      cache: "no-store",
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new TypeError("Received non-JSON response");
    }
    
    const database = await res.json();
    
    // データ検証
    if (!SealCore.validateDatabase(database)) {
      throw new Error("Invalid database format");
    }
    state.db = database;
    
    populateSelects();
    // DBが読めたらガイドを薄く
    els.guide().hidden = true;
    document.getElementById("reset-all").disabled = false;
    status.textContent = t("ready");
    updateSummaries();
  } catch (e) {
    state.db = null;
    status.textContent = t("loadError");
    retry.hidden = false;
  }
}

function populateSelects(){
  // シーン、シール、攻撃、検査はカードUIで表示
  renderSceneCards(state.db?.scenes ?? []);
  renderSealCards(state.db?.seals ?? []);
  renderAttackCards(state.db?.attacks ?? []);
  renderInspectionCards(state.db?.inspections ?? []);
}

function prepareChoice(card, container, multiple) {
  card.type = "button";
  if (multiple) return;
  card.addEventListener("keydown", event => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const cards = [...container.querySelectorAll('[role="radio"]')];
    const index = cards.indexOf(card);
    const delta = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? cards.length - 1 : (index + delta + cards.length) % cards.length;
    cards[next].click();
    cards[next].focus();
  });
}

function syncChoices() {
  for (const [group, field, attribute, multiple] of [
    ["scene", "sceneId", "sceneId", false], ["seal", "sealId", "sealId", false],
    ["attack", "attacks", "attackId", true], ["inspection", "inspections", "inspectionId", true]
  ]) {
    const cards = [...document.querySelectorAll("." + group + "-card")];
    cards.forEach((card, index) => {
      const selected = multiple ? state[field].includes(card.dataset[attribute]) : state[field] === card.dataset[attribute];
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-checked", String(selected));
      card.tabIndex = multiple || selected || !state[field] && index === 0 ? 0 : -1;
    });
  }
}

function invalidateResult() {
  const placeholder = document.createElement("p");
  placeholder.className = "hint";
  placeholder.textContent = t("placeholder");
  els.resultBody().replaceChildren(placeholder);
  els.resultActions().replaceChildren();
  els.inlineRefs().replaceChildren();
  els.inlineImages().replaceChildren();
  if (resultGenerated) document.getElementById("app-status").textContent = t("invalidated");
  resultGenerated = false;
}

// シーンカードUIの生成
function renderSceneCards(scenes){
  const container = els.sceneCards();
  if (!container) return;
  
  container.replaceChildren();
  
  scenes.forEach(scene => {
    const card = document.createElement("button");
    prepareChoice(card, container, false);
    card.className = "scene-card";
    card.setAttribute("role", "radio");
    card.setAttribute("aria-checked", "false");
    card.dataset.sceneId = scene.id;
    
    const visualClass = { "scene-envelope": "envelope", "scene-cardboard": "cardboard", "scene-device": "device" }[scene.id] || "";
    const shortDesc = scene.description || "";
    
    // DOM要素を安全に作成
    const visual = document.createElement('div');
    visual.className = `scene-visual ${visualClass}`;
    
    const title = document.createElement('div');
    title.className = 'scene-card-title';
    title.textContent = scene.name;
    
    const desc = document.createElement('div');
    desc.className = 'scene-card-desc';
    desc.textContent = shortDesc;
    
    card.appendChild(visual);
    card.appendChild(title);
    card.appendChild(desc);
    
    // クリックイベント
    card.addEventListener("click", () => {
      // 他のカードの選択を解除
      container.querySelectorAll(".scene-card").forEach(c => {
        c.classList.remove("selected");
        c.setAttribute("aria-checked", "false");
      });
      
      // このカードを選択
      card.classList.add("selected");
      card.setAttribute("aria-checked", "true");
      
      // 状態を更新
      state.sceneId = scene.id;
      updateSummaries();
    });
    
    container.appendChild(card);
  });
}

// 攻撃カードUIの生成
function renderAttackCards(attacks){
  const container = els.attackCards();
  if (!container) return;
  
  container.replaceChildren();
  
  attacks.forEach(attack => {
    const card = document.createElement("button");
    prepareChoice(card, container, true);
    card.className = "attack-card";
    card.setAttribute("role", "checkbox");
    card.setAttribute("aria-checked", "false");
    card.dataset.attackId = attack.id;
    
    const visualClass = { "atk-full-remove": "full-remove", "atk-same-reapply": "reapply", "atk-heat-peel": "heat", "atk-partial-cut": "cut", "atk-solvent-soften": "solvent", "atk-surface-disguise": "disguise" }[attack.id] || "";
    const shortDesc = attack.description || "";
    
    // DOM要素を安全に作成
    const visual = document.createElement('div');
    visual.className = `attack-visual ${visualClass}`;
    
    const title = document.createElement('div');
    title.className = 'attack-card-title';
    title.textContent = attack.name;
    
    const desc = document.createElement('div');
    desc.className = 'attack-card-desc';
    desc.textContent = shortDesc;
    
    card.appendChild(visual);
    card.appendChild(title);
    card.appendChild(desc);
    
    // 特徴表示エリアの追加
    if (attack.characteristics) {
      const characteristicsWrapper = document.createElement('div');
      
      // 特徴値の表示
      const characteristicsDiv = document.createElement('div');
      characteristicsDiv.className = 'attack-characteristics';
      
      const characteristics = [
        { key: 'cost', icon: '💰' },
        { key: 'time', icon: '⏱️' },
        { key: 'skill', icon: '🎯' },
        { key: 'traces', icon: '⚠️' }
      ];
      
      characteristics.forEach(char => {
        const value = attack.characteristics[char.key] || 0;
        
        const charDiv = document.createElement('div');
        charDiv.className = 'attack-characteristic';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'characteristic-icon';
        iconDiv.textContent = char.icon;
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'characteristic-value';
        valueDiv.textContent = value;
        
        charDiv.appendChild(node("span", t(char.key), "characteristic-label"));
        charDiv.appendChild(iconDiv);
        charDiv.appendChild(valueDiv);
        characteristicsDiv.appendChild(charDiv);
      });
      
      characteristicsWrapper.appendChild(characteristicsDiv);
      card.appendChild(characteristicsWrapper);
    }
    
    // クリックイベント（複数選択可能）
    card.addEventListener("click", () => {
      const isSelected = state.attacks.includes(attack.id);
      
      if (isSelected) {
        // 選択解除
        state.attacks = state.attacks.filter(id => id !== attack.id);
        card.classList.remove("selected");
        card.setAttribute("aria-checked", "false");
      } else {
        // 選択追加
        state.attacks.push(attack.id);
        card.classList.add("selected");
        card.setAttribute("aria-checked", "true");
      }
      
      renderAttackChips();
      updateSummaries();
    });
    
    container.appendChild(card);
  });
}

// シールカードUIの生成
function renderSealCards(seals){
  const container = els.sealCards();
  if (!container) return;
  
  container.replaceChildren();
  
  seals.forEach(seal => {
    const card = document.createElement("button");
    prepareChoice(card, container, false);
    card.className = "seal-card";
    card.setAttribute("role", "radio");
    card.setAttribute("aria-checked", "false");
    card.dataset.sealId = seal.id;
    
    const visualClass = { VOID: "void", HOLOGRAM: "hologram", PAPER: "paper", SERIAL_TAPE: "serial", CLEAR: "transparent" }[seal.type] || "";
    const shortDesc = seal.summary || "";
    
    // DOM要素を安全に作成
    const visual = document.createElement('div');
    visual.className = `seal-visual ${visualClass}`;
    
    const title = document.createElement('div');
    title.className = 'seal-card-title';
    title.textContent = seal.name;
    
    const desc = document.createElement('div');
    desc.className = 'seal-card-desc';
    desc.textContent = shortDesc;
    
    card.appendChild(visual);
    card.appendChild(title);
    card.appendChild(desc);
    
    // クリックイベント
    card.addEventListener("click", () => {
      // 他のカードの選択を解除
      container.querySelectorAll(".seal-card").forEach(c => {
        c.classList.remove("selected");
        c.setAttribute("aria-checked", "false");
      });
      
      // このカードを選択
      card.classList.add("selected");
      card.setAttribute("aria-checked", "true");
      
      // 状態を更新
      state.sealId = seal.id;
      renderSealExtras();
      updateSummaries();
    });
    
    container.appendChild(card);
  });
}

// 検査カードUIの生成
function renderInspectionCards(inspections){
  const container = els.inspectionCards();
  if (!container) return;
  
  container.replaceChildren();
  
  inspections.forEach(inspection => {
    const card = document.createElement("button");
    prepareChoice(card, container, true);
    card.className = "inspection-card";
    card.setAttribute("role", "checkbox");
    card.setAttribute("aria-checked", "false");
    card.dataset.inspectionId = inspection.id;
    
    const visualClass = { "insp-oblique": "oblique", "insp-baseline-compare": "reference", "insp-serial-check": "serial-check", "insp-macro": "microscope", "insp-transmitted": "transmitted", "insp-uv": "fluorescent" }[inspection.id] || "";
    const shortDesc = inspection.howto || "";
    
    // DOM要素を安全に作成
    const visual = document.createElement('div');
    visual.className = `inspection-visual ${visualClass}`;
    
    const title = document.createElement('div');
    title.className = 'inspection-card-title';
    title.textContent = inspection.name || inspection.title;
    
    const desc = document.createElement('div');
    desc.className = 'inspection-card-desc';
    desc.textContent = shortDesc;
    
    card.appendChild(visual);
    card.appendChild(title);
    card.appendChild(desc);
    
    // クリックイベント（複数選択可能）
    card.addEventListener("click", () => {
      const isSelected = state.inspections.includes(inspection.id);
      
      if (isSelected) {
        // 選択解除
        state.inspections = state.inspections.filter(id => id !== inspection.id);
        card.classList.remove("selected");
        card.setAttribute("aria-checked", "false");
      } else {
        // 選択追加
        state.inspections.push(inspection.id);
        card.classList.add("selected");
        card.setAttribute("aria-checked", "true");
      }
      
      renderInspectionChips();
      updateSummaries();
    });
    
    container.appendChild(card);
  });
}

/* ===== アコーディオン ===== */
function attachAccordion(){
  els.accHeaders().forEach(header => {
    header.addEventListener("click", (ev) => {
      // header直クリック以外（ボタン内の要素）でもOK
      const section = header.closest(".accordion");
      const panel = section.querySelector(".acc-panel");
      const isOpen = header.getAttribute("aria-expanded") === "true";
      setAccordion(section, !isOpen);
    });
  });
}

function setAccordion(section, open){
  const step = Number(section.dataset.step);
  if (open && !SealCore.canEnter(state, step)) {
    document.getElementById("app-status").textContent = t("incomplete");
    return;
  }
  if (open && step === 5) renderResult();
  const header = section.querySelector(".acc-header");
  const panel = section.querySelector(".acc-panel");

  // 全閉じ
  document.querySelectorAll(".accordion").forEach(sec => {
    sec.querySelector(".acc-header").setAttribute("aria-expanded", "false");
    sec.querySelector(".acc-panel").hidden = true;
  });

  // 対象を開く
  header.setAttribute("aria-expanded", open ? "true" : "false");
  panel.hidden = !open;
  if (open) header.focus({ preventScroll: true });

  // ステッパーの状態更新
  highlightStepper(section.dataset.step);

  // スクロール
  section.scrollIntoView({behavior: "auto", block: "start"});
}

function highlightStepper(step){
  els.stepper().forEach(li => li.classList.remove("active"));
  const target = Array.from(els.stepper()).find(li => li.dataset.step === String(step));
  if (target) target.classList.add("active");
}

/* ===== 次へ / 戻る ===== */
function attachNav(){
  const next1 = document.getElementById("next-1");
  const prev2 = document.getElementById("prev-2");
  const next2 = document.getElementById("next-2");
  const prev3 = document.getElementById("prev-3");
  const next3 = document.getElementById("next-3");
  const prev4 = document.getElementById("prev-4");
  const next4 = document.getElementById("next-4");
  const prev5 = document.getElementById("prev-5");

  next1.addEventListener("click", () => {
    if (next1.disabled) return;
    setAccordion(document.getElementById("step-2"), true);
  });
  prev2.addEventListener("click", () => setAccordion(document.getElementById("step-1"), true));
  next2.addEventListener("click", () => {
    if (next2.disabled) return;
    setAccordion(document.getElementById("step-3"), true);
  });
  prev3.addEventListener("click", () => setAccordion(document.getElementById("step-2"), true));
  next3.addEventListener("click", () => {
    if (next3.disabled) return;
    setAccordion(document.getElementById("step-4"), true);
  });
  prev4.addEventListener("click", () => setAccordion(document.getElementById("step-3"), true));
  next4.addEventListener("click", () => {
    if (next4.disabled) return;
    setAccordion(document.getElementById("step-5"), true);
  });
  prev5.addEventListener("click", () => setAccordion(document.getElementById("step-4"), true));
}


/* ===== サマリー更新 ===== */
function updateSummaries(){
  syncChoices();
  document.getElementById("app-status").textContent = t(state.sceneId || state.sealId || state.attacks.length || state.inspections.length ? "selectionUpdated" : "ready");
  invalidateResult();
  // シーン
  const scene = findById(state.db?.scenes, state.sceneId);
  const sceneEl = els.sumScene();
  sceneEl.textContent = scene ? scene.name : "";
  sceneEl.classList.toggle("empty", !scene);

  // シール + 強み/弱みの1行
  const seal = findById(state.db?.seals, state.sealId);
  const sealEl = els.sumSeal();
  if (seal){
    const strong = (seal.strengths?.[0]) ? `${t("strong")}${seal.strengths[0]}` : "";
    const weak = (seal.weaknesses?.[0]) ? `${t("weak")}${seal.weaknesses[0]}` : "";
    sealEl.textContent = [seal.name, strong, weak].filter(Boolean).join(" / ");
    sealEl.classList.remove("empty");
  } else {
    sealEl.textContent = "";
    sealEl.classList.add("empty");
  }

  // 攻撃（最大3+省略）
  const attacks = (state.attacks ?? []).map(id => findById(state.db?.attacks, id)?.name).filter(Boolean);
  const attacksEl = els.sumAttacks();
  attacksEl.textContent = chipsSummary(attacks);
  attacksEl.classList.toggle("empty", attacks.length === 0);

  // 検査（最大3+省略）
  const inspections = (state.inspections ?? []).map(id => findById(state.db?.inspections, id)?.name).filter(Boolean);
  const inspectionsEl = els.sumInspections();
  inspectionsEl.textContent = chipsSummary(inspections);
  inspectionsEl.classList.toggle("empty", inspections.length === 0);

  // 結果の一行サマリ（簡易）
  els.sumResult().textContent = [
    scene?.name,
    seal?.name,
    attacks[0] ? `${t("attackPrefix")}${attacks[0]}…` : "",
    inspections[0] ? `${t("inspectionPrefix")}${inspections[0]}…` : ""
  ].filter(Boolean).join(" / ");

  // ナビゲーションボタンの状態更新
  updateNavButtons();
}

// ナビゲーションボタンの有効/無効状態を更新
function updateNavButtons(){
  els.accHeaders().forEach(header => {
    const enabled = Boolean(state.db) && SealCore.canEnter(state, Number(header.closest(".accordion").dataset.step));
    header.disabled = !enabled;
    header.setAttribute("aria-disabled", String(!enabled));
  });
  const next1 = document.getElementById("next-1");
  const next2 = document.getElementById("next-2");
  const next3 = document.getElementById("next-3");
  const next4 = document.getElementById("next-4");
  
  // ステップ1→2: シーン選択が必須
  if (next1) {
    next1.disabled = !state.sceneId;
    next1.classList.toggle("disabled", !state.sceneId);
  }
  
  // ステップ2→3: シール選択が必須
  if (next2) {
    next2.disabled = !SealCore.canEnter(state, 3);
    next2.classList.toggle("disabled", next2.disabled);
  }
  
  // ステップ3→4: 攻撃選択が必須（最低1つ）
  if (next3) {
    const hasAttacks = SealCore.canEnter(state, 4);
    next3.disabled = !hasAttacks;
    next3.classList.toggle("disabled", !hasAttacks);
  }
  
  // ステップ4→5: 検査選択が必須（最低1つ）
  if (next4) {
    const hasInspections = SealCore.canEnter(state, 5);
    next4.disabled = !hasInspections;
    next4.classList.toggle("disabled", !hasInspections);
  }
}

function chipsSummary(list){
  if (!list.length) return "";
  if (list.length <= 3) return list.join("・");
  return `${list.slice(0,3).join("・")} ${t("otherCount")} ${list.length - 3} ${t("count")}`;
}

/* ===== ピル描画 ===== */
function renderAttackChips(){
  const root = els.chipsAttack();
  root.replaceChildren();
  (state.attacks ?? []).forEach(id => {
    const item = findById(state.db?.attacks, id);
    if (!item) return;
    root.append(childChip(item.name, () => {
      state.attacks = state.attacks.filter(x => x !== id);
      renderAttackChips();
      updateSummaries();
      document.querySelector(`[data-attack-id="${id}"]`)?.focus();
    }));
  });
}

function renderInspectionChips(){
  const root = els.chipsInspection();
  root.replaceChildren();
  (state.inspections ?? []).forEach(id => {
    const item = findById(state.db?.inspections, id);
    if (!item) return;
    root.append(childChip(item.name, () => {
      state.inspections = state.inspections.filter(x => x !== id);
      renderInspectionChips();
      updateSummaries();
      document.querySelector(`[data-inspection-id="${id}"]`)?.focus();
    }));
  });
}

function childChip(text, onRemove){
  const span = document.createElement("span");
  span.className = "chip";
  span.appendChild(node("span", text));
  const x = document.createElement("button");
  x.className = "x";
  x.type = "button";
  x.setAttribute("aria-label", `${text}${t("remove")}`);
  x.textContent = "×";
  x.addEventListener("click", onRemove);
  span.appendChild(x);
  return span;
}

/* ===== シールの強み・弱み等 ===== */
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function textList(items) {
  const list = node("ul");
  items.forEach(text => list.appendChild(node("li", text)));
  return list;
}

function renderSealExtras(){
  const c = els.sealExtras();
  c.replaceChildren();
  const seal = findById(state.db?.seals, state.sealId);
  if (!seal) return;
  for (const [key, label] of [["strengths", "strong"], ["weaknesses", "weak"]]) {
    if (seal[key]?.length) c.append(node("h3", t(label)), textList(seal[key]));
  }
  if (seal.common_uses) c.appendChild(node("p", t("use") + seal.common_uses, "meta"));
  c.appendChild(node("p", t("modelSeal"), "hint"));
}

/* ===== 根拠と限界の解説 ===== */
function renderResult(){
  const guide = SealCore.buildGuide(state.db, state);
  if (!guide.complete) {
    invalidateResult();
    document.getElementById("app-status").textContent = t("incomplete");
    return;
  }
  resultGenerated = true;
  document.getElementById("app-status").textContent = t("resultReady");
  const root = els.resultBody();
  root.replaceChildren();
  els.resultActions().replaceChildren();
  els.inlineRefs().replaceChildren();
  els.inlineImages().replaceChildren();

  root.append(node("h2", t("guideTitle")), node("p", t("modelNotice"), "notice"));
  root.append(node("h3", t("selectedConditions")), textList([
    t("scenePrefix") + guide.scene.name,
    t("sealPrefix") + guide.seal.name,
    t("attackPrefix") + guide.attacks.map(item => item.name).join(" / "),
    t("inspectionPrefix") + guide.inspections.map(({item}) => item.name).join(" / ")
  ]));
  root.append(node("h3", t("traceCandidates")), node("p", t("traceNotice")));
  root.appendChild(textList(guide.attacks.map(item => item.name + "：" + item.expected_effect)));

  root.appendChild(node("h3", t("inspectionLimits")));
  for (const { item, condition } of guide.inspections) {
    const section = node("section", undefined, "inspection-guide");
    section.append(node("h4", item.name), node("p", item.howto));
    section.append(node("p", t("observePrefix") + (item.detects || []).map(key => t(key) || key).join("・")));
    section.append(node("p", t(condition), "notice"));
    root.appendChild(section);
  }
  root.append(node("h3", t("caseTitle")), node("p", t("caseNotice")));
  if (!guide.scenarios.length) root.appendChild(node("p", t("noCase")));
  for (const { item, additionalInspections } of guide.scenarios) {
    root.append(node("h4", item.title), node("p", item.lesson));
    if (additionalInspections.length) root.appendChild(node("p", t("additionalPrefix") +
      additionalInspections.map(id => findById(state.db.inspections, id).name).join("・")));
  }
  root.appendChild(node("p", t("finalLimit"), "notice"));

  const sources = [guide.scene, guide.seal, ...guide.attacks,
    ...guide.inspections.map(x => x.item), ...guide.scenarios.map(x => x.item)];
  const refs = [...new Map(sources.flatMap(x => x.refs || [])
    .filter(x => SealCore.safeReference(x.url)).map(x => [SealCore.safeReference(x.url), x])).values()];
  const images = [...new Map(sources.flatMap(x => x.images || [])
    .filter(x => SealCore.safeImage(x.src)).map(x => [x.src, x])).values()];
  if (refs.length) els.resultActions().appendChild(button(t("referenceButton") + " (" + refs.length + ")",
    () => showRefs(t("referenceTitle"), refs)));
  if (images.length) els.resultActions().appendChild(button(t("imageButton") + " (" + images.length + ")",
    () => showImages(t("imageTitle"), images)));
}

function button(text, onClick){
  const b = document.createElement("button");
  b.className = "btn";
  b.type = "button";
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

function showRefs(title, refs){
  const box = node("div", undefined, "inline-card");
  box.append(node("h3", title), node("p", t("referenceNotice")));
  const list = node("ul", undefined, "inline-list");
  refs.forEach(ref => {
    const url = SealCore.safeReference(ref.url);
    if (!url) return;
    const link = node("a", ref.title || url);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const item = node("li");
    item.appendChild(link);
    list.appendChild(item);
  });
  box.appendChild(list);
  els.inlineRefs().replaceChildren(box);
  box.scrollIntoView({behavior: "auto", block: "nearest"});
}

function showImages(title, images){
  const box = node("div", undefined, "inline-card");
  box.appendChild(node("h3", title));
  images.forEach(im => {
    const src = SealCore.safeImage(im.src);
    if (!src) return;
    const figure = node("figure");
    const img = node("img");
    img.src = src;
    img.alt = im.alt || "";
    img.addEventListener("error", () => img.replaceWith(node("p", t("imageError"))), { once: true });
    figure.append(img, node("figcaption", im.alt || ""));
    box.appendChild(figure);
  });
  els.inlineImages().replaceChildren(box);
  box.scrollIntoView({behavior: "auto", block: "nearest"});
}

function findById(list, id){
  return (list || []).find(x => x.id === id);
}

/* 起動 */
boot();
