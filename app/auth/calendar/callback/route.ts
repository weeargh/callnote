import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const MEETINGBAAS_API_KEY = process.env.MEETINGBAAS_API_KEY

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
        console.error('OAuth error:', error)
        return NextResponse.redirect(`${origin}/?calendar_error=${error}`)
    }

    if (!code) {
        return NextResponse.redirect(`${origin}/?calendar_error=no_code`)
    }

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.redirect(`${origin}/login?error=unauthorized`)
        }

        // Exchange code for tokens
        console.log('🔄 Exchanging authorization code for tokens...')
        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
                client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/calendar/callback`,
                grant_type: 'authorization_code',
            }),
        })

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text()
            console.error('Token exchange failed:', errorText)
            throw new Error('Failed to exchange code for tokens')
        }

        const tokens = await tokenResponse.json()
        console.log('✅ Got tokens, refresh_token present:', !!tokens.refresh_token)

        if (!tokens.refresh_token) {
            throw new Error('No refresh token received')
        }

        // Get list of available calendars
        console.log('📋 Fetching available calendars...')
        const listRawResponse = await fetch('https://api.meetingbaas.com/v2/calendars/list-raw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-meeting-baas-api-key': MEETINGBAAS_API_KEY!,
            },
            body: JSON.stringify({
                provider: 'google',
                oauth_client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
                oauth_client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
                oauth_refresh_token: tokens.refresh_token,
            }),
        })

        if (!listRawResponse.ok) {
            const errorText = await listRawResponse.text()
            console.error('Failed to list calendars:', listRawResponse.status, errorText)
            throw new Error(`Failed to list calendars: ${errorText}`)
        }

        const { data: calendars } = await listRawResponse.json()
        console.log(`📅 Found ${calendars?.length || 0} calendars`)

        if (!calendars || calendars.length === 0) {
            throw new Error('No calendars found')
        }

        // Use primary calendar (or first one)
        const primaryCalendar = calendars.find((cal: any) => cal.primary) || calendars[0]
        console.log('✅ Using calendar:', primaryCalendar.summary)

        // Create calendar connection in MeetingBaas
        console.log('🔗 Creating calendar connection in MeetingBaas...')
        const createCalendarResponse = await fetch('https://api.meetingbaas.com/v2/calendars', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-meeting-baas-api-key': MEETINGBAAS_API_KEY!,
            },
            body: JSON.stringify({
                provider: 'google',
                oauth_client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
                oauth_client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
                oauth_refresh_token: tokens.refresh_token,
                raw_calendar_id: primaryCalendar.id,
            }),
        })

        if (!createCalendarResponse.ok) {
            const errorText = await createCalendarResponse.text()
            console.error('Failed to create calendar connection:', errorText)
            throw new Error('Failed to create calendar connection')
        }

        const { data: calendarConnection } = await createCalendarResponse.json()
        console.log('✅ Calendar connected! ID:', calendarConnection.id)

        // Redirect back to dashboard with success
        return NextResponse.redirect(`${origin}/?calendar_connected=true`)

    } catch (error) {
        console.error('Calendar OAuth callback error:', error)
        return NextResponse.redirect(`${origin}/?calendar_error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`)
    }
}
