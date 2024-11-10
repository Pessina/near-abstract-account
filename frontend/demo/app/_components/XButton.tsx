'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useXAuth } from '../../hooks/useXAuth'

export const XLoginButton = () => {
    const [isLoading, setIsLoading] = useState(false)
    const { initiateLogin } = useXAuth({
        clientId: process.env.NEXT_PUBLIC_X_CLIENT_ID || '',
        scope: 'users.read',
        onSuccess: (token) => {
            console.log('Successfully logged in with X', token)
            setIsLoading(false)
        },
        onError: (error) => {
            console.error('Error logging in with X', error)
            setIsLoading(false)
        },
    })

    const handleLogin = async () => {
        setIsLoading(true)
        await initiateLogin()
        setIsLoading(false)
    }

    return (
        <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded"
        >
            {isLoading ? 'Loading...' : 'Login with X'}
        </Button>
    )
}
