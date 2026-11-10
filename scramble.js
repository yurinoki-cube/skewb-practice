var ScrambleColor = [0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5];

//表示向き変更用
  var FLsurface;//基準面
  var FLcolor;  //FirstLayerの色(0,1,2,3,4,5=w,r,g,o,b,y)
  var Twist;  //Twistコーナー

//今表示している問題（苦手の記録用）
var CurrentTco;     //TCLLの番号（1〜18）
var CurrentCenter;  //センターの番号（CENTER_CASES の番号）

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

    //Text部分
      var beforeText ="前のスクランブル : " +  document.getElementById("text_scramble").innerHTML;

      //スクランブル変更
      document.getElementById("text_before_scramble").innerHTML = beforeText;
      document.getElementById("text_scramble").innerHTML = ScrambleText;

      //基準色変更
      document.getElementById("text_scramble").style.textDecorationColor = flcolorIF();

    //図形部分
      var cvs = document.getElementById("canvas");
      InitSkewbDrawer(64, cvs);

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
