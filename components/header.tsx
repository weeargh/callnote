import Link from "next/link"
import { Video, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/server"

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const fullName = user?.user_metadata?.full_name || user?.email || 'Guest'

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Video className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-foreground">Mekari Call</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">{fullName}</span>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  )
}
