import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/meetings/[id] - Get meeting detail with all nested data
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch meeting with all related data
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        *,
        meeting_segments (*),
        action_items (*),
        speaker_stats (*)
      `)
      .eq('id', id)
      .single()

    if (meetingError) {
      if (meetingError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
      }
      console.error('Error fetching meeting:', meetingError)
      return NextResponse.json({ error: 'Failed to fetch meeting' }, { status: 500 })
    }

    // Transform transcript_json for frontend consumption
    const transformedMeeting = {
      ...meeting,
      segments: meeting.meeting_segments || [],
      action_items: meeting.action_items || [],
      speaker_stats: meeting.speaker_stats || [],
      // Remove nested relations from root
      meeting_segments: undefined,
    }

    return NextResponse.json(transformedMeeting)
  } catch (error) {
    console.error('Error in GET /api/meetings/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/meetings/[id] - Update meeting (e.g., mark as complete, update title)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data: meeting, error } = await supabase
      .from('meetings')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating meeting:', error)
      return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
    }

    return NextResponse.json(meeting)
  } catch (error) {
    console.error('Error in PATCH /api/meetings/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/meetings/[id] - Delete meeting and all related data
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting meeting:', error)
      return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/meetings/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
