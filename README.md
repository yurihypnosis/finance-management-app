# finance-management-app

シンプルな家計簿アプリ。固定費・変動費・習慣・サブスク・投資目標・給与手取りをまとめて可視化する。

## 構成

- React + TypeScript + Vite フロントエンド（`src/`）
  - `src/lib/` — 税金・社保計算などの純粋関数、Supabaseクライアント、型定義
  - `src/store/appStore.ts` — Zustandによるグローバル状態管理（localStorageキャッシュ + Supabaseへのデバウンス同期）
  - `src/hooks/useComputed.ts` — 画面表示用の派生値（旧 computeVals 相当）
  - `src/components/` — 共通UI部品（Topbar・Menu・タブ等）
  - `src/screens/` — 画面ごとのコンポーネント（ホーム・支出・予算・レポート等）
- `supabase/` — Supabaseのマイグレーション（DBスキーマ・認証設定）

## 開発

```
npm install
npm run dev      # 開発サーバー
npm run build    # 本番ビルド（dist/ に出力、Vercelがそのままデプロイ）
```

## データと認証

- ユーザーはメール＋パスワードでサインアップ/ログインする（Supabase Auth）
- アプリの状態（給与・目標・カテゴリ・習慣・サブスク・イベント等）は `user_state` テーブルにユーザーごとのJSONBとして保存される
- カード明細（`card_transactions`）もユーザーごとに分離されており、Row Level Securityで本人以外は読み書きできない
- ローカルには表示用のキャッシュのみを保持し、正本はSupabase側にある

## セットアップ

1. Supabaseプロジェクトを作成し、`supabase link --project-ref <ref>` でこのリポジトリを紐付ける
2. `supabase db push` でマイグレーションを適用する
3. `src/lib/supabase.ts` の `SUPABASE_URL` / `SUPABASE_ANON_KEY` を自分のプロジェクトの値に置き換える
4. `npm run build` で `dist/` を生成し、静的ホスティングする（Vercelは `vercel.json` の設定でそのままデプロイ可能）
