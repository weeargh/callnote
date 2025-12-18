/**
 * LocalStorage cache utility for meeting transcripts and data
 * Provides fast access to recently viewed meetings
 */

const CACHE_PREFIX = 'callnote_cache_'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes - no expiry until manual sync
const MAX_CACHED_ITEMS = 20

interface CacheEntry<T> {
    data: T
    timestamp: number
}

/**
 * Get cached data if not expired
 */
export function getFromCache<T>(key: string): T | null {
    if (typeof window === 'undefined') return null

    try {
        const item = localStorage.getItem(CACHE_PREFIX + key)
        if (!item) return null

        const entry: CacheEntry<T> = JSON.parse(item)
        const now = Date.now()

        // Check if expired
        if (now - entry.timestamp > CACHE_TTL_MS) {
            localStorage.removeItem(CACHE_PREFIX + key)
            return null
        }

        return entry.data
    } catch {
        return null
    }
}

/**
 * Set data in cache with timestamp
 */
export function setInCache<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return

    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now()
        }

        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))

        // Prune old cache entries if too many
        pruneCache()
    } catch {
        // localStorage full or unavailable
    }
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(CACHE_PREFIX + key)
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
    if (typeof window === 'undefined') return

    const keys = Object.keys(localStorage)
    keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(key)
        }
    })
}

/**
 * Remove oldest cache entries if exceeding max
 */
function pruneCache(): void {
    const keys = Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_PREFIX))

    if (keys.length <= MAX_CACHED_ITEMS) return

    // Sort by timestamp and remove oldest
    const entries = keys.map(key => {
        try {
            const item = localStorage.getItem(key)
            if (!item) return null
            const entry = JSON.parse(item)
            return { key, timestamp: entry.timestamp || 0 }
        } catch {
            return null
        }
    }).filter(Boolean) as { key: string; timestamp: number }[]

    entries.sort((a, b) => a.timestamp - b.timestamp)

    // Remove oldest entries
    const toRemove = entries.slice(0, entries.length - MAX_CACHED_ITEMS)
    toRemove.forEach(({ key }) => localStorage.removeItem(key))
}
