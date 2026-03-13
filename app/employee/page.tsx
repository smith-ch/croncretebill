'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EmployeeIndex() {
    const router = useRouter()

    useEffect(() => {
        // Redirect employee to the route list as their default landing page
        router.replace('/employee/route')
    }, [router])

    return (
        <div className="p-8 flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent flex items-center justify-center rounded-full animate-spin"></div>
        </div>
    )
}
