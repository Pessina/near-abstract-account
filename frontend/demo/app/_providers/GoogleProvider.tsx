import { GoogleOAuthProvider } from "@react-oauth/google";

export default function GoogleProvider({ children }: { children: React.ReactNode }) {
    return (
        <GoogleOAuthProvider
            clientId="739911069797-idp062866964gbndo6693h32tga5cvl1.apps.googleusercontent.com"
        >
            {children}
        </GoogleOAuthProvider>
    );
}