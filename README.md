# claude-code-api

Cloudflare Workers + Hono で作ったシンプルなAPIプロジェクト

## 開発環境

### 必要なもの
- Node.js
- npm

### セットアップ
```bash
npm install
```

### 開発サーバー起動
```bash
npm run dev
```
http://localhost:8787 でアクセス可能

### テスト実行
```bash
npm test
```

### デプロイ
```bash
npm run deploy
```

## API エンドポイント

- `GET /` - Hello World
- `GET /json` - JSON レスポンス例
- `GET /hello/:name` - パラメータ付きルート

## Database
migrations
```bash
npx wrangler d1 execute claude-code-api-dev --local --file=./database/logs.sql
```
query
```bash
npx wrangler d1 execute claude-code-api-dev --local --command="SELECT * FROM Logs"
```
`--local`フラグなしでリモートへの実行になる

## 技術スタック

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [Vitest](https://vitest.dev/)
