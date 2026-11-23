var ScrambleColor = [0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5];

//表示向き変更用
  var FLsurface;//基準面
  var FLcolor;  //FirstLayerの色(0,1,2,3,4,5=w,r,g,o,b,y)
  var Twist;  //Twistコーナー

//今表示している問題（苦手の記録用）
var CurrentTco;     //TCLLの番号（1〜18）
var CurrentCenter;  //センターの番号（CENTER_CASES の番号）

//表示しているスクランブルと、その前の2つ（右スワイプ・← キーで1回だけ戻せる）
//  { text, color（下線の色）, colors（図の色）, tco, center, problem（苦手の記録用）, fl（FL Trainer のときの状態） }
var CurrentScramble = null;
var PrevScramble = null;    //1つ前（「前のスクランブル」に表示）
var Prev2Scramble = null;   //2つ前（戻したときに「前のスクランブル」に表示）
var CanBackScramble = false;

//新しいスクランブルを表示する（今のものは「前のスクランブル」になる）
function pushScramble(s) {
  Prev2Scramble = PrevScramble;
  PrevScramble = CurrentScramble;
  CurrentScramble = s;
  CanBackScramble = (PrevScramble !== null);
  renderScramble();
}

//1つ前のスクランブルに戻す（直近1回だけ。戻したら「前のスクランブル」はその1つ前を表示）
//戻せたら true
function backScramble() {
  if (!CanBackScramble || PrevScramble === null) return false;
  CurrentScramble = PrevScramble;
  PrevScramble = Prev2Scramble;
  Prev2Scramble = null;
  CanBackScramble = false;
  renderScramble();
  return true;
}

//スクランブルの文字・下線の色・図を表示する
function renderScramble() {
  var cur = CurrentScramble;
  if (cur === null) return;

  //前のスクランブル（設定で表示するときだけ。まだ無いときは「前のスクランブル : 」だけ表示）
  var before = document.getElementById("text_before_scramble");
  if (!document.getElementById("show-before").checked) {
    before.innerHTML = "";
  } else if (PrevScramble !== null) {
    before.innerHTML = '前のスクランブル : <span class="before-scramble" style="text-decoration-color:'
                     + PrevScramble.color + '">' + PrevScramble.text + '</span>';
  } else {
    before.innerHTML = "前のスクランブル : ";
  }

  document.getElementById("text_scramble").innerHTML = cur.text;
  document.getElementById("text_scramble").style.textDecorationColor = cur.color;   //基準色

  CurrentTco = cur.tco;
  CurrentCenter = cur.center;
  //FL Trainer は、キャンバスの高さを図に合わせる（図の下の空白を短くする）。TCLL は元の高さ（300）
  var canvas = document.getElementById("canvas");
  var height = cur.fl ? getSkewbCanvasSize(64).height : 300;
  if (canvas.height !== height) canvas.height = height;

  if (cur.fl) {
    //FL Trainer：設定（First Layer を D 面・LL を非表示）に合わせて、表示するたびに色を作る
    ScrambleColor = getFlTrainerColors(cur.fl);
    DrawSkewbColors(64, document.getElementById("canvas"), ScrambleColor, FL_TRAINER_PALETTE);
  } else {
    ScrambleColor = cur.colors;
    InitSkewbDrawer(64, document.getElementById("canvas"));
  }

  if (typeof renderFlTrainerPanel === "function") renderFlTrainerPanel(cur);   //FL Trainer の手順（main.js）
}

//スクランブル
function ScrambleSkewb(state,corner,center){

  switch (state) {
    case "none":
      break;

    case "tcll":
    //一つも選択されていないときに終了する
      if (corner.length === 0) {
        //選択が一つもないときの処理
        alert("コーナーを選択しなさい！！");
        break;
      }

      var ScrambleAlg = statusTCLL(corner,center); //スクランブル取得
      if (ScrambleAlg === null) {
        break;  //解法が見つからなかったときは表示を変えない
      }
      var ScrambleText = getScrambleText(ScrambleAlg);  //回転記号化
      var sColor = getStateColor(ScrambleAlg);  //色取得

    //基準面をD面に変更
      if (document.getElementById("FL-Dface").checked == true) {
        ScrambleColor = chengeDface(sColor);
      }else {
        ScrambleColor =sColor;
      }

    //表示（今のスクランブルは「前のスクランブル」に回す）
      pushScramble({
        text: ScrambleText,        //スクランブル
        color: flcolorIF(),        //下線の色（FirstLayer の色）
        colors: ScrambleColor,     //図の色
        tco: CurrentTco,           //苦手の記録用
        center: CurrentCenter,
        problem: { tcll: CurrentTco, center: CurrentCenter }
      });

      break;
    default:
  }
}

//TCLLの状態にする関数
//（向き・色をランダムに決めて、buildTcllState で状態を作る）
function statusTCLL(corner,center){

  //チェックしているTCLLのコーナーをランダムで1つ選択
  var Tco = parseInt(corner[getRandomInt(0,corner.length-1)]); //TCLLの番号
  var TcoNum = returnOneOrTwoBasedOnRemainder(Tco); //twistの向き
  var Tcos = getTcos(Tco); //各LLコーナーの向き

  //Firstlayerの面をランダムで確定(0,1,2,3,4,5=U,FR,FL,BL,BR,D)
  FLsurface = getRandomInt(0, 5);

  //Firstlayerの面の色とtwistコーナーを確定
  var TwistFlag = false;//Twistが確定してるかの判定
  var Diff; //FirstLayerの基準面と色の差

  if (FLsurface < 3) {
    //0-2のとき
    //TwistFlagがTrueになるまで繰り返す
    while (TwistFlag == false) {
      FLcolor = getRandomInt(0, 2); //FirstLayerの色を決める
      Diff = addThreeIfNegative(FLcolor - FLsurface); //基準面と色の差

      if (Diff == 0) {
        //基準面と色の差が同じ時
        Twist = getRandomInt(1, 3);  //Twistの場所確定
        TwistFlag = true;  //Twist確定

      }else {
        //基準面と色の差が違う時
        if (Diff == TcoNum) {
          //差とTwistのCOが同じときの処理
          Twist = 0;  //Twistの場所確定
          TwistFlag = true;  //Twist確定
        }
      }
    }
  }else{
    //3-5のとき
    //TwistFlagがTrueになるまで繰り返す
    while (TwistFlag == false) {
      FLcolor = getRandomInt(3, 5); //FirstLayerの色を決める
      Diff = addThreeIfNegative(FLcolor - FLsurface); //基準面と色の差

      //LLのコーナーにDiffがあるか確認
      var StockTco = new Array();  //可能な向き
      for (var i = 0; i < Tcos.length; i++) {
        if (Tcos[i] == Diff) {
          StockTco.push(i);
        }
      }
      if (StockTco.length >= 1) {
        Twist = StockTco[getRandomInt(0,StockTco.length - 1)];
        TwistFlag = true;  //Twist確定
      }
    }
  }

//センター
  var candidates = getCenterCandidates(center[Tco-1]);                    //候補（CENTER_CASES の番号）
  var centerIndex = candidates[getRandomInt(0, candidates.length - 1)];  //1つ選ぶ

  //状態を作る
  var state = buildTcllState(Tco, centerIndex, FLsurface, FLcolor, Twist);

  //スクランブル用Alg取得
  var SolveAlg = SkewbSolution(state.center, state.corner);
  if (!Array.isArray(SolveAlg)) {
    console.error("解法が見つかりませんでした（TCLL " + Tco + "）");
    return null;
  }
  //今表示している問題として記録
  CurrentTco = Tco;
  CurrentCenter = centerIndex;

  var ScrambleAlg = getReverseAlg(SolveAlg);

  return ScrambleAlg;

}

//TCLLの状態（センター・コーナー）を作る関数
//  Tco        : TCLLの番号（1〜18）
//  centerIndex: センターの番号（CENTER_CASES の番号）
//  fls        : FirstLayerの面(0,1,2,3,4,5=U,FR,FL,BL,BR,D)
//  flc        : FirstLayerの色
//  twist      : Twistコーナーの場所(0〜3)
//戻り値 { center: Lsurface, corner: Lvertex }（SkewbSolution にそのまま渡せる形）
function buildTcllState(Tco, centerIndex, fls, flc, twist){
  var TcoNum = returnOneOrTwoBasedOnRemainder(Tco); //twistの向き
  var Tcos = rotateArrayLeft(getTcos(Tco), twist);  //各LLコーナーの向き（Twistに合わせる）
  var Diff = addThreeIfNegative(flc - fls);         //基準面と色の差

  //CP反映
  var Lvertex = getCorners(Diff);

  //CO反映
  var FLcps = getFLcps(fls);  //基準面のCPを取得
  var LLcps = getFLcps(getOppColor(fls));  //LL面のCPを取得

  var CornerCos = [9,9,9,9,9,9,9,9];  //LvertexにCOを反映するための配列
  CornerCos[FLcps[twist]] = TcoNum; //TwistのCO反映
  //LLのCO反映
  for (var j = 0; j < LLcps.length; j++) {
    CornerCos[LLcps[j]] = Tcos[j];
  }
  Lvertex = reflectCOs(Lvertex,CornerCos); //反映

  //センター（ねじれ位置に合わせて回す）
  var CenterO = rotateCenterPerm(CENTER_CASES[centerIndex].perm, (4 - twist) % 4);
  var CenterP = getCenterP(fls);
  var Lsurface = getCenters(Diff);//初期ポジション
  var CenterPos = [9,9,9,9,9,9];
  for (var k = 0; k < CenterPos.length; k++) {
    CenterPos[CenterP[CenterO[k]]] = Lsurface[CenterP[k]];
  }

  return { center: CenterPos, corner: Lvertex };
}

//センターの候補（CENTER_CASES の番号）の一覧を返す
//1つも選ばれていなければ、全60通りを返す
function getCenterCandidates(selected) {
  if (selected.length > 0) {
    return selected;
  }
  return CENTER_CASES.map(function (c, n) { return n; });
}

//センターの置換を、側面（FR→FL→BL→BR）方向に times 回だけ回す
//（ねじれコーナーの位置が変わっても、同じ向きでセンターが表示されるようにする）
function rotateCenterPerm(perm, times) {
  var r = [0, 2, 3, 4, 1, 5];   //1回分の回転：U と D はそのまま、側面を1つずつずらす
  var result = perm.slice();
  for (var t = 0; t < times; t++) {
    var next = [];
    for (var k = 0; k < 6; k++) {
      next[r[k]] = r[result[k]];
    }
    result = next;
  }
  return result;
}



//持ち替え（x,x',y,y',z,z'）で色の配列を動かすための表
var CUBE_ROTATE = [
	[[ 0, 5,25,15],[ 1, 6,26,19],[ 2, 7,27,18],[ 3, 8,28,17],[ 4, 9,29,16],[11,13,14,12],[21,22,24,23]],
	[[ 0,15,25, 5],[ 1,19,26, 6],[ 2,18,27, 7],[ 3,17,28, 8],[ 4,16,29, 9],[11,12,14,13],[21,23,24,22]],
	[[ 5,10,15,20],[ 6,11,16,21],[ 7,12,17,22],[ 8,13,18,23],[ 9,14,19,24],[ 1, 3, 4, 2],[26,27,29,28]],
	[[ 5,20,15,10],[ 6,21,16,11],[ 7,22,17,12],[ 8,23,18,13],[ 9,24,19,14],[ 1, 2, 4, 3],[26,28,29,27]],
	[[ 0,20,25,10],[ 1,23,29,12],[ 2,21,28,14],[ 3,24,27,11],[ 4,22,26,13],[ 6, 8, 9, 7],[16,17,19,18]],
	[[ 0,10,25,20],[ 1,12,29,23],[ 2,14,28,21],[ 3,11,27,24],[ 4,13,26,22],[ 6, 7, 9, 8],[16,18,19,17]]];
  //x,x',y,y',z,z'

//持ち替えの記号（例 "x' y2"）に従って、色の配列を動かした新しい配列を返す
function rotateStateColor(col, text){
  var arr = col.slice();
  var tokens = String(text || "").trim().split(/\s+/);
  for (var t = 0; t < tokens.length; t++) {
    var m = /^([xyz])(2?)('?)$/.exec(tokens[t]);
    if (m === null) continue;
    var idx = "xyz".indexOf(m[1]) * 2 + (m[3] === "" ? 0 : 1);
    var times = (m[2] === "2") ? 2 : 1;
    for (var n = 0; n < times; n++) {
      var table = CUBE_ROTATE[idx];
      for (var j = 0; j < table.length; j++) {
        var q = table[j];
        var tmp = arr[q[0]];
        arr[q[0]] = arr[q[1]];
        arr[q[1]] = arr[q[2]];
        arr[q[2]] = arr[q[3]];
        arr[q[3]] = tmp;
      }
    }
  }
  return arr;
}

//D面を基準にする
function chengeDface(col){

  var arr = col;

  var rotate = CUBE_ROTATE;

  var alg = [];

  switch (FLsurface) {
    case 0:
      alg.push(4);
      alg.push(4);
      switch (Twist) {
        case 0:
          alg.push(3);
          break;
        case 1:
          break;
        case 2:
          alg.push(2);
          break;
        case 3:
          alg.push(2);
          alg.push(2);
          break;
      }
      break;
    case 1:
      alg.push(4);
      switch (Twist) {
        case 0:
          break;
        case 1:
          alg.push(2);
          break;
        case 2:
          alg.push(2);
          alg.push(2);
          break;
        case 3:
          alg.push(3);
          break;
      }
      break;
    case 2:
      alg.push(1);
      switch (Twist) {
        case 0:
          break;
        case 1:
          alg.push(2);
          break;
        case 2:
          alg.push(2);
          alg.push(2);
          break;
        case 3:
          alg.push(3);
          break;
      }
      break;
    case 3:
      alg.push(5);
      switch (Twist) {
        case 0:
          alg.push(3);
          break;
        case 1:
          break;
        case 2:
          alg.push(2);
          break;
        case 3:
          alg.push(2);
          alg.push(2);
          break;
      }
      break;
    case 4:
      alg.push(0);
      switch (Twist) {
        case 0:
          alg.push(2);
          break;
        case 1:
          alg.push(2);
          alg.push(2);
          break;
        case 2:
          alg.push(3);
          break;
        case 3:
          break;
      }
      break;
    case 5:
      switch (Twist) {
        case 0:
          break;
        case 1:
          alg.push(2);
          break;
        case 2:
          alg.push(2);
          alg.push(2);
          break;
        case 3:
          alg.push(3);
          break;
      }
      break;
  }

for (var i = 0; i < alg.length; i++) {
  for(var j = 0; j < rotate[alg[i]].length; j++){
    var tmp = arr[rotate[alg[i]][j][0]];
    arr[rotate[alg[i]][j][0]] = arr[rotate[alg[i]][j][1]];
    arr[rotate[alg[i]][j][1]] = arr[rotate[alg[i]][j][2]];
    arr[rotate[alg[i]][j][2]] = arr[rotate[alg[i]][j][3]];
    arr[rotate[alg[i]][j][3]] = tmp;
  }
}
return arr;

}

//Skewb全般
//指定した面の対面を返す関数
function getOppColor(num){
  var arr = [5,3,4,1,2,0];
  return arr[num];
}

//逆回転させる関数
function getReverseAlg(arr){

  var sol = new Array();
  var rev = [1,0,3,2,5,4,7,6];

  for (var i = 0; i < arr.length; i++) {
    sol.unshift(rev[arr[i]]);
  }
  return sol;
}

//回転記号化させる関数
function getScrambleText(ScrambleAlg){
  //各回転番号から回転記号に変換
  var sol = "";
  for(var z = 0; z < ScrambleAlg.length; z++){
    sol += "LRBU".charAt(ScrambleAlg[z] >> 1) + (((ScrambleAlg[z] & 1) == 0)? " ": "' ")
  }
  return sol;
}

//回転記号の文字列（例 "R U' L B"）を回転番号の配列に変換する関数
//読めない記号があれば null を返す
function parseScrambleText(text){
  var alg = [];
  var tokens = String(text).trim().split(/\s+/);
  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i] === "") continue;
    var m = /^([LRBU])(['’]?)$/.exec(tokens[i]);
    if (m === null) return null;
    alg.push("LRBU".indexOf(m[1]) * 2 + (m[2] === "" ? 0 : 1));
  }
  return alg;
}

//色取得
function getStateColor(alg){

  var arr = [0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5];
  var rotate = [
	[[ 5,20,25],[ 8,24,26],[ 6,23,27],[ 9,22,28],[19,13, 3]],
	[[ 5,25,20],[ 8,26,24],[ 6,27,23],[ 9,28,22],[19, 3,13]],
	[[10,25,15],[14,29,18],[12,27,19],[13,28,16],[ 2, 9,23]],
	[[10,15,25],[14,18,29],[12,19,27],[13,16,28],[ 2,23, 9]],
	[[25,20,15],[28,23,19],[26,21,18],[29,24,17],[ 1,14, 8]],
	[[25,15,20],[28,19,23],[26,18,21],[29,17,24],[ 1, 8,14]],
	[[ 0,15,20],[ 1,17,21],[ 3,16,23],[ 2,19,22],[28, 6,12]],
	[[ 0,20,15],[ 1,21,17],[ 3,23,16],[ 2,22,19],[28,12, 6]]];
  //L,L',R,R',B,B',U,U'

  for (var i = 0; i < alg.length; i++) {
    for (var j = 0; j < 5; j++) {
      var tmp = arr[rotate[alg[i]][j][0]];
      arr[rotate[alg[i]][j][0]] = arr[rotate[alg[i]][j][1]];
      arr[rotate[alg[i]][j][1]] = arr[rotate[alg[i]][j][2]];
      arr[rotate[alg[i]][j][2]] = tmp;
    }
  }
  return arr;
}

//数字を色に変換する関数
function flcolorIF(){
  switch (FLcolor) {
    case 0:
      return "#afadad";
      break;
    case 1:
      return "#DA4040";
      break;
    case 2:
      return "#3FA877";
      break;
    case 3:
      return "#FFa500";
      break;
    case 4:
      return "#1E90FF";
      break;
    case 5:
      return "#FFEA00";
      break;
  }
}

//TCLL関係
//TCLLのコーナーの向きを返す関数
function getTcos(num){
  var arr = new Array();
  switch (num) {
    case 1:
      arr = [0,2,0,0];
      break;
    case 2:
      arr = [0,1,0,0];
      break;
    case 3:
      arr = [0,0,0,2];
      break;
    case 4:
      arr = [0,0,0,1];
      break;
    case 5:
      arr = [0,1,0,1];
      break;
    case 6:
      arr = [0,2,0,2];
      break;
    case 7:
      arr = [2,2,1,0];
      break;
    case 8:
      arr = [2,1,1,0];
      break;
    case 9:
      arr = [1,2,2,0];
      break;
    case 10:
      arr = [1,1,2,0];
      break;
    case 11:
      arr = [2,0,1,2];
      break;
    case 12:
      arr = [2,0,1,1];
      break;
    case 13:
      arr = [1,0,2,2];
      break;
    case 14:
      arr = [1,0,2,1];
      break;
    case 15:
      arr = [1,1,2,1];
      break;
    case 16:
      arr = [2,2,1,2];
      break;
    case 17:
      arr = [2,1,1,1];
      break;
    case 18:
      arr = [1,2,2,2];
      break;
    default:
  }
  return arr;
}

//基準面と色の差からCornerのCPとCOを返す関数
function getCorners(num){
  switch (true) {
    case (num == 0):
      return [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]];
      break;
    case (num == 1):
      return [[0,2],[2,1],[4,1],[5,2],[1,1],[6,2],[3,2],[7,1]];
      break;
    case (num == 2):
      return [[0,1],[4,2],[1,2],[6,1],[2,2],[3,1],[5,1],[7,2]];
      break;
  }
}

//各面のCornerのCPを返す関数
function getFLcps(num){
  var arr = new Array();
  switch (num) {
    case 0:
      arr = [0,1,3,2];
      break;
    case 1:
      arr = [0,2,5,4];
      break;
    case 2:
      arr = [0,4,6,1];
      break;
    case 3:
      arr = [1,6,7,3];
      break;
    case 4:
      arr = [2,3,7,5];
      break;
    case 5:
      arr = [4,5,7,6];
      break;
  }
  return arr;
}

//COの並びを反映する関数
function reflectCOs(arr,cos){
  for (var i = 0; i < cos.length; i++) {
    if (cos[i] != 9) {
      arr[i][1] = subtractOrEqualThree(arr[i][1] + cos[i]);
    }
  }
  return arr;
}

//基準面と色の差からCenterを返す関数
function getCenters(num){
  switch (true) {
    case (num == 0):
      return [0,1,2,3,4,5];
      break;
    case (num == 1):
      return [1,2,0,4,5,3];
      break;
    case (num == 2):
      return [2,0,1,5,3,4];
      break;
  }
}

//各面のCenterの対応位置を返す関数
function getCenterP(num){
  switch (true) {
    case (num == 0):
      return [5,2,1,4,3,0];
      break;
    case (num == 1):
      return [3,0,2,5,4,1];
      break;
    case (num == 2):
      return [4,1,0,3,5,2];
      break;
    case (num == 3):
      return [1,2,0,4,5,3];
      break;
    case (num == 4):
      return [2,0,1,5,3,4];
      break;
    case (num == 5):
      return [0,1,2,3,4,5];
      break;
  }
}


//Math関係
// ランダムな整数を取得する関数
function getRandomInt(min, max) {
  // Math.random() は 0 以上 1 未満のランダムな小数を返すので、
  // それを整数に変換し、指定した範囲内に収めます。
  min = Math.ceil(min); // 最小値を切り上げ
  max = Math.floor(max); // 最大値を切り捨て
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//値の余りが1のときは1を、0のときは2を返す関数
function returnOneOrTwoBasedOnRemainder(value) {
    var remainder = value % 2; // 余りを計算する（この例では3で割った余りを使用）
    if (remainder === 1) {
        return 1;
    } else if (remainder === 0) {
        return 2;
    }
}

//0より低い値のときに3を足す関数
function addThreeIfNegative(value) {
    if (value < 0) {
        return value + 3;
    } else {
        return value;
    }
}

//3以上の値のときに3を引く関数
function subtractOrEqualThree(value) {
    if (value >= 3) {
        return value - 3;
    } else {
        return value;
    }
}

//回数を指定して配列を左にシフト
function rotateArrayLeft(arr, count) {
    if (arr.length <= 1 || count === 0) {
        return arr; // 長さが1以下または回転回数が0の場合、並べ替え不要
    }

    const timesToShift = count % arr.length; // 回転回数を配列の長さで割る

    for (let i = 0; i < timesToShift; i++) {
        const firstElement = arr.shift(); // 配列の最初の要素を取り出す
        arr.push(firstElement); // 取り出した要素を配列の最後に追加
    }
    return arr;
}



//FL Trainer 関係
//  色の配列（30個）の色番号：0=白 1=緑 2=赤 3=青 4=オレンジ 5=黄（面の番号と同じ。U F R B L D）
//  FL Trainer の状態は「FL 面 = F 面」の向き（FL一覧と同じ向き。r R B b で回せる）で作る

//下線の色（色番号の順）
var FL_TRAINER_HEX = ["#afadad", "#3FA877", "#DA4040", "#1E90FF", "#FFa500", "#FFEA00"];

//持ち替え 24 通り（{ perm, seq }。回したあとの色[i] = 回す前の色[perm[i]]、seq は持ち替えの記号）
var allCubeRotations = null;
function getAllCubeRotations() {
  if (allCubeRotations !== null) return allCubeRotations;
  var id = [];
  for (var i = 0; i < 30; i++) id.push(i);
  var list = [{ perm: id, seq: [] }], seen = {};
  seen[id.join()] = true;
  for (var q = 0; q < list.length; q++) {
    ["x", "y", "z"].forEach(function (r) {
      var perm = rotateStateColor(list[q].perm, r);
      if (seen[perm.join()]) return;
      seen[perm.join()] = true;
      list.push({ perm: perm, seq: list[q].seq.concat(r) });
    });
  }
  allCubeRotations = list;
  return list;
}

//色の付け替え 24 通り（持ち替えたときの色の入れ替わり方と同じ）  map[元の色] = 新しい色
var allColorMaps = null;
function getAllColorMaps() {
  if (allColorMaps !== null) return allColorMaps;
  allColorMaps = getAllCubeRotations().map(function (r) {
    var map = [];
    for (var f = 0; f < 6; f++) map[Math.floor(r.perm[5 * f] / 5)] = f;
    return map;
  });
  return allColorMaps;
}

function permuteColors(col, perm) {
  return perm.map(function (src) { return col[src]; });
}

function recolor(col, map) {
  return col.map(function (c) { return map[c]; });
}

//r R B b の手順（FL_MOVE_NAMES の番号の配列）で色の配列を動かす
function applyFlMoves(col, moves) {
  moves.forEach(function (m) {
    var perm = FL_MOVE_PERMS[FL_MOVE_NAMES[m].charAt(0)];
    var times = (m % 2 === 1) ? 2 : 1;     //逆回し = 2回まわす
    for (var t = 0; t < times; t++) col = permuteColors(col, perm);
  });
  return col;
}

//記号の文字列（"r R' B"）を FL_MOVE_NAMES の番号の配列にする
function parseFlMoves(text) {
  return String(text).trim().split(/\s+/).map(function (n) { return FL_MOVE_NAMES.indexOf(n); });
}

//色の配列から、solver.js でスクランブル（L R B U）を求める
//  白・赤・緑のコーナーが UFR に来るように持ち替えた状態（= スクランブルを回した状態）を solver.js で解く
//  戻り値 { alg: スクランブル（回転番号の配列）, colors: スクランブルを回した状態の色 }、解けなければ null
function solveColorsForScramble(col) {
  var rots = getAllCubeRotations();
  for (var r = 0; r < rots.length; r++) {
    var rc = permuteColors(col, rots[r].perm);
    if (!(rc[4] === 0 && rc[11] === 2 && rc[7] === 1)) continue;

    //solver.js の状態（センター・コーナーの番号）にする
    var f = [], v = [];
    for (var i = 0; i < 6; i++) {
      f[i] = -1;
      for (var k = 0; k < 6; k++) if (fMap[k] / 5 === rc[fMap[i]]) f[i] = k;
      if (f[i] < 0) return null;
    }
    for (var i = 0; i < 8; i++) {
      var sc = vMap[i].map(function (s) { return rc[s]; });
      v[i] = null;
      for (var k = 0; k < 8 && v[i] === null; k++) {
        var home = vMap[k].map(function (s) { return Math.floor(s / 5); });
        for (var o = 0; o < 3; o++) {
          if (home.every(function (x, j) { return sc[(j + o) % 3] === x; })) { v[i] = [k, o]; break; }
        }
      }
      if (v[i] === null) return null;
    }

    var tF = ConvF(f), tV = ConvV(v);
    var f2 = [0, 1, 2, 3, 4, 5], v2 = [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]];
    ReconsF(f2, tF);
    ReconsV(v2, tV);
    if (!CompareState(f, v, f2, v2)) return null;    //作れない状態

    var seq = [];
    var n = Solve(tF, tV, seq, 4, 0, 11);
    if (n < 1) return null;
    var alg = getReverseAlg(seq[getRandomInt(0, n - 1)]);
    if (getStateColor(alg).join() !== rc.join()) return null;   //念のため確認
    return { alg: alg, colors: rc };
  }
  return null;
}

//CLL・EG2 の状態を見分けるための表
//  一面を D 面にした色の配列を、D 面を軸にした持ち替え（y）と色の付け替えでそろえた文字列で比べる
var llCaseIndex = null;

function llCaseKey(col) {
  var best = null;
  var maps = getAllColorMaps().filter(function (m) { return m[col[25]] === 5; });   //一面の色を黄にする付け替え
  var cur = col;
  for (var k = 0; k < 4; k++) {
    maps.forEach(function (m) {
      var key = recolor(cur, m).join("");
      if (best === null || key < best) best = key;
    });
    cur = rotateStateColor(cur, "y");
  }
  return best;
}

//別の面を一面として見たときの文字列（一面になる面が複数あるとき用。コーナーが全部揃っているときなど）
//  D 面に持ってきたとき D 面の色がそろう向きの中で、いちばん小さい文字列
function llCaseKeyAnyFace(col) {
  var best = null;
  getAllCubeRotations().forEach(function (r) {
    var rc = permuteColors(col, r.perm);
    if (![26, 27, 28, 29].every(function (i) { return rc[i] === rc[25]; })) return;
    var key = llCaseKey(rc);
    if (best === null || key < best) best = key;
  });
  return best;
}

function getLlCaseIndex() {
  if (llCaseIndex !== null) return llCaseIndex;
  llCaseIndex = { d: {}, any: {} };
  var add = function (col, item) {
    var key = llCaseKey(col);
    if (llCaseIndex.d[key] === undefined) llCaseIndex.d[key] = item;
    var key2 = llCaseKeyAnyFace(col);
    if (llCaseIndex.any[key2] === undefined) llCaseIndex.any[key2] = item;
  };
  var solved = [];
  for (var i = 0; i < 30; i++) solved.push(Math.floor(i / 5));
  add(solved, { sheet: "", name: "完成" });
  [["CLL", CLL_CASES], ["EG2", EG2_CASES]].forEach(function (s) {
    s[1].forEach(function (c) {
      add(rotateStateColor(getStateColor(parseScrambleText(c[2])), c[3]), { sheet: s[0], name: c[0] });
    });
  });
  return llCaseIndex;
}

//一面を D 面にした状態が、どの CLL・EG2 か（見つからなければ null）
//  まず D 面を一面として探し、無ければほかの面を一面として探す
function findLlCase(colD) {
  var index = getLlCaseIndex();
  return index.d[llCaseKey(colD)] || index.any[llCaseKeyAnyFace(colD)] || null;
}

//一面が揃った状態（FL 面 = F 面）をランダムに作る（CLL のケースから選んで、F 面を軸にランダムに回す）
function randomFlSolvedState() {
  var n = getRandomInt(0, CLL_CASES.length);   //CLL_CASES.length のときは全部揃った状態
  var col;
  if (n === CLL_CASES.length) {
    col = [];
    for (var i = 0; i < 30; i++) col.push(Math.floor(i / 5));
  } else {
    var c = CLL_CASES[n];
    col = rotateStateColor(getStateColor(parseScrambleText(c[2])), c[3] + " x");   //一面を D 面 → F 面
  }
  for (var k = getRandomInt(0, 3); k > 0; k--) col = rotateStateColor(col, "z");
  return col;
}

//FL Trainer の問題を作る（p = FL一覧のパターン）
//  戻り値 { colors: FL 面 = F 面の状態の色, scramble: { alg, colors }, flColor: 一面の色 }
function buildFlTrainerState(p) {
  for (var tries = 0; tries < 20; tries++) {
    var col = applyFlMoves(randomFlSolvedState(), parseFlMoves(p.setup));
    var maps = getAllColorMaps();
    col = recolor(col, maps[getRandomInt(0, maps.length - 1)]);   //一面の色をランダムにする
    var scr = solveColorsForScramble(col);
    if (scr !== null) return { colors: col, scramble: scr, flColor: col[5] };
  }
  console.error("スクランブルが作れませんでした（" + p.name + "）");
  return null;
}

//図の色（色番号の順）と、非表示の色（ライトグレー = 6 番）
var FL_TRAINER_PALETTE = ["#FFFFFF", "#008000", "#FF0000", "#0F45FF", "#FFa500", "#FFFF00", "#D3D3D3"];

//FL Trainer の問題を表示する（p = FL一覧のパターン）
function ScrambleFlTrainer(p) {
  var st = buildFlTrainerState(p);
  if (st === null) return;
  pushScramble({
    text: getScrambleText(st.scramble.alg),
    color: FL_TRAINER_HEX[st.flColor],     //下線の色（一面の色）
    colors: null,                          //図の色は表示するときに作る
    problem: { fl: p.name },
    //selColor = 一面を作る色（色のボタンで変える。最初は出題したパターンの色）
    fl: { pattern: p, colors: st.colors, scrambled: st.scramble.colors, flColor: st.flColor, selColor: st.flColor, views: [] }
  });
}

//色ごとの一面（FL一覧のどのパターンか）
//  見本 = FL一覧のセットアップを揃った状態から回した状態（一面の色 = 緑）
//  一面の色のステッカーの位置（紺の見え方）で FL一覧のパターンを探し、その向き（FL一覧の図と同じ向き）にする
var flSampleIndex = null;   //紺の見え方 → パターン

function flNavyKey(colF, c) {
  return colF.map(function (x) { return x === c ? 1 : 0; }).join("");
}

function getFlSampleIndex() {
  if (flSampleIndex !== null) return flSampleIndex;
  flSampleIndex = {};
  var solved = [];
  for (var i = 0; i < 30; i++) solved.push(Math.floor(i / 5));
  getFlPatterns().forEach(function (list) {
    list.forEach(function (p) {
      var sample = applyFlMoves(solved, parseFlMoves(p.setup));
      p.sample = sample;
      flSampleIndex[flNavyKey(sample, 1)] = p;
    });
  });
  return flSampleIndex;
}

//一面のコーナー（色 c を含むコーナー）のステッカーの位置
function flPieceStickers(colF, c) {
  var list = [];
  vMap.forEach(function (corner) {
    if (corner.some(function (s) { return colF[s] === c; })) list = list.concat(corner);
  });
  return list;
}

//色 c で一面を作るときの { color, pattern, colors（FL 面 = F 面の向きの色）, swapped }
//  swapped = 一面のコーナーの並びが見本と対角で入れ替わっている（完全一面と不完全一面の手順が逆になる）
function getFlView(fl, c) {
  if (fl.views[c]) return fl.views[c];
  var index = getFlSampleIndex();
  var found = null;
  getAllCubeRotations().forEach(function (r) {
    if (found !== null && !found.swapped) return;
    if (fl.colors[r.perm[5]] !== c) return;            //色 c のセンターを F 面に
    var colF = permuteColors(fl.colors, r.perm);
    var p = index[flNavyKey(colF, c)];
    if (!p) return;
    var stickers = flPieceStickers(colF, c);
    var sampleType = getAllColorMaps().some(function (m) {
      return m[c] === 1 && stickers.every(function (s) { return m[colF[s]] === p.sample[s]; });
    });
    if (found === null || sampleType) found = { color: c, pattern: p, colors: colF, swapped: !sampleType };
  });
  if (found === null) {
    //FL一覧に無い = その色の一面はもう揃っている（完全一面か不完全一面）
    var r0 = getAllCubeRotations().filter(function (r) { return fl.colors[r.perm[5]] === c; })[0];
    found = { color: c, pattern: null, colors: permuteColors(fl.colors, r0.perm), swapped: false };
  }
  fl.views[c] = found;
  return found;
}

//FL Trainer の図の色
//  First Layer を D 面に表示する：FL一覧と同じ向き（一面を D 面にして、手順の r R B b がそのまま使える向き）
//  表示しない：スクランブルを回したときの向き（白が上・緑が前の持ち方で回した状態）
//  LL のコーナー（一面の色を含まないコーナー）・LL のセンター（一面以外のセンター）は、設定でライトグレーにする
function getFlTrainerColors(fl) {
  var view = getFlView(fl, fl.selColor);
  var col = document.getElementById("FL-Dface").checked ? rotateStateColor(view.colors, "x'") : fl.scrambled.slice();
  if (document.getElementById("flt-hide-corners").checked) {
    vMap.forEach(function (c) {
      if (!c.some(function (s) { return col[s] === fl.selColor; })) {
        c.forEach(function (s) { col[s] = 6; });
      }
    });
  }
  if (document.getElementById("flt-hide-centers").checked) {
    for (var f = 0; f < 6; f++) {
      if (col[5 * f] !== fl.selColor) col[5 * f] = 6;
    }
  }
  return col;
}

//手順（FL_MOVE_NAMES の番号の文字列）を回したあとの状態（一面を D 面）と、その CLL・EG2
//（今選んでいる色の一面で回す）
function getFlTrainerResult(fl, code) {
  var col = rotateStateColor(applyFlMoves(getFlView(fl, fl.selColor).colors, code.split("").map(Number)), "x'");
  return { colors: col, llCase: findLlCase(col) };
}
