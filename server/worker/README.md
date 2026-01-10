# UV Shade Map - Python Worker

日陰タイル生成用のPythonワーカー

## 概要

このディレクトリには、地図タイル（PNG）を生成するためのPythonスクリプトが含まれています。

- **shade_calculator.py**: 太陽位置計算と建物の影計算
- **tile_generator.py**: 地図タイル（256x256 PNG）生成
- **plateau_preprocessor.py**: PLATEAU建物データの前処理（GeoJSON変換）
- **worker.py**: メインワーカープロセス（Node.jsから呼び出される）

## セットアップ

### 1. Python 3.9+ のインストール

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip python3-venv

# macOS
brew install python@3.11
```

### 2. 仮想環境の作成（推奨）

```bash
cd server/worker
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 3. 依存パッケージのインストール

```bash
pip install -r requirements.txt
```

## 使い方

### サンプル建物データの生成（PoC用）

東京駅周辺の10x10グリッド建物データを生成:

```bash
python3 plateau_preprocessor.py \
  --mode sample \
  --bbox '{"north":35.682,"south":35.680,"east":139.768,"west":139.766}' \
  --output data/buildings-sample.geojson \
  --grid-size 10
```

### タイル生成ジョブの実行

設定JSONファイルを作成:

```json
{
  "bounds": {
    "north": 35.682,
    "south": 35.680,
    "east": 139.768,
    "west": 139.766
  },
  "startTime": "2026-01-10T03:00:00Z",
  "endTime": "2026-01-10T05:00:00Z",
  "stepMinutes": 10,
  "zooms": [15, 16, 17],
  "buildingsGeojson": "data/buildings-sample.geojson",
  "outputDir": "../../tiles/shade"
}
```

ワーカーを実行:

```bash
python3 worker.py --config job-config.json
```

生成されたタイルは `../../tiles/shade/{timeBucket}/{z}/{x}/{y}.png` に保存されます。

## タイル命名規則

- **timeBucket**: `YYYYMMDD_HHMM` 形式（10分刻み）
  - 例: `20260110_1530` = 2026年1月10日 15:30
- **z**: ズームレベル（15〜17を推奨）
- **x, y**: タイル座標（Web Mercator投影）

例: `/tiles/shade/20260110_1530/16/58267/25676.png`

## テスト

各モジュールを個別にテスト:

```bash
# 日陰計算のテスト
python3 shade_calculator.py

# タイル生成のテスト
python3 tile_generator.py

# 建物データ生成のテスト
python3 plateau_preprocessor.py --mode sample \
  --bbox '{"north":35.682,"south":35.680,"east":139.768,"west":139.766}' \
  --output test-buildings.geojson
```

## パフォーマンス

### PoC設定（品質重視）

- サンプリングレート: 4（タイル内を64x64ピクセルでサンプリング）
- ズームレベル: 15〜17
- 時間刻み: 10分

**想定処理時間**（東京駅周辺 0.002° x 0.002°）:

- 建物100個、ズーム16、1時間分（6タイムバケット）: 約2〜5分
- タイル数: 約50〜100枚/タイムバケット

### 本番最適化案（PoC後）

- タイルキャッシュ（Redis）
- 非同期ジョブキュー
- バックグラウンドワーカー（複数並列）
- 事前生成（対象地域の1日分）

## PLATEAU実データ対応（PoC後）

`plateau_preprocessor.py` の `parse_plateau_citygml()` を実装:

1. CityGMLパーサー（lxml + citygml4j or pyproj）
2. 建物フットプリント抽出
3. 高さ属性の取得（`measuredHeight`, `storeysAboveGround` など）
4. GeoJSON形式で出力

## トラブルシューティング

### Python依存パッケージのエラー

```bash
# 仮想環境を再作成
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### メモリ不足

タイル生成時にメモリ不足になる場合:

- ズームレベルを下げる（15のみ）
- 時間範囲を短くする（1時間分ずつ）
- サンプリングレートを下げる（tile_generator.py の `sampling_rate=2`）

### タイル生成が遅い

- 建物データを削減（bbox を小さくする）
- サンプリングレートを下げる
- 不要なズームレベルを除外

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
