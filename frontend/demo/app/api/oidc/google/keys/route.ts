import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Google keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch Google keys" },
      { status: 500 }
    );
  }
}
