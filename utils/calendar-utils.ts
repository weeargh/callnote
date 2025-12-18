/**
 * Interface definition for Calendar Events supporting both Google and MeetingBaas structures
 */
export interface CalendarEvent {
    // Google Calendar / Standard Structure
    id: string
    summary?: string
    description?: string
    start?: { dateTime?: string; date?: string; timeZone?: string }
    end?: { dateTime?: string; date?: string; timeZone?: string }
    location?: string
    hangoutLink?: string

    // MeetingBaas Structure
    event_id?: string
    title?: string
    start_time?: string
    end_time?: string
    meeting_url?: string
    bot_scheduled?: boolean // MeetingBaas v2 field
}

/**
 * Filter events to only include those within the next N days.
 * @param events List of calendar events
 * @param days Number of days from now to include
 * @returns Filtered list of events
 */
export function filterEventsNextNDays(events: CalendarEvent[], days: number = 3): CalendarEvent[] {
    const now = new Date()
    const futureDate = new Date(now)
    futureDate.setDate(now.getDate() + days)
    futureDate.setHours(23, 59, 59, 999)

    return events.filter(event => {
        const startDateStr = event.start_time || event.start?.dateTime || event.start?.date
        if (!startDateStr) return false

        const eventDate = new Date(startDateStr)
        // Ensure valid date
        if (isNaN(eventDate.getTime())) return false

        return eventDate >= now && eventDate <= futureDate
    })
}

/**
 * Sort events by start time ascending (Nearest first)
 * @param events List of calendar events
 * @returns Sorted list of events
 */
export function sortEventsAscending(events: CalendarEvent[]): CalendarEvent[] {
    return [...events].sort((a, b) => {
        const dateA = new Date(a.start_time || a.start?.dateTime || a.start?.date || 0)
        const dateB = new Date(b.start_time || b.start?.dateTime || b.start?.date || 0)
        return dateA.getTime() - dateB.getTime()
    })
}
