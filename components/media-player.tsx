"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, Volume2, SkipBack, SkipForward, Headphones, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Toggle } from "@/components/ui/toggle"

interface MediaPlayerProps {
    mediaUrl?: string | null
    durationSeconds: number
    currentTime: number
    onTimeChange: (time: number) => void
}

export function MediaPlayer({ mediaUrl, durationSeconds, currentTime, onTimeChange }: MediaPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [volume, setVolume] = useState(80)
    const [mode, setMode] = useState<'video' | 'audio'>('audio')

    // Single ref for the media element (we'll use a video tag for both as it handles audio too)
    const mediaRef = useRef<HTMLVideoElement | null>(null)

    // Sync media element with current time
    useEffect(() => {
        if (mediaRef.current && Math.abs(mediaRef.current.currentTime - currentTime) > 0.5) {
            mediaRef.current.currentTime = currentTime
        }
    }, [currentTime])

    // Handle play/pause
    useEffect(() => {
        if (mediaRef.current) {
            if (isPlaying) {
                mediaRef.current.play().catch(console.error)
            } else {
                mediaRef.current.pause()
            }
        }
    }, [isPlaying])

    // Handle volume
    useEffect(() => {
        if (mediaRef.current) {
            mediaRef.current.volume = volume / 100
        }
    }, [volume])

    // Auto-increment time when playing
    useEffect(() => {
        const media = mediaRef.current
        if (!media) return

        const handleTimeUpdate = () => {
            onTimeChange(media.currentTime)
        }

        const handleEnded = () => {
            setIsPlaying(false)
        }

        const handlePlay = () => setIsPlaying(true)
        const handlePause = () => setIsPlaying(false)

        media.addEventListener("timeupdate", handleTimeUpdate)
        media.addEventListener("ended", handleEnded)
        media.addEventListener("play", handlePlay)
        media.addEventListener("pause", handlePause)

        return () => {
            media.removeEventListener("timeupdate", handleTimeUpdate)
            media.removeEventListener("ended", handleEnded)
            media.removeEventListener("play", handlePlay)
            media.removeEventListener("pause", handlePause)
        }
    }, [onTimeChange])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    return (
        <div className="flex flex-col w-full rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Media Display Area - Enforce 16:9 Aspect Ratio */}
            <div className="relative bg-black w-full aspect-video flex items-center justify-center">
                {mediaUrl ? (
                    <>
                        <video
                            ref={mediaRef}
                            src={mediaUrl}
                            className={`h-full w-full object-contain ${mode === 'audio' ? 'hidden' : 'block'}`}
                            onClick={() => setIsPlaying(!isPlaying)}
                        />
                        {/* Waveform Overlay for Audio Mode */}
                        {mode === 'audio' && (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                <div className="w-full max-w-md h-32 flex items-end justify-around px-8">
                                    {Array.from({ length: 40 }).map((_, i) => {
                                        const delay = i * 0.1
                                        return (
                                            <div
                                                key={i}
                                                className="w-1.5 rounded-full bg-indigo-500 mx-0.5"
                                                style={{
                                                    opacity: 0.9,
                                                    animation: isPlaying
                                                        ? `visualizer 0.8s ease-in-out infinite alternate ${delay}s`
                                                        : 'none',
                                                    height: isPlaying ? '40%' : `${Math.sin(i * 0.2) * 20 + 30}%`
                                                }}
                                            />
                                        )
                                    })}
                                </div>
                                <style dangerouslySetInnerHTML={{
                                    __html: `
                                  @keyframes visualizer {
                                    0% { height: 20%; }
                                    100% { height: 75%; }
                                  }
                                `}} />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-gray-400">No media available</div>
                )
                }
            </div >

            {/* Controls Bar */}
            <div className="px-6 py-6 bg-white border-t border-gray-100">
                <div className="space-y-4">
                    {/* Progress Slider */}
                    <div className="space-y-1.5">
                        <Slider
                            value={[currentTime]}
                            max={durationSeconds || 1}
                            step={0.1}
                            onValueChange={(value) => {
                                onTimeChange(value[0])
                                if (mediaRef.current) {
                                    mediaRef.current.currentTime = value[0]
                                }
                            }}
                            className="w-full cursor-pointer"
                        />
                        <div className="flex justify-between text-xs font-medium text-gray-500">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(durationSeconds)}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Toggle
                                pressed={mode === 'video'}
                                onPressedChange={() => setMode('video')}
                                aria-label="Video Mode"
                                className="h-9 px-3 data-[state=on]:bg-indigo-50 data-[state=on]:text-indigo-600"
                            >
                                <Video className="h-4 w-4 mr-2" />
                                <span className="text-xs font-medium">Video</span>
                            </Toggle>
                            <Toggle
                                pressed={mode === 'audio'}
                                onPressedChange={() => setMode('audio')}
                                aria-label="Audio Mode"
                                className="h-9 px-3 data-[state=on]:bg-indigo-50 data-[state=on]:text-indigo-600"
                            >
                                <Headphones className="h-4 w-4 mr-2" />
                                <span className="text-xs font-medium">Audio</span>
                            </Toggle>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                                onClick={() => {
                                    const newTime = Math.max(0, currentTime - 10)
                                    if (mediaRef.current) {
                                        mediaRef.current.currentTime = newTime
                                        onTimeChange(newTime)
                                    }
                                }}
                            >
                                <SkipBack className="h-5 w-5" />
                            </Button>

                            <Button
                                size="icon"
                                className="h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-md transition-transform active:scale-95"
                                onClick={() => setIsPlaying(!isPlaying)}
                            >
                                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5" />}
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                                onClick={() => {
                                    const newTime = Math.min(durationSeconds, currentTime + 10)
                                    if (mediaRef.current) {
                                        mediaRef.current.currentTime = newTime
                                        onTimeChange(newTime)
                                    }
                                }}
                            >
                                <SkipForward className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-3 w-[140px]">
                            <Volume2 className="h-4 w-4 text-gray-400" />
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
            </div >
        </div >
    )
}
