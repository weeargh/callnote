"use client"

import { useEffect, useState } from "react"
import { JoinMeetingDialog } from "@/components/join-meeting-dialog"

export function WelcomeSection() {
  const [greeting, setGreeting] = useState("Good morning")

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good morning")
    else if (hour < 18) setGreeting("Good afternoon")
    else setGreeting("Good evening")
  }, [])

  const handleRecordingSuccess = () => {
    // Refresh the page to show the new meeting
    window.location.reload()
  }

  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance">
          {greeting}! Welcome to Mekari Call.
        </h1>
        <p className="mt-2 text-base text-muted-foreground">Your recent recordings and meeting intelligence</p>
      </div>
      <JoinMeetingDialog onSuccess={handleRecordingSuccess} />
    </div>
  )
}
