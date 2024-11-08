'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"

function generateCodeVerifier(length: number): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export default function FacebookButton() {
    const [isLoading, setIsLoading] = useState(false);

    async function initiateLogin() {
        setIsLoading(true);
        const codeVerifier = generateCodeVerifier(128);
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const state = generateCodeVerifier(32);

        // Store code_verifier and state in localStorage (in a real app, use a more secure method)
        localStorage.setItem('codeVerifier', codeVerifier);
        localStorage.setItem('state', state);

        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/auth/facebook/callback`);

        const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=openid&response_type=code&code_challenge=${codeChallenge}&code_challenge_method=S256`;

        window.location.href = url;
    }

    return (
        <Button onClick={initiateLogin} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            {isLoading ? 'Loading...' : 'Login with Facebook'}
        </Button>
    );
}