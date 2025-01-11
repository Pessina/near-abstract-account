import { NextResponse } from "next/server";
import fetch from "node-fetch";

export async function GET() {
  try {
    const response = await fetch(
      "https://www.facebook.com/.well-known/oauth/openid/jwks/",
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
    console.error("Error fetching Facebook keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch Facebook keys" },
      { status: 500 }
    );
  }
}
