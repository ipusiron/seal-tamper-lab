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
  
  container.innerHTML = "";
  
  scenes.forEach(scene => {
    const card = document.createElement("button");
    prepareChoice(card, container, false);
    card.className = "scene-card";
    card.setAttribute("role", "radio");
    card.setAttribute("aria-checked", "false");
    card.dataset.sceneId = scene.id;
    
    // 視覚表現の決定
    let visualClass = "";
    let shortDesc = scene.description || "";
    
    if (scene.name?.includes("封筒") || scene.id?.includes("envelope")) {
      visualClass = "envelope";
      shortDesc = shortDesc || "紙の表面で繊維の乱れが観察しやすい";
    } else if (scene.name?.includes("段ボール") || scene.id?.includes("cardboard")) {
      visualClass = "cardboard"; 
      shortDesc = shortDesc || "波形構造で除去後の下地荒れが出やすい";
    } else if (scene.name?.includes("機器") || scene.id?.includes("device")) {
      visualClass = "device";
      shortDesc = shortDesc || "平滑面で再貼付が目立ちにくい";
    }
    
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
  
  container.innerHTML = "";
  
  // 既存のヘッダーを削除（重複防止）
  const existingHeader = container.parentNode.querySelector('.attack-characteristics-header');
  if (existingHeader) {
    existingHeader.remove();
  }
  
  // 特徴説明ヘッダーをグリッドの前に追加
  const headerDiv = document.createElement('div');
  headerDiv.className = 'attack-characteristics-header';
  
  attacks.forEach(attack => {
    const card = document.createElement("button");
    prepareChoice(card, container, true);
    card.className = "attack-card";
    card.setAttribute("role", "checkbox");
    card.setAttribute("aria-checked", "false");
    card.dataset.attackId = attack.id;
    
    // 視覚表現の決定
    let visualClass = "";
    let shortDesc = attack.description || "";
    
    if (attack.name?.includes("完全除去") || attack.id?.includes("full-remove")) {
      visualClass = "full-remove";
      shortDesc = shortDesc || "痕跡ごと削ぎ取る";
    } else if (attack.name?.includes("再貼付") || attack.id?.includes("reapply")) {
      visualClass = "reapply";
      shortDesc = shortDesc || "同一シールで貼り直し";
    } else if (attack.name?.includes("温風") || attack.id?.includes("heat")) {
      visualClass = "heat";
      shortDesc = shortDesc || "熱で粘着を弱める";
    } else if (attack.name?.includes("カット") || attack.id?.includes("cut")) {
      visualClass = "cut";
      shortDesc = shortDesc || "部分的に切って侵入";
    } else if (attack.name?.includes("溶剤") || attack.id?.includes("solvent")) {
      visualClass = "solvent";
      shortDesc = shortDesc || "薬品で糊を緩める";
    } else if (attack.name?.includes("偽装") || attack.id?.includes("disguise")) {
      visualClass = "disguise";
      shortDesc = shortDesc || "表面を整え新規貼付";
    }
    
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
      
      // ラベル行追加
      const labelsDiv = document.createElement('div');
      labelsDiv.className = 'characteristics-labels';
      
      const labels = ['コスト', '時間', '技術', 'リスク'];
      labels.forEach(label => {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'characteristic-label';
        labelDiv.textContent = label;
        labelsDiv.appendChild(labelDiv);
      });
      
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
        
        charDiv.appendChild(iconDiv);
        charDiv.appendChild(valueDiv);
        characteristicsDiv.appendChild(charDiv);
      });
      
      characteristicsWrapper.appendChild(labelsDiv);
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
  
  container.innerHTML = "";
  
  seals.forEach(seal => {
    const card = document.createElement("button");
    prepareChoice(card, container, false);
    card.className = "seal-card";
    card.setAttribute("role", "radio");
    card.setAttribute("aria-checked", "false");
    card.dataset.sealId = seal.id;
    
    // 視覚表現の決定
    let visualClass = "";
    let shortDesc = seal.summary || "";
    
    if (seal.type === "VOID") {
      visualClass = "void";
      shortDesc = shortDesc || "剥がすとVOID文字が残る";
    } else if (seal.type === "HOLOGRAM" || seal.name?.includes("ホログラム")) {
      visualClass = "hologram";
      shortDesc = shortDesc || "光の角度で色が変化";
    } else if (seal.type === "PAPER" || seal.name?.includes("紙封緘")) {
      visualClass = "paper";
      shortDesc = shortDesc || "和紙に朱印を押したタイプ";
    } else if (seal.type === "SERIAL_TAPE" || seal.name?.includes("連番")) {
      visualClass = "serial";
      shortDesc = shortDesc || "連番で追跡可能";
    } else if (seal.type === "CLEAR" || seal.name?.includes("透明")) {
      visualClass = "transparent";
      shortDesc = shortDesc || "透明で目立たない";
    }
    
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
  
  container.innerHTML = "";
  
  inspections.forEach(inspection => {
    const card = document.createElement("button");
    prepareChoice(card, container, true);
    card.className = "inspection-card";
    card.setAttribute("role", "checkbox");
    card.setAttribute("aria-checked", "false");
    card.dataset.inspectionId = inspection.id;
    
    // 視覚表現の決定
    let visualClass = "";
    let shortDesc = inspection.description || "";
    
    if (inspection.name?.includes("斜光") || inspection.id?.includes("oblique")) {
      visualClass = "oblique";
      shortDesc = shortDesc || "角度を変えて光を当てる";
    } else if (inspection.name?.includes("基準写真") || inspection.id?.includes("baseline")) {
      visualClass = "reference";
      shortDesc = shortDesc || "元の写真と比較検証";
    } else if (inspection.name?.includes("連番") || inspection.id?.includes("serial")) {
      visualClass = "serial-check";
      shortDesc = shortDesc || "番号の整合性を確認";
    } else if (inspection.name?.includes("マクロ") || inspection.id?.includes("macro")) {
      visualClass = "microscope";
      shortDesc = shortDesc || "拡大でエッジや繊維確認";
    } else if (inspection.name?.includes("透過光") || inspection.id?.includes("transmitted")) {
      visualClass = "transmitted";
      shortDesc = shortDesc || "透過光で密度ムラ確認";
    } else if (inspection.name?.includes("UV") || inspection.name?.includes("IR") || inspection.id?.includes("uv")) {
      visualClass = "fluorescent";
      shortDesc = shortDesc || "特殊光で隠し要素確認";
    }
    
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
    const strong = (seal.strengths?.[0]) ? `強: ${seal.strengths[0]}` : "";
    const weak = (seal.weaknesses?.[0]) ? `弱: ${seal.weaknesses[0]}` : "";
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
    attacks[0] ? `攻:${attacks[0]}…` : "",
    inspections[0] ? `検:${inspections[0]}…` : ""
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
  return `${list.slice(0,3).join("・")} 他 ${list.length - 3} 件`;
}

/* ===== ピル描画 ===== */
function renderAttackChips(){
  const root = els.chipsAttack();
  root.innerHTML = "";
  (state.attacks ?? []).forEach(id => {
    const item = findById(state.db?.attacks, id);
    if (!item) return;
    root.append(childChip(item.name, () => {
      state.attacks = state.attacks.filter(x => x !== id);
      renderAttackChips();
      updateSummaries();
    }));
  });
}

function renderInspectionChips(){
  const root = els.chipsInspection();
  root.innerHTML = "";
  (state.inspections ?? []).forEach(id => {
    const item = findById(state.db?.inspections, id);
    if (!item) return;
    root.append(childChip(item.name, () => {
      state.inspections = state.inspections.filter(x => x !== id);
      renderInspectionChips();
      updateSummaries();
    }));
  });
}

function childChip(text, onRemove){
  const span = document.createElement("span");
  span.className = "chip";
  span.innerHTML = `<span>${text}</span>`;
  const x = document.createElement("button");
  x.className = "x";
  x.setAttribute("aria-label", `${text} を削除`);
  x.textContent = "×";
  x.addEventListener("click", onRemove);
  span.appendChild(x);
  return span;
}

/* ===== シールの強み・弱み等 ===== */
function renderSealExtras(){
  const c = els.sealExtras();
  c.innerHTML = "";
  const seal = findById(state.db?.seals, state.sealId);
  if (!seal) return;

  const block = document.createElement("div");
  const strengths = (seal.strengths ?? []).map(s => `<li>${escapeHtml(s)}</li>`).join("");
  const weaknesses = (seal.weaknesses ?? []).map(s => `<li>${escapeHtml(s)}</li>`).join("");
  block.className = "extras";
  block.innerHTML = `
    ${strengths ? `<div><strong>強み</strong><ul>${strengths}</ul></div>` : ""}
    ${weaknesses ? `<div style="margin-top:6px;"><strong>弱み</strong><ul>${weaknesses}</ul></div>` : ""}
    ${seal.common_uses ? `<div class="meta" style="margin-top:6px;">用途：${escapeHtml(seal.common_uses)}</div>` : ""}
  `;
  c.appendChild(block);
}

/* ===== 結果の描画・アクション（refs/images ボタンは存在時のみ） ===== */
function renderResult(){
  if (!SealCore.buildGuide(state.db, state).complete) {
    invalidateResult();
    document.getElementById("app-status").textContent = t("incomplete");
    return;
  }
  resultGenerated = true;
  // クリア
  els.resultBody().innerHTML = "";
  els.resultActions().innerHTML = "";
  els.inlineRefs().innerHTML = "";
  els.inlineImages().innerHTML = "";

  const scene = findById(state.db?.scenes, state.sceneId);
  const seal = findById(state.db?.seals, state.sealId);
  const attacks = (state.attacks ?? []).map(id => findById(state.db?.attacks, id)).filter(Boolean);
  const inspections = (state.inspections ?? []).map(id => findById(state.db?.inspections, id)).filter(Boolean);

  // 本文カード（文章だけで成立）
  const lines = [];
  if (scene) lines.push(`<p><strong>シーン：</strong>${escapeHtml(scene.name)}</p>`);
  if (seal) lines.push(`<p><strong>シール：</strong>${escapeHtml(seal.name)}</p>`);
  if (attacks.length) lines.push(`<p><strong>攻撃：</strong>${attacks.map(a => escapeHtml(a.name)).join(" / ")}</p>`);
  if (inspections.length) lines.push(`<p><strong>検査：</strong>${inspections.map(i => escapeHtml(i.name)).join(" / ")}</p>`);

  // 教育的な要点（簡易）
  if (seal){
    if (seal.weaknesses?.length){
      lines.push(`<p><strong>注意：</strong>${escapeHtml(seal.weaknesses[0])}</p>`);
    }
  }
  if (!lines.length){
    lines.push(`<p class="hint">上のステップで選択すると、ここに解説が表示されます。</p>`);
  }
  els.resultBody().innerHTML = lines.join("");

  // refs / images のあるなしでボタン出し分け（存在時のみ）
  // ここでは「シール」の refs/images を優先してボタン化（拡張可）
  const actions = [];
  if (seal?.refs?.length){
    const btn = button("資料を開く ("+ seal.refs.length +")", () => showRefs("シールの参考資料", seal.refs));
    actions.push(btn);
  }
  if (seal?.images?.length){
    const btn2 = button("画像を見る ("+ seal.images.length +")", () => showImages("シールの画像", seal.images));
    actions.push(btn2);
  }
  // 攻撃・検査にも refs/images があれば追補
  const aggRefs = [...(attacks.flatMap(a => a.refs || [])), ...(inspections.flatMap(i => i.refs || []))];
  const aggImgs = [...(attacks.flatMap(a => a.images || [])), ...(inspections.flatMap(i => i.images || []))];

  if (aggRefs.length){
    const b = button("関連資料を開く ("+ aggRefs.length +")", () => showRefs("関連資料", aggRefs));
    actions.push(b);
  }
  if (aggImgs.length){
    const b2 = button("関連画像を見る ("+ aggImgs.length +")", () => showImages("関連画像", aggImgs));
    actions.push(b2);
  }

  // ボタンが1つ以上ある場合のみ表示
  if (actions.length){
    actions.forEach(a => els.resultActions().appendChild(a));
  }
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
  els.inlineRefs().innerHTML = "";
  const box = document.createElement("div");
  box.className = "inline-card";
  box.innerHTML = `<h4>${escapeHtml(title)}</h4>`;
  const ul = document.createElement("ul");
  ul.className = "inline-list";
  refs.forEach(r => {
    const li = document.createElement("li");
    const t = r.title || r.url;
    const type = r.type || "link";
    li.innerHTML = `・<a href="${r.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(t)}</a> <span style="opacity:.6">[${escapeHtml(type)}]</span>`;
    ul.appendChild(li);
  });
  box.appendChild(ul);
  els.inlineRefs().appendChild(box);
  // スクロール
  box.scrollIntoView({behavior:"smooth", block:"nearest"});
}

function showImages(title, images){
  els.inlineImages().innerHTML = "";
  const box = document.createElement("div");
  box.className = "inline-card";
  box.innerHTML = `<h4>${escapeHtml(title)}</h4>`;
  images.forEach(im => {
    const fig = document.createElement("figure");
    fig.style.margin = "0 0 8px 0";
    const img = document.createElement('img');
    img.src = im.src;
    img.alt = im.alt || "";
    img.style.cssText = "max-width:100%;height:auto;border:1px solid #eee;border-radius:8px;";
    
    const caption = document.createElement('figcaption');
    caption.style.cssText = "opacity:.7;font-size:13px;";
    caption.textContent = im.alt || "";
    
    fig.appendChild(img);
    fig.appendChild(caption);
    box.appendChild(fig);
  });
  els.inlineImages().appendChild(box);
  box.scrollIntoView({behavior:"smooth", block:"nearest"});
}


/* ===== 小物 ===== */
function findById(list, id){
  return (list || []).find(x => x.id === id);
}
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

/* 起動 */
boot();
