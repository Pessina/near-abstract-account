import { GoogleOAuthProvider } from "@react-oauth/google";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <GoogleOAuthProvider clientId="876834174282-6ce99dphnb5ls945b783kfjkr5uh7e03.apps.googleusercontent.com">
            {children}
        </GoogleOAuthProvider>
    );
}