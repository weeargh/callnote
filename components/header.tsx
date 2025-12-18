import { createClient } from "@/utils/supabase/server"

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const fullName = user?.user_metadata?.full_name || user?.email || 'Guest'

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-end">
          <span className="text-sm font-medium text-gray-600">Welcome, {fullName}</span>
        </div>
      </div>
    </header>
  )
}
