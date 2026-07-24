-- Per-user app state: the whole client-side state object (habits, subs, events,
-- budget categories, goals, salary, etc.) is stored as a single JSONB blob per
-- user, mirroring what used to live in localStorage. This keeps the app's
-- existing single setState() call site as the one place that needs to sync to
-- the backend, instead of normalizing every entity into its own table.
create table user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_state enable row level security;

create policy "users manage own state" on user_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Card transactions now belong to whichever user imported/owns them.
alter table card_transactions add column user_id uuid references auth.users (id) on delete cascade;

drop policy "public read transactions" on card_transactions;

create policy "users manage own transactions" on card_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index card_transactions_user_idx on card_transactions (user_id);
