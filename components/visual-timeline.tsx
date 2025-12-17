"use client"

import type { MeetingSegment } from "@/lib/supabase"

const TYPE_COLORS: Record<string, string> = {
  discussion: "bg-blue-500",
  decision: "bg-emerald-500",
  issue: "bg-red-500",
  question: "bg-pink-500",
}

const TYPE_LABELS: Record<string, string> = {
  discussion: "Discussion",
  decision: "Decision",
  issue: "Issue",
  question: "Question",
}

interface VisualTimelineProps {
  segments: MeetingSegment[]
  durationSeconds: number
  currentTime: number
  onTimeClick: (time: number) => void
}

export function VisualTimeline({ segments, durationSeconds, currentTime, onTimeClick }: VisualTimelineProps) {
  const currentPercent = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0

  // Get unique types for legend
  const uniqueTypes = [...new Set(segments.map(s => s.type))]

  if (segments.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Meeting Timeline</h3>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {uniqueTypes.map(type => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${TYPE_COLORS[type] || "bg-gray-500"}`} />
              {TYPE_LABELS[type] || type}
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        {/* Timeline Bar */}
        <div className="flex h-12 overflow-hidden rounded-lg">
          {segments.map((segment, index) => {
            const startPercent = (segment.start_time / durationSeconds) * 100
            const widthPercent = ((segment.end_time - segment.start_time) / durationSeconds) * 100
            const color = TYPE_COLORS[segment.type] || "bg-gray-500"

            return (
              <button
                key={segment.id || index}
                onClick={() => onTimeClick(segment.start_time)}
                className={`${color} relative flex-shrink-0 transition-all hover:opacity-80 hover:scale-y-105`}
                style={{ 
                  width: `${widthPercent}%`,
                  marginLeft: index === 0 ? `${startPercent}%` : 0,
                }}
                title={`${segment.topic} (${formatTime(segment.start_time)} - ${formatTime(segment.end_time)})`}
              >
                <div className="flex h-full items-center justify-center px-2 overflow-hidden">
                  <span className="truncate text-xs font-medium text-white">{segment.topic}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Current Time Indicator */}
        <div
          className="pointer-events-none absolute top-0 h-12 w-0.5 bg-foreground shadow-lg transition-all"
          style={{ left: `${currentPercent}%` }}
        >
          <div className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-foreground" />
        </div>
      </div>

      {/* Time labels */}
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>0:00</span>
        <span>{formatTime(durationSeconds)}</span>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
