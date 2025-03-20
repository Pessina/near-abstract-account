"use client";

import { LogOut, User, Send, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccount } from "@/providers/AccountContext";

export default function Header() {
  const { accountId, setAccountId } = useAccount();
  const router = useRouter();

  const handleLogout = () => {
    setAccountId(null);
    // Clear session cookie
    document.cookie =
      "NEAR_ABSTRACT_ACCOUNT_SESSION=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    router.push("/login");
  };

  if (!accountId) {
    return null;
  }

  return (
    <header className="border-b bg-white/75 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-end items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/account")}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Account
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push("/transaction")}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Send Transaction
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {accountId}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
