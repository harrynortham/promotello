import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaXTwitter, FaYoutube } from "react-icons/fa6";

import { socialsOf, type SocialKey } from "@/lib/social-links";

// The brand marks, which are the only thing anybody actually reads in a
// row like this — nobody squints at the word "Instagram".
const ICONS: Record<SocialKey, React.ComponentType<{ "aria-hidden"?: boolean; className?: string }>> = {
    instagram: FaInstagram,
    facebook: FaFacebookF,
    tiktok: FaTiktok,
    x: FaXTwitter,
    youtube: FaYoutube,
    linkedin: FaLinkedinIn,
};

// Where else to find a business, on its public page.
//
// Renders nothing at all when there are none, rather than an empty
// card: a heading over a blank space reads as something broken.
export function SocialLinks({
    business,
    businessName,
}: {
    business: Partial<Record<`${SocialKey}_url`, string | null>>;
    businessName: string;
}) {
    const links = socialsOf(business);

    if (links.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2">
            {links.map(({ network, url }) => {
                const Icon = ICONS[network.key];

                return (
                    <a
                        key={network.key}
                        href={url}
                        target="_blank"
                        // noreferrer as well as noopener: these go to
                        // somebody else's site and there is no reason to
                        // tell it which page sent them.
                        rel="noopener noreferrer"
                        // The name as well as the network, because a
                        // screen reader reads this list on its own and
                        // "Instagram" six times down a directory is not
                        // an answer to "whose".
                        aria-label={`${businessName} on ${network.label}`}
                        title={network.label}
                        className="flex size-10 items-center justify-center rounded-full border border-[#17233B]/12 text-[#17233B]/70 transition hover:border-[#FF593F]/40 hover:bg-[#FF593F]/5 hover:text-[#FF593F]"
                    >
                        <Icon aria-hidden className="size-4" />
                    </a>
                );
            })}
        </div>
    );
}
