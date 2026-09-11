create table if not exists public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    user_agent text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions(endpoint);

alter table public.push_subscriptions enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'Allow all push_subscriptions access'
    ) then
        create policy "Allow all push_subscriptions access" on public.push_subscriptions
            for all to anon, authenticated
            using (true)
            with check (true);
    end if;
end $$;
