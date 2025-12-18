import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const MEETINGBAAS_API_URL = 'https://api.meetingbaas.com/v2/bots'

// POST /api/bots - Spawn a new bot to join a meeting
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { meeting_url, bot_name = 'Mekari Callnote', title } = body

    if (!meeting_url) {
      return NextResponse.json({ error: 'meeting_url is required' }, { status: 400 })
    }

    const apiKey = process.env.MEETINGBAAS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'MEETINGBAAS_API_KEY not configured' }, { status: 500 })
    }

    const gladiaKey = process.env.GLADIA_API_KEY

    // Get the webhook URL for callbacks
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/meetingbaas`
      : null

    console.log('=== Spawning MeetingBaas Bot ===')
    console.log('Meeting URL:', meeting_url)
    console.log('Bot Name:', bot_name)

    // Build request body
    const requestBody: Record<string, unknown> = {
      meeting_url,
      bot_name,
      deduplication_id: meeting_url, // Use meeting URL as deduplication key
      allow_multiple_bots: false, // Prevent multiple bots in the same meeting
      recording_mode: 'speaker_view',
      entry_message: 'Mekari Callnote is joining to record this meeting.',
      reserved: false,
      automatic_leave: {
        waiting_room_timeout: 300, // 5 minutes waiting room
        noone_joined_timeout: 300, // 5 minutes no one joined
        everyone_left_timeout: 60, // 1 minute after everyone leaves (slightly increased from 10s to avoid false positives)
      },
    }

    // Enable transcription by default
    requestBody.transcription_enabled = true
    requestBody.transcription_config = {
      provider: 'gladia',
    }

    // Only add BYOK key if explicitly configured AND plan supports it.
    // Currently disabled to prevent "FST_ERR_BYOK_TRANSCRIPTION_NOT_ENABLED_ON_PLAN" error
    // on plans that don't support BYOK.
    // if (gladiaKey) {
    //   (requestBody.transcription_config as any).api_key = gladiaKey
    // }

    // Add webhook if URL available
    if (webhookUrl) {
      requestBody.webhook_url = webhookUrl
    }

    // console.log('Request body:', JSON.stringify(requestBody, null, 2))

    // Make API call to MeetingBaas
    const response = await fetch(MEETINGBAAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-meeting-baas-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    // console.log(`MeetingBaas Response Status: ${response.status}`)
    // console.log(`MeetingBaas Response Body: ${responseText}`)

    if (!response.ok) {
      console.error('MeetingBaas API error:', response.status, responseText)
      return NextResponse.json({
        error: 'MeetingBaas API error',
        details: responseText || `HTTP ${response.status}`,
        status: response.status,
        hint: 'Please verify your MEETINGBAAS_API_KEY is valid at https://meetingbaas.com/dashboard',
      }, { status: response.status })
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      console.error('Failed to parse response as JSON:', responseText)
      return NextResponse.json({
        error: 'Invalid response from MeetingBaas',
        details: responseText
      }, { status: 500 })
    }

    // MeetingBaas v2 returns { success: true, data: { bot_id: "..." } }
    const botId = data.data?.bot_id

    console.log('SUCCESS! Bot spawned with ID:', botId)

    // Create meeting record in database
    const { data: meeting, error: dbError } = await supabase
      .from('meetings')
      .insert({
        bot_id: botId,
        meeting_url,
        title: title || 'New Meeting',
        status: 'scheduled',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
    }

    return NextResponse.json({
      success: true,
      bot_id: botId,
      meeting_id: meeting?.id,
      message: 'Bot is joining the meeting!',
    })

  } catch (error) {
    console.error('Error in POST /api/bots:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/bots - List active bots
export async function GET() {
  try {
    const apiKey = process.env.MEETINGBAAS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'MEETINGBAAS_API_KEY not configured' }, { status: 500 })
    }

    const response = await fetch(MEETINGBAAS_API_URL, {
      method: 'GET',
      headers: {
        'x-meeting-baas-api-key': apiKey,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({
        error: 'Failed to fetch bots',
        status: response.status,
        details: text
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/bots:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
