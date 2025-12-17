'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export function ConnectCalendarButton() {
    const [connecting, setConnecting] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        // Check for OAuth callback status
        const connected = searchParams.get('calendar_connected')
        const error = searchParams.get('calendar_error')

        if (connected === 'true') {
            setStatus('success')
            // Clear URL params after showing success
            setTimeout(() => {
                router.replace('/')
            }, 3000)
        } else if (error) {
            setStatus('error')
            setErrorMessage(decodeURIComponent(error))
        }
    }, [searchParams, router])

    const handleConnect = () => {
        setConnecting(true)
        window.location.href = '/api/calendar/connect'
    }

    if (status === 'success') {
        return (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Calendar connected!</span>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Connection failed: {errorMessage}</span>
                </div>
                <Button
                    onClick={handleConnect}
                    variant="outline"
                    size="sm"
                    className="w-full"
                >
                    Try Again
                </Button>
            </div>
        )
    }

    return (
        <Button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
            {connecting ? (
                <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                </>
            ) : (
                <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Connect Google Calendar
                </>
            )}
        </Button>
    )
}
