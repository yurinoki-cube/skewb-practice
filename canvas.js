//canvas関係
var facewidth = 50;
var colmap;
var canvas;
var crrCol = 0;
var xymap = new Array();
var colors = new Array();

var netXY=[
[	[[1.0,2.0,1.0,0.0],[0.0,0.5,1.0,0.5]],[[1.5,1.5,0.5,0.5],[0.25,0.75,0.75,0.25]],
[[1.0,1.5,0.5],[0.00,0.25,0.25]],[[2.0,1.5,1.5],[0.50,0.75,0.25]],
[[0.0,0.5,0.5],[0.50,0.25,0.75]],[[1.0,0.5,1.5],[1.00,0.75,0.75]]	],
[	[[0.0,1.0,1.0,0.0],[0.0,0.5,1.5,1.0]],[[0.5,1.0,0.5,0.0],[0.25,1.00,1.25,0.50]],
[[0.0,0.5,0.0],[0.00,0.25,0.50]],[[1.0,1.0,0.5],[0.50,1.00,0.25]],
[[0.0,0.0,0.5],[1.00,0.50,1.25]],[[1.0,0.5,1.0],[1.50,1.25,1.00]]	],
[	[[0.0,1.0,1.0,0.0],[0.5,0.0,1.0,1.5]],[[0.5,1.0,0.5,0.0],[0.25,0.50,1.25,1.00]],
[[0.0,0.5,0.0],[0.50,0.25,1.00]],[[1.0,1.0,0.5],[0.00,0.50,0.25]],
[[0.0,0.0,0.5],[1.50,1.00,1.25]],[[1.0,0.5,1.0],[1.00,1.25,0.50]]	]
];

var colorList = new Array(
	"w", "#FFFFFF", // white
	"g", "#008000", // green
	"r", "#FF0000", // red
	"b", "#0F45FF", // blue
	"o", "#FFa500",  // orange
	"y", "#FFFF00" // yellow
);

function InitSkewbDrawer(width, cvs){
	DrawSkewbColors(width, cvs, ScrambleColor);
}

//色の配列（30個）を指定して、展開図を描く
//（手順表の小さい図など、トレーナー以外の canvas にも使う）
function DrawSkewbColors(width, cvs, col){
	facewidth = width;
	canvas = cvs;
	SetColorScheme();
	colmap = col;
	DrawFigure();
}

//展開図を描くのに必要な canvas の大きさ
function getSkewbCanvasSize(width){
	return {
		width: Math.ceil(2 + 4 * 0.98 * 0.8660254 * width),
		height: Math.ceil(2 + 3 * 0.98 * width)
	};
}

function SetColorScheme(){
  colorString = "wgrboy";
	for(var k = 0; k < 6; k++){
		colors[k] = colorList.length - 1;
		for(var i = 0; i < colorList.length - 1; i += 2){
			if(colorString.charAt(k) == colorList[i]){
				colors[k] = colorList[i + 1];
				break;
			}
		}
	}
}

function DrawFigure(){
  ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  DrawNet(0, 0, 1.0, 0.0);
  DrawNet(1, 1, 1.0, 0.5);
  DrawNet(2, 2, 2.0, 0.5);
  DrawNet(2, 3, 3.0, 0.0);
  DrawNet(1, 4, 0.0, 0.0);
  DrawNet(1, 5, 1.0, 1.5);

}

function DrawNet(netType, faceNo, x, y){
	for(var k = 0; k < netXY[netType].length; k++){
		var mapNo;
		var fillcolor;
		var strokecolor = "#000000";
		var aryX = new Array();
		var aryY = new Array();

		if(k == 0){
			mapNo = -1;
			fillcolor = "#000000";
		}else{
			mapNo = 5 * faceNo + k - 1;
			fillcolor = colors[colmap[mapNo]];
		}

		for(var p = 0; p < netXY[netType][k][0].length; p++){
			aryX[p] = 1 + (x + netXY[netType][k][0][p]) * 0.98 * 0.8660254 * facewidth;
			aryY[p] = 1 + (y + netXY[netType][k][1][p]) * 0.98 * facewidth;
		}

		DrawPolygon(mapNo, fillcolor, strokecolor, aryX, aryY);
	}
}

function DrawPolygon(k, fillcolor, strokecolor, x, y){
	ctx.fillStyle = fillcolor;
	ctx.strokeStyle = strokecolor;
	ctx.lineWidth = 1 * (facewidth / 50);
	ctx.beginPath();
	ctx.moveTo(x[0], y[0]);
	xymap[k] = new Array();
	for(var i=0; i<x.length && i<y.length; i++){
		ctx.lineTo(x[i], y[i]);
		if(k >= 0) xymap[k][i] = new Array(x[i], y[i]);
	}
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}
