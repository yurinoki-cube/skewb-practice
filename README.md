# Skewb練習

ページ上部のタブで「TCLL Trainer」と「手順表」を切り替えます。サイトを開いたときは TCLL Trainer が表示されます。

## iPhone のホーム画面に追加（アプリのように使う）

- Safari でサイトを開き、共有ボタン →「ホーム画面に追加」。ホーム画面のアイコンから開くと、Safari の上下のバーなしで全画面で開きます。
- 設定は index.html の `<head>` の PWA 用のタグと `manifest.json`、アイコンは `image/icon-180.png`（iPhone 用）・`icon-192.png`・`icon-512.png`。
- index.html と同じ場所に manifest.json と image フォルダを置いてください（ローカルのファイルを直接開いた場合は使えません。Web サーバーで公開したときに有効です）。


## 手順表

- 表：CLL（完全1面から・134）、EG2（不完全1面 = Diag から・137）、TCLL（18コーナー × 60センター = 1080）
- 1ケースごとに、上にキューブの状態、下に r / r' / R / R' / B / B' / b / b' の8行の手順を並べます。各枠の中で改行できます。
- CLL・EG2 はコーナー（Solved / Peanut / Pi）ごと、TCLL はコーナーケース（1-1〜4-4）ごとに、上のボタンで切り替えて表示します（ボタンは画面の幅に合わせて改行します）。
- 上部（タイトル・設定・表・コーナーのボタン）は、スクロールしても画面の上に残ります。
- 入力内容はブラウザ（localStorage）に自動保存されます。
- 読み込み・書き出しは、手順表の左上の設定ボタン（歯車）から行います。

### CLL・EG2 のケース

- 「【最新】Skewb手順表_20250215」の CLL・Diag シートから作成し、date.js の `CLL_CASES`・`EG2_CASES` に入れています。
  名前は「コーナー（＋位置）/ センター」（例: `Peanut FR / O-perm (cw)`）。
- 状態は、シートの手順の逆手順から作り、solver.js でセットアップ（L R B U）を求めて確認しています。
  図はセットアップのあとに持ち替え（x y z）をして、First Layer を D 面（黄）に表示します。
- シートの手順の記号：上段の角 = R（右）・B（奥）・L（左）・F（手前）、下段の角 = r・b・l・f（UFR の角を手前に向けた持ち方）。z・x・y は通常の持ち替え。
- 注記のあるケース
  - 「全パターンから補完（要確認）」… シートの手順では状態が作れなかったセル（CLL: `Peanut BL / O-perm (ccw)`・`Pi BR / Wat (cw/1oppleft)`）。
  - CLL の Peanut・Pi の U-perm は `U-perm(FR-cw)` のように「動く3つのセンターのうち、対面色が入っている面（oop）＋回る向き（cw / ccw）」で表す（`U-perm(FR-cw)` = シートの U-perm (FRr)）。Solved の Z-perm・U-perm は位置を付けない。
  - EG2 の Solved は Z-perm（side は向きを変えると front と同じ形なので1つ）→ Pure → H-perm → U-perm(cw) → U-perm(ccw) の順。Pure と H-perm は持ち替えで同じ形になるが、持ち替えにくいので別ケースとして扱う。
  - EG2 の Peanut・Pi の U-perm は `U-perm(cw)-BR` のように「向き（Solved の U-perm(cw)/(ccw) と同じ形か）＋ oop の面」で表す。EG2 の oop は、センターがその面の下2つのコーナーのステッカー色のどちらとも違い、かつ下のコーナーのどちらかに、センターの対面色が含まれている面。並びは cw → ccw、FR → FL → BL → BR。
  - EG2 でシートに無い14ケース（Peanut 7・Pi 7、すべて U-perm）は全パターンの列挙から追加（注記なし）。
  - EG2 の図とセットアップは、正面のコーナー（UFR）が白・赤・緑になる色の付け方にそろえている。

### TCLL の状態の図

- `buildTcllState`（scramble.js）で状態を作り、solver.js で求めたセットアップから図を描きます（First Layer は D 面）。

### 一括編集（読み込み・書き出し）

- **CSV書き出し**：表示中の表を全ケース分（空欄も含む）書き出します。Excel 等で編集して読み込めます。
- **JSON書き出し**：すべての表をまとめて書き出します（バックアップ用）。
- **読み込み**：CSV / TSV / JSON に対応。列があるものだけ書き換えます（空欄の列はその手順を消します）。

CSV の列（1行目は見出し）：

```
sheet,id,name,setup,r,r',R,R',B,B',b,b'
```

- `id`（必須）：ケースの名前（初期の名前）。CLL・EG2 は `Peanut FR / O-perm (cw)`、TCLL は `1-1 Pure` や `3-2 Ur-fr`
- `sheet`：`CLL` / `EG2` / `TCLL`（省略すると表示中の表）
- `name`：表示名を変えるとき
- `setup`：CLL・EG2 の状態のセットアップ（参考。読み込みでは使いません）
- 枠の中の改行は、`"` で囲んだセルの中の改行で表します。

## 確認用ファイル

- `test.html`：main.css と各 .js をすべて書き写した1ファイル版（index.html と同じ動作）
