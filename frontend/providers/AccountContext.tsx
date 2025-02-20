"use client"

import { IdentityWithPermissions } from "chainsig-aa.js"
import { useRouter } from "next/navigation"
import React, { createContext, useCallback, useContext, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { useAbstractAccountContract } from "@/contracts/useAbstractAccountContract"

interface AccountContextType {
    accountId: string | null
    setAccountId: (accountId: string | null) => void
    logout: () => Promise<void>
    authIdentities: IdentityWithPermissions[] | null
    isLoading: boolean
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

const STORAGE_KEY = "NEAR_ABSTRACT_ACCOUNT_SESSION"

export function AccountProvider({ children }: { children: React.ReactNode }) {
    const [accountId, setAccountIdState] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            const savedSession = localStorage.getItem(STORAGE_KEY)
            if (savedSession) {
                const { accountId } = JSON.parse(savedSession)
                return accountId
            }
        }
        return null
    })

    const router = useRouter()
    const { contract } = useAbstractAccountContract()

    const { data: authIdentities = [], isLoading } = useQuery({
        queryKey: ['identities', accountId],
        queryFn: async () => {
            if (!contract || !accountId) {
                return []
            }
            try {
                return await contract.listAuthIdentities({
                    account_id: accountId,
                })
            } catch (error) {
                console.error("Failed to fetch identities:", error)
                return []
            }
        },
        enabled: !!contract && !!accountId
    })

    const setAccountId = useCallback((newAccountId: string | null) => {
        setAccountIdState(newAccountId)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ accountId: newAccountId }))
    }, [])

    const logout = useCallback(async () => {
        localStorage.removeItem(STORAGE_KEY)
        document.cookie = "NEAR_ABSTRACT_ACCOUNT_SESSION=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
        setAccountIdState(null)
        router.push("/login")
    }, [router])

    return (
        <AccountContext.Provider value={{ accountId, setAccountId, authIdentities, isLoading, logout }}>
            {children}
        </AccountContext.Provider>
    )
}

export function useAccount() {
    const context = useContext(AccountContext)
    if (context === undefined) {
        throw new Error("useAccount must be used within an AccountProvider")
    }
    return context
}