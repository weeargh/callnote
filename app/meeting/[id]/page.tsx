import { MeetingDetailView } from "@/components/meeting-detail-view"
import { AppSidebar } from "@/components/app-sidebar"

interface MeetingPageProps {
  params: Promise<{ id: string }>
}

export default async function MeetingPage({ params }: MeetingPageProps) {
  const { id } = await params

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppSidebar />
      <div className="pl-56 transition-all duration-300">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <MeetingDetailView meetingId={id} />
        </main>
      </div>
    </div>
  )
}
