-- Supabase / Postgres schema for PayType Guard (optional for the MVP; swap in for src/lib/store.ts)
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null,
  description text not null,
  selected_type text not null check (selected_type in ('GS','FF')),
  intent_category text not null check (intent_category in ('commercial','personal','ambiguous')),
  intent_confidence numeric(3,2) not null,
  has_mismatch boolean not null default false,
  report jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  paypal_order_id text primary key,
  assessment_id uuid references assessments(id),
  status text not null,
  amount numeric(12,2),
  currency text,
  updated_at timestamptz not null default now()
);

create table if not exists txn_events (
  id text primary key,                      -- PayPal event id (idempotency key)
  paypal_order_id text not null,
  event_type text not null,
  status text not null,
  origin text not null check (origin in ('webhook','capture-response','simulation')),
  signature_verified boolean not null,
  received_at timestamptz not null default now()
);
create index if not exists txn_events_order on txn_events (paypal_order_id, received_at desc);

create table if not exists policy_sources (
  id text primary key,
  title text not null,
  url text not null,
  market text,
  last_verified date
);

create table if not exists appeals (
  id uuid primary key default gen_random_uuid(),
  restriction_kind text,
  stated_reason text,
  draft text,
  created_at timestamptz not null default now()
);
-- Never store passwords, card numbers or PayPal credentials.
