import { RecentRecordings } from "@/components/recent-recordings"
import { UpcomingEvents } from "@/components/upcoming-events"
import { AppSidebar } from "@/components/app-sidebar"
import { JoinMeetingDialog } from "@/components/join-meeting-dialog"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content - offset by sidebar width */}
      <div className="pl-56 transition-all duration-300">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Meetings */}
            <div className="lg:col-span-8 space-y-8">
              <RecentRecordings />
            </div>

            {/* Right Column: Record Button + Calendar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Record Meeting Action */}
              <div className="flex justify-end">
                <JoinMeetingDialog />
              </div>

              <UpcomingEvents />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
