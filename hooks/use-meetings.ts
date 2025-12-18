import useSWR from 'swr'
import { getFromCache, setInCache } from '@/lib/cache'

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

interface MeetingDetails {
    id: string
    bot_id: string
    title: string
    meeting_url: string | null
    date: string | null
    duration_seconds: number | null
    status: string
    audio_url: string | null
    transcript_json: any[]
    transcript_full: string | null
    summary_overview: string | null
    summary_key_points: any[]
    action_items: any[]
    speaker_stats: any[]
}

// Custom fetcher with localStorage cache fallback
const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
}

/**
 * Hook for fetching meetings list with caching
 */
export function useMeetings(limit: number = 20) {
    const { data, error, isLoading, mutate } = useSWR<MeetingListItem[]>(
        `/api/meetings?limit=${limit}`,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 30000, // 30 seconds
            focusThrottleInterval: 60000, // 1 minute
        }
    )

    return {
        meetings: data || [],
        isLoading,
        isError: !!error,
        mutate,
    }
}

/**
 * Hook for fetching single meeting with transcript - uses localStorage cache
 */
export function useMeeting(id: string | null) {
    const cacheKey = `meeting_${id}`

    const { data, error, isLoading, mutate } = useSWR<MeetingDetails>(
        id ? `/api/meetings/${id}` : null,
        async (url: string) => {
            // Try localStorage cache first for instant load
            const cached = getFromCache<MeetingDetails>(cacheKey)
            if (cached) {
                // Return cached data immediately, fetch fresh in background
                setTimeout(async () => {
                    try {
                        const fresh = await fetcher(url)
                        setInCache(cacheKey, fresh)
                        mutate(fresh, false)
                    } catch { }
                }, 0)
                return cached
            }

            // No cache, fetch fresh
            const data = await fetcher(url)
            setInCache(cacheKey, data)
            return data
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute
        }
    )

    return {
        meeting: data,
        isLoading,
        isError: !!error,
        mutate,
    }
}
