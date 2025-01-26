"use client"

import { useRouter } from "next/navigation"
import React from "react"

import { useAccount } from "@/app/_providers/AccountContext"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Header() {
    const { accountId, setAccount, setAccountId } = useAccount()
    const router = useRouter()

    const handleLogout = () => {
        setAccount(null)
        setAccountId(null)
        // Clear session cookie
        document.cookie = "NEAR_ABSTRACT_ACCOUNT_SESSION=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
        router.push("/login")
    }

    if (!accountId) {
        return null
    }

    return (
        <header className="border-b">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <span className="font-semibold">Near Abstract Account</span>
                </div>

                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                {accountId}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push("/account")}>
                                Manage Account
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/signature")}>
                                Request Signature
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleLogout}>
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
} 