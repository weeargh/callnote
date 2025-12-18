import { Header } from "@/components/header"
import { AppSidebar } from "@/components/app-sidebar"
import { RecordingsPageContent } from "./recordings-content"

export default function RecordingsPage() {
    return (
        <div className="min-h-screen bg-gray-50/50">
            <AppSidebar />
            <div className="pl-56 transition-all duration-300">
                <Header />
                <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                    <RecordingsPageContent />
                </main>
            </div>
        </div>
    )
}
