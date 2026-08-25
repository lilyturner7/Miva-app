insert into storage.buckets (id, name, public)
values ('nutrition-plans','nutrition-plans',false)
on conflict (id) do nothing;

drop policy if exists "users upload own nutrition plans" on storage.objects;
drop policy if exists "users read own nutrition plans" on storage.objects;
drop policy if exists "users update own nutrition plans" on storage.objects;
drop policy if exists "users delete own nutrition plans" on storage.objects;

create policy "users upload own nutrition plans" on storage.objects for insert to authenticated with check (bucket_id='nutrition-plans' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "users read own nutrition plans" on storage.objects for select to authenticated using (bucket_id='nutrition-plans' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "users update own nutrition plans" on storage.objects for update to authenticated using (bucket_id='nutrition-plans' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='nutrition-plans' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "users delete own nutrition plans" on storage.objects for delete to authenticated using (bucket_id='nutrition-plans' and (storage.foldername(name))[1]=auth.uid()::text);