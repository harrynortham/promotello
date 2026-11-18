"use client";

import { useState } from "react";
import { FiExternalLink } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postLetter, previewLetter } from "../actions";

// Posting a letter, which is the only thing in the pipeline that costs
// money and cannot be undone.
//
// Preview and post are deliberately not the same shape. A preview is a
// button: Stannp makes a sample PDF, charges nothing, and it can be
// pressed all day. Posting asks for a word to be typed, says where it
// is going and what it costs, and only then offers a button.
export function LetterCard({
    leadId,
    destination,
    cost,
}: {
    leadId: string;
    destination: string | null;
    cost: string;
}) {
    const [pdf, setPdf] = useState<string | null>(null);
    const [problem, setProblem] = useState("");
    const [busy, setBusy] = useState(false);
    const [confirming, setConfirming] = useState(false);

    async function onPreview() {
        setProblem("");
        setPdf(null);
        setBusy(true);

        const data = new FormData();
        data.set("leadId", leadId);

        const result = await previewLetter(data);

        if (result.error) setProblem(result.error);
        if (result.pdf) setPdf(result.pdf);

        setBusy(false);
    }

    if (!destination) {
        return (
            <p className="text-sm leading-6 text-[#17233B]/65">
                A letter needs a street address, a town and a postcode. Add them above and
                it can go.
            </p>
        );
    }

    return (
        <div className="space-y-4 text-sm">
            <div>
                <p className="text-xs uppercase tracking-wide text-[#17233B]/55">It would go to</p>
                <p className="mt-1 leading-6">{destination}</p>
            </div>

            {problem && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 leading-6 text-red-900">
                    {problem}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                <Button type="button" variant="outline" size="sm" onClick={onPreview} disabled={busy}>
                    {busy ? "Making it…" : "Preview the letter"}
                </Button>

                {pdf && (
                    <a
                        href={pdf}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#FF593F] hover:underline"
                    >
                        Open the sample
                        <FiExternalLink aria-hidden="true" className="size-3" />
                    </a>
                )}
            </div>

            <p className="text-[11px] leading-5 text-[#17233B]/55">
                A preview is made at Stannp and costs nothing. Nothing is printed or posted
                until you post it below.
            </p>

            <div className="border-t pt-4">
                {!confirming ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-0 text-[#FF593F]"
                        onClick={() => setConfirming(true)}
                    >
                        Post this letter
                    </Button>
                ) : (
                    <form action={postLetter} className="space-y-3">
                        <input type="hidden" name="leadId" value={leadId} />

                        <p className="leading-6 text-[#17233B]/70">
                            This prints and posts a letter to <strong>{destination}</strong> and
                            charges <strong>£{cost}</strong>. It cannot be cancelled once Stannp
                            starts printing.
                        </p>

                        <div className="space-y-1">
                            <Label htmlFor="confirm" className="text-xs">
                                Type <strong>post</strong> to confirm
                            </Label>
                            <Input id="confirm" name="confirm" autoComplete="off" className="max-w-40" />
                        </div>

                        <div className="flex items-center gap-3">
                            <Button type="submit" size="sm">Post it</Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirming(false)}
                            >
                                Not now
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
