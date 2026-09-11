create extension if not exists pgcrypto;

create table if not exists public.members (
    id uuid primary key default gen_random_uuid(),
    user_id text not null unique,
    name text not null,
    role text not null default 'beginner',
    join_date timestamptz not null default now(),
    activity_score integer not null default 0,
    streak integer not null default 0,
    last_active_date timestamptz,
    xp integer not null default 0,
    completed_tasks jsonb not null default '[]'::jsonb
);

create table if not exists public.playlists (
    id uuid primary key default gen_random_uuid(),
    url text not null,
    channel_id text not null,
    playlist_id text not null,
    title text not null,
    videos jsonb not null default '[]'::jsonb,
    current_index integer not null default 0,
    status text not null default 'active',
    added_by text not null
);

create table if not exists public.quizzes (
    id uuid primary key default gen_random_uuid(),
    question text not null,
    options jsonb not null,
    correct_option_index integer not null,
    topic text not null
);

create table if not exists public.progress (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    date timestamptz not null default now(),
    text text not null
);

alter table public.members enable row level security;
alter table public.playlists enable row level security;
alter table public.quizzes enable row level security;
alter table public.progress enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies where schemaname = 'public' and tablename = 'members' and policyname = 'Allow all member access'
    ) then
        create policy "Allow all member access" on public.members
            for all to anon
            using (true)
            with check (true);
    end if;

    if not exists (
        select 1 from pg_policies where schemaname = 'public' and tablename = 'playlists' and policyname = 'Allow all playlist access'
    ) then
        create policy "Allow all playlist access" on public.playlists
            for all to anon
            using (true)
            with check (true);
    end if;

    if not exists (
        select 1 from pg_policies where schemaname = 'public' and tablename = 'quizzes' and policyname = 'Allow all quiz access'
    ) then
        create policy "Allow all quiz access" on public.quizzes
            for all to anon
            using (true)
            with check (true);
    end if;

    if not exists (
        select 1 from pg_policies where schemaname = 'public' and tablename = 'progress' and policyname = 'Allow all progress access'
    ) then
        create policy "Allow all progress access" on public.progress
            for all to anon
            using (true)
            with check (true);
    end if;
end $$;

-- ============================================================================
-- Web Push Subscriptions Table
-- ============================================================================
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
        select 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'Allow anonymous subscription management'
    ) then
        create policy "Allow anonymous subscription management" on public.push_subscriptions
            for all to anon
            using (true)
            with check (true);
    end if;

    if not exists (
        select 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'Allow authenticated users manage own subscriptions'
    ) then
        create policy "Allow authenticated users manage own subscriptions" on public.push_subscriptions
            for all to authenticated
            using (auth.uid()::text = user_id or user_id is not null)
            with check (auth.uid()::text = user_id or user_id is not null);
    end if;
end $$;

-- ============================================================================
-- Events Table
-- ============================================================================
create table if not exists public.events (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    event_date timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_events_created_at on public.events(created_at desc);

alter table public.events enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies where schemaname = 'public' and tablename = 'events' and policyname = 'Allow public event read'
    ) then
        create policy "Allow public event read" on public.events
            for select to anon, authenticated
            using (true);
    end if;

    if not exists (
        select 1 from pg_policies where schemaname = 'public' and tablename = 'events' and policyname = 'Allow organizer event management'
    ) then
        create policy "Allow organizer event management" on public.events
            for all to anon, authenticated
            using (true)
            with check (true);
    end if;
end $$;