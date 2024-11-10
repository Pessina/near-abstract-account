'use client'

import { Button } from "@/components/ui/button"
import { useFacebookAuth } from '../../hooks/useFacebookAuth';
import { useState } from "react";

export default function FacebookButton() {
    const [isLoading, setIsLoading] = useState(false);
    const { initiateLogin } = useFacebookAuth({
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
        onSuccess: (idToken) => {
            console.log('Successfully logged in with Facebook', idToken);
            setIsLoading(false);
        },
        onError: (error) => {
            console.error('Error logging in with Facebook', error);
            setIsLoading(false);
        },
    });

    const handleLogin = async () => {
        setIsLoading(true);
        await initiateLogin({
            nonce: 'test-123',
        });
        setIsLoading(false);
    };

    return (
        <Button onClick={handleLogin} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            {isLoading ? 'Loading...' : 'Login with Facebook'}
        </Button>
    );
}