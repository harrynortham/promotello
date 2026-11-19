"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
    children: React.ReactNode;
    pendingLabel: string;
    variant?: "default" | "outline";
    size?: "default" | "sm" | "lg";
    className?: string;
    name?: string;
    value?: string;
    // Separate from pending: a button that cannot be pressed at all,
    // like Send with no sender configured.
    disabled?: boolean;
};

export function SubmitButton({
    children,
    pendingLabel,
    variant = "default",
    size,
    className,
    name,
    value,
    disabled = false,
}: SubmitButtonProps) {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            name={name}
            value={value}
            variant={variant}
            size={size}
            disabled={pending || disabled}
            className={className}
        >
            {pending ? pendingLabel : children}
        </Button>
    );
}
