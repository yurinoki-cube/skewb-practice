function test(){
  alert("OK");
}



//画面の切り替え（TCLLトレーナー / 手順表）
//  サイトを開いたときは、いつも TCLL Trainer を表示する
var currentView = "trainer";

function showView(name) {
  if (name !== "trainer" && name !== "algsheet") name = "trainer";
  currentView = name;

  document.getElementById("view-trainer").hidden = (name !== "trainer");
  document.getElementById("view-algsheet").hidden = (name !== "algsheet");
  document.querySelectorAll("#view-tabs .nav-link").forEach(function (a) {
    a.classList.toggle("active", a.dataset.view === name);
  });

  if (name === "algsheet") {
    renderAlgSheet();   //表示されてから描く（テキストエリアの高さを正しく測るため）
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
  if (currentView !== "trainer") return false;
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

//タッチ時に実行
//  1本指でタップ        → 次のスクランブル（指を離したとき）
//  2本指で下にスワイプ  → 今の問題を苦手に記録（weak モード中は苦手から外す）
var SWIPE_DISTANCE = 50;  //スワイプと判定する距離（px）
var touchInfo = null;     //タッチ操作中の情報（指が全部離れたら null に戻す）

var touchArea = document.getElementById('touchArea');

touchArea.addEventListener('touchstart', function (e) {
  if (touchInfo === null) {
    touchInfo = { maxFingers: 0, startY: 0, lastY: 0 };
  }
  touchInfo.maxFingers = Math.max(touchInfo.maxFingers, e.touches.length);
  if (e.touches.length === 2) {
    //2本目の指が触れた位置を、スワイプの開始位置にする
    touchInfo.startY = averageY(e.touches);
    touchInfo.lastY = touchInfo.startY;
  }
  e.preventDefault();
}, { passive: false });

touchArea.addEventListener('touchmove', function (e) {
  if (touchInfo !== null && e.touches.length === 2) {
    touchInfo.lastY = averageY(e.touches);
  }
  e.preventDefault();
}, { passive: false });

touchArea.addEventListener('touchend', function (e) {
  if (touchInfo === null || e.touches.length > 0) return;  //まだ指が残っている

  var info = touchInfo;
  touchInfo = null;

  if (info.maxFingers === 1) {
    onNextRequest(e);                                       //1本指 → 次へ
  } else if (info.maxFingers === 2 && info.lastY - info.startY > SWIPE_DISTANCE) {
    toggleWeakCurrent();                                    //2本指で下へ → 苦手
  }
  e.preventDefault();
}, { passive: false });

touchArea.addEventListener('touchcancel', function () {
  touchInfo = null;
});

//指の位置（縦方向）の平均
function averageY(touches) {
  var sum = 0;
  for (var i = 0; i < touches.length; i++) {
    sum += touches[i].clientY;
  }
  return sum / touches.length;
}

//X キーを押したら、今の問題を苦手に記録（weak モード中は苦手から外す）
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
  var visible = (training !== null) || document.getElementById("counter").checked;
  document.getElementById("counters").style.visibility = visible ? "visible" : "hidden";
}

//設定画面を閉じたとき
$('#modal1').on('hidden.bs.modal', applyCounterVisibility);




//設定のチェックボックスを初期化
function resetSettingCheck(){

  document.getElementById("FL-Dface").checked = true;
  document.getElementById("counter").checked = true;
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
    alert("コーナーを選択しなさい！！");
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
function buildTrainingList() {
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

//指定した問題 { tcll, center } を表示する
function showProblem(problem) {
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

  //Reset ボタン：training 中は非表示
  document.getElementById("reset-counter").style.display = (training !== null) ? "none" : "";

  //カウンターの表示（training 中は進み具合）
  applyCounterVisibility();
}





//weak モード関係
//苦手パターンの一覧 [{ tcll: ケース番号(1〜18), center: センター番号(0〜59) }, …]
//ブラウザ（localStorage）に保存し、次に開いたときも使う
var WEAK_STORAGE_KEY = "tcll-trainer-weak";
var weakList = loadWeakList();
var weakMode = false;   //weak モード中か

//保存されている苦手パターンを読み込む
function loadWeakList() {
  try {
    var saved = localStorage.getItem(WEAK_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];   //保存が使えない環境では空から始める
  }
}

//苦手パターンを保存する
function saveWeakList() {
  try {
    localStorage.setItem(WEAK_STORAGE_KEY, JSON.stringify(weakList));
  } catch (e) {
    //保存できなくても、このページを開いている間は使える
  }
}

//苦手パターンの中から探す（見つからなければ -1）
function findWeak(tcll, center) {
  for (var i = 0; i < weakList.length; i++) {
    if (weakList[i].tcll === tcll && weakList[i].center === center) return i;
  }
  return -1;
}

//今表示している問題を、苦手に追加する（weak モード中は苦手から外す）
function toggleWeakCurrent() {
  if (CurrentTco === undefined) return;   //まだ何も表示していない
  var i = findWeak(CurrentTco, CurrentCenter);

  if (weakMode) {
    //weak モード：克服したので外す
    if (i !== -1) {
      weakList.splice(i, 1);
      saveWeakList();
      flashWeakButton("weak-removed");

      if (weakList.length === 0) {
        //苦手が全部なくなった → 通常モードに戻る
        weakMode = false;
        updateModeUI();
        //ボタンが青くなるのを画面に出してから、メッセージを表示する
        setTimeout(function () {
          alert("苦手パターンが無くなりました！通常モードに戻ります。");
        }, 50);
      }
    }
  } else {
    //通常・training：苦手に追加（記録済みなら追加はしないが、合図は出す）
    if (i === -1) {
      weakList.push({ tcll: CurrentTco, center: CurrentCenter });
      saveWeakList();
    }
    flashWeakButton("weak-added");
  }
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
