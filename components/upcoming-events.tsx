'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, Video, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConnectCalendarButton } from "@/components/connect-calendar-button"

import { filterEventsNextNDays, sortEventsAscending, CalendarEvent } from '@/utils/calendar-utils'

export function UpcomingEvents() {
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchEvents = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/calendar/events?t=${new Date().getTime()}`)
            const data = await res.json()

            if (!res.ok || data.error) {
                throw new Error(data.error || 'Failed to fetch events')
            }

            // Filter logic moved to utility for better testability and maintainability
            const allEvents = data.events || []
            const filteredEvents = sortEventsAscending(filterEventsNextNDays(allEvents, 3))

            setEvents(filteredEvents)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load calendar')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEvents()
    }, [])

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const getDayLabel = (isoString: string) => {
        const date = new Date(isoString)
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        if (date.toDateString() === today.toDateString()) return 'Today'
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
        return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
    }

    return (
        <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Upcoming Events</CardTitle>
                    <Button variant="ghost" size="icon" onClick={fetchEvents} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                <CardDescription>Next 3 days from your connected calendar</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                {loading && events.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">Loading events...</div>
                ) : error ? (
                    <div className="text-center py-8 space-y-4">
                        {error.includes('Calendar API error') || error.includes('No calendars') ? (
                            <>
                                <div className="text-gray-500 flex flex-col items-center gap-2">
                                    <Calendar className="h-8 w-8 text-gray-400" />
                                    <p className="text-sm">Connect your Google Calendar to see upcoming events</p>
                                </div>
                                <ConnectCalendarButton />
                            </>
                        ) : (
                            <>
                                <div className="text-red-500 flex flex-col items-center gap-2">
                                    <AlertCircle className="h-6 w-6" />
                                    <span className="text-sm">{error}</span>
                                </div>
                                <Button variant="outline" size="sm" onClick={fetchEvents} className="mt-2">Try Again</Button>
                            </>
                        )}
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-8 space-y-4">
                        <div className="text-gray-500 bg-gray-50 rounded-lg p-6">
                            <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm">No upcoming events in the next 3 days</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {events.map((event, i) => {
                            // Normalize event data
                            const startDate = event.start_time || event.start?.dateTime || event.start?.date
                            const title = event.title || event.summary || 'Untitled Event'
                            const meetingLink = event.meeting_url || event.hangoutLink
                            const eventId = event.event_id || event.id || i

                            if (!startDate) return null // Skip invalid events

                            // Ensure we have a valid date object
                            const dateObj = new Date(startDate)
                            if (isNaN(dateObj.getTime())) return null

                            // Determine if specific time (has T and not full day)
                            // If start_time or start.dateTime is present, we assume it has time unless explicitly told otherwise.
                            // Simple check: if input string length > 10, typically ISO has time.
                            const hasTime = startDate.includes('T') || startDate.length > 10;

                            return (
                                <div key={eventId} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 transition-colors shadow-sm">
                                    <div className="flex flex-col items-center justify-center bg-indigo-50 text-indigo-700 h-14 w-14 rounded-lg shrink-0">
                                        <span className="text-xs font-bold uppercase">{dateObj.toLocaleDateString([], { month: 'short' })}</span>
                                        <span className="text-xl font-bold">{dateObj.getDate()}</span>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-semibold text-gray-900 line-clamp-1">{title}</h4>
                                            <Badge variant="secondary" className="text-xs font-normal">
                                                {hasTime ? formatTime(startDate) : 'All Day'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{getDayLabel(startDate)}</span>
                                            {event.location && (
                                                <>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1 line-clamp-1">
                                                        <MapPin className="h-3 w-3" /> {event.location}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {meetingLink && (
                                            <div className="pt-2 flex items-center justify-between">
                                                <a href={meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                                                    <Video className="h-3 w-3" /> Join
                                                </a>

                                                <Button
                                                    size="sm"
                                                    variant={event.bot_scheduled ? "secondary" : "default"}
                                                    className={`h-7 px-3 text-xs ${event.bot_scheduled ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-indigo-600 hover:bg-indigo-700"}`}
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const btn = e.currentTarget;
                                                        const originalHTML = btn.innerHTML;
                                                        btn.innerText = '...';
                                                        btn.disabled = true;

                                                        try {
                                                            const res = await fetch('/api/calendar/events/bot', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    meeting_url: event.meeting_url || event.hangoutLink || event.location, // Prioritize valid URL
                                                                    bot_name: 'Mekari Callnote',
                                                                    title: event.title || event.summary,
                                                                    start_time: event.start_time || event.start?.dateTime
                                                                })
                                                            });

                                                            if (res.ok) {
                                                                fetchEvents(); // Refresh to update 'bot_scheduled' if API supported it, but mainly to show success
                                                                // Since we don't persist 'bot_scheduled' on our end for calendar events easily without a DB table, 
                                                                // we'll just toggle the UI locally for now or rely on fetchEvents if the source updates.
                                                                // The API response might not update 'bot_scheduled' in Google Calendar immediately.
                                                                // So visual feedback is key.
                                                                btn.innerHTML = 'Sent';
                                                                setTimeout(() => {
                                                                    btn.innerHTML = originalHTML; // Reset or keep as 'Sent'? 
                                                                    // Better to keep visual indicator if we could.
                                                                    // For now, let's keep it simple.
                                                                    btn.disabled = false;
                                                                }, 2000);
                                                            } else {
                                                                btn.innerText = 'Failed';
                                                                setTimeout(() => {
                                                                    btn.innerHTML = originalHTML;
                                                                    btn.disabled = false;
                                                                }, 2000);
                                                            }
                                                        } catch (err) {
                                                            console.error('Join failed', err);
                                                            btn.innerText = 'Error';
                                                        }
                                                    }}
                                                >
                                                    <Video className="h-3 w-3 mr-1.5" />
                                                    Record This
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
