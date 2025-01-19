import { NextResponse } from "next/server";
import fetch from "node-fetch";

export async function GET() {
  try {
    const response = await fetch(
      "https://dev-um3ne30lucm6ehqq.us.auth0.com/.well-known/jwks.json",
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Auth0 keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch Auth0 keys" },
      { status: 500 }
    );
  }
}
