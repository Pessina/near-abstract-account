"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export const FacebookProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");

    if (window.opener) {
      if (error || errorReason) {
        window.opener.postMessage(
          {
            type: "FACEBOOK_AUTH_ERROR",
            error: error || errorReason || "Authentication failed",
          },
          window.location.origin
        );
      } else if (code && state) {
        window.opener.postMessage(
          {
            type: "FACEBOOK_AUTH_SUCCESS",
            code,
            returnedState: state,
          },
          window.location.origin
        );
      }

      window.close();
    }
  }, [searchParams]);

  return children;
};
