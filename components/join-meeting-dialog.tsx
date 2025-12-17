"use client"

import { useState } from "react"
import { Video, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface JoinMeetingDialogProps {
  onSuccess?: () => void
}

export function JoinMeetingDialog({ onSuccess }: JoinMeetingDialogProps) {
  const [open, setOpen] = useState(false)
  const [meetingUrl, setMeetingUrl] = useState("")
  const [meetingTitle, setMeetingTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate URL
      if (!meetingUrl.includes("meet.google.com")) {
        throw new Error("Please enter a valid Google Meet URL")
      }

      const response = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_url: meetingUrl,
          title: meetingTitle || "Untitled Meeting",
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        const errorDetails = data.details ? `: ${data.details}` : ''
        throw new Error(`${data.error || "Failed to spawn bot"}${errorDetails}`)
      }

      // Success
      setOpen(false)
      setMeetingUrl("")
      setMeetingTitle("")
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Video className="h-4 w-4" />
          Record Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record a Meeting</DialogTitle>
            <DialogDescription>
              Paste a Google Meet URL and our bot will join to record and transcribe the meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="meeting-url">Meeting URL *</Label>
              <Input
                id="meeting-url"
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting-title">Meeting Title (optional)</Label>
              <Input
                id="meeting-title"
                placeholder="Weekly Sync"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
              />
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">{error}</p>
                {error.includes('401') && (
                  <p className="mt-2 text-xs">
                    Your MeetingBaas API key may be invalid. Please check your key at{' '}
                    <a 
                      href="https://meetingbaas.com/dashboard" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      meetingbaas.com/dashboard
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Start Recording"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
