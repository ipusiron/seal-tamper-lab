(function(root) {
  "use strict";
  const messages = Object.freeze({
    loading: "教材データを読み込んでいます。",
    ready: "シーンから順番に選んでください。",
    loadError: "教材データを読み込めませんでした。接続を確認して再試行してください。",
    fileUnsupported: "ファイルを直接開く方式には対応していません。フォルダーで python -m http.server 8000 を実行し、http://localhost:8000/ を開いてください。",
    invalidated: "条件が変わったため結果を消しました。選択を確認し、結果を開いてください。",
    placeholder: "シーン、シール、攻撃、検査を選ぶと、観察候補と判断の限界を表示します。",
    incomplete: "結果を表示するには、シーン、シール、攻撃、検査をすべて選んでください。",
    reset: "すべての選択と結果を消しました。",
    remove: "を選択から外す",
    attackPrefix: "攻撃：",
    inspectionPrefix: "検査：",
    otherCount: "ほか",
    count: "件",
    strong: "強み：",
    weak: "限界：",
    use: "用途：",
    cost: "コスト",
    time: "時間",
    skill: "技術",
    traces: "発覚リスク"
  });
  if (typeof module === "object" && module.exports) module.exports = messages;
  else root.SealMessages = messages;
})(typeof globalThis === "object" ? globalThis : this);
