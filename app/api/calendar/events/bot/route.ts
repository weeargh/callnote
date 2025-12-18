
import { NextResponse } from 'next/server'

// POST /api/calendar/events/bot - Manually spawn a bot for a specific calendar event
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { meeting_url, bot_name, title, start_time, end_time } = body

        if (!meeting_url) {
            return NextResponse.json({ error: 'meeting_url is required' }, { status: 400 })
        }

        // Determine if this is a "future" scheduling request or "join now"
        // Since MeetingBaas V2 doesn't explicitly document "schedule for later" via POST /bots in our search,
        // we will treat this as "Join Now". 
        // Ideally, we'd check if (startTime - now) > 10 mins.
        // For now, we proceed to spawn.

        // Call our internal /api/bots endpoint to centralize logic
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const spawnResponse = await fetch(`${baseUrl}/api/bots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                meeting_url,
                bot_name: bot_name || 'Mekari Callnote',
                title: title || 'Calendar Meeting',
                start_time, // Include for future scheduling
            }),
        })

        if (!spawnResponse.ok) {
            const errorText = await spawnResponse.text()
            return NextResponse.json({
                error: 'Failed to spawn bot',
                details: errorText
            }, { status: spawnResponse.status })
        }

        const data = await spawnResponse.json()
        return NextResponse.json(data)

    } catch (error) {
        console.error('Error in calendar bot route:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE - Stub for unscheduling (if we supported it)
export async function DELETE(request: Request) {
    // Since we don't have a schedule DB, we can't really "unschedule" a future bot 
    // unless we kill an active bot.
    // We'll leave this as not implemented or simple success for UI toggle purposes.
    return NextResponse.json({ success: true, message: 'Unscheduling not fully supported yet' })
}
