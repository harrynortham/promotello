import type { Metadata } from "next";

import { LoyaltyGroupPage } from "../group-page";

export const metadata: Metadata = {
    title: "Loyalty cards you are collecting",
};

export default function Page(props: { searchParams: Promise<{ show?: string }> }) {
    return <LoyaltyGroupPage group="collecting" {...props} />;
}
