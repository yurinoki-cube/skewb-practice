//手順表
//  CLL（134）・EG2（137）・TCLL（1080）の手順表
//  CLL・EG2 のケースは date.js の CLL_CASES・EG2_CASES、TCLL は buildTcllState で作る
//  1ケースごとに、上にキューブの状態、下に r, r', R, R', B, B', b, b' の8行の手順を並べる
//  （ケースは画面の幅に合わせてグリッドで並ぶ。フルHDで横に4ケース）
//  入力内容はブラウザ（localStorage）に保存し、JSON / CSV で書き出し・一括読み込みができる

var ALG_ROWS = ["r", "r'", "R", "R'", "B", "B'", "b", "b'"];   //手順の行
var ALG_STORAGE_KEY = "skewb-algsheet";
var ALG_FIGURE_WIDTH = 30; //状態の図の大きさ

var ALG_SHEETS = {
  CLL:  { label: "CLL",  count: CLL_CASES.length },   //完全1面から揃える
  EG2:  { label: "EG2",  count: EG2_CASES.length },   //不完全1面（Diag）から揃える
  TCLL: { label: "TCLL", count: 1080 }                //ねじれ1面から揃える（18コーナー × 60センター）
};

//TCLLのケース名（"1-1"〜"4-4"）
var TCLL_CASE_NAMES = tclls[1].map(function (id) { return id.replace("title-twist", ""); });

//手順のデータ
//  algData[表][ケースID] = { name: 名前（変更したときだけ）, algs: { "r": 手順, … } }
//  空の項目は保存しない
var algData = loadAlgData();

var algSheet = "CLL";     //表示している表
var algGroup = 0;         //表示しているグループ
var algRenderToken = 0;   //図の描画の途中で表示が変わったら止めるための番号
var algCaseCache = {};    //表ごとのケース一覧
var tcllInfoCache = {};   //TCLLの状態の図（計算に時間がかかるので覚えておく）
var algSaveTimer = null;



//データの保存・読み込み
function loadAlgData() {
  var data = { CLL: {}, EG2: {}, TCLL: {} };
  try {
    var saved = JSON.parse(localStorage.getItem(ALG_STORAGE_KEY));
    if (saved && saved.sheets) {
      Object.keys(data).forEach(function (s) {
        if (saved.sheets[s]) data[s] = saved.sheets[s];
      });
    }
  } catch (e) {
    //保存が使えない環境では空から始める
  }
  return data;
}

function saveAlgData() {
  clearTimeout(algSaveTimer);
  algSaveTimer = null;
  try {
    localStorage.setItem(ALG_STORAGE_KEY, JSON.stringify({ version: 1, sheets: algData }));
  } catch (e) {
    //保存できなくても、このページを開いている間は使える
  }
}

//入力のたびに保存すると重いので、少し待ってからまとめて保存
function scheduleSaveAlgData() {
  clearTimeout(algSaveTimer);
  algSaveTimer = setTimeout(saveAlgData, 400);
}

//ページを閉じるときに、保存待ちがあれば保存
window.addEventListener("beforeunload", function () {
  if (algSaveTimer !== null) saveAlgData();
});

//以前の形式（CLL・EG2 のケースIDが番号、setup を手入力）のデータは使わない
Object.keys(algData).forEach(function (sheet) {
  Object.keys(algData[sheet]).forEach(function (id) {
    if (algData[sheet][id]) delete algData[sheet][id].setup;
  });
});

//ケース名を変えたときに、前の名前で保存されている手順を新しい名前に移す
var ALG_ID_RENAMES = {
  "CLL": {
    "Solved / Z-perm (front)": "Solved / Z-perm",
    "Solved / U-perm (FRr)": "Solved / U-perm",
    "Peanut / U-perm (FRr)": "Peanut / U-perm(FR-cw)",
    "Peanut / U-perm (FRl)": "Peanut / U-perm(FR-ccw)",
    "Peanut / U-perm (FLr)": "Peanut / U-perm(FL-cw)",
    "Peanut / U-perm (FLl)": "Peanut / U-perm(FL-ccw)",
    "Peanut / U-perm (BLr)": "Peanut / U-perm(BL-cw)",
    "Peanut / U-perm (BLl)": "Peanut / U-perm(BL-ccw)",
    "Peanut / U-perm (BRr)": "Peanut / U-perm(BR-cw)",
    "Peanut / U-perm (BRl)": "Peanut / U-perm(BR-ccw)",
    "Pi / U-perm (FRr)": "Pi / U-perm(FR-cw)",
    "Pi / U-perm (FRl)": "Pi / U-perm(FR-ccw)",
    "Pi / U-perm (FLr)": "Pi / U-perm(FL-cw)",
    "Pi / U-perm (FLl)": "Pi / U-perm(FL-ccw)",
    "Pi / U-perm (BLr)": "Pi / U-perm(BL-cw)",
    "Pi / U-perm (BLl)": "Pi / U-perm(BL-ccw)",
    "Pi / U-perm (BRr)": "Pi / U-perm(BR-cw)",
    "Pi / U-perm (BRl)": "Pi / U-perm(BR-ccw)"
  },
  "EG2": {
    "Solved / Z-perm (front)": "Solved / Z-perm",
    "Solved / Z-perm (side)": "Solved / U-perm(cw)",
    "Solved / U-perm": "Solved / U-perm(ccw)",
    "Peanut / U-perm": "Peanut / U-perm(ccw)-BL",
    "Peanut / シート外 1": "Peanut / U-perm(cw)-BR",
    "Peanut / シート外 2": "Peanut / U-perm(cw)-BL",
    "Peanut / シート外 3": "Peanut / U-perm(ccw)-FL",
    "Peanut / シート外 4": "Peanut / U-perm(cw)-FL",
    "Peanut / シート外 5": "Peanut / U-perm(ccw)-FR",
    "Peanut / シート外 6": "Peanut / U-perm(ccw)-BR",
    "Peanut / シート外 7": "Peanut / U-perm(cw)-FR",
    "Pi / U-perm": "Pi / U-perm(ccw)-BL",
    "Pi / シート外 1": "Pi / U-perm(cw)-BL",
    "Pi / シート外 2": "Pi / U-perm(ccw)-FR",
    "Pi / シート外 3": "Pi / U-perm(cw)-FR",
    "Pi / シート外 4": "Pi / U-perm(cw)-FL",
    "Pi / シート外 5": "Pi / U-perm(cw)-BR",
    "Pi / シート外 6": "Pi / U-perm(ccw)-BR",
    "Pi / シート外 7": "Pi / U-perm(ccw)-FL"
  }
};
Object.keys(ALG_ID_RENAMES).forEach(function (sheet) {
  var map = ALG_ID_RENAMES[sheet];
  Object.keys(map).forEach(function (oldId) {
    var newId = map[oldId];
    if (algData[sheet][oldId] && !algData[sheet][newId]) algData[sheet][newId] = algData[sheet][oldId];
    delete algData[sheet][oldId];
  });
});

//1ケース分のデータ（なければ null）
function getAlgEntry(sheet, id) {
  return algData[sheet][id] || null;
}

//1項目を書き換える（field: "name" / ALG_ROWS のどれか）
function setAlgField(sheet, id, field, value) {
  value = String(value).replace(/\r\n?/g, "\n");
  var entry = algData[sheet][id] || { algs: {} };
  if (!entry.algs) entry.algs = {};

  if (ALG_ROWS.indexOf(field) !== -1) {
    if (value.trim() === "") delete entry.algs[field];
    else entry.algs[field] = value;
  } else {
    if (value.trim() === "") delete entry[field];
    else entry[field] = value;
  }

  //空になったケースは消す
  var empty = Object.keys(entry.algs).length === 0 && !entry.name;
  if (empty) delete algData[sheet][id];
  else algData[sheet][id] = entry;
}



//ケース一覧
//  TCLL    : { id, name（初期の名前）, group, tco, center }
//  CLL・EG2: { id, name（初期の名前）, group（0=Solved 1=Peanut 2=Pi）, setup, view, note }
function getAlgCases(sheet) {
  if (algCaseCache[sheet]) return algCaseCache[sheet];

  var list = [];
  if (sheet === "TCLL") {
    for (var t = 1; t <= 18; t++) {
      CENTER_CASES.forEach(function (c, n) {
        var name = TCLL_CASE_NAMES[t - 1] + " " + c.name;
        list.push({ id: name, name: name, group: t - 1, tco: t, center: n });
      });
    }
  } else {
    (sheet === "CLL" ? CLL_CASES : EG2_CASES).forEach(function (d) {
      list.push({ id: d[0], name: d[0], group: d[1], setup: d[2], view: d[3], note: d[4] ? ALG_CASE_NOTES[d[4]] : "" });
    });
  }
  algCaseCache[sheet] = list;
  return list;
}

//グループ（コーナー）の表示名
//  CLL・EG2 は Solved / Peanut / Pi、TCLL は 1-1〜4-4
function getAlgGroupNames(sheet) {
  return (sheet === "TCLL") ? TCLL_CASE_NAMES : ALG_CORNER_NAMES;
}

//IDからケースを探す
function findAlgCase(sheet, id) {
  var list = getAlgCases(sheet);
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}



//状態の図
//TCLLの状態（FirstLayer を D 面に置いた向き）とセットアップ手順を作る
function getTcllCaseInfo(tco, centerIndex) {
  var key = tco + "-" + centerIndex;
  if (tcllInfoCache[key] !== undefined) return tcllInfoCache[key];

  //FirstLayer を D 面にして、置ける色・ねじれ位置を順に探す
  var Tcos = getTcos(tco);
  var flc = -1, twist = -1;
  [5, 3, 4].some(function (color) {
    var i = Tcos.indexOf(addThreeIfNegative(color - 5));
    if (i !== -1) { flc = color; twist = i; return true; }
    return false;
  });

  var state = buildTcllState(tco, centerIndex, 5, flc, twist);

  //solver.js で解を求める（毎回同じ図になるよう、最初の解を使う）
  var info = null;
  var typeNum = [0, 0];
  if (ReconsByState(typeNum, state.center, state.corner)) {
    var seq = [];
    if (Solve(typeNum[0], typeNum[1], seq, 4, 0, 11) > 0) {
      var setupAlg = getReverseAlg(seq[0]);
      var col = getStateColor(setupAlg);

      //chengeDface はトレーナーの変数を使うので、一時的に書き換えて戻す
      var saveSurface = FLsurface, saveTwist = Twist;
      FLsurface = 5;
      Twist = twist;
      col = chengeDface(col);
      FLsurface = saveSurface;
      Twist = saveTwist;

      info = { colors: col, setup: getScrambleText(setupAlg).trim() };
    }
  }
  tcllInfoCache[key] = info;
  return info;
}

//ケースの状態  { colors: 色の配列 or null, setup: 手順の文字列, error: エラー文 }
function getAlgCaseState(sheet, c) {
  if (sheet === "TCLL") {
    var info = getTcllCaseInfo(c.tco, c.center);
    if (info === null) return { colors: null, setup: "", error: "状態を作れませんでした" };
    return { colors: info.colors, setup: info.setup, error: "" };
  }

  //CLL・EG2 はセットアップ（solver.js で求めたもの）から図を作り、持ち替えて First Layer を D 面にする
  var alg = parseScrambleText(c.setup);
  if (alg === null) return { colors: null, setup: c.setup, error: "セットアップが読めません" };
  return { colors: rotateStateColor(getStateColor(alg), c.view), setup: c.setup, error: "" };
}

//1ケース分の図を描く
function drawAlgCase(el) {
  var c = findAlgCase(algSheet, el.dataset.id);
  var st = getAlgCaseState(algSheet, c);
  var cvs = el.querySelector(".alg-canvas");
  var msg = el.querySelector(".alg-state-msg");

  if (st.colors !== null) {
    DrawSkewbColors(ALG_FIGURE_WIDTH, cvs, st.colors);
    cvs.classList.remove("alg-canvas-empty");
    msg.textContent = "";
  } else {
    cvs.getContext("2d").clearRect(0, 0, cvs.width, cvs.height);
    cvs.classList.add("alg-canvas-empty");
    msg.textContent = st.error || "状態未設定";
  }

  el.querySelector(".alg-setup-text").textContent = st.setup;
}

//表示中のケースの図を、少しずつ描く（TCLLは計算に時間がかかるので、画面が固まらないように）
function drawAlgCases() {
  var token = ++algRenderToken;
  var items = Array.prototype.slice.call(document.querySelectorAll("#alg-list .alg-case"));
  var i = 0;

  function step() {
    if (token !== algRenderToken) return;   //表示が変わったので中止
    var start = Date.now();
    while (i < items.length && Date.now() - start < 30) {
      drawAlgCase(items[i]);
      i++;
    }
    if (i < items.length) setTimeout(step, 0);
  }
  step();
}



//画面
//手順表を表示する（表・グループの切り替え時にも呼ぶ）
function renderAlgSheet() {
  //表の切り替えボタン
  document.querySelectorAll("#alg-sheet-buttons button").forEach(function (b) {
    b.classList.toggle("active", b.dataset.sheet === algSheet);
  });

  //コーナーのボタン
  var names = getAlgGroupNames(algSheet);
  if (algGroup >= names.length) algGroup = 0;
  document.getElementById("alg-group-buttons").innerHTML = names.map(function (name, g) {
    return '<button type="button" class="btn btn-outline-secondary' + (g === algGroup ? ' active' : '') + '"'
         + ' data-group="' + g + '">' + escapeHtml(name) + '</button>';
  }).join("");

  //ケースの一覧
  var cases = getAlgCases(algSheet).filter(function (c) { return c.group === algGroup; });
  var cvsSize = getSkewbCanvasSize(ALG_FIGURE_WIDTH);

  document.getElementById("alg-list").innerHTML = cases.map(function (c) {
    var entry = getAlgEntry(algSheet, c.id);
    var name = (entry && entry.name) ? entry.name : c.name;

    //上段：左に図、右に名前とセットアップ
    var stateHtml =
        '<div class="alg-figure">'
      +   '<canvas class="alg-canvas" width="' + cvsSize.width + '" height="' + cvsSize.height + '"></canvas>'
      +   '<div class="alg-state-msg"></div>'
      + '</div>'
      + '<div class="alg-state-info">'
      + '<div class="alg-case-name">' + escapeHtml(name) + '</div>'
      + '<div class="alg-setup-text"></div>'
      + (c.note ? '<div class="alg-case-note">' + escapeHtml(c.note) + '</div>' : '')
      + '</div>';

    var rowsHtml = ALG_ROWS.map(function (row) {
      var value = (entry && entry.algs && entry.algs[row]) || "";
      return '<tr><th>' + escapeHtml(row) + '</th>'
           + '<td><textarea class="alg-input" rows="1" data-row="' + escapeHtml(row) + '">'
           + escapeHtml(value) + '</textarea></td></tr>';
    }).join("");

    return '<div class="alg-case" data-id="' + escapeHtml(c.id) + '">'
         +   '<div class="alg-state">' + stateHtml + '</div>'
         +   '<table class="alg-table"><tbody>' + rowsHtml + '</tbody></table>'
         + '</div>';
  }).join("");

  document.querySelectorAll("#alg-list .alg-input").forEach(autoSizeTextarea);
  drawAlgCases();
}

//表の切り替え
function selectAlgSheet(sheet) {
  if (sheet === algSheet) return;
  algSheet = sheet;
  algGroup = 0;
  renderAlgSheet();
}

//グループの切り替え
function selectAlgGroup(g) {
  var count = getAlgGroupNames(algSheet).length;
  if (g < 0 || g >= count) return;
  algGroup = g;
  renderAlgSheet();
  window.scrollTo(0, 0);
}

//テキストエリアの高さを中身に合わせる（改行すると枠が伸びる）
function autoSizeTextarea(ta) {
  ta.style.height = "auto";
  ta.style.height = ta.scrollHeight + "px";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

//入力（一覧の中の入力欄をまとめて受け取る）
document.getElementById("alg-list").addEventListener("input", function (e) {
  var target = e.target;
  var caseEl = target.closest(".alg-case");
  if (caseEl === null) return;
  var id = caseEl.dataset.id;

  if (target.classList.contains("alg-input")) {
    setAlgField(algSheet, id, target.dataset.row, target.value);
    autoSizeTextarea(target);
    scheduleSaveAlgData();
  }
});

//表の切り替えボタン
document.getElementById("alg-sheet-buttons").addEventListener("click", function (e) {
  var b = e.target.closest("button");
  if (b !== null) selectAlgSheet(b.dataset.sheet);
});

//コーナーのボタン
document.getElementById("alg-group-buttons").addEventListener("click", function (e) {
  var b = e.target.closest("button");
  if (b !== null) selectAlgGroup(Number(b.dataset.group));
});

//画面の幅が変わったら、テキストエリアの高さを合わせ直す
window.addEventListener("resize", function () {
  document.querySelectorAll("#alg-list .alg-input").forEach(autoSizeTextarea);
});



//書き出し
//ファイルとしてダウンロードさせる
function downloadText(filename, text, type) {
  var blob = new Blob([text], { type: type });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

//JSON：すべての表をまとめて書き出す
function exportAlgJson() {
  saveAlgData();
  var json = JSON.stringify({ format: "skewb-algsheet", version: 1, sheets: algData }, null, 2);
  downloadText("skewb-algsheet.json", json, "application/json");
}

//CSV：表示中の表を、全ケース分（空欄も含めて）書き出す
//  列: sheet, id, name, setup, r, r', R, R', B, B', b, b'
//  setup は CLL・EG2 の状態のセットアップ（参考。読み込みでは使わない。TCLL は空欄）
function exportAlgCsv() {
  var header = ["sheet", "id", "name", "setup"].concat(ALG_ROWS);
  var lines = [header];

  getAlgCases(algSheet).forEach(function (c) {
    var entry = getAlgEntry(algSheet, c.id) || { algs: {} };
    var algs = entry.algs || {};
    lines.push([algSheet, c.id, entry.name || c.name, c.setup || ""]
      .concat(ALG_ROWS.map(function (row) { return algs[row] || ""; })));
  });

  var csv = lines.map(function (cols) {
    return cols.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(",");
  }).join("\r\n");

  //先頭の BOM は Excel で文字化けしないようにするため
  downloadText("skewb-algsheet-" + algSheet + ".csv", "﻿" + csv + "\r\n", "text/csv");
}



//読み込み
//CSV / TSV を2次元配列にする（"…" で囲んだ中の改行・カンマ・"" に対応）
function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  var firstLine = text.split("\n")[0];
  var delim = (firstLine.indexOf("\t") !== -1 && firstLine.indexOf(",") === -1) ? "\t" : ",";

  var rows = [], row = [], field = "", inQuote = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuote = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === delim) {
      row.push(field); field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row);
      row = []; field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  //空行を除く
  return rows.filter(function (r) { return r.some(function (v) { return v.trim() !== ""; }); });
}

//CSV の内容を「変更の一覧」にする
//  変更 = { sheet, id, fields: { 列名: 値 } }
//  列がある項目だけ書き換える（空欄の列は、その手順を消す）
function changesFromCsv(text) {
  var rows = parseCsv(text);
  if (rows.length < 2) throw new Error("データがありません。1行目に見出し（id, r, r', …）が必要です。");

  var header = rows[0].map(function (h) { return h.trim(); });
  var col = function (name) { return header.indexOf(name); };
  if (col("id") === -1) throw new Error("見出しに id の列がありません。");

  var fieldCols = ["name"].concat(ALG_ROWS).filter(function (f) { return col(f) !== -1; });
  if (fieldCols.length === 0) throw new Error("見出しに手順の列（r, r', R, R', B, B', b, b'）がありません。");

  return rows.slice(1).map(function (r) {
    var fields = {};
    fieldCols.forEach(function (f) { fields[f] = r[col(f)] || ""; });
    return {
      sheet: col("sheet") !== -1 ? (r[col("sheet")] || "").trim() : algSheet,
      id: (r[col("id")] || "").trim(),
      fields: fields
    };
  });
}

//JSON の内容を「変更の一覧」にする（書き出した形式、または sheets の中身だけでも可）
function changesFromJson(text) {
  var obj = JSON.parse(text);
  var sheets = obj.sheets || obj;
  var changes = [];
  Object.keys(sheets).forEach(function (sheet) {
    Object.keys(sheets[sheet] || {}).forEach(function (id) {
      var e = sheets[sheet][id] || {};
      var fields = {};
      if (e.name !== undefined) fields.name = e.name;
      Object.keys(e.algs || {}).forEach(function (row) { fields[row] = e.algs[row]; });
      changes.push({ sheet: sheet, id: id, fields: fields });
    });
  });
  return changes;
}

//変更を反映する
function applyAlgChanges(changes) {
  var ok = [], skipped = [];
  changes.forEach(function (ch) {
    var c = ALG_SHEETS[ch.sheet] ? findAlgCase(ch.sheet, ch.id) : null;
    if (c === null) {
      skipped.push(ch.sheet + " / " + ch.id);
      return;
    }
    ok.push(ch);
  });

  if (ok.length === 0) {
    alert("読み込めるケースがありませんでした。\n不明なID: " + skipped.slice(0, 10).join(", "));
    return;
  }

  var message = ok.length + " ケースの手順を書き換えます。";
  if (skipped.length > 0) {
    message += "\n（表・IDが見つからない " + skipped.length + " 行は読み飛ばします: "
             + skipped.slice(0, 5).join(", ") + (skipped.length > 5 ? " …" : "") + "）";
  }
  if (!confirm(message + "\nよろしいですか？")) return;

  ok.forEach(function (ch) {
    var c = findAlgCase(ch.sheet, ch.id);
    Object.keys(ch.fields).forEach(function (f) {
      if (f !== "name" && ALG_ROWS.indexOf(f) === -1) return;  //知らない項目は無視
      var value = ch.fields[f] === null ? "" : String(ch.fields[f]);
      if (f === "name" && value.trim() === c.name) value = "";   //初期の名前と同じなら保存しない
      setAlgField(ch.sheet, ch.id, f, value);
    });
  });
  saveAlgData();
  $('#modal-alg-setting').modal('hide');
  renderAlgSheet();
}

//ファイルを選んだとき
document.getElementById("alg-import-file").addEventListener("change", function (e) {
  var file = e.target.files[0];
  e.target.value = "";   //同じファイルをもう一度選べるように
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function () {
    var text = String(reader.result);
    try {
      var changes = /^\s*[\[{]/.test(text.replace(/^﻿/, ""))
        ? changesFromJson(text.replace(/^﻿/, ""))
        : changesFromCsv(text);
      applyAlgChanges(changes);
    } catch (err) {
      alert("読み込みに失敗しました。\n" + err.message);
    }
  };
  reader.readAsText(file, "utf-8");
});
