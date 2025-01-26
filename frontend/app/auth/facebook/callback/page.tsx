"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function FacebookCallback() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        const errorReason = searchParams.get("error_reason");

        if (window.opener) {
            if (error || errorReason) {
                // Send error to parent window
                window.opener.postMessage(
                    {
                        type: "FACEBOOK_AUTH_ERROR",
                        error: error || errorReason || "Authentication failed",
                    },
                    window.location.origin
                );
            } else if (code && state) {
                // Send success to parent window
                window.opener.postMessage(
                    {
                        type: "FACEBOOK_AUTH_SUCCESS",
                        code,
                        returnedState: state,
                    },
                    window.location.origin
                );
            }
            // Close this window after sending the message
            window.close();
        }
    }, [searchParams]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <p className="text-center text-gray-500">Completing authentication...</p>
        </div>
    );
} 