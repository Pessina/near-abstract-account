import { useEnv } from "@/hooks/useEnv";
import { GoogleOAuthProvider } from "@react-oauth/google";

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