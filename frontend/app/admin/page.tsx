"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import UpdateOIDCKeys from "./_components/UpdateOIDCKeys"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"


export default function AdminPage() {
    const { contract } = useAbstractAccountContract();


    if (!contract) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex justify-center items-center h-full">
            <Card className="w-full md:max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Admin Dashboard</CardTitle>
                    <CardDescription className="text-center">Manage accounts and authentication</CardDescription>
                </CardHeader>
                <CardContent>
                    <UpdateOIDCKeys />
                </CardContent>
            </Card>
        </div >
    )
}
