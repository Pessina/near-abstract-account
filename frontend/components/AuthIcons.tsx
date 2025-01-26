import { Key } from "lucide-react"
import Image from "next/image"
import React from "react"

import metamask from "@/public/metamask.svg"
import phantom from "@/public/sol.svg"

export const MetaMaskIcon = () => (
    <Image src={metamask} alt="MetaMask" width="24" height="24" />
)

export const PhantomIcon = () => (
    <Image src={phantom} alt="Phantom" width="24" height="24" />
)

export const PasskeyIcon = () => (
    <Key className="w-6 h-6 text-indigo-600" />
) 