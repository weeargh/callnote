import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PATCH /api/speaker-stats/[id] - Update speaker stat (rename speaker)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data: speakerStat, error } = await supabase
      .from('speaker_stats')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating speaker stat:', error)
      return NextResponse.json({ error: 'Failed to update speaker' }, { status: 500 })
    }

    return NextResponse.json(speakerStat)
  } catch (error) {
    console.error('Error in PATCH /api/speaker-stats/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
