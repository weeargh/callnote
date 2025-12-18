import { NextResponse } from 'next/server'

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

        const calendarId = calendars[0].id
        console.log('✅ Using calendar ID:', calendarId)

        // 2. Fetch Events for next 3 days
        const now = new Date()
        const endDate = new Date(now)
        endDate.setDate(now.getDate() + 3)

        console.log('📅 Fetching events from', now.toISOString(), 'to', endDate.toISOString())

        const eventsUrl = new URL(`https://api.meetingbaas.com/v2/calendars/${calendarId}/events`)
        eventsUrl.searchParams.set('start_time', now.toISOString())
        eventsUrl.searchParams.set('end_time', endDate.toISOString())
        eventsUrl.searchParams.set('limit', '10')

        console.log('🔗 Events URL:', eventsUrl.toString())

        const eventsRes = await fetch(eventsUrl.toString(), {
            headers: { 'x-meeting-baas-api-key': MEETINGBAAS_API_KEY }
        })

        if (!eventsRes.ok) {
            const errorText = await eventsRes.text()
            console.error('❌ Failed to fetch events:', eventsRes.status, errorText)
            throw new Error(`Failed to fetch events: ${eventsRes.status}`)
        }

        const eventsData = await eventsRes.json()
        console.log('📊 Events response:', JSON.stringify(eventsData, null, 2))

        const events = eventsData.data || eventsData
        console.log(`✅ Found ${events?.length || 0} events`)

        return NextResponse.json({ events })

    } catch (error) {
        console.error('Calendar Proxy Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
