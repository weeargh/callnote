'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Video, Share2, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/recordings', label: 'My Recordings', icon: Video },
    { href: '/shared', label: 'Shared', icon: Share2 },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export function AppSidebar() {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 z-40 h-screen border-r border-gray-200 bg-white transition-all duration-300',
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
            <nav className="flex flex-col gap-1 p-3">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

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

            {/* Collapse Toggle */}
            <div className="absolute bottom-4 left-0 right-0 px-3">
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
