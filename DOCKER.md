# Docker開発環境

このプロジェクトはDockerコンテナで開発できます。

## 必要なもの

- Docker Desktop (https://www.docker.com/products/docker-desktop)
- VS Code (推奨、Dev Container機能を使用する場合)

## 開発方法

### 方法1: Docker Composeを使用

```bash
# コンテナをビルドして起動
docker-compose up

# バックグラウンドで起動
docker-compose up -d

# ログを確認
docker-compose logs -f app

# コンテナを停止
docker-compose down
```

アプリケーションは以下のURLでアクセスできます：
- Expo Metro Bundler: http://localhost:8081
- Backend API: http://localhost:3000
- MySQL: localhost:3306

### 方法2: VS Code Dev Containerを使用（推奨）

1. VS Codeで「Dev Containers」拡張機能をインストール
2. プロジェクトフォルダを開く
3. コマンドパレット（Ctrl+Shift+P / Cmd+Shift+P）を開く
4. 「Dev Containers: Reopen in Container」を選択
5. コンテナが起動したら、ターミナルで`pnpm dev`を実行

## コンテナ内でのコマンド実行

```bash
# コンテナに入る
docker-compose exec app sh

# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev

# テストの実行
pnpm test

# データベースマイグレーション
pnpm db:push
```

## データベース接続情報

- Host: `db` (コンテナ内) / `localhost` (ホストから)
- Port: `3306`
- User: `root`
- Password: `password`
- Database: `uv_shade_map`

## トラブルシューティング

### ポートが既に使用されている

```bash
# 使用中のポートを確認
lsof -i :8081
lsof -i :3000

# プロセスを終了
kill -9 <PID>
```

### コンテナをクリーンビルド

```bash
# コンテナとボリュームを削除
docker-compose down -v

# イメージを再ビルド
docker-compose build --no-cache

# 起動
docker-compose up
```

### node_modulesの問題

```bash
# コンテナ内で依存関係を再インストール
docker-compose exec app pnpm install --force
```

## 本番環境用のビルド

```bash
# 本番用イメージのビルド
docker build -t uv-shade-map:latest .

# 本番用コンテナの起動
docker run -p 8081:8081 -p 3000:3000 uv-shade-map:latest
```
