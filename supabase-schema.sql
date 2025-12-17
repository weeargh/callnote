-- Mekari Call v2.0 Database Schema
-- Run this in Supabase SQL Editor

-- 1. USERS (Managed by Supabase Auth, but extended here)
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  calendar_sync_token text -- To sync Google Calendar later
);

-- 2. MEETINGS (The Core Record)
create table if not exists public.meetings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id), -- Owner
  bot_id text unique not null, -- MeetingBaas ID
  
  -- Metadata
  title text,
  meeting_url text,
  started_at timestamp with time zone,
  duration_seconds int,
  participant_count int,
  
  -- UI Status
  status text default 'processing', -- 'scheduled', 'recording', 'processing', 'ready', 'failed'
  
  -- Raw Assets
  audio_url text, -- MP4/MP3 link
  transcript_full text, -- For search indexing
  transcript_json jsonb, -- Raw Gladia output (timestamps for click-to-play)
  
  -- Intelligence (The "Money" Data)
  summary_overview text,
  language_stats jsonb, -- {"en": 62, "id": 38}
  
  created_at timestamp with time zone default now()
);

-- 3. SEGMENTS (For the "Smart Timeline" Bar)
create table if not exists public.meeting_segments (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade,
  topic text,       -- "Q3 Performance Review"
  start_time int,   -- Seconds (e.g., 0)
  end_time int,     -- Seconds (e.g., 900)
  type text         -- 'discussion' (Blue), 'decision' (Green), 'issue' (Red), 'question' (Pink)
);

-- 4. ACTION_ITEMS (For the "Checklist" Card)
create table if not exists public.action_items (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade,
  task text,
  assignee text,    -- "Rizky"
  priority text,    -- "High", "Medium", "Low"
  timestamp_ref text, -- "01:45"
  is_completed boolean default false
);

-- 5. SPEAKER_STATS (For the "Contribution" Bar Chart)
create table if not exists public.speaker_stats (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade,
  speaker_label text, -- "Speaker A" (Initial)
  speaker_name text,  -- "Budi" (After user renames)
  talk_time_seconds int,
  contribution_pct int -- 45
);

-- Indexes for Performance
create index if not exists idx_meetings_bot_id on public.meetings(bot_id);
create index if not exists idx_meetings_user_id on public.meetings(user_id);
create index if not exists idx_meetings_status on public.meetings(status);
create index if not exists idx_action_items_meeting on public.action_items(meeting_id);
create index if not exists idx_segments_meeting on public.meeting_segments(meeting_id);
create index if not exists idx_speaker_stats_meeting on public.speaker_stats(meeting_id);

-- Enable Row Level Security (Optional - for production)
-- alter table public.meetings enable row level security;
-- alter table public.action_items enable row level security;
-- alter table public.meeting_segments enable row level security;
-- alter table public.speaker_stats enable row level security;
