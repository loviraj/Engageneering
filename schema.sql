-- ══════════════════════════════════════════════════════
-- ENGAGENEERING™ — SUPABASE DATABASE SCHEMA
-- Run each block in SQL Editor, one at a time
-- ══════════════════════════════════════════════════════

-- ── BLOCK 1: EXTENSIONS ──────────────────────────────
create extension if not exists "uuid-ossp";

-- ── BLOCK 2: PROFILES ────────────────────────────────
-- Core user profile, linked to Supabase auth.users
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  bio           text,
  joined_at     timestamptz default now(),
  last_active   timestamptz default now(),
  status        text default 'active' check (status in ('active','suspended','deactivated')),
  is_institution boolean default false,
  org_name      text,
  org_domain    text
);

-- ── BLOCK 3: PROFILE ROLES ───────────────────────────
-- Roles and tier state per user
create table profile_roles (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references profiles(id) on delete cascade,
  role             text not null check (role in ('seeker','answerer','both','institution')),
  seeker_tier      int default 1 check (seeker_tier between 1 and 6),
  answerer_tier    int default 1 check (answerer_tier between 1 and 6),
  expertise_tags   text[] default '{}',
  pts_total        int default 0,
  seeker_pts       int default 0,
  answerer_pts     int default 0,
  is_engageneer    boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(user_id)
);

-- ── BLOCK 4: QUESTIONS ───────────────────────────────
create table questions (
  id              uuid primary key default uuid_generate_v4(),
  asker_id        uuid references profiles(id) on delete set null,
  text            text not null,
  tags            text[] default '{}',
  quality_score   int check (quality_score between 0 and 100),
  gatekeeper_verdict text default 'pending' check (gatekeeper_verdict in ('pending','approved','revise','rejected')),
  gatekeeper_reason  text,
  status          text default 'pending' check (status in ('pending','published','closed','removed')),
  views           int default 0,
  answer_count    int default 0,
  bounty_pts      int default 0,
  matched_uids    uuid[] default '{}',
  created_at      timestamptz default now(),
  published_at    timestamptz
);

-- ── BLOCK 5: ANSWERS ─────────────────────────────────
create table answers (
  id              uuid primary key default uuid_generate_v4(),
  question_id     uuid references questions(id) on delete cascade,
  answerer_id     uuid references profiles(id) on delete set null,
  text            text not null,
  -- Six atomic index scores
  ei_score        int check (ei_score between 0 and 100),
  ri_score        int check (ri_score between 0 and 100),
  rai_score       int check (rai_score between 0 and 100),
  coi_score       int check (coi_score between 0 and 100),
  ai_score        int check (ai_score between 0 and 100),
  integrity_pass  boolean default true,
  integrity_note  text,
  -- Grade computation
  ag              int check (ag between 0 and 100),
  pg              int check (pg between 0 and 100),
  pg_justification text,
  pg_reviewer_id  uuid references profiles(id) on delete set null,
  cds             int check (cds between 0 and 100),
  divergence_flag boolean default false,
  -- Status
  status          text default 'pending' check (status in ('pending','published','flagged','suspended','removed')),
  is_best_answer  boolean default false,
  created_at      timestamptz default now(),
  scored_at       timestamptz
);

-- ── BLOCK 6: SCORE HISTORY ───────────────────────────
-- Every scored action appended here — the Tier Engine reads this
create table score_history (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete cascade,
  action_type   text not null check (action_type in ('question','answer')),
  ref_id        uuid not null,   -- question_id or answer_id
  -- Index scores (null for question actions)
  ei            int,
  ri            int,
  rai           int,
  coi           int,
  ai            int,
  ag            int,
  pg            int,
  cds           int,
  -- Question quality score (null for answer actions)
  quality_score int,
  pts_awarded   int default 0,
  created_at    timestamptz default now()
);

-- ── BLOCK 7: TIER EVENTS ─────────────────────────────
-- Immutable audit trail of every tier change
create table tier_events (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete cascade,
  track         text not null check (track in ('seeker','answerer','engageneer')),
  from_tier     int not null,
  to_tier       int not null,
  direction     text not null check (direction in ('promotion','demotion','award')),
  evidence      jsonb,           -- snapshot of metrics that triggered the change
  triggered_by  text default 'tier_engine',
  created_at    timestamptz default now()
);

-- ── BLOCK 8: INSIGHT REPORTS ─────────────────────────
-- Weekly Insight Narrator output per user
create table insight_reports (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles(id) on delete cascade,
  week_of         date not null,
  strengths       text,
  growth_edge     text,
  next_action     text,
  index_delta     jsonb,         -- EI/RI/RAI/COI/AI change vs prior week
  tier_gap        text,          -- what's needed to reach next tier
  full_report     text,          -- Insight Narrator narrative text
  delivered       boolean default false,
  created_at      timestamptz default now(),
  unique(user_id, week_of)
);

-- ── BLOCK 9: NOTIFICATIONS ───────────────────────────
create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references profiles(id) on delete cascade,
  type        text not null,     -- 'tier_promotion','matched','cds_ready','insight_ready'
  title       text not null,
  body        text,
  ref_id      uuid,              -- related question/answer/tier_event id
  read        boolean default false,
  created_at  timestamptz default now()
);

-- ══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — run as BLOCK 10
-- ══════════════════════════════════════════════════════

alter table profiles         enable row level security;
alter table profile_roles    enable row level security;
alter table questions        enable row level security;
alter table answers          enable row level security;
alter table score_history    enable row level security;
alter table tier_events      enable row level security;
alter table insight_reports  enable row level security;
alter table notifications    enable row level security;

-- Profiles: users read own, update own; everyone can read display_name+avatar
create policy "profiles: public read"
  on profiles for select using (true);
create policy "profiles: owner update"
  on profiles for update using (auth.uid() = id);

-- Profile roles: owner read/update
create policy "profile_roles: owner read"
  on profile_roles for select using (auth.uid() = user_id);
create policy "profile_roles: owner update"
  on profile_roles for update using (auth.uid() = user_id);
create policy "profile_roles: insert own"
  on profile_roles for insert with check (auth.uid() = user_id);

-- Questions: published questions readable by all; owner can insert/update own
create policy "questions: public read published"
  on questions for select using (status = 'published' or auth.uid() = asker_id);
create policy "questions: owner insert"
  on questions for insert with check (auth.uid() = asker_id);
create policy "questions: owner update"
  on questions for update using (auth.uid() = asker_id);

-- Answers: published answers readable by all; owner insert/update
create policy "answers: public read published"
  on answers for select using (status = 'published' or auth.uid() = answerer_id);
create policy "answers: owner insert"
  on answers for insert with check (auth.uid() = answerer_id);
create policy "answers: owner update"
  on answers for update using (auth.uid() = answerer_id);

-- Score history: owner read only
create policy "score_history: owner read"
  on score_history for select using (auth.uid() = user_id);
create policy "score_history: insert own"
  on score_history for insert with check (auth.uid() = user_id);

-- Tier events: owner read only
create policy "tier_events: owner read"
  on tier_events for select using (auth.uid() = user_id);

-- Insight reports: owner read only
create policy "insight_reports: owner read"
  on insight_reports for select using (auth.uid() = user_id);

-- Notifications: owner read/update
create policy "notifications: owner read"
  on notifications for select using (auth.uid() = user_id);
create policy "notifications: owner update"
  on notifications for update using (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════
-- HELPER FUNCTION — auto-create profile on signup
-- Run as BLOCK 11
-- ══════════════════════════════════════════════════════

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: fires on every new auth.users row
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ══════════════════════════════════════════════════════
-- LEADERBOARD VIEW — run as BLOCK 12
-- ══════════════════════════════════════════════════════

create or replace view leaderboard as
select
  p.id,
  p.display_name,
  p.avatar_url,
  pr.role,
  pr.seeker_tier,
  pr.answerer_tier,
  pr.pts_total,
  pr.is_engageneer,
  rank() over (order by pr.pts_total desc) as rank
from profiles p
join profile_roles pr on pr.user_id = p.id
where p.status = 'active'
order by pr.pts_total desc;
