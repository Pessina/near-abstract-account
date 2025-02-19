import type { Metadata } from "next"
import { Inter } from "next/font/google"

import "./globals.css"
import GoogleProvider from "../providers/GoogleProvider"

import Header from "@/components/Header"
import { Toaster } from "@/components/ui/toaster"
import { AccountProvider } from "@/providers/AccountContext"
import { FacebookProvider } from "@/providers/FacebookProvider"
import { QueryClientProvider } from "@/providers/QueryClientProvider"

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
                <Header />
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