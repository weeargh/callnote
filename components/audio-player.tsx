"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, Volume2, SkipBack, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface AudioPlayerProps {
  audioUrl?: string | null
  durationSeconds: number
  currentTime: number
  onTimeChange: (time: number) => void
}

export function AudioPlayer({ audioUrl, durationSeconds, currentTime, onTimeChange }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Sync audio element with current time
  useEffect(() => {
    if (audioRef.current && Math.abs(audioRef.current.currentTime - currentTime) > 1) {
      audioRef.current.currentTime = currentTime
    }
  }, [currentTime])

  // Handle play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error)
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying])

  // Handle volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  // Auto-increment time when playing (fallback if no audio)
  useEffect(() => {
    if (!isPlaying || audioUrl) return

    const interval = setInterval(() => {
      onTimeChange(Math.min(currentTime + 1, durationSeconds))
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying, currentTime, durationSeconds, onTimeChange, audioUrl])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      onTimeChange(audioRef.current.currentTime)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      {/* Hidden audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          preload="metadata"
        />
      )}

      {/* Waveform visualization */}
      <div className="mb-4 h-20 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
        <div className="flex h-full items-end justify-around px-2">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-primary/40 transition-all duration-150"
              style={{
                height: `${Math.sin(i * 0.5) * 30 + 40}%`,
                opacity: durationSeconds > 0 && i < (currentTime / durationSeconds) * 60 ? 1 : 0.3,
              }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={durationSeconds || 1}
            step={1}
            onValueChange={(value) => {
              onTimeChange(value[0])
              if (audioRef.current) {
                audioRef.current.currentTime = value[0]
              }
            }}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(durationSeconds)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const newTime = Math.max(0, currentTime - 10)
                onTimeChange(newTime)
                if (audioRef.current) {
                  audioRef.current.currentTime = newTime
                }
              }}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button size="icon" className="h-10 w-10" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const newTime = Math.min(durationSeconds, currentTime + 10)
                onTimeChange(newTime)
                if (audioRef.current) {
                  audioRef.current.currentTime = newTime
                }
              }}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              max={100}
              step={1}
              onValueChange={(value) => setVolume(value[0])}
              className="w-24"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
