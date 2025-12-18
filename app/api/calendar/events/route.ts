import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MEETINGBAAS_API_KEY = process.env.MEETINGBAAS_API_KEY

export async function GET(request: Request) {
    if (!MEETINGBAAS_API_KEY) {
        return NextResponse.json({ error: 'Missing API Key' }, { status: 500 })
    }

    try {
        // 1. List Calendars
        console.log('📅 Fetching calendars from MeetingBaas...')
        const calListRes = await fetch('https://api.meetingbaas.com/v2/calendars', {
            headers: { 'x-meeting-baas-api-key': MEETINGBAAS_API_KEY }
        })

        if (!calListRes.ok) {
            const errorText = await calListRes.text()
            console.error('❌ Failed to list calendars:', calListRes.status, errorText)
            return NextResponse.json({ error: `Calendar API error: ${calListRes.status}` }, { status: calListRes.status })
        }

        const calListData = await calListRes.json()
        console.log('📋 Calendar list response:', JSON.stringify(calListData, null, 2))

        const calendars = calListData.data || calListData

        if (!calendars || calendars.length === 0) {
            console.log('⚠️  No calendars found in MeetingBaas account')
            return NextResponse.json({ error: 'No calendars connected' }, { status: 404 })
        }

        const calendarId = calendars[0].calendar_id || calendars[0].id
        console.log('✅ Using calendar ID:', calendarId)

        // 2. Fetch Events for next 3 days
        const now = new Date()
        const endDate = new Date(now)
        endDate.setDate(now.getDate() + 3)

        console.log('📅 Fetching events from', now.toISOString(), 'to', endDate.toISOString())

        const eventsUrl = new URL(`https://api.meetingbaas.com/v2/calendars/${calendarId}/events`)
        eventsUrl.searchParams.set('start_time', now.toISOString())
        eventsUrl.searchParams.set('end_time', endDate.toISOString())
        // Try alternate parameter names just in case
        eventsUrl.searchParams.set('start_date_gte', now.toISOString())
        eventsUrl.searchParams.set('start_date_lte', endDate.toISOString())
        // Limit set to 50 to ensure we fetch enough future events to include today's events if the user has many future meetings.
        // MeetingBaas API might return events sorted by date descending (furthest first), so a small limit might miss near-term events.
        eventsUrl.searchParams.set('limit', '50')


        console.log('🔗 Events URL:', eventsUrl.toString())

        const eventsRes = await fetch(eventsUrl.toString(), {
            headers: { 'x-meeting-baas-api-key': MEETINGBAAS_API_KEY },
            // Disable caching to ensure we always get the latest scheduled meetings,
            // especially important for "just scheduled" meetings.
            cache: 'no-store'
        })

        if (!eventsRes.ok) {
            const errorText = await eventsRes.text()
            console.error('❌ Failed to fetch events:', eventsRes.status, errorText)
            throw new Error(`Failed to fetch events: ${eventsRes.status}`)
        }

        const eventsData = await eventsRes.json()
        // console.log('📊 Events response:', JSON.stringify(eventsData, null, 2))

        let events = eventsData.data || eventsData || []
        console.log(`✅ Found ${events?.length || 0} events`)

        // Sort events by start time ascending (Nearest First).
        // The API may return them in descending order (Furthest First), so we must sort them
        // to correctly display "Upcoming" events in the UI.
        if (Array.isArray(events)) {
            events.sort((a: any, b: any) => {
                const dateA = new Date(a.start_time || a.start?.dateTime || a.start?.date || 0)
                const dateB = new Date(b.start_time || b.start?.dateTime || b.start?.date || 0)
                return dateA.getTime() - dateB.getTime()
            })
        }

        return NextResponse.json({ events })

    } catch (error) {
        console.error('Calendar Proxy Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
