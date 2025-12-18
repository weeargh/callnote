import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// MeetingBaas webhook event types
interface MeetingBaasWebhookEvent {
  event: string
  data: {
    bot_id: string
    meeting_url?: string
    mp4_url?: string
    transcript?: TranscriptSegment[]
    duration_seconds?: number
    status?: string
    [key: string]: unknown
  }
}

interface TranscriptSegment {
  speaker: string
  words: Array<{
    word: string
    start: number
    end: number
  }>
  start: number
  end: number
}

// POST /api/webhooks/meetingbaas - Receive events from MeetingBaas
export async function POST(request: Request) {
  try {
    const event: MeetingBaasWebhookEvent = await request.json()

    console.log('Received MeetingBaas webhook:', event.event, event.data.bot_id || event.data.calendar_id || '')

    switch (event.event) {
      case 'bot.joining':
        await handleBotJoining(event.data)
        break

      case 'bot.in_waiting_room':
        await handleBotWaiting(event.data)
        break

      case 'bot.in_call':
        await handleBotInCall(event.data)
        break

      case 'bot.recording':
        await handleBotRecording(event.data)
        break

      case 'bot.done':
      case 'bot.history_available':
        await handleBotDone(event.data)
        break

      case 'bot.error':
        await handleBotError(event.data)
        break

      // Calendar events - trigger auto-join for new meetings
      case 'calendar.sync_events':
      case 'event.added':
      case 'event.updated':
        await handleCalendarEvent(event.data)
        break

      default:
        console.log('Unhandled webhook event:', event.event)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleBotJoining(data: MeetingBaasWebhookEvent['data']) {
  // Create or update meeting record when bot starts joining
  const { error } = await supabase
    .from('meetings')
    .upsert({
      bot_id: data.bot_id,
      meeting_url: data.meeting_url,
      status: 'scheduled',
    }, {
      onConflict: 'bot_id',
    })

  if (error) {
    console.error('Error upserting meeting for bot.joining:', error)
  }
}

async function handleBotWaiting(data: MeetingBaasWebhookEvent['data']) {
  const { error } = await supabase
    .from('meetings')
    .update({ status: 'scheduled' })
    .eq('bot_id', data.bot_id)

  if (error) {
    console.error('Error updating meeting for bot.in_waiting_room:', error)
  }
}

async function handleBotInCall(data: MeetingBaasWebhookEvent['data']) {
  const { error } = await supabase
    .from('meetings')
    .update({
      status: 'recording',
      started_at: new Date().toISOString(),
    })
    .eq('bot_id', data.bot_id)

  if (error) {
    console.error('Error updating meeting for bot.in_call:', error)
  }
}

async function handleBotRecording(data: MeetingBaasWebhookEvent['data']) {
  const { error } = await supabase
    .from('meetings')
    .update({ status: 'recording' })
    .eq('bot_id', data.bot_id)

  if (error) {
    console.error('Error updating meeting for bot.recording:', error)
  }
}

async function handleBotDone(data: MeetingBaasWebhookEvent['data']) {
  // Edge case: Ghost meeting (< 60 seconds) - mark as failed
  if (data.duration_seconds && data.duration_seconds < 60) {
    const { error } = await supabase
      .from('meetings')
      .update({
        status: 'failed',
        duration_seconds: data.duration_seconds,
      })
      .eq('bot_id', data.bot_id)

    if (error) {
      console.error('Error updating ghost meeting:', error)
    }
    console.log('Ghost meeting detected (< 60s), marked as failed:', data.bot_id)
    return
  }

  // Process transcript into our format
  let transcriptJson = null
  let transcriptFull = ''

  if (data.transcript && Array.isArray(data.transcript)) {
    transcriptJson = data.transcript.map((segment: TranscriptSegment) => ({
      time: segment.start,
      timeLabel: formatTime(segment.start),
      speaker: segment.speaker,
      text: segment.words.map((w: { word: string }) => w.word).join(' '),
    }))

    transcriptFull = transcriptJson.map(
      (entry: { speaker: string; text: string }) => `${entry.speaker}: ${entry.text}`
    ).join('\n')
  }

  // Update meeting with audio and transcript
  const { error: updateError } = await supabase
    .from('meetings')
    .update({
      status: 'processing',
      audio_url: data.mp4_url,
      duration_seconds: data.duration_seconds,
      transcript_json: transcriptJson,
      transcript_full: transcriptFull,
    })
    .eq('bot_id', data.bot_id)

  if (updateError) {
    console.error('Error updating meeting for bot.done:', updateError)
    return
  }

  // Trigger intelligence processing (Fire and forget to avoid webhook timeout)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  fetch(`${baseUrl}/api/process-intelligence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bot_id: data.bot_id }),
  }).catch(err => console.error('Error triggering intelligence processing:', err))
}

async function handleBotError(data: MeetingBaasWebhookEvent['data']) {
  const { error } = await supabase
    .from('meetings')
    .update({ status: 'failed' })
    .eq('bot_id', data.bot_id)

  if (error) {
    console.error('Error updating meeting for bot.error:', error)
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Handle calendar events - trigger auto-join for new meetings
async function handleCalendarEvent(data: MeetingBaasWebhookEvent['data']) {
  const calendarId = data.calendar_id as string
  const eventData = data.event as { series_id?: string; meeting_url?: string; title?: string } | undefined

  if (!calendarId) {
    console.log('Calendar event received but no calendar_id')
    return
  }

  console.log('📅 Calendar event received for calendar:', calendarId)

  // If we have specific event data with a meeting URL, create a bot for it directly
  if (eventData?.series_id && eventData?.meeting_url) {
    const MEETINGBAAS_API_KEY = process.env.MEETINGBAAS_API_KEY
    if (!MEETINGBAAS_API_KEY) return

    try {
      const createBotUrl = `https://api.meetingbaas.com/v2/calendars/${calendarId}/bots`
      const botPayload = {
        series_id: eventData.series_id,
        bot_name: 'Mekari Callnote',
        recording_mode: 'speaker_view',
        entry_message: 'Mekari Callnote is joining to record this meeting.',
        all_occurrences: true,
        deduplication_id: `calendar-${eventData.series_id}`,
        allow_multiple_bots: false,
        transcription_enabled: true,
        transcription_config: {
          provider: 'gladia',
          diarization: true,
        },
        automatic_leave: {
          waiting_room_timeout: 300,
          noone_joined_timeout: 300,
          everyone_left_timeout: 60,
        },
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://callnote.vercel.app'}/api/webhooks/meetingbaas`
      }

      const res = await fetch(createBotUrl, {
        method: 'POST',
        headers: {
          'x-meeting-baas-api-key': MEETINGBAAS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(botPayload)
      })

      if (res.ok) {
        console.log('✅ Auto-join enabled for new event:', eventData.title || eventData.series_id)
      } else {
        const errorText = await res.text()
        console.log('⚠️ Could not enable auto-join (may already exist):', errorText)
      }
    } catch (err) {
      console.error('Error creating calendar bot:', err)
    }
  } else {
    // Fire-and-forget: trigger full auto-join refresh for the calendar
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/calendar/auto-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendar_id: calendarId })
    }).catch(err => console.error('Error triggering auto-join refresh:', err))

    console.log('🔄 Triggered auto-join refresh for calendar:', calendarId)
  }
}
