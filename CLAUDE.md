# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際にClaude Code (claude.ai/code) にガイダンスを提供します。

## プロジェクト概要

Honoフレームワークを使用したCloudflare Workersプロジェクトで、サーバーレスAPIを構築します。構成要素：
- HTTP リクエストハンドリング用の Hono ウェブフレームワーク
- D1データベースバインディング設定済み
- Cloudflare Workers プール対応の Vitest テスト環境
- TypeScript設定

## 開発コマンド

### 開発・ビルド
- `npm run dev` - Wranglerで開発サーバー起動 (http://localhost:8787)
- `npm run start` - devコマンドのエイリアス
- `npm run deploy` - Cloudflare Workersにデプロイ

### テスト
- `npm test` - Vitestで全テスト実行
- `npx vitest run test/index.spec.ts` - 特定のテストファイル実行

### 型生成
- `npm run cf-typegen` - wrangler.jsonc から Cloudflare バインディングの型を生成

## アーキテクチャ

### プロジェクト構造
- `src/index.ts` - 基本ルート付きのメインHonoアプリケーション
- `wrangler.jsonc` - D1データベースバインディング付きCloudflare Workers設定
- `test/` - Cloudflare Workers テストプール使用のVitestテスト
- `database/logs.sql` - D1データベーススキーマと初期データ

### 主要コンポーネント
- **Hono App**: 型安全バインディング付きメインアプリケーションインスタンス
- **D1 Database**: データベース操作用の"DB"という名前のバインディング設定
- **Bindings Type**: 現在D1DatabaseとKVNamespace用のプレースホルダー

### テスト設定
- Workers コードテスト用の `@cloudflare/vitest-pool-workers` 使用
- ユニットテストと統合テストスタイル両方利用可能
- 実際のWorkers ランタイム環境でテスト実行

## 重要な注意点
- データベースバインディングは設定済みだが、メインアプリではまだ未使用
- 新しいバインディング追加時は src/index.ts の Bindings 型を更新が必要
- wrangler.jsonc 変更後は `npm run cf-typegen` で型を更新