import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import type { TranscriptEntry } from "@/lib/supabase"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface TranscriptViewProps {
  transcript: TranscriptEntry[]
  currentTime: number
  onSeek: (time: number) => void
}

export function TranscriptView({ transcript, currentTime, onSeek }: TranscriptViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const activeRef = useRef<HTMLButtonElement>(null)

  const filteredTranscript = transcript.filter(
    (entry) =>
      entry.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.speaker.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Find active entry based on current time
  const activeIndex = transcript.findIndex((entry, index) => {
    const nextEntry = transcript[index + 1]
    return currentTime >= entry.time && (!nextEntry || currentTime < nextEntry.time)
  })

  // Auto-scroll to active entry
  useEffect(() => {
    if (activeRef.current && !searchQuery) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex, searchQuery])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getColor = (name: string) => {
    const colors = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-yellow-100 text-yellow-700', 'bg-purple-100 text-purple-700', 'bg-indigo-100 text-indigo-700']
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  if (transcript.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
        No transcript available yet.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-gray-100 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-sm bg-gray-50 border-gray-200 focus-visible:ring-indigo-500"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col p-2">
          {filteredTranscript.map((entry, index) => {
            const originalIndex = transcript.indexOf(entry)
            const isActive = originalIndex === activeIndex

            // Check if previous speaker is same to group visually (optional compactness)
            // But let's keep avatars for every block to ensure clarity if times jump
            const colorClass = getColor(entry.speaker)

            return (
              <button
                key={index}
                ref={isActive ? activeRef : null}
                onClick={() => onSeek(entry.time)}
                className={`group flex w-full gap-4 rounded-xl p-3 text-left transition-all duration-200 ${isActive
                    ? "bg-indigo-50/80 ring-1 ring-indigo-100"
                    : "hover:bg-gray-50"
                  }`}
              >
                {/* Avatar */}
                <div className="mt-0.5 shrink-0 select-none">
                  <Avatar className="h-8 w-8 border border-white shadow-sm">
                    <AvatarFallback className={`text-[10px] font-bold tracking-tight ${colorClass}`}>
                      {getInitials(entry.speaker)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {entry.speaker}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 tabular-nums">
                      {entry.timeLabel}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${isActive ? 'text-indigo-950 font-medium' : 'text-gray-600'}`}>
                    {entry.text}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
