alter table public.nutrition_plans add column if not exists version_number integer not null default 1;
alter table public.nutrition_plans add column if not exists supersedes_plan_id uuid references public.nutrition_plans(id) on delete set null;
alter table public.nutrition_plans add column if not exists effective_from date;
alter table public.nutrition_plans add column if not exists archived_at timestamptz;

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

alter table public.nutritionist_review_items enable row level security;
drop policy if exists "nutritionist_review_items own rows" on public.nutritionist_review_items;
create policy "nutritionist_review_items own rows" on public.nutritionist_review_items
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists nutritionist_review_items_user_id_idx on public.nutritionist_review_items(user_id);
create index if not exists nutrition_plans_user_active_idx on public.nutrition_plans(user_id, is_active);
