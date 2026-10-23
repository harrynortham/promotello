"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
    children: React.ReactNode;
    pendingLabel: string;
    variant?: "default" | "outline";
    className?: string;
};

export function SubmitButton({
    children,
    pendingLabel,
    variant = "default",
    className,
}: SubmitButtonProps) {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            variant={variant}
            disabled={pending}
            className={className}
        >
            {pending ? pendingLabel : children}
        </Button>
    );
}
