import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/meetings/[id]/sync - Manually fetch latest data from MeetingBaas
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // 1. Get meeting to get the bot_id
        const { data: meeting, error: fetchError } = await supabase
            .from('meetings')
            .select('bot_id')
            .eq('id', id)
            .single()

        if (fetchError || !meeting) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
        }

        if (!meeting.bot_id) {
            return NextResponse.json({ error: 'No bot_id associated with this meeting' }, { status: 400 })
        }

        // 2. Fetch latest data from MeetingBaas API v2
        const apiKey = process.env.MEETINGBAAS_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const response = await fetch(`https://api.meetingbaas.com/v2/bots/${meeting.bot_id}`, {
            method: 'GET',
            headers: {
                'x-meeting-baas-api-key': apiKey,
            },
        })

        if (!response.ok) {
            const text = await response.text()
            return NextResponse.json({
                error: 'Failed to fetch from MeetingBaas',
                details: text
            }, { status: response.status })
        }

        const data = await response.json()
        const botData = data.data

        // 3. Process transcription if available
        let transcriptJson = null
        let transcriptFull = ''
        let rawTranscript = botData.transcript

        // If transcript is a URL (S3), fetch it
        if (!rawTranscript && botData.transcription && botData.transcription.startsWith('http')) {
            try {
                const transcriptResponse = await fetch(botData.transcription)
                if (transcriptResponse.ok) {
                    rawTranscript = await transcriptResponse.json()
                }
            } catch (err) {
                console.error('Failed to fetch transcript from URL:', err)
            }
        }

        // Check for Gladia structure (s3 file)
        let transcriptArray = null
        if (rawTranscript && rawTranscript.result && Array.isArray(rawTranscript.result.utterances)) {
            transcriptArray = rawTranscript.result.utterances
        } else if (Array.isArray(rawTranscript)) {
            transcriptArray = rawTranscript
        }

        if (transcriptArray) {
            // Merge consecutive segments from the same speaker
            const mergedSegments: any[] = []
            let currentSegment: any = null

            for (const segment of transcriptArray) {
                const text = segment.text || segment.words?.map((w: any) => w.word).join(' ') || ''
                const speaker = segment.speaker || 'Speaker'
                const start = segment.start
                const end = segment.end // Assume end time is available, or estimate

                // Logic to decide if we should merge with previous segment
                let shouldMerge = false

                if (currentSegment && currentSegment.speaker === speaker) {
                    const timeDiff = start - (currentSegment.end || currentSegment.time)
                    const textLen = currentSegment.text.length

                    // Merge if:
                    // 1. Same speaker
                    // 2. Pause is short (< 2.0s)
                    // 3. Current block is not too long (< 400 chars)
                    if (timeDiff < 2.0 && textLen < 400) {
                        shouldMerge = true
                    }
                }

                if (shouldMerge) {
                    // Merge with previous
                    currentSegment.text += ' ' + text
                    currentSegment.end = end || (start + (text.length * 0.05)) // approximate end if missing
                } else {
                    // Start new segment
                    if (currentSegment) {
                        mergedSegments.push(currentSegment)
                    }
                    currentSegment = {
                        time: start,
                        end: end || (start + (text.length * 0.05)),
                        timeLabel: formatTime(start),
                        speaker: speaker,
                        text: text
                    }
                }
            }
            // Push the last one
            if (currentSegment) {
                mergedSegments.push(currentSegment)
            }

            transcriptJson = mergedSegments

            transcriptFull = transcriptJson.map(
                (entry: any) => `${entry.speaker}: ${entry.text}`
            ).join('\n')
        }

        // 4. Update database
        const updateData: any = {}

        // Only update fields if they are present in source to avoid overwriting with null
        if (botData.mp4_url) updateData.audio_url = botData.mp4_url
        else if (botData.video) updateData.audio_url = botData.video
        else if (botData.audio) updateData.audio_url = botData.audio

        if (botData.duration) updateData.duration_seconds = botData.duration // API v2 uses 'duration' (seconds)
        if (transcriptJson) updateData.transcript_json = transcriptJson
        if (transcriptFull) updateData.transcript_full = transcriptFull

        // Process status mapping if needed, or just take what they give if it matches
        // Usually we want to trust the bot status, but map 'call_ended' -> 'processing' or 'ready'
        // For now, let's trust the webhook flow for status transitions mostly, 
        // but if we have transcript, we can force 'processing' or 'ready'
        if (transcriptFull) {
            // If we have text, mark as ready
            updateData.status = 'ready'
        }

        const { error: updateError } = await supabase
            .from('meetings')
            .update(updateData)
            .eq('id', id)

        if (updateError) {
            console.error('Error updating meeting:', updateError)
            return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
        }

        // 5. Trigger intelligence processing if we got new transcript
        if (transcriptFull) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            // Fire and forget - don't await this
            fetch(`${baseUrl}/api/process-intelligence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bot_id: meeting.bot_id }),
            }).catch(err => console.error('Intelligence trigger failed', err))
        }

        return NextResponse.json({ success: true, message: 'Synced successfully' })

    } catch (error) {
        console.error('Error in sync route:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
