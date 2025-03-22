"use client";

import { FacebookAuthProvider } from "facebook-oauth-pkce";

export const FacebookProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <FacebookAuthProvider>{children}</FacebookAuthProvider>;
};
