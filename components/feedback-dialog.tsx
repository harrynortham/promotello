"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { FiCheckCircle, FiMessageSquare } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendBusinessFeedback } from "./feedback-actions";

const kinds = [
    { value: "idea", label: "An idea" },
    { value: "problem", label: "Something's wrong" },
    { value: "other", label: "Something else" },
] as const;

type Kind = (typeof kinds)[number]["value"];

// Somewhere for a business to say what it needs, from wherever it is in the
// dashboard. The page they were on goes with it, because "this is fiddly"
// means something different on Offers than on Billing.
export function FeedbackDialog({ businessId }: { businessId: string }) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [kind, setKind] = useState<Kind>("idea");
    const [message, setMessage] = useState("");
    const [state, setState] = useState<"editing" | "sending" | "sent" | "failed">("editing");

    function close(open: boolean) {
        setIsOpen(open);

        // Reset once it has closed, so a second visit starts clean.
        if (!open) {
            setTimeout(() => {
                setKind("idea");
                setMessage("");
                setState("editing");
            }, 200);
        }
    }

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setState("sending");

        const result = await sendBusinessFeedback({
            businessId,
            kind,
            message,
            page: pathname,
        });

        setState(result.ok ? "sent" : "failed");
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsOpen(true)}
            >
                <FiMessageSquare aria-hidden="true" />
                Share feedback
            </Button>

            <Dialog open={isOpen} onOpenChange={close}>
                <DialogContent className="sm:max-w-lg">
                    {state === "sent" ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <FiCheckCircle aria-hidden="true" className="text-emerald-600" />
                                    Thank you
                                </DialogTitle>
                                <DialogDescription>
                                    We read every one. If it needs a reply, we&apos;ll email you.
                                </DialogDescription>
                            </DialogHeader>

                            <Button type="button" onClick={() => close(false)} className="mt-2 w-full">
                                Close
                            </Button>
                        </>
                    ) : (
                        <form onSubmit={submit}>
                            <DialogHeader>
                                <DialogTitle>What would make Promotello better?</DialogTitle>
                                <DialogDescription>
                                    Tell us what you need, what got in your way, or what you wish it did.
                                </DialogDescription>
                            </DialogHeader>

                            <fieldset className="mt-5">
                                <legend className="text-sm font-medium text-[#17233B]">
                                    What kind of thing is it?
                                </legend>

                                <div className="mt-2 flex flex-wrap gap-2">
                                    {kinds.map((option) => (
                                        <label
                                            key={option.value}
                                            className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ${
                                                kind === option.value
                                                    ? "bg-[#FF593F] text-white"
                                                    : "bg-[#17233B]/5 text-[#17233B]/70 hover:bg-[#17233B]/10"
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="kind"
                                                value={option.value}
                                                checked={kind === option.value}
                                                onChange={() => setKind(option.value)}
                                                className="sr-only"
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="mt-5">
                                <Label htmlFor="feedback-message">Your message</Label>
                                <Textarea
                                    id="feedback-message"
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    rows={5}
                                    maxLength={2000}
                                    required
                                    minLength={10}
                                    placeholder="I'd love to be able to…"
                                    className="mt-2"
                                />
                            </div>

                            {state === "failed" && (
                                <p role="alert" className="mt-3 text-sm text-red-600">
                                    That didn&apos;t send. Please try again, or email support@promotello.com.
                                </p>
                            )}

                            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Button type="button" variant="ghost" onClick={() => close(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={state === "sending" || message.trim().length < 10}>
                                    {state === "sending" ? "Sending…" : "Send feedback"}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
