"use client"

import { useState, useEffect } from "react"
import { Share2, Download, ChevronDown, ArrowLeft, Loader2, RefreshCw, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MediaPlayer } from "@/components/media-player"
import { TranscriptView } from "@/components/transcript-view"
import { ActionItemsHero } from "@/components/action-items-hero"
import Link from "next/link"
import type { MeetingWithDetails, TranscriptEntry } from "@/lib/supabase"

interface MeetingDetailViewProps {
  meetingId: string
}

export function MeetingDetailView({ meetingId }: MeetingDetailViewProps) {
  const [meeting, setMeeting] = useState<MeetingWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    async function fetchMeeting() {
      try {
        const response = await fetch(`/api/meetings/${meetingId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch meeting')
        }
        const data = await response.json()
        setMeeting(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchMeeting()
  }, [meetingId])

  // Auto-expand transcript if we have one but no summary (intelligence failed)
  useEffect(() => {
    if (meeting && meeting.transcript_json && meeting.transcript_json.length > 0 && !meeting.summary_overview) {
      setIsTranscriptExpanded(true)
    }
  }, [meeting])

  // Polling for real-time updates when recording or processing
  useEffect(() => {
    if (!meeting || (meeting.status !== 'recording' && meeting.status !== 'processing')) return

    const interval = setInterval(() => {
      // Silent fetch
      fetch(`/api/meetings/${meetingId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setMeeting(data)
        })
        .catch(console.error)
    }, 5000)

    return () => clearInterval(interval)
  }, [meeting, meetingId])

  const handleSync = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/meetings/${meetingId}/sync`, { method: 'POST' })
      if (!response.ok) {
        throw new Error('Sync failed')
      }
      // Refresh meeting data
      const meetingResponse = await fetch(`/api/meetings/${meetingId}`)
      const meetingData = await meetingResponse.json()
      setMeeting(meetingData)
    } catch (err) {
      console.error('Sync failed:', err)
      // Optional: show toast error
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    )
  }

  if (error || !meeting) {
    return (
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">{error || 'Meeting not found'}</p>
          <Link href="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    )
  }

  const transcript: TranscriptEntry[] = meeting!.transcript_json || []
  const languageStats = meeting!.language_stats as { en: number; id: number } | null

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown date'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown duration'
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins} min`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }

  return (

    <main className="mx-auto max-w-[1800px] p-4 h-[calc(100vh-65px)] overflow-hidden flex flex-col gap-4">
      {/* Top Bar - Minimal */}
      <div className="flex items-center justify-between shrink-0 px-2">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-indigo-600">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">
              {meeting!.title || 'Untitled Meeting'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{formatDate(meeting!.started_at)}</span>
              <span>•</span>
              <Badge
                variant="outline"
                className={`py-0 px-2 h-5 text-[10px] uppercase tracking-wide border-0 ${meeting!.status === 'ready' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                  }`}
              >
                {meeting!.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            onClick={handleSync}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span>Sync</span>
          </Button>
          <Button variant="default" size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700 shadow-sm">
            <Share2 className="h-3.5 w-3.5 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Main Content Grid - YouTube Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">

        {/* LEFT COLUMN: Video + Context */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
          {/* Media Player - Natural Height with Aspect Ratio inside */}
          <div className="w-full">
            <MediaPlayer
              mediaUrl={meeting!.audio_url}
              durationSeconds={meeting!.duration_seconds || 2700}
              currentTime={currentTime}
              onTimeChange={setCurrentTime}
            />
          </div>

          {/* BELOW VIDEO: Tabs/Context */}
          <div className="space-y-6 pb-12">
            <div className="grid grid-cols-2 gap-4">
              {/* Summary Card */}
              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-1 h-5 bg-indigo-500 rounded-full" />
                    AI Summary
                  </h3>
                  {meeting!.summary_overview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        navigator.clipboard.writeText(meeting!.summary_overview || '')
                        // Visual feedback would go here
                      }}
                      title="Copy to clipboard"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="prose-sm text-gray-600 leading-relaxed">
                  {meeting!.summary_overview ? (
                    <p>{meeting!.summary_overview}</p>
                  ) : (
                    <p className="text-gray-400 italic">No summary generated yet.</p>
                  )}
                </div>
              </div>

              {/* Speaker Stats (Mini) */}
              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-1 h-5 bg-indigo-500 rounded-full" />
                  Speakers
                </h3>
                <div className="space-y-3">
                  {meeting!.speaker_stats && meeting!.speaker_stats.length > 0 ? (
                    meeting!.speaker_stats.map((stat, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{stat.speaker_name || stat.speaker_label}</span>
                        <span className="text-gray-500">{Math.round(stat.contribution_pct || 0)}%</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 italic text-sm">No speaker data.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Items */}
            <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
              <ActionItemsHero actionItems={meeting!.action_items || []} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Transcript (Sidebar) */}
        <div className="flex flex-col h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="font-semibold text-gray-900">Transcript</h2>
            {languageStats && (
              <Badge variant="secondary" className="text-xs bg-white border border-gray-200 text-gray-600">
                {languageStats!.en}% EN / {languageStats!.id}% ID
              </Badge>
            )}
          </div>
          <div className="flex-1 overflow-hidden relative">
            {/* We pass a specialized prop or style to TranscriptView to ensure it fits and scrolls internally */}
            <div className="absolute inset-0">
              <TranscriptView
                transcript={transcript}
                currentTime={currentTime}
                onSeek={setCurrentTime}
              />
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
