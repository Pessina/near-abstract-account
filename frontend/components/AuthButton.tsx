"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";

interface AuthButtonProps {
    onClick: () => void;
    imageSrc: string;
    imageAlt: string;
    buttonText: string;
    disabled?: boolean;
}

const AuthButton = ({
    onClick,
    imageSrc,
    imageAlt,
    buttonText,
    disabled = false
}: AuthButtonProps) => {
    return (
        <Button
            onClick={onClick}
            className="flex items-center justify-center gap-2"
            variant="outline"
            disabled={disabled}
        >
            <Image
                src={imageSrc}
                alt={imageAlt}
                width={24}
                height={24}
            />
            <span>{buttonText}</span>
        </Button>
    );
};

export default AuthButton;
