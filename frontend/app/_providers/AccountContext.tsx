"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"

interface AccountContextType {
    accountId: string | null
    setAccountId: (accountId: string | null) => void
    logout: () => Promise<void>
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

const STORAGE_KEY = "NEAR_ABSTRACT_ACCOUNT_SESSION"

export function AccountProvider({ children }: { children: React.ReactNode }) {
    const [accountId, setAccountIdState] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const savedSession = localStorage.getItem(STORAGE_KEY)
        if (savedSession) {
            const { accountId } = JSON.parse(savedSession)
            setAccountIdState(accountId)
        }
        setIsLoading(false)
    }, [])

    const setAccountId = useCallback((newAccountId: string | null) => {
        setAccountIdState(newAccountId)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ accountId: newAccountId }))
    }, [])

    const logout = useCallback(async () => {
        setAccountIdState(null)
        localStorage.removeItem(STORAGE_KEY)
    }, [])

    if (isLoading) {
        return null
    }

    return (
        <AccountContext.Provider value={{ accountId, setAccountId, logout }}>
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