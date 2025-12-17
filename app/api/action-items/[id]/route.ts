import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PATCH /api/action-items/[id] - Update action item (toggle complete, update task, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data: actionItem, error } = await supabase
      .from('action_items')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating action item:', error)
      return NextResponse.json({ error: 'Failed to update action item' }, { status: 500 })
    }

    return NextResponse.json(actionItem)
  } catch (error) {
    console.error('Error in PATCH /api/action-items/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/action-items/[id] - Delete action item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase
      .from('action_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting action item:', error)
      return NextResponse.json({ error: 'Failed to delete action item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/action-items/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
