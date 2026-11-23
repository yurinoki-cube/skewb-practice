function test(){
  alert("OK");
}



//画面の切り替え（TCLLトレーナー / 手順表 / FL一覧 / FL Trainer）
//  サイトを開いたときは、いつも TCLL Trainer を表示する
//  TCLL Trainer と FL Trainer は同じ画面（view-trainer）を使い、出題する問題を切り替える
var currentView = "trainer";

function showView(name) {
  if (name !== "trainer" && name !== "algsheet" && name !== "fl" && name !== "fltrainer") name = "trainer";
  currentView = name;

  document.getElementById("view-trainer").hidden = (name !== "trainer" && name !== "fltrainer");
  document.getElementById("view-algsheet").hidden = (name !== "algsheet");
  document.getElementById("view-fl").hidden = (name !== "fl");
  document.querySelectorAll("#view-tabs .nav-link").forEach(function (a) {
    a.classList.toggle("active", a.dataset.view === name);
  });

  if (name === "algsheet") {
    renderAlgSheet();   //表示されてから描く（テキストエリアの高さを正しく測るため）
  }
  if (name === "fl") {
    renderFlSheet();    //一面の手順（最初に開いたときに計算する）
  }
  if (name === "trainer") switchTrainer("tcll");
  if (name === "fltrainer") switchTrainer("fl");
}

//トレーナーの画面を表示中か
function isTrainerView() {
  return currentView === "trainer" || currentView === "fltrainer";
}



//TCLL Trainer と FL Trainer の切り替え
//  それぞれの状態（training・weak モード・苦手・カウンター・スクランブルの履歴）を別々に持つ
var trainerKind = "tcll";     //"tcll" または "fl"
var trainerSaved = {};        //表示していない方の状態

//「前のスクランブルを表示する」はトレーナーごと（初期値：TCLL は表示する、FL は表示しない）
var SHOW_BEFORE_DEFAULT = { tcll: true, fl: false };
var trainerShowBefore = { tcll: SHOW_BEFORE_DEFAULT.tcll, fl: SHOW_BEFORE_DEFAULT.fl };

function switchTrainer(kind) {
  if (kind !== trainerKind) {
    trainerSaved[trainerKind] = {
      training: training, weakMode: weakMode, weakList: weakList, count: count,
      cur: CurrentScramble, prev: PrevScramble, prev2: Prev2Scramble, canBack: CanBackScramble
    };
    trainerKind = kind;
    var s = trainerSaved[kind] || {
      training: null, weakMode: false, weakList: loadWeakList(), count: 0,
      cur: null, prev: null, prev2: null, canBack: false
    };
    training = s.training; weakMode = s.weakMode; weakList = s.weakList; count = s.count;
    CurrentScramble = s.cur; PrevScramble = s.prev; Prev2Scramble = s.prev2; CanBackScramble = s.canBack;
    CurrentTco = undefined; CurrentCenter = undefined;
  }

  document.getElementById("show-before").checked = trainerShowBefore[kind];

  //TCLL 選択画面 / FL 選択画面、FL Trainer だけの設定
  document.getElementById("state-button").setAttribute("data-target", kind === "fl" ? "#modal-fl-select" : "#modal-tcll");
  document.querySelectorAll(".flt-setting").forEach(function (tr) { tr.hidden = (kind !== "fl"); });
  document.getElementById("flt-panel").hidden = (kind !== "fl");
  document.getElementById("view-trainer").classList.toggle("flt-mode", kind === "fl");   //FL Trainer だけの見た目（main.css）

  //FL Trainer は、上から スクランブル → 手順の表 → 色のボタン → キューブの状態 の順にする
  //（スマホで、キューブの状態の部分を親指で操作しやすいように下の方に置く）
  var canvas = document.getElementById("canvas");
  var slot = (kind === "fl") ? document.getElementById("flt-canvas-slot") : document.getElementById("tcll-canvas-slot");
  if (canvas.parentNode !== slot) slot.appendChild(canvas);
  document.getElementById("touchArea2").hidden = (kind !== "fl");

  updateModeUI();
  if (CurrentScramble === null) {
    nextScramble();           //初めて開いたとき
  } else {
    renderScramble();
  }
}

document.getElementById("view-tabs").addEventListener("click", function (e) {
  var a = e.target.closest(".nav-link");
  if (a === null) return;
  e.preventDefault();
  showView(a.dataset.view);
  a.blur();
});

//トレーナーのキー操作を受け付けるか
//（手順表を表示中や、文字を入力中は受け付けない）
function acceptsTrainerKey(e) {
  if (!isTrainerView()) return false;
  var t = e.target;
  if (t && (t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return false;
  if (t && t.tagName === "INPUT" && t.type !== "checkbox" && t.type !== "radio") return false;
  return true;
}



//次のスクランブルを表示する
function nextScramble() {
  if (training !== null) {
    //training モード：リストの次の問題
    nextTrainingProblem();
  } else if (weakMode) {
    //weak モード：苦手パターンからランダム
    nextWeakProblem();
  } else if (trainerKind === "fl") {
    //FL Trainer の通常モード：選択した FL パターンからランダム
    var names = getFlSelectedNames();
    if (names.length === 0) {
      alert("FLパターンを選択しなさい！！");
      return;
    }
    showProblem({ fl: names[getRandomInt(0, names.length - 1)] });
  } else {
    //通常モード：選択の中からランダム
    ScrambleSkewb(getSelectedLanguage(), getCheckboxValues(), getCheckboxCenters());
  }
}

//操作関係
//Space キー・タッチ共通の処理
function onNextRequest(e) {
  document.activeElement.blur();
  var wasNormal = (training === null);

  //スクランブル
  nextScramble();

  //カウンター更新
  if (wasNormal) {
    incrementCounter();
  } else {
    renderCounter();
  }

  e.preventDefault();
}



//スペースキーの押下で実行する
document.addEventListener('keypress', function (e) {
  if (e.code === 'Space' && acceptsTrainerKey(e)) {
    onNextRequest(e);
  }
});

//タッチ時に実行（1本指）
//  タップ・左にスワイプ → 次のスクランブル
//  右にスワイプ         → 1つ前のスクランブル（直近1回だけ。PC は ← キー）
//  下にスワイプ         → 今の問題を苦手に登録
//  上にスワイプ         → 今の問題を苦手から外す
var SWIPE_DISTANCE = 50;  //スワイプと判定する距離（px）
var touchInfo = null;     //タッチ操作中の情報（指が全部離れたら null に戻す）

//スクランブルの部分（touchArea）と、FL Trainer のキューブの状態の部分（touchArea2）で同じ操作
function bindTrainerTouch(el) {
  el.addEventListener('touchstart', function (e) {
    if (touchInfo === null) {
      var t = e.touches[0];
      touchInfo = { maxFingers: 0, startX: t.clientX, startY: t.clientY, lastX: t.clientX, lastY: t.clientY };
    }
    touchInfo.maxFingers = Math.max(touchInfo.maxFingers, e.touches.length);
    e.preventDefault();
  }, { passive: false });

  el.addEventListener('touchmove', function (e) {
    if (touchInfo !== null && e.touches.length === 1) {
      touchInfo.lastX = e.touches[0].clientX;
      touchInfo.lastY = e.touches[0].clientY;
    }
    e.preventDefault();
  }, { passive: false });

  el.addEventListener('touchend', function (e) {
    if (touchInfo === null || e.touches.length > 0) return;  //まだ指が残っている

    var info = touchInfo;
    touchInfo = null;
    if (info.maxFingers !== 1) return;                       //2本指以上は何もしない

    var dx = info.lastX - info.startX;
    var dy = info.lastY - info.startY;
    if (Math.abs(dx) < SWIPE_DISTANCE && Math.abs(dy) < SWIPE_DISTANCE) {
      onNextRequest(e);                                       //タップ → 次へ
    } else if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx < 0) onNextRequest(e);                           //左 → 次へ
      else onBackRequest();                                   //右 → 前へ
    } else {
      if (dy > 0) addWeakCurrent();                           //下 → 苦手に登録
      else removeWeakCurrent();                               //上 → 苦手から外す
    }
    e.preventDefault();
  }, { passive: false });

  el.addEventListener('touchcancel', function () {
    touchInfo = null;
  });
}
bindTrainerTouch(document.getElementById('touchArea'));
bindTrainerTouch(document.getElementById('touchArea2'));

//1つ前のスクランブルに戻す（直近1回だけ。戻すと「前のスクランブル」にはその1つ前を表示）
function onBackRequest() {
  if (training !== null && training.index === 0) return;   //training の最初の問題より前には戻らない
  if (!backScramble()) return;

  if (training !== null) {
    training.index--;                                       //次は今まで表示していた問題をもう一度出す
  } else if (!weakMode) {
    count = Math.max(0, count - 1);
  }
  renderCounter();
}

//矢印キー（PC 用。スワイプと同じ機能）
//  → 次のスクランブル / ← 1つ前のスクランブル / ↓ 苦手に登録 / ↑ 苦手から外す
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || !acceptsTrainerKey(e)) return;
  if (document.body.classList.contains('modal-open')) return;   //設定などの画面を開いているとき
  switch (e.key) {
    case 'ArrowRight': onNextRequest(e); break;
    case 'ArrowLeft':  if (!e.repeat) onBackRequest(); e.preventDefault(); break;
    case 'ArrowDown':  if (!e.repeat) addWeakCurrent(); e.preventDefault(); break;
    case 'ArrowUp':    if (!e.repeat) removeWeakCurrent(); e.preventDefault(); break;
  }
});

//X キーを押したら、今の問題を苦手に登録（weak モード中は苦手から外す）
//Ctrl+X（切り取り）などのショートカットや、押しっぱなしの連続入力では反応しない
document.addEventListener('keydown', function (e) {
  if (e.code === 'KeyX' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && acceptsTrainerKey(e)) {
    toggleWeakCurrent();
  }
});




//カウンター関係
//カウンターの数字を表示に反映
function renderCounter() {
  var text;
  if (training !== null) {
    text = "Training " + (training.index + 1) + " / " + training.list.length;
  } else if (weakMode) {
    text = "苦手 : " + weakList.length + " パターン";        //weak モードは苦手の数
  } else {
    text = "count : " + count;
  }
  document.getElementById("text_counter").textContent = text;
}

//カウンターを1増やす
function incrementCounter() {
  count++;
  renderCounter();
}

//カウンターのリセット
function resetCounter() {
  count = 0;
  renderCounter();
  document.activeElement.blur();
}

//設定に合わせてカウンターを表示／非表示
function applyCounterVisibility() {
  renderCounter();
  var visible = (training !== null) || weakMode || document.getElementById("counter").checked;
  document.getElementById("counters").style.visibility = visible ? "visible" : "hidden";
}

//設定画面を閉じたとき（FL Trainer は図の向き・非表示の設定をすぐに反映する）
$('#modal1').on('hidden.bs.modal', function () {
  trainerShowBefore[trainerKind] = document.getElementById("show-before").checked;
  applyCounterVisibility();
  renderScramble();
});




//設定のチェックボックスを初期化
function resetSettingCheck(){

  document.getElementById("FL-Dface").checked = true;
  document.getElementById("counter").checked = true;
  document.getElementById("show-before").checked = SHOW_BEFORE_DEFAULT[trainerKind];
  document.getElementById("flt-hide-corners").checked = false;
  document.getElementById("flt-hide-centers").checked = false;
  document.getElementById("flt-exclude-done").checked = true;
}


//フォーム関係
//選択されたラジオボタンの値を取得
function getSelectedLanguage() {
    // ラジオボタンの要素を取得
    var radioButtons = document.getElementsByName("state");

    // 選択されているラジオボタンを探し、その値を取得
    var selectedLanguage = "";
    for (var i = 0; i < radioButtons.length; i++) {
        if (radioButtons[i].checked) {
            selectedLanguage = radioButtons[i].value;
            break;
        }
    }
    return selectedLanguage;
}

//選択されたチェックボックスの値を取得
function getCheckboxValues() {
  var checkboxes = document.querySelectorAll('input[name="twist"]:checked');
  var selectedOptions = Array.from(checkboxes).map(checkbox => checkbox.value);
  return selectedOptions;

}


function getCheckboxCenters(){

  var arrCheck = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
  for (var i = 0; i < 18; i++) {
    for (var j = 0; j < centers[i].length; j++) {
      if (centers[i][j] == true) {
        arrCheck[i].push(j);
      }
    }
  }
  return arrCheck;
}


//Center画面関係
//センター選択画面の中身を作る（起動時に1回だけ）
function buildCenterList() {
  var html = "";

  CENTER_GROUP_NAMES.forEach(function (groupName, g) {
    //このグループに属するセンターの番号
    var members = [];
    CENTER_CASES.forEach(function (c, n) {
      if (c.group === g) members.push(n);
    });

    if (members.length === 1) {
      //1パターンだけのグループ（Pure, H-perm）は折りたたまない
      html += '<div class="center-group">'
            +   '<label class="center-summary">'
            +     '<span class="center-toggle"></span>'
            +     patternCheckboxHtml(members[0])
            +     '<span class="center-group-name">' + groupName + '</span>'
            +   '</label>'
            + '</div>';
    } else {
      //複数パターンのグループは折りたたみ
      html += '<details class="center-group">'
            +   '<summary class="center-summary">'
            +     '<span class="center-toggle"></span>'
            +     '<label class="center-group-label">'
            +       '<input type="checkbox" class="center-group-check" data-group="' + g + '">'
            +       '<span class="center-group-name">' + groupName + '</span>'
            +     '</label>'
            +     '<span class="center-group-count" data-group="' + g + '"></span>'
            +   '</summary>'
            +   '<div class="center-patterns">'
            +     members.map(function (n) {
                    return '<label>' + patternCheckboxHtml(n) + CENTER_CASES[n].name + '</label>';
                  }).join('')
            +   '</div>'
            + '</details>';
    }
  });

  document.getElementById("center-list").innerHTML = html;
}

//センター1パターン分のチェックボックス
function patternCheckboxHtml(n) {
  return '<input type="checkbox" class="center-pattern"'
       + ' data-index="' + n + '" data-group="' + CENTER_CASES[n].group + '">';
}

//グループ g に属するセンターのチェックボックス
function getPatternChecks(g) {
  return document.querySelectorAll('.center-pattern[data-group="' + g + '"]');
}

//グループのチェックと件数表示を、中のセンターの状態に合わせる
function refreshGroupCheck(g) {
  var groupCheck = document.querySelector('.center-group-check[data-group="' + g + '"]');
  if (groupCheck === null) return;  //1パターンだけのグループにはない

  var checks = getPatternChecks(g);
  var selected = 0;
  checks.forEach(function (cb) { if (cb.checked) selected++; });

  groupCheck.checked = (selected === checks.length);                        //全部 → チェック
  groupCheck.indeterminate = (selected > 0 && selected < checks.length);    //一部 → 「－」表示
  document.querySelector('.center-group-count[data-group="' + g + '"]').textContent =
    selected + "/" + checks.length;
}

function refreshAllGroupChecks() {
  CENTER_GROUP_NAMES.forEach(function (name, g) { refreshGroupCheck(g); });
}

//チェックボックスが操作されたとき（センター選択画面の中の全部をまとめて受け取る）
document.getElementById("center-list").addEventListener("change", function (e) {
  var target = e.target;
  var g = Number(target.dataset.group);

  if (target.classList.contains("center-group-check")) {
    //グループのチェック → 中のセンターを全部そろえる
    getPatternChecks(g).forEach(function (cb) { cb.checked = target.checked; });
  }
  refreshGroupCheck(g);
});

//Center画面を開いたときの処理
function selectCenters(num){
  cNumber = num;
  document.getElementById("label-center").textContent =
    "Center : " + document.getElementById(tclls[1][num]).textContent;

  document.querySelectorAll(".center-pattern").forEach(function (cb) {
    cb.checked = centers[cNumber][Number(cb.dataset.index)];
  });
  refreshAllGroupChecks();
}

//Center画面を閉じたら実行
$('#modal-center').on('hide.bs.modal', function () {

  //centers更新
  document.querySelectorAll(".center-pattern").forEach(function (cb) {
    centers[cNumber][Number(cb.dataset.index)] = cb.checked;
  });

  //センターが1つでも選ばれていればケースを選択、0個なら解除
  var anySelected = centers[cNumber].some(function (c) { return c; });
  document.getElementById("checkbox" + (cNumber + 1)).checked = anySelected;

  //背景色変更
  refreshCaseColor(cNumber);
});

//Center画面が閉じ終わったら、開いているグループをすべて閉じる
$('#modal-center').on('hidden.bs.modal', function () {
  document.querySelectorAll("#center-list details").forEach(function (d) {
    d.open = false;
  });
});

//centerのチェックショートカット用（All / Clear）
function setAllCenterChecks(flag) {
  document.querySelectorAll(".center-pattern").forEach(function (cb) { cb.checked = flag; });
  refreshAllGroupChecks();
}

function updateCenters(num,flag){
  for (var i = 0; i < centers[num].length; i++) {
    centers[num][i] = flag;
  }
}

//TCLLのチェックショートカットボタン用
//mode: 0=Clear, 1=Odd, 2=Even, 3=All
function checkTCLL(mode) {
  document.querySelectorAll('input[name="twist"]').forEach(function (checkbox, i) {
    var isOdd = (i % 2 === 0);  //i=0 がケース1（奇数）
    var flag = (mode === 3) || (mode === 1 && isOdd) || (mode === 2 && !isOdd);
    setCaseSelected(i, flag);
  });
}


//チェックボックスの背景
//ケースを選択／解除する（センターの選択と背景色も連動させる）
function setCaseSelected(i, flag) {
  document.getElementById("checkbox" + (i + 1)).checked = flag;
  updateCenters(i, flag);
  refreshCaseColor(i);
}

//センターの選択数に応じて、ケースの背景色を変える
function refreshCaseColor(i) {
  var selected = centers[i].filter(function (c) { return c; }).length;

  var color;
  if (selected === 0) {
    color = "#FFFFFF";                 //なし
  } else if (selected === centers[i].length) {
    color = "#ABC88B";                 //全部
  } else {
    color = "#F47A4D";                 //一部
  }
  document.getElementById(tclls[0][i]).style.backgroundColor = color;
  document.getElementById(tclls[1][i]).style.backgroundColor = color;
}



//18個のチェックボックスに、同じ処理を登録する
document.querySelectorAll('input[name="twist"]').forEach(function (checkbox, i) {
  checkbox.addEventListener('change', function () {
    setCaseSelected(i, checkbox.checked);
  });
});






//training モード関係
//training の状態（null のときは通常モード）
//  list  : 出題する問題の配列。問題は { tcll: ケース番号(1〜18), center: センター番号(0〜59) }
//  index : 今表示している問題の番号（list の添字）
var training = null;

//training ボタン：開始／中断
document.getElementById('training-button').addEventListener('click', function () {
  document.activeElement.blur();
  if (training === null) {
    startTraining();
  } else {
    stopTraining();
  }
});

//training を開始する
function startTraining() {
  var list = buildTrainingList();
  if (list.length === 0) {
    alert(trainerKind === "fl" ? "FLパターンを選択しなさい！！" : "コーナーを選択しなさい！！");
    return;
  }
  weakMode = false;   //weak モード中なら抜ける
  training = { list: list, index: 0 };
  showTrainingProblem();
  updateModeUI();
}

//training を中断して通常モードに戻る
function stopTraining() {
  training = null;
  updateModeUI();
}

//選択されている「ケース × センター」をすべて並べ、シャッフルして返す
//（持ち替えると同じ状態になるケースも、別々に出題する）
//（FL Trainer は、選択した FL パターンを1つずつ）
function buildTrainingList() {
  if (trainerKind === "fl") {
    return shuffle(getFlSelectedNames().map(function (name) { return { fl: name }; }));
  }
  var list = [];
  getCheckboxValues().forEach(function (value) {
    var tcll = Number(value);
    centers[tcll - 1].forEach(function (selected, n) {
      if (selected) {
        list.push({ tcll: tcll, center: n });
      }
    });
  });
  return shuffle(list);
}

//配列をシャッフルする（Fisher–Yates 法）
function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = getRandomInt(0, i);
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

//今の問題（list[index]）を表示する
function showTrainingProblem() {
  showProblem(training.list[training.index]);
}

//指定した問題を表示する（TCLL は { tcll, center }、FL Trainer は { fl: パターン名 }）
function showProblem(problem) {
  if (problem.fl !== undefined) {
    var p = findFlPatternByName(problem.fl);
    if (p !== null) ScrambleFlTrainer(p);
    return;
  }
  //このケース・このセンターだけが選ばれている形にして渡す
  var centerSelection = tclls[0].map(function () { return []; });
  centerSelection[problem.tcll - 1] = [problem.center];

  ScrambleSkewb(getSelectedLanguage(), [String(problem.tcll)], centerSelection);
}

//次の問題へ進む。1周したら通常モードへ戻る
function nextTrainingProblem() {
  training.index++;

  if (training.index >= training.list.length) {
    //1周した → 通常モードに戻って、通常のスクランブルを表示
    training = null;
    updateModeUI();
    nextScramble();
    return;
  }

  showTrainingProblem();
  updateModeUI();
}

//モードに合わせて、ボタンとカウンターの表示を切り替える
function updateModeUI() {
  //training ボタン・weak ボタン：そのモード中は押し込まれた見た目
  document.getElementById("training-button").classList.toggle("active", training !== null);
  document.getElementById("weak-button").classList.toggle("active", weakMode);

  //Reset ボタン：training・weak モード中は非表示
  document.getElementById("reset-counter").style.display = (training !== null || weakMode) ? "none" : "";

  //カウンターの表示（training 中は進み具合、weak モード中は苦手の数）
  applyCounterVisibility();
}





//weak モード関係
//苦手パターンの一覧
//  TCLL Trainer: [{ tcll: ケース番号(1〜18), center: センター番号(0〜59) }, …]
//  FL Trainer  : [{ fl: FL一覧のパターン名 }, …]
//ブラウザ（localStorage）に保存し、次に開いたときも使う（TCLL と FL は別々に保存）
var WEAK_STORAGE_KEY = "tcll-trainer-weak";
var FL_WEAK_STORAGE_KEY = "fl-trainer-weak";
var weakList = loadWeakList();
var weakMode = false;   //weak モード中か

function weakStorageKey() {
  return trainerKind === "fl" ? FL_WEAK_STORAGE_KEY : WEAK_STORAGE_KEY;
}

//保存されている苦手パターンを読み込む
function loadWeakList() {
  try {
    var saved = localStorage.getItem(weakStorageKey());
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];   //保存が使えない環境では空から始める
  }
}

//苦手パターンを保存する
function saveWeakList() {
  try {
    localStorage.setItem(weakStorageKey(), JSON.stringify(weakList));
  } catch (e) {
    //保存できなくても、このページを開いている間は使える
  }
}

//問題を比べるための文字列
function problemKey(p) {
  return (p.fl !== undefined) ? "fl:" + p.fl : p.tcll + "-" + p.center;
}

//今表示している問題（まだ何も表示していなければ null）
function currentProblem() {
  return (CurrentScramble !== null && CurrentScramble.problem) ? CurrentScramble.problem : null;
}

//苦手パターンの中から探す（見つからなければ -1）
function findWeak(problem) {
  var key = problemKey(problem);
  for (var i = 0; i < weakList.length; i++) {
    if (problemKey(weakList[i]) === key) return i;
  }
  return -1;
}

//今表示している問題を、苦手に登録する（記録済みなら追加はしないが、合図は出す）
function addWeakCurrent() {
  var problem = currentProblem();
  if (problem === null) return;   //まだ何も表示していない
  if (findWeak(problem) === -1) {
    weakList.push(problem);
    saveWeakList();
  }
  flashWeakButton("weak-added");
  renderCounter();
}

//今表示している問題を、苦手から外す（どのモードでも外せる）
function removeWeakCurrent() {
  var problem = currentProblem();
  if (problem === null) return;
  var i = findWeak(problem);
  if (i === -1) return;                   //登録されていない
  weakList.splice(i, 1);
  saveWeakList();
  flashWeakButton("weak-removed");
  renderCounter();

  if (weakMode && weakList.length === 0) {
    //苦手が全部なくなった → 通常モードに戻る
    weakMode = false;
    updateModeUI();
    //ボタンが青くなるのを画面に出してから、メッセージを表示する
    setTimeout(function () {
      alert("苦手パターンが無くなりました！通常モードに戻ります。");
    }, 50);
  }
}

//X キー用：苦手に登録（weak モード中は苦手から外す）
function toggleWeakCurrent() {
  if (weakMode) removeWeakCurrent();
  else addWeakCurrent();
}

//weak ボタンを 0.3 秒だけ色付けする
function flashWeakButton(className) {
  var el = document.getElementById("weak-button");
  el.classList.add(className);
  setTimeout(function () {
    el.classList.remove(className);
  }, 300);
}

//weak ボタン：weak モードの開始／終了（training 中なら training を中断して開始）
document.getElementById('weak-button').addEventListener('click', function () {
  document.activeElement.blur();
  if (weakMode) {
    stopWeakMode();
  } else {
    startWeakMode();
  }
});

function startWeakMode() {
  if (weakList.length === 0) {
    alert("苦手パターンが登録されていません");
    return;
  }
  training = null;   //training 中なら中断
  weakMode = true;
  nextWeakProblem();
  updateModeUI();
}

function stopWeakMode() {
  weakMode = false;
  updateModeUI();
}

//苦手パターンからランダムに1つ表示する
function nextWeakProblem() {
  if (weakList.length === 0) {
    //全部外れた → 通常モードに戻る
    weakMode = false;
    updateModeUI();
    nextScramble();
    return;
  }
  showProblem(weakList[getRandomInt(0, weakList.length - 1)]);
}










//FL Trainer 関係
//FL選択画面：出題する FL一覧のパターン（名前 → 選択されているか）
//ブラウザ（localStorage）に保存する。保存が無いときは全部選択
var FL_SELECT_STORAGE_KEY = "fl-trainer-selected";
var FLT_SELECT_FIGURE_WIDTH = 30;   //選択画面の図の大きさ
var FLT_RESULT_FIGURE_WIDTH = 50;   //手順のあとの LL の状態（モーダル）の図の大きさ
var flSelected = loadFlSelected();
var flSelectGroup = 0;              //選択画面で表示しているグループ
var flSelectToken = 0;
var flPatternByName = null;

function loadFlSelected() {
  var sel = {};
  try {
    var saved = JSON.parse(localStorage.getItem(FL_SELECT_STORAGE_KEY));
    if (Array.isArray(saved)) {
      saved.forEach(function (name) { sel[name] = true; });
      return sel;
    }
  } catch (e) {
    //保存が使えない環境では全部選択から始める
  }
  getFlPatterns().forEach(function (list) {
    list.forEach(function (p) { sel[p.name] = true; });
  });
  return sel;
}

function saveFlSelected() {
  try {
    localStorage.setItem(FL_SELECT_STORAGE_KEY, JSON.stringify(getFlSelectedRecord()));
  } catch (e) {
    //保存できなくても、このページを開いている間は使える
  }
}

//「Doneを除く」のときは、FL選択画面の Done は非選択で固定（選択の記録は残し、出題には使わない）
var FL_DONE_GROUP = 4;
function isFlGroupLocked(g) {
  return g === FL_DONE_GROUP && document.getElementById("flt-exclude-done").checked;
}

function isFlSelected(p) {
  return !!flSelected[p.name] && !isFlGroupLocked(p.group);
}

//選択されているパターンの名前（FL一覧の順。「Doneを除く」のときは Done を除く）
function getFlSelectedNames() {
  var names = [];
  getFlPatterns().forEach(function (list) {
    list.forEach(function (p) { if (isFlSelected(p)) names.push(p.name); });
  });
  return names;
}

//保存する選択（Done の固定中も、Done の選択の記録は残す）
function getFlSelectedRecord() {
  var names = [];
  getFlPatterns().forEach(function (list) {
    list.forEach(function (p) { if (flSelected[p.name]) names.push(p.name); });
  });
  return names;
}

function findFlPatternByName(name) {
  if (flPatternByName === null) {
    flPatternByName = {};
    getFlPatterns().forEach(function (list) {
      list.forEach(function (p) { flPatternByName[p.name] = p; });
    });
  }
  return flPatternByName[name] || null;
}

//グループのボタン（選択数も表示）
function renderFlSelectButtons() {
  document.getElementById("flt-group-buttons").innerHTML = getFlPatterns().map(function (list, g) {
    var n = list.filter(isFlSelected).length;
    return '<button type="button" class="btn btn-outline-secondary' + (g === flSelectGroup ? ' active' : '') + '" data-group="' + g + '">'
         + escapeHtml(FL_GROUP_NAMES[g]) + ' <span class="flt-group-count">' + n + '/' + list.length + '</span></button>';
  }).join("");
}

//FL選択画面を表示する（グループの切り替え時にも呼ぶ）
function renderFlSelect() {
  renderFlSelectButtons();
  var list = getFlPatterns()[flSelectGroup];
  var locked = isFlGroupLocked(flSelectGroup);
  document.getElementById("flt-select-note").hidden = !locked;
  var size = getSkewbCanvasSize(FLT_SELECT_FIGURE_WIDTH);
  document.getElementById("flt-select-list").innerHTML = list.map(function (p, n) {
    return '<div class="flt-tile' + (isFlSelected(p) ? ' selected' : '') + (locked ? ' locked' : '') + '" data-index="' + n + '"'
         +   (locked ? '' : ' title="タップで選択／解除"') + '>'
         +   '<canvas width="' + size.width + '" height="' + size.height + '"></canvas>'
         +   '<div class="flt-tile-name">' + escapeHtml(p.name) + '</div>'
         + '</div>';
  }).join("");

  //図を少しずつ描く
  var token = ++flSelectToken;
  var tiles = Array.prototype.slice.call(document.querySelectorAll("#flt-select-list .flt-tile"));
  var i = 0;
  (function step() {
    if (token !== flSelectToken) return;
    var start = Date.now();
    while (i < tiles.length && Date.now() - start < 30) {
      DrawSkewbColors(FLT_SELECT_FIGURE_WIDTH, tiles[i].querySelector("canvas"), getFlPatternColors(list[i]), FL_PALETTE);
      i++;
    }
    if (i < tiles.length) setTimeout(step, 0);
  })();
}

//タイルの見た目を選択に合わせる
function refreshFlSelectTiles() {
  var list = getFlPatterns()[flSelectGroup];
  document.querySelectorAll("#flt-select-list .flt-tile").forEach(function (t) {
    t.classList.toggle("selected", isFlSelected(list[Number(t.dataset.index)]));
  });
  renderFlSelectButtons();
}

function setFlSelected(p, flag) {
  if (flag) flSelected[p.name] = true;
  else delete flSelected[p.name];
}

//表示しているグループを全部選択／解除
function setFlSelectGroup(flag) {
  if (isFlGroupLocked(flSelectGroup)) return;   //「Doneを除く」のときの Done は変えない
  getFlPatterns()[flSelectGroup].forEach(function (p) { setFlSelected(p, flag); });
  saveFlSelected();
  refreshFlSelectTiles();
}

//全部のグループを選択／解除（「Doneを除く」のときの Done は変えない）
function setFlSelectAll(flag) {
  getFlPatterns().forEach(function (list, g) {
    if (isFlGroupLocked(g)) return;
    list.forEach(function (p) { setFlSelected(p, flag); });
  });
  saveFlSelected();
  refreshFlSelectTiles();
}

$('#modal-fl-select').on('show.bs.modal', renderFlSelect);

document.getElementById("flt-group-buttons").addEventListener("click", function (e) {
  var b = e.target.closest("button");
  if (b === null) return;
  flSelectGroup = Number(b.dataset.group);
  renderFlSelect();
  document.getElementById("flt-select-list").scrollTop = 0;
  b.blur();
});

document.getElementById("flt-select-list").addEventListener("click", function (e) {
  var t = e.target.closest(".flt-tile");
  if (t === null || isFlGroupLocked(flSelectGroup)) return;
  var p = getFlPatterns()[flSelectGroup][Number(t.dataset.index)];
  setFlSelected(p, !flSelected[p.name]);
  saveFlSelected();
  refreshFlSelectTiles();
});



//メイン画面の一面の手順（FL一覧の手順）
//  表の下：一面を作る色のボタン（色ごとに、その色の一面のパターン・向きに切り替える）
//  左：完全一面の手順、右：不完全一面の手順（お気に入り → 短い手順 の順に3つまで。表の大きさは固定）
//  手順をタップすると、その手順を回したあとの LL の状態と CLL・EG2 の名前をモーダルで表示する
//  パターン名をタップすると、FL一覧の詳細画面を開く
var FLT_COLOR_ORDER = [0, 5, 1, 3, 2, 4];   //色のボタンの並び（白 黄 緑 青 赤 オレンジ）
var FLT_COLOR_NAMES = ["白", "黄", "緑", "青", "赤", "オレンジ"];

//列 col（FL一覧の列）に載せる手順：5手以下 ＋ お気に入りの6手・7手 の中から、
//お気に入り → 短い手順 の順に FLT_ROWS（3）個まで（表の大きさを固定するため）
var FLT_ROWS = 3;
function getFlTrainerAlgs(p, col) {
  var items = sortFlAlgs(p, col, p.cols[col].algs.concat(getFlFavoriteLong(p, col)));
  var favs = items.filter(function (it) { return it.fav; });
  var rest = items.filter(function (it) { return !it.fav; });
  return favs.concat(rest).slice(0, FLT_ROWS);
}

//表の1列分（FLT_ROWS 行。足りない行は空けて、表の大きさをそろえる）
//  first = 手順が無いときに1行目に出す文字
function flTrainerColumnHtml(items, first) {
  var rows = [];
  var prev = 0;
  items.forEach(function (it) {
    var cls = "fl-alg flt-alg" + ((prev !== 0 && it.code.length !== prev) ? " flt-alg-next" : "") + (it.fav ? " fl-alg-fav" : "")
            + (it.code.length >= 6 ? " flt-alg-len" + it.code.length : "");   //6手・7手は文字を小さくして幅に入れる
    prev = it.code.length;
    rows.push('<div class="' + cls + '" data-code="' + it.code + '"><span>' + escapeHtml(flAlgText(it.code)) + '</span></div>');
  });
  if (rows.length === 0 && first) rows.push('<div class="flt-alg-empty fl-none">' + first + '</div>');
  while (rows.length < FLT_ROWS) rows.push('<div class="flt-alg-empty">&nbsp;</div>');
  return '<td>' + rows.join("") + '</td>';
}

//色のボタン（「Doneを除く」のときは、一面が Done になる色を出さない。選んでいる色は出す）
function flTrainerColorButtonsHtml(fl) {
  var excludeDone = document.getElementById("flt-exclude-done").checked;
  return '<div class="flt-colors">' + FLT_COLOR_ORDER.map(function (c) {
    var v = getFlView(fl, c);
    if (excludeDone && c !== fl.selColor && v.pattern !== null && v.pattern.group === 4) return "";
    return '<button type="button" class="flt-color' + (c === fl.selColor ? ' active' : '') + '" data-color="' + c + '"'
         + ' style="background-color:' + FL_TRAINER_PALETTE[c] + '" aria-label="' + FLT_COLOR_NAMES[c] + 'の一面"></button>';
  }).join("") + '</div>';
}

function renderFlTrainerPanel(cur) {
  var panel = document.getElementById("flt-panel");
  if (!cur.fl) {
    panel.innerHTML = "";
    return;
  }
  var view = getFlView(cur.fl, cur.fl.selColor);
  var p = view.pattern;
  var table;

  if (p === null) {
    //この色の一面はもう揃っている
    //（タップすると、今の CLL・EG2 をモーダルで表示）
    table = '<table class="fl-table flt-table"><thead><tr><th colspan="2" class="flt-pattern-name">揃っています</th></tr></thead>'
          +   '<tbody><tr>'
          +     flTrainerColumnHtml([], "").replace('<td><div class="flt-alg-empty">&nbsp;</div>', '<td><div class="fl-alg flt-alg" data-code=""><span>LL の状態を見る</span></div>')
          +     flTrainerColumnHtml([], "")
          +   '</tr></tbody></table>';
  } else {
    //見本と対角が入れ替わっているときは、FL一覧の不完全一面の手順で完全一面になる
    var cols = view.swapped ? [1, 0] : [0, 1];
    var cells = cols.map(function (col) {
      return flTrainerColumnHtml(getFlTrainerAlgs(p, col), p.cols[col].shortest + "手");
    });
    table = '<table class="fl-table flt-table">'
          +   '<thead><tr><th colspan="2" class="flt-pattern-name flt-open-detail" title="タップで FL一覧の詳細">' + escapeHtml(p.name) + '</th></tr></thead>'
          +   '<tbody><tr>' + cells.join("") + '</tr></tbody>'
          + '</table>';
  }

  panel.innerHTML = '<div class="flt-body">' + table + '</div>'
    + flTrainerColorButtonsHtml(cur.fl);
}

//手順 code を回したあとの LL の状態（一面は D 面）と CLL・EG2 を、モーダルで表示する
function showFlTrainerResult(code) {
  var r = getFlTrainerResult(CurrentScramble.fl, code);
  var c = r.llCase;
  var size = getSkewbCanvasSize(FLT_RESULT_FIGURE_WIDTH);
  document.getElementById("label-flt-result").textContent = (code === "") ? "揃っている状態" : flAlgText(code);
  document.getElementById("flt-result").innerHTML =
      '<canvas width="' + size.width + '" height="' + size.height + '"></canvas>'
    + '<div class="flt-result-sheet">' + (c === null ? "?" : escapeHtml(c.sheet || "完成")) + '</div>'
    + '<div class="flt-result-name">' + (c === null ? "見つかりません" : escapeHtml(c.sheet ? c.name : "全部揃う")) + '</div>';
  DrawSkewbColors(FLT_RESULT_FIGURE_WIDTH, document.querySelector("#flt-result canvas"), r.colors, FL_TRAINER_PALETTE);
  $('#modal-flt-result').modal('show');
}

document.getElementById("flt-panel").addEventListener("click", function (e) {
  if (CurrentScramble === null || !CurrentScramble.fl) return;
  var fl = CurrentScramble.fl;

  //色のボタン → その色の一面に切り替える
  var b = e.target.closest(".flt-color");
  if (b !== null) {
    fl.selColor = Number(b.dataset.color);
    renderScramble();
    b.blur();
    return;
  }

  //パターン名 → FL一覧の詳細画面
  if (e.target.closest(".flt-open-detail") !== null) {
    openFlDetail(getFlView(fl, fl.selColor).pattern);
    return;
  }

  //手順 → 回したあとの CLL・EG2
  var a = e.target.closest(".flt-alg");
  if (a === null) return;
  document.querySelectorAll("#flt-panel .flt-alg").forEach(function (x) { x.classList.toggle("active", x === a); });
  showFlTrainerResult(a.dataset.code);
});

//詳細画面でお気に入りを変えたら、FL Trainer の手順にも反映する
$('#modal-fl-detail').on('hidden.bs.modal', function () {
  if (currentView === "fltrainer" && CurrentScramble !== null && CurrentScramble.fl) {
    renderFlTrainerPanel(CurrentScramble);
  }
});





//手順表の上部をタイトルのすぐ下に固定するため、タイトルの高さを CSS に渡す
function updateNavHeight() {
  var h = document.querySelector(".app-nav").offsetHeight;
  document.documentElement.style.setProperty("--app-nav-h", h + "px");
}
window.addEventListener('resize', updateNavHeight);

window.addEventListener('load', function () {
  updateNavHeight();
  buildCenterList();          //センター選択画面を作成
  InitSkewbSolver();          //ソルバーの表を作成
  nextScramble();             //最初のスクランブルを表示（図の描画も含む）
  applyCounterVisibility();   //カウンターの表示

  showView("trainer");     //最初は TCLL Trainer
});
