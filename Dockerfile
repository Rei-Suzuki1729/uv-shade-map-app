# syntax=docker/dockerfile:1

# ベースイメージ
FROM node:22-slim

# pnpmのインストール
RUN npm install -g pnpm@9.12.0

# 作業ディレクトリの設定
WORKDIR /app

# 依存関係のインストール
# package.jsonとpnpm-lock.yamlをコピー
COPY package.json pnpm-lock.yaml ./

# 依存関係をインストール
RUN pnpm install --frozen-lockfile

# アプリケーションコードをコピー
COPY . .

# 環境変数の設定
ENV NODE_ENV=development
ENV EXPO_PORT=8081
ENV PORT=3000

# ポートの公開
EXPOSE 8081 3000

# 開発サーバーの起動
CMD ["pnpm", "dev"]
