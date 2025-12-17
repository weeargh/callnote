"use client"

import { TrendingUp, TrendingDown, Minus, Pencil } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SpeakerStat } from "@/lib/supabase"

const COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
]

interface ParticipantInsightsProps {
  speakerStats: SpeakerStat[]
  onRenameSpeaker?: (id: string, newName: string) => void
}

export function ParticipantInsights({ speakerStats, onRenameSpeaker }: ParticipantInsightsProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const handleStartEdit = (stat: SpeakerStat) => {
    setEditingId(stat.id)
    setEditName(stat.speaker_name || stat.speaker_label || "")
  }

  const handleSaveEdit = async (id: string) => {
    if (onRenameSpeaker) {
      onRenameSpeaker(id, editName)
    }

    // Update via API
    try {
      await fetch(`/api/speaker-stats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker_name: editName }),
      })
    } catch (error) {
      console.error('Error updating speaker name:', error)
    }

    setEditingId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(id)
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  if (speakerStats.length === 0) {
    return null
  }

  // Sort by contribution percentage (descending)
  const sortedStats = [...speakerStats].sort(
    (a, b) => (b.contribution_pct || 0) - (a.contribution_pct || 0)
  )

  // Calculate sentiment based on contribution (mock - would come from OpenAI in production)
  const getSentiment = (pct: number) => {
    if (pct > 40) return "positive"
    if (pct < 20) return "negative"
    return "neutral"
  }

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Participant Insights</h3>

      <div className="space-y-4">
        {sortedStats.map((participant, index) => {
          const sentiment = getSentiment(participant.contribution_pct || 0)
          const color = COLORS[index % COLORS.length]
          const displayName = participant.speaker_name || participant.speaker_label || `Speaker ${index + 1}`
          
          return (
            <div key={participant.id} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${color}`} />
                  
                  {editingId === participant.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, participant.id)}
                        className="h-7 w-32 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => handleSaveEdit(participant.id)}
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{displayName}</span>
                      <button
                        onClick={() => handleStartEdit(participant)}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  )}
                  
                  {sentiment === "positive" && <TrendingUp className="h-4 w-4 text-emerald-600" />}
                  {sentiment === "negative" && <TrendingDown className="h-4 w-4 text-red-600" />}
                  {sentiment === "neutral" && <Minus className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(participant.talk_time_seconds || 0)}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {participant.contribution_pct || 0}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                <div
                  className={`h-full ${color} transition-all`}
                  style={{ width: `${participant.contribution_pct || 0}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}
