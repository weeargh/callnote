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

    console.log('Received MeetingBaas webhook:', event.event, event.data.bot_id)

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

      case 'event.added':
      case 'event.updated':
        await handleCalendarEventAdded(event.data)
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

async function handleCalendarEventAdded(data: any) {
  try {
    console.log('📅 Calendar Event Payload:', data.summary || data.title)

    // Extract meeting URL and Time
    const meetingUrl = data.meeting_url || data.hangoutLink || data.location
    // MeetingBaas webhook payload usually has 'start' object
    const startTime = data.start?.dateTime || data.start_time

    if (!meetingUrl) {
      console.log('⚠️ No meeting URL found in event, skipping auto-join.')
      return
    }

    // For updates, we might want to check if it's already scheduled?
    // Our /api/bots route handles deduplication via `deduplication_id: meeting_url`.
    // So safe to retry.

    console.log('🤖 Auto-Scheduling Bot for:', meetingUrl, 'at', startTime)

    // Call our internal API to schedule the bot
    // We use the internal API to leverage the standardized logic (deduplication, config, etc)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meeting_url: meetingUrl,
        bot_name: 'Mekari Callnote (Auto)',
        title: data.summary || data.title || 'Auto-Joined Meeting',
        start_time: startTime
      })
    })

    if (res.ok) {
      console.log('✅ Bot successfully scheduled via Auto-Join webhook')
    } else {
      const err = await res.text()
      console.error('❌ Failed to schedule auto-join bot:', err)
    }

  } catch (e) {
    console.error('Error in handleCalendarEventAdded:', e)
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
