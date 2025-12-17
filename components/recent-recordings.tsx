"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Clock, Users, ChevronRight, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface MeetingListItem {
  id: string
  bot_id: string
  title: string
  meeting_url: string | null
  date: string | null
  duration_seconds: number | null
  participant_count: number | null
  status: string
  participants: string[]
  created_at: string
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ready":
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Ready</Badge>
    case "processing":
      return <Badge className="animate-pulse bg-amber-500/10 text-amber-500 border-amber-500/20">Processing</Badge>
    case "recording":
      return <Badge className="animate-pulse bg-red-500/10 text-red-500 border-red-500/20">Recording</Badge>
    case "scheduled":
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Scheduled</Badge>
    case "failed":
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Failed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Unknown date'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number | null) {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

export function RecentRecordings() {
  const [recordings, setRecordings] = useState<MeetingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMeetings() {
      try {
        const response = await fetch('/api/meetings?limit=20')
        if (!response.ok) {
          throw new Error('Failed to fetch meetings')
        }
        const data = await response.json()
        setRecordings(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchMeetings()
  }, [])

  if (loading) {
    return (
      <div>
        <h2 className="mb-6 text-xl font-semibold text-foreground">Recent Recordings</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2 className="mb-6 text-xl font-semibold text-foreground">Recent Recordings</h2>
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-border p-8 text-center">
          <p className="text-muted-foreground">Failed to load meetings</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-foreground">Recent Recordings</h2>
      
      {recordings.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-border p-8 text-center">
          <p className="text-muted-foreground">No recordings yet</p>
          <p className="text-sm text-muted-foreground">Your meeting recordings will appear here</p>
        </div>
      ) : (
        <div className="space-y-1">
          {recordings.map((recording) => (
            <Link key={recording.id} href={`/meeting/${recording.id}`}>
              <div className="group flex items-center justify-between rounded-lg border border-transparent px-4 py-4 transition-colors hover:border-border hover:bg-accent/50">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-foreground text-pretty">{recording.title}</h3>
                    {getStatusBadge(recording.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(recording.date)} {formatTime(recording.date) && `at ${formatTime(recording.date)}`}
                    </span>
                    {recording.duration_seconds && (
                      <span>{formatDuration(recording.duration_seconds)}</span>
                    )}
                    {recording.participants.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {recording.participants.join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
