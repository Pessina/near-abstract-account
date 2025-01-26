"use client";

import React from "react";

import { Button } from "@/components/ui/button";

interface AuthButtonProps {
    onClick: () => void;
    buttonText: string;
    className?: string;
}

export default function AuthButton({ onClick, buttonText, className }: AuthButtonProps) {
    return (
        <Button
            onClick={onClick}
            variant="outline"
            className={`flex-1 flex items-center justify-center gap-2 ${className || ""}`}
        >
            {buttonText}
        </Button>
    );
}
