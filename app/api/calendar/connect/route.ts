import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID

    if (!clientId) {
        return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/calendar/callback`

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')

    return NextResponse.redirect(authUrl.toString())
}
