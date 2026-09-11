create table if not exists public.settings (
    id uuid primary key default gen_random_uuid(),
    key text not null unique,
    value text,
    category text default 'general',
    updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies where schemaname = 'public' and tablename = 'settings' and policyname = 'Allow all settings access'
    ) then
        create policy "Allow all settings access" on public.settings
            for all to anon
            using (true)
            with check (true);
    end if;
end $$;
