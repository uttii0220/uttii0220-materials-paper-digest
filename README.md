# 材料科学論文ダイジェスト

材料科学分野の博士課程研究者向けに、毎朝10分で重要論文を把握するための個人向けアプリケーション。

## 機能概要

- **毎日の推薦論文**: 研究テーマに近い新着論文を毎日10本推薦
- **推薦理由表示**: なぜその論文が推薦されたかを分かりやすく表示
- **日本語要約**: OpenAI APIで論文アブストを日本語200字要約
- **フィードバック学習**: 「既読」「興味なし」「ブックマーク」「アイデアにつながった」でスコア調整
- **週次再学習**: 毎週日曜にフィードバックを元にキーワード重みを自動調整
- **毎日配信メール**: 毎朝9:00（JST）に推薦10本をまとめてメール送信
- **キーワード管理**: UIからキーワードの追加・編集・削除が可能
- **KPI集計**: 「アイデアにつながった」件数を最重要KPIとして記録・表示

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router, TypeScript)
- **認証**: NextAuth.js v5 (Google OAuth)
- **データベース**: PostgreSQL + Prisma
- **メール送信**: Resend
- **AI要約**: OpenAI API (GPT-4o-mini)
- **定期実行**: GitHub Actions schedule
- **デプロイ**: Vercel（推奨）

## データソース

| ソース | ステータス | 備考 |
|--------|-----------|------|
| arXiv | ✅ 実装済み | 無料API |
| Crossref | ✅ 実装済み | 無料API |
| PubMed | ✅ 実装済み | 無料API（APIキーで高レート制限） |
| Web of Science | 🔧 スタブ | Starter API登録が必要 |
| Scopus | 🔧 スタブ | Elsevier APIキーが必要 |

## セットアップ手順

### 前提条件

- Node.js 18+
- PostgreSQL
- Google Cloud Console プロジェクト（OAuth用）
- Resend アカウント（メール送信用）
- OpenAI API キー（要約生成用）

### 1. リポジトリのクローン・依存インストール

```bash
git clone <this-repo>
cd materials-paper-digest
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を開いて以下を設定：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/materials_digest"
AUTH_SECRET="openssl rand -base64 32 で生成"
AUTH_GOOGLE_ID="Google Cloud ConsoleのOAuthクライアントID"
AUTH_GOOGLE_SECRET="Google Cloud ConsoleのOAuthクライアントシークレット"
OPENAI_API_KEY="sk-..."
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="digest@yourdomain.com"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="任意のランダム文字列"
```

### 3. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. 「APIとサービス」→「認証情報」→「OAuthクライアントIDを作成」
3. アプリケーションの種類: ウェブアプリケーション
4. 承認済みのリダイレクトURI: `http://localhost:3000/api/auth/callback/google`
5. クライアントIDとシークレットを `.env` に設定

### 4. データベースのセットアップ

```bash
# Prismaクライアントの生成
npm run db:generate

# マイグレーションの実行
npm run db:migrate

# （オプション）初期キーワードのシード（初回ログイン時に自動実行されます）
npm run db:seed
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いてGoogleログインを行ってください。

初回ログイン時に、デフォルトキーワード（粒界、DFT計算など）が自動設定されます。

### 6. 論文収集の手動実行

```bash
# 論文収集 + 推薦生成
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/jobs/collect

# メール送信
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/jobs/digest
```

## 本番デプロイ（Vercel）

### 1. Vercelへのデプロイ

```bash
npx vercel
```

### 2. 環境変数の設定

Vercel ダッシュボードで以下を設定：
- `DATABASE_URL`（Vercel Postgres または Supabase推奨）
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_APP_URL`（デプロイされたURL）
- `CRON_SECRET`

### 3. GitHub Actions の設定

GitHub リポジトリの Settings → Secrets and variables → Actions に追加：
- `APP_URL`: デプロイされたURL（例: `https://your-app.vercel.app`）
- `CRON_SECRET`: 上で設定したものと同じ値

## npm スクリプト一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint実行 |
| `npm test` | テスト実行 |
| `npm run db:generate` | Prismaクライアント生成 |
| `npm run db:migrate` | DBマイグレーション実行 |
| `npm run db:push` | スキーマをDBに反映（開発用） |
| `npm run db:seed` | 初期キーワードシード |
| `npm run db:studio` | Prisma Studio起動 |

## 推薦スコア計算式

```
total = 0.6 * keyword_match + 0.2 * recency + 0.15 * feedback + 0.05 * idea_signal
```

| スコア | 範囲 | 説明 |
|--------|------|------|
| `keyword_match` | 0〜1 | キーワード・同義語の一致度（重み付き） |
| `recency` | 0〜1 | 直近7日=1.0、1年超=0.1 |
| `feedback` | -1〜1 | 「興味なし」=-1、「ブックマーク」=+1 |
| `idea_signal` | 0〜1 | 「アイデアにつながった」論文との類似度 |

## キーワード管理

設定画面からキーワードを管理できます：

- **term**: キーワード（例：粒界）
- **type**: `core`（コア）/ `subfield`（サブ分野）/ `exclude`（除外）
- **weight**: 重み（0.0〜1.0）
- **synonyms**: 同義語（英語キーワードなど）

## 制約・未実装事項

- **Web of Science**: API利用にはClarivate Starter APIの契約が必要
- **Scopus**: Elsevier APIキーが必要（機関ライセンスが必要な場合あり）
- **OpenAI要約**: APIキー未設定時は英語アブストをそのまま表示
- **メール送信**: Resend APIキー未設定時はスキップ（ダッシュボードは正常動作）
- **週次重み更新**: 現在は簡易的なルールベース実装（将来的にはEmbedding類似度による高度な実装に移行予定）

## 今後の拡張予定

- Web of Science / Scopus の完全実装
- Embedding（ベクトル類似度）を使った精度向上
- 研究ノート・メモ機能
- BibTeX/RIS形式でのエクスポート
- Zotero/Mendeley連携
- モバイル向けUI最適化

## ライセンス

個人利用専用
