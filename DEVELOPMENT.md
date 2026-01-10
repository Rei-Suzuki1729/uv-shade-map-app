# ローカル開発ガイド

このドキュメントは、UV Shade Mapをローカル環境で開発するためのガイドです。

## 必要な環境

- Node.js 22.x
- pnpm 9.12.0
- MySQL 8.0（オプション、バックエンド機能を使用する場合）

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

プロジェクトには以下の環境変数が設定されています：

- `DATABASE_URL`: MySQLデータベースの接続URL
- `PORT`: バックエンドAPIのポート（デフォルト: 3000）
- `EXPO_PORT`: Expo Metro Bundlerのポート（デフォルト: 8081）

追加の環境変数が必要な場合は、Manus UIの「Settings → Secrets」から設定してください。

### 3. データベースのセットアップ（オプション）

バックエンド機能を使用する場合：

```bash
# データベースマイグレーション
pnpm db:push
```

## 開発サーバーの起動

### すべてのサーバーを同時に起動

```bash
pnpm dev
```

これにより以下が起動します：
- バックエンドAPI（http://localhost:3000）
- Expo Metro Bundler（http://localhost:8081）

### 個別に起動

```bash
# バックエンドのみ
pnpm dev:server

# Metro Bundlerのみ
pnpm dev:metro
```

## 開発用コマンド

```bash
# TypeScript型チェック
pnpm check

# Lintの実行
pnpm lint

# コードフォーマット
pnpm format

# テストの実行
pnpm test

# QRコードの生成（モバイルデバイスでテスト）
pnpm qr
```

## モバイルデバイスでのテスト

### 1. Expo Goアプリをインストール

- iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
- Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

### 2. QRコードでアクセス

```bash
pnpm qr
```

表示されたQRコードをExpo Goアプリでスキャンします。

### 3. 直接URLでアクセス

Metro Bundlerが起動したら、以下のURLにアクセスできます：

- Web: http://localhost:8081
- iOS: `exp://localhost:8081`
- Android: `exp://localhost:8081`

## プロジェクト構造

```
app/(tabs)/
  index.tsx       # マップ画面（809行 - リファクタリング推奨）
  route.tsx       # ルート検索画面
  settings.tsx    # 設定画面

components/       # 再利用可能なコンポーネント
  uv-card.tsx
  search-bar.tsx
  map-mode-selector.tsx
  ...

lib/              # ビジネスロジック・サービス
  uv-service.ts
  route-service.ts
  shade-calculator.ts
  ...

hooks/            # カスタムフック
  use-location.ts
  use-colors.ts
  ...

constants/        # 定数定義
  map.ts          # 地図関連の定数
  uv.ts           # UV関連の定数
  ...

types/            # 型定義
  map.ts          # 地図関連の型
  ...

server/           # バックエンドAPI
  routers.ts      # tRPCルーター
  _core/          # コアロジック
  ...
```

## よくある問題

### ポートが既に使用されている

```bash
# 使用中のプロセスを確認
lsof -i :8081
lsof -i :3000

# プロセスを終了
kill -9 <PID>
```

### Metro Bundlerのキャッシュクリア

```bash
# キャッシュをクリアして起動
npx expo start --clear
```

### node_modulesの再インストール

```bash
rm -rf node_modules
pnpm install
```

### データベース接続エラー

1. MySQLが起動しているか確認
2. `DATABASE_URL`が正しく設定されているか確認
3. データベースが作成されているか確認

```sql
CREATE DATABASE uv_shade_map;
```

## デバッグ

### VS Codeでのデバッグ

`.vscode/launch.json`を作成：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev:server"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

### React Native Debuggerの使用

1. [React Native Debugger](https://github.com/jhen0409/react-native-debugger)をインストール
2. Metro Bundlerを起動
3. デバイスでアプリを開く
4. 開発者メニューから「Debug」を選択

## パフォーマンス最適化

### 大きなファイルの特定

```bash
# ファイルサイズの確認
find app lib components -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -20
```

現在の大きなファイル：
- `app/(tabs)/index.tsx`: 809行 - MapScreen、MapView、NativeMapViewを分離推奨
- `lib/shade-route-service.ts`: 499行 - サービスの分割を検討

### バンドルサイズの確認

```bash
# Webビルドのバンドルサイズを確認
pnpm build
npx source-map-explorer dist/**/*.js
```

## コントリビューション

1. 新機能を追加する前に`todo.md`を確認
2. 大きな変更は issue で議論
3. コードフォーマットとLintを実行
4. テストを追加
5. プルリクエストを作成

## 参考リンク

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [tRPC Documentation](https://trpc.io/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
