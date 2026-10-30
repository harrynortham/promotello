import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

import { Button } from "@/components/ui/button";

// The one way back on a dashboard page below the side menu (new offer, logo,
// hours…). Pages in the menu don't need one: the menu is always there.
export function BackButton({ href }: { href: string }) {
    return (
        <Button
            render={<Link href={href} />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="-ml-2.5 text-[#17233B]/70 hover:text-[#17233B]"
        >
            <FiArrowLeft aria-hidden="true" />
            Back
        </Button>
    );
}
