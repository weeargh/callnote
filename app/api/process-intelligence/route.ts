import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// OpenAI Intelligence Response Schema
interface IntelligenceResponse {
  summary: string
  language_stats: {
    en_percent: number
    id_percent: number
  }
  segments: Array<{
    topic: string
    start_sec: number
    end_sec: number
    type: 'discussion' | 'decision' | 'issue' | 'question'
  }>
  action_items: Array<{
    task: string
    assignee: string
    priority: 'High' | 'Medium' | 'Low'
    timestamp: string
  }>
  speaker_stats: Array<{
    speaker: string
    talk_time_percent: number
    contributions: number
  }>
}

const SYSTEM_PROMPT = `You are a Secretary for an Indonesian B2B tech company. Analyze this mixed-language transcript.

**Rules:**
1. **Language:** Output the summary in **English**, but preserve specific Indonesian cultural nuances if untranslatable.
2. **Action Items:** Extract tasks aggressively. Assign a priority (High/Medium/Low).
3. **Context Cleanup:** The transcript may have phonetic errors (e.g., 'Saas' heard as 'Sast'). Use your knowledge of B2B SaaS terms to correct these in the summary.
4. **Indonesian Slang:** Interpret Indonesian corporate slang (Cuan, Blocker, Follow-up) in a professional business context.
5. **Speaker Analysis:** Calculate approximate talk time percentage for each speaker.
6. **Timeline:** Divide the meeting into 3-5 distinct chapters (topics).

**Output format (Strict JSON):**
{
  "summary": "Executive summary of the meeting...",
  "language_stats": {"en_percent": 60, "id_percent": 40},
  "segments": [
    {"topic": "Q3 Review", "start_sec": 0, "end_sec": 600, "type": "discussion"}
  ],
  "action_items": [
    {"task": "Fix API Latency", "assignee": "Rizky", "priority": "High", "timestamp": "01:45"}
  ],
  "speaker_stats": [
    {"speaker": "Speaker A", "talk_time_percent": 45, "contributions": 5}
  ]
}

Only return valid JSON. No markdown, no explanations.`

// POST /api/process-intelligence - Process transcript with OpenAI
export async function POST(request: Request) {
  try {
    const { bot_id } = await request.json()

    if (!bot_id) {
      return NextResponse.json({ error: 'bot_id is required' }, { status: 400 })
    }

    // Fetch the meeting with transcript
    const { data: meeting, error: fetchError } = await supabase
      .from('meetings')
      .select('id, transcript_full, duration_seconds')
      .eq('bot_id', bot_id)
      .single()

    if (fetchError || !meeting) {
      console.error('Error fetching meeting:', fetchError)
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (!meeting.transcript_full) {
      return NextResponse.json({ error: 'No transcript available' }, { status: 400 })
    }

    // Check if OpenAI key is configured
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      console.log('OpenAI key not configured, using mock data')
      await saveMockIntelligence(meeting.id, meeting.duration_seconds || 2700)
      return NextResponse.json({ success: true, mock: true })
    }

    // Call OpenAI API
    const intelligence = await processWithOpenAI(meeting.transcript_full, openaiKey)

    if (!intelligence) {
      console.error('Failed to process with OpenAI')
      // Don't mark meeting as failed just because intelligence failed
      // await supabase
      //   .from('meetings')
      //   .update({ status: 'failed' })
      //   .eq('id', meeting.id)
      return NextResponse.json({ error: 'Intelligence processing failed' }, { status: 500 })
    }

    // Save intelligence data to database
    await saveIntelligence(meeting.id, intelligence, meeting.duration_seconds || 2700)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in process-intelligence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processWithOpenAI(transcript: string, apiKey: string): Promise<IntelligenceResponse | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analyze this transcript:\n\n${transcript}` },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return null
    }

    return JSON.parse(content) as IntelligenceResponse
  } catch (error) {
    console.error('Error calling OpenAI:', error)
    return null
  }
}

async function saveIntelligence(meetingId: string, intelligence: IntelligenceResponse, durationSeconds: number) {
  // Update meeting with summary and language stats
  await supabase
    .from('meetings')
    .update({
      summary_overview: intelligence.summary,
      language_stats: {
        en: intelligence.language_stats.en_percent,
        id: intelligence.language_stats.id_percent,
      },
      status: 'ready',
    })
    .eq('id', meetingId)

  // Insert segments
  if (intelligence.segments.length > 0) {
    const segments = intelligence.segments.map(seg => ({
      meeting_id: meetingId,
      topic: seg.topic,
      start_time: seg.start_sec,
      end_time: seg.end_sec,
      type: seg.type,
    }))

    await supabase.from('meeting_segments').insert(segments)
  }

  // Insert action items
  if (intelligence.action_items.length > 0) {
    const actionItems = intelligence.action_items.map(item => ({
      meeting_id: meetingId,
      task: item.task,
      assignee: item.assignee,
      priority: item.priority,
      timestamp_ref: item.timestamp,
      is_completed: false,
    }))

    await supabase.from('action_items').insert(actionItems)
  }

  // Insert speaker stats
  if (intelligence.speaker_stats.length > 0) {
    const speakerStats = intelligence.speaker_stats.map(stat => ({
      meeting_id: meetingId,
      speaker_label: stat.speaker,
      speaker_name: stat.speaker,
      talk_time_seconds: Math.round((stat.talk_time_percent / 100) * durationSeconds),
      contribution_pct: stat.talk_time_percent,
    }))

    await supabase.from('speaker_stats').insert(speakerStats)
  }
}

async function saveMockIntelligence(meetingId: string, durationSeconds: number) {
  // Mock data for testing without OpenAI key
  await supabase
    .from('meetings')
    .update({
      summary_overview: 'This meeting covered Q3 roadmap planning, including mobile app launch timeline, API performance optimization targets, and payment gateway integration schedules. Key decisions were made regarding OKR targets.',
      language_stats: { en: 62, id: 38 },
      status: 'ready',
    })
    .eq('id', meetingId)

  // Mock segments
  const segments = [
    { meeting_id: meetingId, topic: 'Q3 Performance Review', start_time: 0, end_time: Math.round(durationSeconds * 0.25), type: 'discussion' },
    { meeting_id: meetingId, topic: 'Roadmap Planning', start_time: Math.round(durationSeconds * 0.25), end_time: Math.round(durationSeconds * 0.45), type: 'discussion' },
    { meeting_id: meetingId, topic: 'Mobile App Launch', start_time: Math.round(durationSeconds * 0.45), end_time: Math.round(durationSeconds * 0.65), type: 'decision' },
    { meeting_id: meetingId, topic: 'API Optimization', start_time: Math.round(durationSeconds * 0.65), end_time: Math.round(durationSeconds * 0.85), type: 'decision' },
    { meeting_id: meetingId, topic: 'Payment Integration', start_time: Math.round(durationSeconds * 0.85), end_time: durationSeconds, type: 'question' },
  ]
  await supabase.from('meeting_segments').insert(segments)

  // Mock action items
  const actionItems = [
    { meeting_id: meetingId, task: 'Fix API endpoint response time optimization', assignee: 'Rizky', priority: 'High', timestamp_ref: '01:45', is_completed: false },
    { meeting_id: meetingId, task: 'Deliver mobile app design mockups by next week', assignee: 'Siti', priority: 'High', timestamp_ref: '02:08', is_completed: false },
    { meeting_id: meetingId, task: 'Schedule payment gateway integration kickoff', assignee: 'Rizky', priority: 'Medium', timestamp_ref: '02:40', is_completed: false },
  ]
  await supabase.from('action_items').insert(actionItems)

  // Mock speaker stats
  const speakerStats = [
    { meeting_id: meetingId, speaker_label: 'Speaker A', speaker_name: 'Budi', talk_time_seconds: Math.round(durationSeconds * 0.45), contribution_pct: 45 },
    { meeting_id: meetingId, speaker_label: 'Speaker B', speaker_name: 'Siti', talk_time_seconds: Math.round(durationSeconds * 0.32), contribution_pct: 32 },
    { meeting_id: meetingId, speaker_label: 'Speaker C', speaker_name: 'Alex', talk_time_seconds: Math.round(durationSeconds * 0.23), contribution_pct: 23 },
  ]
  await supabase.from('speaker_stats').insert(speakerStats)
}
