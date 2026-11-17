import { Button } from "@/components/ui/button";
import { pointQrCode } from "./actions";

// Re-aim a code that is already printed. No client state: a native select
// and a submit, so it works before the page has finished hydrating — which
// is the point, since this is the repair path for a poster that is out in
// the world right now.

type OfferOption = {
    id: string;
    title: string;
    approval_status: string;
};

export function PointQrCode({
    businessId,
    codeId,
    offers,
    loyalty,
}: {
    businessId: string;
    codeId: string;
    offers: OfferOption[];
    loyalty: { id: string; name: string } | null;
}) {
    const selectId = `point-${codeId}`;

    return (
        <form action={pointQrCode} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="codeId" value={codeId} />
            {loyalty && <input type="hidden" name="loyaltyProgramId" value={loyalty.id} />}

            <div className="min-w-0 flex-1 space-y-1.5">
                <label htmlFor={selectId} className="text-xs font-medium text-[#17233B]/70">
                    Point this poster at
                </label>

                <select
                    id={selectId}
                    name="target"
                    defaultValue="business"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                    <option value="business">Your business profile page</option>
                    {loyalty && <option value="loyalty">Loyalty card: {loyalty.name}</option>}
                    {offers.map((offer) => {
                        const waiting = offer.approval_status === "pending";

                        return (
                            <option key={offer.id} value={offer.id} disabled={waiting}>
                                Offer: {offer.title}
                                {waiting ? " — waiting for approval" : ""}
                            </option>
                        );
                    })}
                </select>
            </div>

            <Button type="submit" size="sm" variant="outline" className="shrink-0">
                Point it there
            </Button>
        </form>
    );
}
