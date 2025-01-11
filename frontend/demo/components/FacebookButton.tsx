'use client'

import { Button } from "@/components/ui/button"
import { useFacebookAuth } from '@/hooks/useFacebookAuth';
import { useState } from "react";

type FacebookButtonProps = {
    text: string;
    onSuccess: (token: string) => void;
}

export default function FacebookButton({ text, onSuccess }: FacebookButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { initiateLogin } = useFacebookAuth({
        scope: 'email',
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
        onSuccess: (idToken) => {
            console.log('Successfully logged in with Facebook', idToken);
            setIsLoading(false);
            if (idToken) {
                onSuccess(idToken);
            } else {
                console.error('No token received from Facebook');
            }
        },
        onError: (error) => {
            console.error('Error logging in with Facebook', error);
            setIsLoading(false);
        },
    });

    const handleLogin = async () => {
        setIsLoading(true);
        await initiateLogin({
            nonce: 'test_123_felipe',
        });
        setIsLoading(false);
    };

    return (
        <Button onClick={handleLogin} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            {isLoading ? 'Loading...' : text}
        </Button>
    );
}