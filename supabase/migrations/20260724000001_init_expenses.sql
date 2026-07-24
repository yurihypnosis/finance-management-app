-- Expense categories used to classify card transactions.
-- group_type distinguishes fixed monthly costs from variable/discretionary spend,
-- mirroring the FIXED_LIST / VARIABLE_LIST split already used in the frontend.
create table expense_categories (
  id text primary key,
  name text not null,
  group_type text not null check (group_type in ('fixed', 'variable')),
  sort_order int not null default 0
);

insert into expense_categories (id, name, group_type, sort_order) values
  ('rent', '家賃', 'fixed', 1),
  ('parking', '駐車場', 'fixed', 2),
  ('utility', '光熱・水道', 'fixed', 3),
  ('telecom', '通信', 'fixed', 4),
  ('insurance', '保険', 'fixed', 5),
  ('sub', 'サブスク', 'fixed', 6),
  ('food', '食費・外食', 'variable', 7),
  ('shopping', '買い物', 'variable', 8),
  ('etc', 'ETC・高速', 'variable', 9),
  ('suica', 'Suicaチャージ', 'variable', 10),
  ('movie', '映画・娯楽', 'variable', 11),
  ('medical', '医療', 'variable', 12),
  ('other', 'その他', 'variable', 13);

-- Raw card statement line items imported from the "ご利用明細" CSV exports.
create table card_transactions (
  id bigint generated always as identity primary key,
  statement_month text not null,          -- billing month, e.g. '2026-07'
  used_date date not null,                -- ご利用年月日
  merchant text not null,                 -- ご利用箇所
  amount numeric not null,                -- ご利用額
  refund_amount numeric not null default 0,
  billed_amount numeric not null,         -- ご請求額（うち手数料・利息）
  card_name text,
  category_id text references expense_categories(id),
  created_at timestamptz not null default now()
);

create index card_transactions_month_idx on card_transactions (statement_month);
create index card_transactions_category_idx on card_transactions (category_id);

alter table expense_categories enable row level security;
alter table card_transactions enable row level security;

-- Personal single-user app with no auth layer yet: expose read-only access to
-- the anon key so the static frontend can render reports. Writes are only
-- ever performed with the service_role key from the import script.
create policy "public read categories" on expense_categories for select using (true);
create policy "public read transactions" on card_transactions for select using (true);
