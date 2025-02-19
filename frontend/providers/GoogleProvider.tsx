import { GoogleOAuthProvider } from "@react-oauth/google";

import { useEnv } from "@/hooks/useEnv";

export default function GoogleProvider({ children }: { children: React.ReactNode }) {
    const { googleClientId } = useEnv()

    return (
        <GoogleOAuthProvider
            clientId={googleClientId}
        >
            {children}
        </GoogleOAuthProvider>
    );
}