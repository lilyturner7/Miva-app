create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  username text unique,
  avatar_url text,
  language text not null default 'it',
  date_of_birth date,
  height_cm numeric(5,2),
  weight_kg numeric(6,2),
  occupation text,
  activity_level text,
  dietary_style text,
  plant_based_days_per_week smallint check (plant_based_days_per_week between 0 and 7),
  show_calories boolean not null default true,
  show_weight boolean not null default true,
  neutral_language boolean not null default false,
  avoid_compensation_language boolean not null default false,
  pantry_enabled boolean not null default false,
  onboarding_data jsonb not null default '{}'::jsonb,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  plan_type text not null default 'standard',
  source_filename text,
  storage_path text,
  parse_status text not null default 'pending',
  raw_extraction jsonb not null default '{}'::jsonb,
  confirmed_structure jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  makes_plan_on boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  nutrition_plan_id uuid references public.nutrition_plans(id) on delete set null,
  day_type text,
  sport_id uuid references public.sports(id) on delete set null,
  macro_targets jsonb not null default '{}'::jsonb,
  generation_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, plan_date)
);

create table if not exists public.daily_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_plan_id uuid not null references public.daily_plans(id) on delete cascade,
  meal_key text not null,
  meal_label text not null,
  planned_time time,
  title text,
  status text not null default 'planned',
  rationale text,
  planned_macros jsonb not null default '{}'::jsonb,
  actual_macros jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_meal_id uuid not null references public.daily_meals(id) on delete cascade,
  food_name text not null,
  brand text,
  barcode text,
  planned_quantity numeric(8,2),
  actual_quantity numeric(8,2),
  unit text,
  macros_per_100 jsonb not null default '{}'::jsonb,
  source text not null default 'plan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null,
  event_time time,
  event_type text not null,
  title text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_name text not null,
  brand text,
  barcode text,
  quantity numeric(10,2),
  unit text,
  is_open boolean not null default false,
  opened_at timestamptz,
  expires_on date,
  purchase_price numeric(10,2),
  supermarket text,
  nutrition_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_name text not null,
  brand text,
  quantity numeric(10,2),
  unit text,
  reason text,
  checked boolean not null default false,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  category text not null,
  values text[] not null default '{}',
  intensity smallint check (intensity between 1 and 5),
  notes text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.medication_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  reminder_time time not null,
  recurrence text not null default 'daily',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notifications jsonb not null default '{"medications":true,"expirations":false,"shopping":false,"planning":false}'::jsonb,
  planning_days smallint not null default 5 check (planning_days in (2,5,7)),
  display_days smallint not null default 5 check (display_days between 2 and 7),
  planning_style text not null default 'proposal_alternatives',
  variety_style text not null default 'balanced',
  max_repeat_count smallint not null default 3,
  meal_prep_enabled boolean not null default false,
  freeze_leftovers boolean not null default false,
  weekly_budget numeric(10,2),
  monthly_budget numeric(10,2),
  supermarkets text[] not null default '{}',
  optimization_priorities text[] not null default array['taste','expiry','convenience','cost'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.profiles enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.sports enable row level security;
alter table public.daily_plans enable row level security;
alter table public.daily_meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.daily_events enable row level security;
alter table public.pantry_items enable row level security;
alter table public.shopping_items enable row level security;
alter table public.diary_entries enable row level security;
alter table public.medication_reminders enable row level security;
alter table public.user_settings enable row level security;

create policy "profiles own rows" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "nutrition_plans own rows" on public.nutrition_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sports own rows" on public.sports for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "daily_plans own rows" on public.daily_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "daily_meals own rows" on public.daily_meals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "meal_items own rows" on public.meal_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "daily_events own rows" on public.daily_events for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pantry_items own rows" on public.pantry_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "shopping_items own rows" on public.shopping_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "diary_entries own rows" on public.diary_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "medication_reminders own rows" on public.medication_reminders for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_settings own rows" on public.user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
