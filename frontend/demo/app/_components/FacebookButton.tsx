'use client'


import { Button } from "@/components/ui/button"
import { useFacebookAuth } from '../hooks/useFacebookAuth';


export default function FacebookButton() {
    const { status, message, initiateLogin, isLoading } = useFacebookAuth();

    return (
        <Button onClick={initiateLogin} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            {isLoading ? 'Loading...' : 'Login with Facebook'}
        </Button>
    );
}