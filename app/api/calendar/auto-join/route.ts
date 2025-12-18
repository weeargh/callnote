import { NextResponse } from 'next/server'

const MEETINGBAAS_API_KEY = process.env.MEETINGBAAS_API_KEY

/**
 * POST /api/calendar/auto-join
 * Enable auto-join for all events in a calendar by creating calendar bots for each event series.
 * 
 * Body: { calendar_id: string }
 */
export async function POST(request: Request) {
    try {
        const { calendar_id } = await request.json()

        if (!calendar_id) {
            return NextResponse.json({ error: 'calendar_id is required' }, { status: 400 })
        }

        if (!MEETINGBAAS_API_KEY) {
            return NextResponse.json({ error: 'MEETINGBAAS_API_KEY not configured' }, { status: 500 })
        }

        console.log('🤖 Enabling auto-join for calendar:', calendar_id)

        // 1. Fetch all event series from the calendar
        const eventsUrl = `https://api.meetingbaas.com/v2/calendars/${calendar_id}/events?limit=100`
        const eventsRes = await fetch(eventsUrl, {
            headers: { 'x-meeting-baas-api-key': MEETINGBAAS_API_KEY }
        })

        if (!eventsRes.ok) {
            const errorText = await eventsRes.text()
            console.error('Failed to fetch events:', errorText)
            return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 })
        }

        const eventsData = await eventsRes.json()
        const events = eventsData.data || eventsData || []

        // 2. Get unique series_ids from events that have meeting URLs
        const seriesMap = new Map<string, { title: string; meeting_url: string }>()
        for (const event of events) {
            if (event.series_id && event.meeting_url) {
                if (!seriesMap.has(event.series_id)) {
                    seriesMap.set(event.series_id, {
                        title: event.title || event.summary || 'Meeting',
                        meeting_url: event.meeting_url
                    })
                }
            }
        }

        console.log(`📋 Found ${seriesMap.size} unique event series with meeting URLs`)

        // 3. Create calendar bot for each series
        const createBotUrl = `https://api.meetingbaas.com/v2/calendars/${calendar_id}/bots`
        const results: { series_id: string; success: boolean; error?: string }[] = []

        for (const [series_id, info] of seriesMap) {
            try {
                const botPayload = {
                    series_id,
                    bot_name: 'Mekari Callnote',
                    recording_mode: 'speaker_view',
                    entry_message: 'Mekari Callnote is joining to record this meeting.',
                    all_occurrences: true,
                    // Enable transcription with speaker diarization
                    transcription_config: {
                        provider: 'gladia',
                        diarization: true
                    }
                }

                const res = await fetch(createBotUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-meeting-baas-api-key': MEETINGBAAS_API_KEY
                    },
                    body: JSON.stringify(botPayload)
                })

                if (res.ok) {
                    console.log(`✅ Auto-join enabled for series: ${series_id} (${info.title})`)
                    results.push({ series_id, success: true })
                } else {
                    const errorText = await res.text()
                    console.error(`❌ Failed for series ${series_id}:`, errorText)
                    results.push({ series_id, success: false, error: errorText })
                }
            } catch (err) {
                console.error(`❌ Error for series ${series_id}:`, err)
                results.push({ series_id, success: false, error: String(err) })
            }
        }

        const successCount = results.filter(r => r.success).length
        console.log(`🎉 Auto-join enabled for ${successCount}/${seriesMap.size} event series`)

        return NextResponse.json({
            success: true,
            message: `Auto-join enabled for ${successCount} event series`,
            results
        })

    } catch (error) {
        console.error('Error in auto-join route:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
