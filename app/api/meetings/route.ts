import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/meetings - List all meetings for dashboard
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('meetings')
      .select(`
        id,
        bot_id,
        title,
        meeting_url,
        started_at,
        duration_seconds,
        participant_count,
        status,
        created_at,
        speaker_stats (
          speaker_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: meetings, error } = await query

    if (error) {
      console.error('Error fetching meetings:', error)
      return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
    }

    // Transform data for frontend
    const transformedMeetings = meetings?.map(meeting => ({
      id: meeting.id,
      bot_id: meeting.bot_id,
      title: meeting.title || 'Untitled Meeting',
      meeting_url: meeting.meeting_url,
      date: meeting.started_at,
      duration_seconds: meeting.duration_seconds,
      participant_count: meeting.participant_count,
      status: meeting.status,
      participants: meeting.speaker_stats?.map((s: { speaker_name: string | null }) => s.speaker_name).filter(Boolean) || [],
      created_at: meeting.created_at,
    }))

    return NextResponse.json(transformedMeetings)
  } catch (error) {
    console.error('Error in GET /api/meetings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/meetings - Create a new meeting (for manual creation or testing)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        bot_id: body.bot_id,
        title: body.title,
        meeting_url: body.meeting_url,
        started_at: body.started_at,
        status: body.status || 'scheduled',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating meeting:', error)
      return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
    }

    return NextResponse.json(meeting, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/meetings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
