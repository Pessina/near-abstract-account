"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"

import { Account } from "@/contracts/AbstractAccountContract/AbstractAccountContract"

interface AccountContextType {
    account: Account | null
    accountId: string | null
    setAccount: (account: Account | null) => void
    setAccountId: (accountId: string | null) => void
    logout: () => Promise<void>
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

const STORAGE_KEY = "NEAR_ABSTRACT_ACCOUNT_SESSION"

export function AccountProvider({ children }: { children: React.ReactNode }) {
    const [account, setAccountState] = useState<Account | null>(null)
    const [accountId, setAccountIdState] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Load session from localStorage on mount
    useEffect(() => {
        const savedSession = localStorage.getItem(STORAGE_KEY)
        if (savedSession) {
            const { account, accountId } = JSON.parse(savedSession)
            setAccountState(account)
            setAccountIdState(accountId)
        }
        setIsLoading(false)
    }, [])

    const setAccount = useCallback((newAccount: Account | null) => {
        setAccountState(newAccount)
        // Update localStorage
        if (newAccount) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ account: newAccount, accountId }))
        } else {
            localStorage.removeItem(STORAGE_KEY)
        }
    }, [accountId])

    const setAccountId = useCallback((newAccountId: string | null) => {
        setAccountIdState(newAccountId)
        // Update localStorage
        if (newAccountId && account) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ account, accountId: newAccountId }))
        } else {
            localStorage.removeItem(STORAGE_KEY)
        }
    }, [account])

    const logout = useCallback(async () => {
        setAccountState(null)
        setAccountIdState(null)
        localStorage.removeItem(STORAGE_KEY)
    }, [])

    // Don't render children until we've checked localStorage
    if (isLoading) {
        return null
    }

    return (
        <AccountContext.Provider value={{ account, accountId, setAccount, setAccountId, logout }}>
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