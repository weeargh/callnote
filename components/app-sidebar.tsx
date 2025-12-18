'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Video, BarChart3, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/recordings', label: 'My Recordings', icon: Video },
    { href: '/analytics', label: 'Analytics', icon: BarChart3, comingSoon: true },
]

export function AppSidebar() {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 z-40 h-screen border-r border-gray-200 bg-white transition-all duration-300 flex flex-col',
                collapsed ? 'w-16' : 'w-56'
            )}
        >
            {/* Logo */}
            <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
                {!collapsed && (
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                            <span className="text-sm font-bold text-white">M</span>
                        </div>
                        <span className="font-semibold text-gray-900">Callnote</span>
                    </Link>
                )}
                {collapsed && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 mx-auto">
                        <span className="text-sm font-bold text-white">M</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 p-3 flex-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

                    if (item.comingSoon) {
                        return (
                            <div
                                key={item.href}
                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed"
                                title={collapsed ? `${item.label} (Coming Soon)` : undefined}
                            >
                                <Icon className="h-5 w-5 shrink-0 text-gray-300" />
                                {!collapsed && (
                                    <div className="flex items-center gap-2">
                                        <span>{item.label}</span>
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Soon</Badge>
                                    </div>
                                )}
                            </div>
                        )
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-violet-50 text-violet-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-violet-600' : 'text-gray-400')} />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom section: Sign out + Collapse */}
            <div className="border-t border-gray-100 p-3 space-y-2">
                <form action="/auth/signout" method="post">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "w-full text-gray-500 hover:text-red-600 hover:bg-red-50",
                            collapsed ? "justify-center px-2" : "justify-start"
                        )}
                        title={collapsed ? "Sign Out" : undefined}
                    >
                        <LogOut className="h-4 w-4" />
                        {!collapsed && <span className="ml-2">Sign Out</span>}
                    </Button>
                </form>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full justify-center text-gray-400 hover:text-gray-600"
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>
        </aside>
    )
}
