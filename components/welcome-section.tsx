"use client"

import { JoinMeetingDialog } from "@/components/join-meeting-dialog"

export function WelcomeSection() {
  const handleRecordingSuccess = () => {
    // Refresh the page to show the new meeting
    window.location.reload()
  }

  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Dashboard
        </h1>
      </div>
      <JoinMeetingDialog onSuccess={handleRecordingSuccess} />
    </div>
  )
}
