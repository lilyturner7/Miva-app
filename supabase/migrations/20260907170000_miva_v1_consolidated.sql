-- Miva v1 consolidated incremental migration
-- Safe to run more than once. Does not drop user data.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Existing core tables: additive evolution only
-- ------------------------------------------------------------

alter table if exists public.profiles
  add column if not exists startup_mode text not null default 'learn_first',
  add column if not exists startup_learning_days smallint not null default 7,
  add column if not exists startup_started_at timestamptz,
  add column if not exists startup_completed_at timestamptz;

alter table if exists public.nutrition_plans
  add column if not exists version_number integer not null default 1,
  add column if not exists supersedes_plan_id uuid references public.nutrition_plans(id) on delete set null,
  add column if not exists effective_from date,
  add column if not exists effective_to date,
  add column if not exists archived_at timestamptz,
  add column if not exists interpretation_status text not null default 'unverified',
  add column if not exists interpretation_notes jsonb not null default '{}'::jsonb;

alter table if exists public.daily_plans
  add column if not exists plan_version_number integer,
  add column if not exists data_completeness text not null default 'partial',
  add column if not exists balance_context jsonb not null default '{}'::jsonb;

alter table if exists public.daily_meals
  add column if not exists meal_kind text not null default 'planned',
  add column if not exists is_ad_hoc boolean not null default false,
  add column if not exists source_meal_id uuid references public.daily_meals(id) on delete set null,
  add column if not exists skipped_reason text,
  add column if not exists prepared_macros jsonb not null default '{}'::jsonb,
  add column if not exists proposal_context jsonb not null default '{}'::jsonb,
  add column if not exists adjustment_context jsonb not null default '{}'::jsonb,
  add column if not exists confirmed_at timestamptz;

alter table if exists public.meal_items
  add column if not exists prepared_quantity numeric(8,2),
  add column if not exists relationship_to_plan text not null default 'planned',
  add column if not exists confidence text not null default 'known',
  add column if not exists is_extra boolean not null default false,
  add column if not exists is_leftover boolean not null default false,
  add column if not exists leftover_source_item_id uuid references public.meal_items(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.pantry_items
  add column if not exists item_state text not null default 'sealed',
  add column if not exists quantity_confidence text not null default 'known',
  add column if not exists original_quantity numeric(10,2),
  add column if not exists package_size numeric(10,2),
  add column if not exists package_unit text,
  add column if not exists always_stock boolean not null default false,
  add column if not exists auto_rebuy boolean not null default false,
  add column if not exists use_first boolean not null default false,
  add column if not exists source text not null default 'manual',
  add column if not exists is_prepared boolean not null default false,
  add column if not exists servings_remaining numeric(6,2),
  add column if not exists prepared_at timestamptz,
  add column if not exists frozen_at timestamptz,
  add column if not exists discarded_at timestamptz,
  add column if not exists discarded_quantity numeric(10,2),
  add column if not exists discarded_reason text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.shopping_items
  add column if not exists item_category text not null default 'food',
  add column if not exists package_size numeric(10,2),
  add column if not exists package_unit text,
  add column if not exists suggested boolean not null default false,
  add column if not exists suggestion_reason text,
  add column if not exists purchased_at timestamptz,
  add column if not exists purchase_price numeric(10,2),
  add column if not exists supermarket text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.diary_entries
  add column if not exists daily_meal_id uuid references public.daily_meals(id) on delete cascade,
  add column if not exists recorded_for_time time,
  add column if not exists source text not null default 'manual',
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.medication_reminders
  add column if not exists reminder_type text not null default 'pill',
  add column if not exists weekdays smallint[] not null default array[1,2,3,4,5,6,7],
  add column if not exists meal_relation text,
  add column if not exists suspended_at timestamptz,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.user_settings
  add column if not exists startup_mode text not null default 'learn_first',
  add column if not exists startup_learning_days smallint not null default 7,
  add column if not exists show_macros boolean not null default true,
  add column if not exists show_body_perception boolean not null default false,
  add column if not exists auto_update_pantry boolean not null default true,
  add column if not exists auto_add_always_stock boolean not null default false,
  add column if not exists save_meal_photos boolean not null default false,
  add column if not exists optimization_priorities_v1 text[] not null default array['taste','expiry','pantry','variety','time','meal_prep','cost'];

-- ------------------------------------------------------------
-- Preferences: explicit + learned, without conflating them
-- ------------------------------------------------------------

create table if not exists public.food_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_type text not null default 'food',
  key text not null,
  label text not null,
  context jsonb not null default '{}'::jsonb,
  explicit_rating smallint check (explicit_rating between -2 and 2),
  observed_score numeric(5,4) not null default 0,
  observation_count integer not null default 0,
  favorite boolean not null default false,
  do_not_suggest boolean not null default false,
  repetition_tolerance numeric(5,4),
  last_observed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, preference_type, key)
);

-- ------------------------------------------------------------
-- Recipes: user recipes, Miva recipes, variants and favorites
-- ------------------------------------------------------------

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  recipe_origin text not null default 'user',
  edit_mode text not null default 'ask_each_time',
  parent_recipe_id uuid references public.recipes(id) on delete set null,
  image_path text,
  servings numeric(6,2) not null default 1,
  prep_minutes integer,
  cook_minutes integer,
  instructions jsonb not null default '[]'::jsonb,
  nutrition_data jsonb not null default '{}'::jsonb,
  plan_compatibility text not null default 'unknown',
  compatibility_context jsonb not null default '{}'::jsonb,
  favorite boolean not null default false,
  rating text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_name text not null,
  brand text,
  quantity numeric(10,2),
  unit text,
  relationship_to_plan text not null default 'unknown',
  nutrition_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Medication completion log: reminder definition != daily check
-- ------------------------------------------------------------

create table if not exists public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_id uuid not null references public.medication_reminders(id) on delete cascade,
  log_date date not null,
  scheduled_time time,
  taken_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(reminder_id, log_date, scheduled_time)
);

-- ------------------------------------------------------------
-- Product scan history + purchase memory
-- ------------------------------------------------------------

create table if not exists public.product_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  barcode text,
  product_name text not null,
  brand text,
  nutrition_data jsonb not null default '{}'::jsonb,
  ingredients jsonb not null default '[]'::jsonb,
  general_score numeric(5,2),
  general_label text,
  general_reasons jsonb not null default '[]'::jsonb,
  personal_compatibility text,
  personal_reasons jsonb not null default '[]'::jsonb,
  confidence text not null default 'known',
  image_path text,
  scanned_at timestamptz not null default now()
);

create table if not exists public.purchase_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_name text not null,
  brand text,
  barcode text,
  item_category text not null default 'food',
  quantity numeric(10,2),
  unit text,
  package_size numeric(10,2),
  package_unit text,
  price numeric(10,2),
  supermarket text,
  purchased_at timestamptz not null default now(),
  liked_rating smallint check (liked_rating between -2 and 2),
  metadata jsonb not null default '{}'::jsonb
);

-- ------------------------------------------------------------
-- Nutritionist review: create if the earlier migration has not run
-- ------------------------------------------------------------

create table if not exists public.nutritionist_review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_item_id uuid references public.meal_items(id) on delete set null,
  food_name text not null,
  brand text,
  quantity numeric(10,2),
  unit text,
  nutrition_data jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'to_review',
  note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ------------------------------------------------------------
-- RLS: all policies are explicitly dropped before recreation
-- ------------------------------------------------------------

alter table public.food_preferences enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.medication_logs enable row level security;
alter table public.product_scans enable row level security;
alter table public.purchase_history enable row level security;
alter table public.nutritionist_review_items enable row level security;

drop policy if exists "food_preferences own rows" on public.food_preferences;
create policy "food_preferences own rows" on public.food_preferences
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "recipes own rows" on public.recipes;
create policy "recipes own rows" on public.recipes
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "recipe_items own rows" on public.recipe_items;
create policy "recipe_items own rows" on public.recipe_items
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "medication_logs own rows" on public.medication_logs;
create policy "medication_logs own rows" on public.medication_logs
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "product_scans own rows" on public.product_scans;
create policy "product_scans own rows" on public.product_scans
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "purchase_history own rows" on public.purchase_history;
create policy "purchase_history own rows" on public.purchase_history
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "nutritionist_review_items own rows" on public.nutritionist_review_items;
create policy "nutritionist_review_items own rows" on public.nutritionist_review_items
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Existing-table policies are also normalized safely. This makes the
-- migration idempotent even when the original schema/repair migrations
-- were run in an unusual order.

do $$
begin
  if to_regclass('public.profiles') is not null then
    drop policy if exists "profiles own rows" on public.profiles;
    create policy "profiles own rows" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
  end if;
  if to_regclass('public.nutrition_plans') is not null then
    drop policy if exists "nutrition_plans own rows" on public.nutrition_plans;
    create policy "nutrition_plans own rows" on public.nutrition_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if to_regclass('public.daily_plans') is not null then
    drop policy if exists "daily_plans own rows" on public.daily_plans;
    create policy "daily_plans own rows" on public.daily_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if to_regclass('public.daily_meals') is not null then
    drop policy if exists "daily_meals own rows" on public.daily_meals;
    create policy "daily_meals own rows" on public.daily_meals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if to_regclass('public.meal_items') is not null then
    drop policy if exists "meal_items own rows" on public.meal_items;
    create policy "meal_items own rows" on public.meal_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if to_regclass('public.daily_events') is not null then
    drop policy if exists "daily_events own rows" on public.daily_events;
    create policy "daily_events own rows" on public.daily_events for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if to_regclass('public.pantry_items') is not null then
    drop policy if exists "pantry_items own rows" on public.pantry_items;
    create policy "pantry_items own rows" on public.pantry_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if to_regclass('public.shopping_items') is not null then
    drop policy if exists "shopping_items own rows" on public.shopping_items;
    create policy "shopping_items own rows" on public.shopping_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if to_regclass('public.diary_entries') is not null then
    drop policy if exists "diary_entries own rows" on public.diary_entries;
    create policy "diary_entries own rows" on public.diary_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if to_regclass('public.medication_reminders') is not null then
    drop policy if exists "medication_reminders own rows" on public.medication_reminders;
    create policy "medication_reminders own rows" on public.medication_reminders for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if to_regclass('public.user_settings') is not null then
    drop policy if exists "user_settings own rows" on public.user_settings;
    create policy "user_settings own rows" on public.user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if to_regclass('public.sports') is not null then
    drop policy if exists "sports own rows" on public.sports;
    create policy "sports own rows" on public.sports for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

-- Storage bucket and policies for nutrition plans, also safe to rerun.
insert into storage.buckets (id, name, public)
values ('nutrition-plans','nutrition-plans',false)
on conflict (id) do nothing;

drop policy if exists "users upload own nutrition plans" on storage.objects;
drop policy if exists "users read own nutrition plans" on storage.objects;
drop policy if exists "users update own nutrition plans" on storage.objects;
drop policy if exists "users delete own nutrition plans" on storage.objects;

create policy "users upload own nutrition plans" on storage.objects
for insert to authenticated
with check (bucket_id='nutrition-plans' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "users read own nutrition plans" on storage.objects
for select to authenticated
using (bucket_id='nutrition-plans' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "users update own nutrition plans" on storage.objects
for update to authenticated
using (bucket_id='nutrition-plans' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='nutrition-plans' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "users delete own nutrition plans" on storage.objects
for delete to authenticated
using (bucket_id='nutrition-plans' and (storage.foldername(name))[1]=auth.uid()::text);

-- Helpful indexes (all idempotent)
create index if not exists daily_meals_user_date_lookup_idx on public.daily_meals(user_id, daily_plan_id, planned_time);
create index if not exists meal_items_meal_idx on public.meal_items(daily_meal_id);
create index if not exists pantry_items_user_state_idx on public.pantry_items(user_id, item_state, expires_on);
create index if not exists shopping_items_user_checked_idx on public.shopping_items(user_id, checked);
create index if not exists diary_entries_user_date_idx on public.diary_entries(user_id, entry_date);
create index if not exists food_preferences_user_type_idx on public.food_preferences(user_id, preference_type);
create index if not exists recipes_user_active_idx on public.recipes(user_id, active);
create index if not exists product_scans_user_date_idx on public.product_scans(user_id, scanned_at desc);
create index if not exists purchase_history_user_date_idx on public.purchase_history(user_id, purchased_at desc);
create index if not exists nutritionist_review_items_user_id_idx on public.nutritionist_review_items(user_id);
create index if not exists nutrition_plans_user_active_idx on public.nutrition_plans(user_id, is_active);
