import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on schema
export interface User {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  calendar_sync_token: string | null
}

export interface Meeting {
  id: string
  user_id: string | null
  bot_id: string
  title: string | null
  meeting_url: string | null
  started_at: string | null
  duration_seconds: number | null
  participant_count: number | null
  status: 'scheduled' | 'recording' | 'processing' | 'ready' | 'failed'
  audio_url: string | null
  transcript_full: string | null
  transcript_json: TranscriptEntry[] | null
  summary_overview: string | null
  language_stats: { en: number; id: number } | null
  created_at: string
}

export interface MeetingSegment {
  id: string
  meeting_id: string
  topic: string | null
  start_time: number
  end_time: number
  type: 'discussion' | 'decision' | 'issue' | 'question'
}

export interface ActionItem {
  id: string
  meeting_id: string
  task: string | null
  assignee: string | null
  priority: 'High' | 'Medium' | 'Low' | null
  timestamp_ref: string | null
  is_completed: boolean
}

export interface SpeakerStat {
  id: string
  meeting_id: string
  speaker_label: string | null
  speaker_name: string | null
  talk_time_seconds: number | null
  contribution_pct: number | null
}

export interface TranscriptEntry {
  time: number
  timeLabel: string
  speaker: string
  text: string
}

// Full meeting with relations
export interface MeetingWithDetails extends Meeting {
  segments: MeetingSegment[]
  action_items: ActionItem[]
  speaker_stats: SpeakerStat[]
}
