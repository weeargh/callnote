import { Header } from "@/components/header"
import { MeetingDetailView } from "@/components/meeting-detail-view"

interface MeetingPageProps {
  params: Promise<{ id: string }>
}

export default async function MeetingPage({ params }: MeetingPageProps) {
  const { id } = await params
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MeetingDetailView meetingId={id} />
    </div>
  )
}
