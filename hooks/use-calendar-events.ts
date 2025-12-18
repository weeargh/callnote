import useSWR from 'swr'
import type { CalendarEvent } from '@/utils/calendar-utils'

const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch')
    const data = await res.json()
    return data.events || []
}

/**
 * Hook for fetching calendar events with caching
 */
export function useCalendarEvents() {
    const { data, error, isLoading, mutate } = useSWR<CalendarEvent[]>(
        '/api/calendar/events',
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000, // 1 minute - calendar doesn't change often
            focusThrottleInterval: 120000, // 2 minutes
            errorRetryCount: 2,
        }
    )

    return {
        events: data || [],
        isLoading,
        isError: !!error,
        mutate,
    }
}
