import type { Metadata } from "next"
import { Inter } from "next/font/google"

import "./globals.css"
import GoogleProvider from "./_providers/GoogleProvider"

import { AccountProvider } from "@/app/_providers/AccountContext"
import { FacebookProvider } from "@/app/_providers/FacebookProvider"
import { QueryClientProvider } from "@/app/_providers/QueryClientProvider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Near Abstract Account",
  description: "Near Abstract Account Demo",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full w-full">
      <body
        className={`antialiased h-full w-full ${inter.className}`}
        suppressHydrationWarning
      >
        <QueryClientProvider>
          <AccountProvider>
            <GoogleProvider>
              <FacebookProvider>
                {children}
                <Toaster />
              </FacebookProvider>
            </GoogleProvider>
          </AccountProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}