# UV Shade Map

日陰を優先したルート検索ができるモバイルアプリケーション。リアルタイムのUV指数データと建物の影を計算し、紫外線露出を最小限に抑えるルートを提案します。

## 特徴

- **リアルタイムUV指数表示** - Open-Meteo APIから取得した実際のUV指数データ
- **日陰マップ表示** - PLATEAU建物データと太陽位置から計算した影の表示
- **日陰優先ルート検索** - 紫外線露出を最小限に抑えるルートの提案
- **地図上のルート描画** - 出発地から目的地までのルートを視覚的に表示
- **リバースジオコーディング** - 現在地の地名と座標を自動表示
- **ダークモード対応** - システム設定に応じた自動切り替え

## 技術スタック

- **フレームワーク**: React Native (Expo SDK 54)
- **言語**: TypeScript 5.9
- **スタイリング**: NativeWind 4 (Tailwind CSS)
- **ルーティング**: Expo Router 6
- **状態管理**: React Context + TanStack Query
- **API通信**: tRPC
- **データベース**: MySQL + Drizzle ORM
- **地図**: react-native-maps (ネイティブ) / OpenStreetMap (Web)

## 開発環境のセットアップ

### 通常の開発環境

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev

# 個別に起動する場合
pnpm dev:server  # バックエンドサーバー
pnpm dev:metro   # Expo Metro Bundler
```

### Docker開発環境（推奨）

Docker環境での開発については [DOCKER.md](./DOCKER.md) を参照してください。

```bash
# Docker Composeで起動
docker-compose up

# VS Code Dev Containerで開発
# 1. Dev Containers拡張機能をインストール
# 2. コマンドパレットから「Dev Containers: Reopen in Container」を選択
```

## プロジェクト構造

```
uv-shade-map-app/
├── app/                    # アプリケーション画面
│   ├── (tabs)/            # タブナビゲーション
│   │   ├── index.tsx      # マップ画面
│   │   ├── route.tsx      # ルート検索画面
│   │   └── settings.tsx   # 設定画面
│   └── _layout.tsx        # ルートレイアウト
├── components/            # 再利用可能なコンポーネント
├── lib/                   # ビジネスロジック・サービス
├── hooks/                 # カスタムフック
├── constants/             # 定数定義
├── types/                 # 型定義
├── server/                # バックエンドAPI
└── theme.config.js        # テーマ設定
```

## 主要な機能

### 1. UV指数表示

Open-Meteo APIから取得したリアルタイムのUV指数を表示。肌タイプに応じた安全な露出時間も計算します。

### 2. 日陰マップ

PLATEAU建物データと太陽位置（SunCalc）を使用して、現在時刻の建物の影を地図上に表示します。

### 3. ルート検索

OSRM APIを使用したルート検索に加え、ルート上の日陰率を計算。日陰優先ルートを提案します。

### 4. 地図表示

- **標準モード**: 通常の地図表示
- **UVモード**: UV指数のヒートマップ表示
- **日陰モード**: 建物の影を強調表示

## API

### バックエンドAPI

バックエンドAPIの詳細については [server/README.md](./server/README.md) を参照してください。

主要なエンドポイント：
- `uv.getData` - UV指数データの取得
- `search.address` - 住所検索
- `favorites.list` - お気に入り場所の管理
- `history.list` - 検索履歴の管理

### 外部API

- **Open-Meteo API**: UV指数データ
- **Nominatim API**: ジオコーディング・リバースジオコーディング
- **OSRM API**: ルート検索
- **Overpass API**: PLATEAU建物データ

## テスト

```bash
# 全テストの実行
pnpm test

# TypeScriptの型チェック
pnpm check

# Lintの実行
pnpm lint
```

## ビルド

```bash
# Androidビルド
pnpm android

# iOSビルド
pnpm ios

# Webビルド
pnpm build
```

## 環境変数

プロジェクトルートに `.env` ファイルを作成してください：

```env
# データベース接続
DATABASE_URL=postgres://postgres:password@localhost:5432/uv_shade_map

# API設定（オプション）
# OPEN_METEO_API_KEY=your_api_key
# NOMINATIM_USER_AGENT=your_app_name
```

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 参考文献

- [PLATEAU](https://www.mlit.go.jp/plateau/) - 国土交通省の3D都市モデル
- [Open-Meteo](https://open-meteo.com/) - オープンソース気象API
- [OSRM](http://project-osrm.org/) - オープンソースルーティングエンジン
- [Nominatim](https://nominatim.org/) - OpenStreetMapのジオコーディングサービス
