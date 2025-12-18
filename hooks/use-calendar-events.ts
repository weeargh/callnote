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
            revalidateOnReconnect: false,
            dedupingInterval: 1800000, // 30 minutes
            focusThrottleInterval: 1800000, // 30 minutes
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
