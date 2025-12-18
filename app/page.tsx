import { Header } from "@/components/header"
import { WelcomeSection } from "@/components/welcome-section"
import { RecentRecordings } from "@/components/recent-recordings"
import { UpcomingEvents } from "@/components/upcoming-events"
import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content - offset by sidebar width */}
      <div className="pl-56 transition-all duration-300">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Welcome + Meetings */}
            <div className="lg:col-span-8 space-y-8">
              <WelcomeSection />
              <RecentRecordings />
            </div>

            {/* Right Column: Calendar / Sidebar */}
            <div className="lg:col-span-4 space-y-8">
              <UpcomingEvents />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
