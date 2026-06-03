-- ══════════════════════════════════════════════════════════════════
-- ENGAGENEERING™ — CLUSTER MEMBERS & CLUSTERS RLS FIX
-- Run this entire script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tbqnkcjftxfbxujxsqkj/sql
-- ══════════════════════════════════════════════════════════════════

-- ── STEP 1: DYNAMICALLY DROP ALL EXISTING POLICIES TO PREVENT CONFLICTS ──
do $$
declare
  pol record;
begin
  for pol in 
    select policyname, tablename 
    from pg_policies 
    where schemaname = 'public' 
      and tablename in ('cluster_members', 'clusters')
  loop
    execute format('drop policy if exists %I on %I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- ── STEP 2: CONFIGURE CLUSTERS TABLE RLS ────────────────────────────
alter table clusters enable row level security;

-- Public read for all active or default clusters
create policy "clusters: public read"
  on clusters for select
  using (true);

-- Only service role / admin can write/modify clusters
create policy "clusters: admin all"
  on clusters for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


-- ── STEP 3: CONFIGURE CLUSTER_MEMBERS TABLE RLS ─────────────────────
alter table cluster_members enable row level security;

-- Public read for memberships (ELIMINATES the recursive loop)
create policy "cluster_members: public select"
  on cluster_members for select
  using (true);

-- Authenticated users can join a cluster (insert their own row)
create policy "cluster_members: insert own"
  on cluster_members for insert
  with check (auth.uid() = user_id);

-- Users can update or leave their own memberships
create policy "cluster_members: update own"
  on cluster_members for update
  using (auth.uid() = user_id);

create policy "cluster_members: delete own"
  on cluster_members for delete
  using (auth.uid() = user_id);

-- ── STEP 4: VERIFY POLICIES APPLIED SUCCESSFULLY ────────────────────
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' 
  and tablename in ('cluster_members', 'clusters')
order by tablename, cmd;
