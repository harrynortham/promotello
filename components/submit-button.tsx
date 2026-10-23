"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
    children: React.ReactNode;
    pendingLabel: string;
    variant?: "default" | "outline";
    className?: string;
    name?: string;
    value?: string;
};

export function SubmitButton({
    children,
    pendingLabel,
    variant = "default",
    className,
    name,
    value,
}: SubmitButtonProps) {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            name={name}
            value={value}
            variant={variant}
            disabled={pending}
            className={className}
        >
            {pending ? pendingLabel : children}
        </Button>
    );
}
