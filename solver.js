//各センター状態番号に対応する定数(初期化時に算出)
var fmF = new Array(); //センター完成までの最少手数
var ftF = new Array(); //隣接状態のコーナー状態番号

//各コーナー状態番号に対応する定数(初期化時に算出)
var fmV = new Array(); //コーナー完成までの最少手数
var ftV = new Array(); //隣接状態のコーナー状態番号

//各回転番号に対する定数(L L' R R' B B' U U')
var OV = [2,2,3,3,4,4,1,1];//回転するコーナー番号
var PF = [[5,1,2],[5,2,1],[5,3,4],[5,4,3],[5,4,1],[5,1,4],[0,1,4],[0,4,1]];//移動するセンター番号
var PV = [[4,7,5],[4,5,7],[4,5,6],[4,6,5],[1,2,3],[1,3,2],[4,6,7],[4,7,6]];//移動するコーナー番号
var RS = [1,0,3,2,5,4,7,6];//逆回転の回転記号

//各面色番号に対する定数(U LB LF RF RB D)
var oppFNum = [5,3,4,1,2,0]; //対面の面色番号

//各センター番号に対する定数(U LB LF RF RB D)
var FNum = [0,1,2,3,4,5]; //面色番号
var fMap = [0,20,5,10,15,25]; //完成状態時のマップ位置

//各コーナー番号に対する定数(FBlrbfRL)
var vMap = [[4,11,7],[1,21,17],[26,24,8],[29,14,18],[28,19,23],[27,9,13],[2,16,12],[3,6,22]]; //完成状態時のマップ位置
var vCol = [[0,3,2],[0,1,4],[5,1,2],[5,3,4],[5,4,1],[5,2,3],[0,4,3],[0,2,1]]; //面色番号


//skewbの状態からの最適解を１つ見つける
function SkewbSolution(cen,cor){

  var typeNum = [0, 0];
  if(ReconsByState(typeNum,cen,cor)){

    var seq = new Array();
    var len = Solve(typeNum[0], typeNum[1], seq, 4, 0, 11);

    return seq[getRandomSol(0,len - 1)];
  }else{
    return "NG"
  }
}

function Solve(tF, tV, seq, sym, lmin, lmax){
	if(tF == 0 && tV == 0){
		seq[0] = new Array();
		return 1;
	}

	if(fmF[tF] > lmin) lmin = fmF[tF];
	if(fmV[tV] > lmin) lmin = fmV[tV];
	var cnt = 0;
	for(var i = lmin; i <= lmax; i++){
		for(var j = 0; j < 8; j++){
			if((j >> 1) != sym){
				var tmp = new Array();
				if(Solve(ftF[tF][j], ftV[tV][j], tmp, j >> 1, i - 1, i - 1) > 0){
					for(var m = 0; m < tmp.length; m++){
						seq[cnt] = new Array();
						seq[cnt][0] = j;
						for(var n = 0; n < tmp[m].length; n++){
							seq[cnt][n + 1] = tmp[m][n];
						}
						cnt++;
					}
				}
			}
		}
		if(cnt > 0) return cnt;
	}

	return cnt ;
}

//初期化計算関数
function InitSkewbSolver(sol){
	objSOL = sol;
	var face=[0,1,2,3,4,5];
	var vertex = [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]];
	InitSolverParts(face, ftF, fmF, 360, TurnF, ConvF, ReconsF);
	InitSolverParts(vertex, ftV, fmV, 8748, TurnV, ConvV, ReconsV);

}

//隣接状態と最少手数を算出
function InitSolverParts(part, ft, fm, num, TurnFunc, ConvFunc, ReconsFunc){
	for(var t = 0; t < num; t++){
		ReconsFunc(part,t);
		ft[t] = new Array();
		for(var sym = 0; sym < 8; sym++){
			TurnFunc(part, sym);
			ft[t][sym] = ConvFunc(part);
			TurnFunc(part, RS[sym]);
		}
		fm[t] = -1;
	}

	cnt = 1;
	fm[0] = movecnt = 0;
	do{
		for(var t = 0; t < num; t++){
			if(fm[t] == movecnt){
				for(var sym = 0; sym < 8; sym++){
					if(fm[ft[t][sym]] == -1){
						fm[ft[t][sym]] = movecnt + 1;
						cnt++;
					}
				}
			}
		}
		movecnt++;
	} while(cnt < num);
}

//回転記号に従い回転
function Turn(sym, f, v){
	TurnF(f, sym);
	TurnV(v, sym);
}

//回転記号に従いセンターのみ回転
function TurnF(f, sym){
	var idx = PF[sym];
	var t = f[idx[2]];
	f[idx[2]] = f[idx[1]];
	f[idx[1]] = f[idx[0]];
	f[idx[0]] = t;
}

//回転記号に従いコーナーのみ回転
function TurnV(v, sym){
	var idx = PV[sym];
	var x = 2 - (sym & 1);
	v[OV[sym]][1] = (v[OV[sym]][1] - x + 3) % 3;
	var t = v[idx[2]][0];
	v[idx[2]][0] = v[idx[1]][0];
	v[idx[1]][0] = v[idx[0]][0];
	v[idx[0]][0] = t;
	t = (v[idx[2]][1] + x) % 3;
	v[idx[2]][1] = (v[idx[1]][1] + x) % 3;
	v[idx[1]][1] = (v[idx[0]][1] + x) % 3;
	v[idx[0]][1] = t;
}


//状態からセンターの番号を算出
function ConvF(f){
	var t = 0;
	for(var i = 0; i < 4; i++){


		var sum = 0;
		for(var j = 0; j < i; j++){
			if(f[i] > f[j]) sum++;
		}
		t = (t * (6 - i)) + (f[i] - sum);
	}
	return t;
}

//状態からコーナーの番号を算出
function ConvV(v){
	var t = 0;
	t = (t * 3) + (v[1][0] - 1);
	t = (t * 4) + (v[4][0] - 4);
	t = (t * 3) + v[5][0] - ((v[4][0] < v[5][0])? 5: 4);
	for(var i = 2; i <= 6; i++){
		t = (t * 3) + v[i][1];
	}
	return t;
}

//センターの番号から状態を再現
function ReconsF(f, t){
	f[4] = ((t & 1) ^ (Math.floor(t / 12))) & 1;
	f[5] = f[4] ^ 1;
	for(var i = 3; i >= 0; i--){
		f[i]= t % (6 - i);
		t = Math.floor(t / (6 - i));
		for(j = i + 1; j < 6; j++){
			if(f[j] >= f[i]) f[j]++;
		}
	}
}

//コーナーの番号から状態を再現
function ReconsV(v, t){
	for(var i = 6; i >= 2; i--){
		v[i][1] = t % 3;
		t = Math.floor(t / 3);
	}

	j = t % 3;
	v[5][0] = (t % 3) + 4;
	t = Math.floor(t / 3);
	v[4][0] = (t & 3) + 4;
	v[6][0] = (v[5][0] + (t & 1)) % 3 + 4;
	v[7][0] = (v[5][0] + ((t & 1) ^ 1)) % 3 + 4;
	if(v[5][0] >= v[4][0]) v[5][0]++;
	if(v[6][0] >= v[4][0]) v[6][0]++;
	if(v[7][0] >= v[4][0]) v[7][0]++;
	t >>= 2;
	v[0][0] = 0;
	v[1][0] = (t % 3) + 1;
	v[2][0] = (t + 1) % 3 + 1;
	v[3][0] = (t + 2) % 3 + 1;
	t = Math.floor(t / 3);

	v[0][1] = 0;
	v[1][1] = (9 - v[2][1] - v[3][1] + ((v[4][0] - 1) & 3)
							+ ((v[4][0] & 1)? -1: 1) * j) % 3;
	v[7][1] = (13 - v[4][1] - v[5][1] - v[6][1] - v[1][0]) % 3;
}

//2つの状態が同じであることを確認
function CompareState(face,vertex,face2,vertex2){
	for(var i = 0; i < 6; i++){
		if(face[i] != face2[i]) return false;
	}
	for(var i = 0; i < 8; i++){
		for(var j = 0; j < 2; j++){
			if(vertex[i][j] != vertex2[i][j]) return false;
		}
	}
	return true;
}

function ReconsByState(typeNum,cen,cor){

  var face = interfaceCenter(cen);
  var vertex = interfaceCorner(cor);
  var face2 = [0,1,2,3,4,5];
  var vertex2 = [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]];

  //状態から状態番号に変換し、再度状態に戻して元通りになるか確認
  typeNum[0] = ConvF(face);
  typeNum[1] = ConvV(vertex);
  ReconsF(face2, typeNum[0]);
  ReconsV(vertex2, typeNum[1]);

  if(CompareState(face, vertex, face2, vertex2)){
    return true;	//再現可能
  }else{
    return false;	//再現不可
  }
}



//センターIF
function interfaceCenter(face){
  //  [0,1,2,3,4,5]から[0,3,2,1,4,5]に変換する
  var Center = [0,1,2,3,4,5];
  var face2 = face;

//値の変更
  for (var i = 0; i < face2.length; i++) {
    switch (face2[i]) {
      case 1:
        face[i] = 3;
        break;
      case 3:
        face[i] = 1;
        break;
      default:
    }
  }

//場所変更
  Center[0] = face2[0];
  Center[1] = face2[3];
  Center[2] = face2[2];
  Center[3] = face2[1];
  Center[4] = face2[4];
  Center[5] = face2[5];

  return Center;
}

//コーナーIF
function interfaceCorner(vertex){
  // [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]]から
  // [[0,0],[7,0],[6,0],[1,0],[5,0],[3,0],[2,0],[4,0]]に変換する
  var Corner = [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]];
  var vertex2 = vertex;
  //値の変更
    for (var i = 0; i < 8; i++) {
      switch (vertex[i][0]) {
        case 1:
          vertex2[i][0] = 7;
          break;
        case 2:
          vertex2[i][0] = 6;
          break;
        case 3:
          vertex2[i][0] = 1;
          break;
        case 4:
          vertex2[i][0] = 5;
          break;
        case 5:
          vertex2[i][0] = 3;
          break;
        case 6:
          vertex2[i][0] = 2;
          break;
        case 7:
          vertex2[i][0] = 4;
          break;
        default:
      }
    }

  //場所の変更
  Corner[0][0] = vertex2[0][0];
  Corner[0][1] = vertex2[0][1];
  Corner[1][0] = vertex2[3][0];
  Corner[1][1] = vertex2[3][1];
  Corner[2][0] = vertex2[6][0];
  Corner[2][1] = vertex2[6][1];
  Corner[3][0] = vertex2[5][0];
  Corner[3][1] = vertex2[5][1];
  Corner[4][0] = vertex2[7][0];
  Corner[4][1] = vertex2[7][1];
  Corner[5][0] = vertex2[4][0];
  Corner[5][1] = vertex2[4][1];
  Corner[6][0] = vertex2[2][0];
  Corner[6][1] = vertex2[2][1];
  Corner[7][0] = vertex2[1][0];
  Corner[7][1] = vertex2[1][1];

  return Corner;
}

//ランダムに返す
function getRandomSol(min, max) {
  // Math.random() は 0 以上 1 未満のランダムな小数を返すので、
  // それを整数に変換し、指定した範囲内に収めます。
  min = Math.ceil(min); // 最小値を切り上げ
  max = Math.floor(max); // 最大値を切り捨て
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
