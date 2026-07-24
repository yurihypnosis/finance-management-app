# finance-management-app

シンプルな家計簿アプリ。固定費・変動費・習慣・サブスク・投資目標・給与手取りをまとめて可視化する。

## 構成

- `index.html` / `style.css` / `app.js` — ビルド不要のバニラJSフロントエンド
- `supabase/` — Supabaseのマイグレーション（DBスキーマ・認証設定）

## データと認証

- ユーザーはメール＋パスワードでサインアップ/ログインする（Supabase Auth）
- アプリの状態（給与・目標・カテゴリ・習慣・サブスク・イベント等）は `user_state` テーブルにユーザーごとのJSONBとして保存される
- カード明細（`card_transactions`）もユーザーごとに分離されており、Row Level Securityで本人以外は読み書きできない
- ローカルには表示用のキャッシュのみを保持し、正本はSupabase側にある

## セットアップ

1. Supabaseプロジェクトを作成し、`supabase link --project-ref <ref>` でこのリポジトリを紐付ける
2. `supabase db push` でマイグレーションを適用する
3. `app.js` の `SUPABASE_URL` / `SUPABASE_ANON_KEY` を自分のプロジェクトの値に置き換える
4. `index.html` を静的ホスティングするか、ローカルで開く
