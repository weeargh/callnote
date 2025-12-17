This is the **Master Design Document** for **Mekari Call (v2.0)**. It synthesizes your new UI requirements, the MeetingBaas architecture, and the "Indonesian B2B" context into a single executable blueprint.

---

# **1. Product Specification**

**Product Name:** Mekari Call
**Version:** 2.0 (Intelligence Platform)
**Target Audience:** Indonesian B2B Professionals (Managers, Sales, Product).
**Core Value:** Turns mixed-language meetings (Indo/Eng) into structured data (Action Items, Decisions, Timelines).

### **Feature Requirements (Mapped to UI)**

| Feature Module | UI Component | Functionality |
| --- | --- | --- |
| **Bot Management** | Dashboard List | "Good morning, Budi." Shows upcoming & recent meetings with status (`Processing`, `Ready`). |
| **Smart Timeline** | Detail View (Bottom) | Color-coded progress bar dividing the meeting into chapters (e.g., "Discussion" vs "Decision"). |
| **Speaker Insights** | Detail View (Middle) | Visualization of who spoke the most ("Budi 45%"). |
| **Action Extraction** | Detail View (Top) | Checkboxes with **Assignee** (`@Siti`), **Priority** (`High`), and **Due Date**. |
| **Transcript** | Detail View (Bottom) | Read-along text with a "Mixed Language" badge (e.g., "62% EN / 38% ID"). |

---

# **2. Architecture Diagram**

### **Data Flow**

1. **Capture:** `MeetingBaas` joins the call → Streams audio to `Gladia` (configured for Indo/Eng).
2. **Ingest:** `Gladia` sends JSON Transcript → `MeetingBaas` → **Your Webhook**.
3. **Process:** Your Backend sends Transcript to `OpenAI` → Returns "Intelligence JSON".
4. **Store:** Data saved to `Supabase` (PostgreSQL).
5. **Serve:** User views Dashboard → Fetches from `Supabase`.

---

# **3. Database Schema (Supabase/PostgreSQL)**

Run this SQL in your Supabase SQL Editor. It covers every element visible in your UI drafts.

```sql
-- 1. USERS (Managed by Supabase Auth, but extended here)
create table public.users (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  calendar_sync_token text -- To sync Google Calendar later
);

-- 2. MEETINGS (The Core Record)
create table public.meetings (
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
  status text default 'processing', -- 'scheduled', 'recording', 'processing', 'ready'
  
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
create table public.meeting_segments (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade,
  topic text,       -- "Q3 Performance Review"
  start_time int,   -- Seconds (e.g., 0)
  end_time int,     -- Seconds (e.g., 900)
  type text         -- 'discussion' (Blue), 'decision' (Green), 'issue' (Red)
);

-- 4. ACTION_ITEMS (For the "Checklist" Card)
create table public.action_items (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade,
  task text,
  assignee text,    -- "Rizky"
  priority text,    -- "High", "Medium", "Low"
  timestamp_ref text, -- "01:45"
  is_completed boolean default false
);

-- 5. SPEAKER_STATS (For the "Contribution" Bar Chart)
create table public.speaker_stats (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade,
  speaker_label text, -- "Speaker A" (Initial)
  speaker_name text,  -- "Budi" (After user renames)
  talk_time_seconds int,
  contribution_pct int -- 45
);

```

---

# **4. API Documentation (Internal)**

These are the routes your Next.js Frontend will call.

### **POST /api/webhooks/meetingbaas**

* **Purpose:** The listener. Receives data from the bot.
* **Logic:**
1. Receives `bot.history_available`.
2. Extracts `transcript` and `mp4_url`.
3. Updates `meetings` table.
4. **Triggers:** `process_intelligence()` (The OpenAI function).



### **GET /api/meetings**

* **Purpose:** Populates the Dashboard.
* **Response:**
```json
[
  {
    "id": "...",
    "title": "Weekly Sync - Q3",
    "date": "2025-12-17T10:00:00Z",
    "status": "ready",
    "participants": ["Budi", "Siti"]
  }
]

```



### **GET /api/meetings/:id**

* **Purpose:** Populates the Detail View.
* **Response:** Returns nested JSON including `segments`, `action_items`, and `speaker_stats`.

---

# **5. The "Intelligence" Logic (OpenAI)**

This is the most critical part. You must prompt GPT-4o to return the exact JSON structure your UI needs.

**The Prompt:**

> "You are a Secretary for an Indonesian B2B tech company. Analyze this mixed-language transcript.
> **Input:** [TRANSCRIPT TEXT]
> **Task:**
> 1. **Summarize:** Create a brief executive summary.
> 2. **Analyze Speakers:** Identify who spoke (Speaker A, B, etc.) and guess their names if mentioned.
> 3. **Timeline:** Divide the meeting into 3-5 distinct chapters (topics).
> 4. **Actions:** Extract tasks. Assign a priority (High/Medium/Low).
> 
> 
> **Output format (Strict JSON):**
> ```json
> {
>   "summary": "...",
>   "language_stats": {"en_percent": 60, "id_percent": 40},
>   "segments": [
>     {"topic": "Q3 Review", "start_sec": 0, "end_sec": 600, "type": "discussion"}
>   ],
>   "action_items": [
>     {"task": "Fix API Latency", "assignee": "Rizky", "priority": "High", "timestamp": "01:45"}
>   ]
> }
> 
> ```
> 
> 

---

# **6. External API Configuration**

### **MeetingBaas + Gladia Config**

Use this payload when spawning the bot to ensure you get the data needed for the **Speaker Insights** graph.

```json
{
  "meeting_url": "...",
  "bot_name": "Mekari Call",
  "speech_to_text": {
    "provider": "gladia",
    "api_key": "YOUR_GLADIA_KEY", 
    "config": {
      "diarization": true, // CRITICAL: Enables "Speaker A/B" detection
      "language_behaviour": "automatic single language", 
      "model": "enhanced"
    }
  }
}

```

---

# **7. Airtight Edge Cases (The "Gotchas")**

1. **"Who is Speaker A?"**
* *Problem:* The bot doesn't know "Speaker A" is "Budi".
* *Solution:* On the UI, next to "Speaker A", add a small **pencil icon**. When clicked, allow the user to rename "Speaker A" to "Budi". Update the `speaker_stats` table. Future transcripts won't learn this automatically (privacy), but the current report will look correct.


2. **The "Ghost" Meeting**
* *Problem:* A meeting under 60 seconds (user kicked the bot).
* *Fix:* In your webhook, `if duration < 60s`, set status to `failed` and do not bill the user / do not run OpenAI (save money).


3. **Indonesian Slang Hallucination**
* *Problem:* GPT-4o might translate "Kita butuh cuan" literally.
* *Fix:* Add to the System Prompt: *"Interpret Indonesian corporate slang (Cuan, Blocker, Follow-up) in a professional business context."*
