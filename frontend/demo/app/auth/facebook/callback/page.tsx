'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FacebookCallback() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const router = useRouter();

    useEffect(() => {
        async function handleCallback() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const stateParam = urlParams.get('state');

            if (!code || !stateParam) {
                setStatus('error');
                setMessage('Missing code or state parameter');
                return;
            }

            const storedState = localStorage.getItem('state');
            const codeVerifier = localStorage.getItem('codeVerifier');

            if (stateParam !== storedState) {
                setStatus('error');
                setMessage('Invalid state parameter');
                return;
            }

            if (!codeVerifier) {
                setStatus('error');
                setMessage('Code verifier not found');
                return;
            }

            try {
                const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
                const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/auth/facebook/callback`);

                const response = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&code_verifier=${codeVerifier}&code=${code}`, {
                    method: 'GET'
                });

                const data = await response.json();

                if (data.access_token) {
                    // Here you would typically send the token to your server for validation and to fetch user info
                    setStatus('success');
                    setMessage('Successfully logged in!');
                    console.log({ data });

                    // Redirect to home page after 2 seconds
                    setTimeout(() => router.push('/'), 2000);
                } else {
                    setStatus('error');
                    setMessage('Failed to obtain access token');
                }
            } catch (error) {
                setStatus('error');
                setMessage('Error exchanging code for token');
            }

            // Clear localStorage
            localStorage.removeItem('codeVerifier');
            localStorage.removeItem('state');
        }

        handleCallback();
    }, [router]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            {status === 'loading' && <p>Loading...</p>}
            {status === 'success' && <p className="text-green-500">{message}</p>}
            {status === 'error' && <p className="text-red-500">{message}</p>}
        </div>
    );
}