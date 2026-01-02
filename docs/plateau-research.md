# PLATEAU データ調査結果

## データ形式

PLATEAUの3D都市モデルは以下の形式で提供されている：

| 形式 | 説明 | 用途 |
|------|------|------|
| CityGML | XML形式の標準データ | 元データ |
| 3D Tiles | WebGIS用タイル形式 | Web表示に最適 |
| MVT | MapboxVectorTile | 軽量な2D表示 |
| GeoJSON | GIS標準形式 | モバイルアプリに最適 |
| FBX/OBJ | 3Dソフト用 | Unity/Unreal等 |

## データ取得方法

1. **G空間情報センター**: https://www.geospatial.jp/
2. **PLATEAUポータル**: https://front.geospatial.jp/plateau_portal_site/
3. **PLATEAU VIEW**: ブラウザで直接閲覧可能

## モバイルアプリでの利用方針

GeoJSON形式またはMVT形式を使用することで、モバイルアプリでも効率的に建物データを取得・表示できる。

### 3D Tiles配信URL

PLATEAUは3D Tilesを以下のようなURLで配信している：
- 東京23区: `https://plateau.geospatial.jp/main/data/3d-tiles/bldg/13100_tokyo/`

### 建物データの属性

- `bldg:measuredHeight`: 建物の実測高さ（メートル）
- `bldg:storeysAboveGround`: 地上階数
- `bldg:storeysBelowGround`: 地下階数
- `gml:id`: 建物ID

## 実装方針

1. **軽量化**: 全建物データをダウンロードせず、表示範囲のみを動的に取得
2. **キャッシュ**: 一度取得したデータはローカルにキャッシュ
3. **LOD選択**: モバイルではLOD1（箱型）を使用し、パフォーマンスを優先
