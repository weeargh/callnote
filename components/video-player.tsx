"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, Volume2, SkipBack, SkipForward, Maximize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface VideoPlayerProps {
    videoUrl?: string | null
    durationSeconds: number
    currentTime: number
    onTimeChange: (time: number) => void
}

export function VideoPlayer({ videoUrl, durationSeconds, currentTime, onTimeChange }: VideoPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [volume, setVolume] = useState(80)
    const videoRef = useRef<HTMLVideoElement | null>(null)

    // Sync video element with current time
    useEffect(() => {
        if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
            videoRef.current.currentTime = currentTime
        }
    }, [currentTime])

    // Handle play/pause
    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.play().catch(console.error)
            } else {
                videoRef.current.pause()
            }
        }
    }, [isPlaying])

    // Handle volume
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume / 100
        }
    }, [volume])

    // Auto-increment time when playing (listener-based instead of interval for video)
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handleTimeUpdate = () => {
            onTimeChange(video.currentTime)
        }

        const handleEnded = () => {
            setIsPlaying(false)
        }

        const handlePlay = () => setIsPlaying(true)
        const handlePause = () => setIsPlaying(false)

        video.addEventListener("timeupdate", handleTimeUpdate)
        video.addEventListener("ended", handleEnded)
        video.addEventListener("play", handlePlay)
        video.addEventListener("pause", handlePause)

        return () => {
            video.removeEventListener("timeupdate", handleTimeUpdate)
            video.removeEventListener("ended", handleEnded)
            video.removeEventListener("play", handlePlay)
            video.removeEventListener("pause", handlePause)
        }
    }, [onTimeChange])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    return (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Video Area */}
            <div className="relative aspect-video bg-black">
                {videoUrl ? (
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className="h-full w-full object-contain"
                        onClick={() => setIsPlaying(!isPlaying)}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        No video available
                    </div>
                )}
            </div>

            {/* Controls Area */}
            <div className="p-4 space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <Slider
                        value={[currentTime]}
                        max={durationSeconds || 1}
                        step={0.1}
                        onValueChange={(value) => {
                            onTimeChange(value[0])
                            if (videoRef.current) {
                                videoRef.current.currentTime = value[0]
                            }
                        }}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(durationSeconds)}</span>
                    </div>
                </div>

                {/* Start/Stop/Vol Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                const newTime = Math.max(0, currentTime - 10)
                                if (videoRef.current) {
                                    videoRef.current.currentTime = newTime
                                    onTimeChange(newTime)
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
                                if (videoRef.current) {
                                    videoRef.current.currentTime = newTime
                                    onTimeChange(newTime)
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
