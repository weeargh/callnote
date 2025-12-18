"use client"

import Link from "next/link"
import { Clock, Users, ChevronRight, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useMeetings } from "@/hooks/use-meetings"

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

function groupMeetingsByDate(meetings: MeetingListItem[]) {
    const groups: { [key: string]: MeetingListItem[] } = {}

    meetings.forEach(meeting => {
        const dateStr = meeting.date || meeting.created_at
        if (!dateStr) return

        const date = new Date(dateStr)
        const dateKey = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })

        if (!groups[dateKey]) {
            groups[dateKey] = []
        }
        groups[dateKey].push(meeting)
    })

    return groups
}

export function RecordingsPageContent() {
    const { meetings, isLoading, isError } = useMeetings(50)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-lg border border-border p-8 text-center">
                <p className="text-muted-foreground">Failed to load recordings</p>
                <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
            </div>
        )
    }

    if (meetings.length === 0) {
        return (
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-6">My Recordings</h1>
                <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-lg border border-border p-8 text-center">
                    <p className="text-muted-foreground">No recordings yet</p>
                    <p className="text-sm text-muted-foreground">Your meeting recordings will appear here</p>
                </div>
            </div>
        )
    }

    const groupedMeetings = groupMeetingsByDate(meetings)

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My Recordings</h1>

            <div className="space-y-8">
                {Object.entries(groupedMeetings).map(([dateLabel, dayMeetings]) => (
                    <div key={dateLabel}>
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            {dateLabel}
                        </h2>
                        <div className="space-y-2">
                            {dayMeetings.map((recording) => (
                                <Link key={recording.id} href={`/meeting/${recording.id}`}>
                                    <div className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all hover:border-indigo-200 hover:shadow-sm">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-medium text-gray-900">{recording.title}</h3>
                                                {getStatusBadge(recording.status)}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                                                {formatTime(recording.date || recording.created_at) && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {formatTime(recording.date || recording.created_at)}
                                                    </span>
                                                )}
                                                {recording.duration_seconds && (
                                                    <span>{formatDuration(recording.duration_seconds)}</span>
                                                )}
                                                {recording.participants && recording.participants.length > 0 && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Users className="h-3.5 w-3.5" />
                                                        {recording.participants.slice(0, 2).join(", ")}
                                                        {recording.participants.length > 2 && ` +${recording.participants.length - 2}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
