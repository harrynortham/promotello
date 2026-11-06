// Small two-tone illustrations for the main header links, in the brand's
// coral, ink and cream. Decorative: the link's label says what it is.

const INK = "#17233B";
const CORAL = "#FF593F";
const CREAM = "#FFF4E8";

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
    return (
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
            {children}
        </svg>
    );
}

// A compass, for finding your way around a city.
function ExploreIcon({ className }: IconProps) {
    return (
        <Svg className={className}>
            <circle cx="16" cy="16" r="12.5" fill={CREAM} stroke={INK} strokeWidth="1.75" />
            <path d="M22.4 9.6 18.2 18.2 9.6 22.4l4.2-8.6z" fill={INK} />
            <path d="M22.4 9.6 18.2 18.2 13.8 13.8z" fill={CORAL} />
            <circle cx="16" cy="16" r="1.5" fill={CREAM} />
        </Svg>
    );
}

// A price tag, for offers.
function OffersIcon({ className }: IconProps) {
    return (
        <Svg className={className}>
            <path
                d="M5 15.2V6.6A1.6 1.6 0 0 1 6.6 5h8.6c.42 0 .83.17 1.13.47l10.2 10.2a1.6 1.6 0 0 1 0 2.26l-8.6 8.6a1.6 1.6 0 0 1-2.26 0L5.47 16.33A1.6 1.6 0 0 1 5 15.2z"
                fill={CORAL}
                stroke={INK}
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <circle cx="10.5" cy="10.5" r="2.1" fill={CREAM} stroke={INK} strokeWidth="1.5" />
            <path d="m14.5 20.5 6-6" stroke={CREAM} strokeWidth="1.75" strokeLinecap="round" />
        </Svg>
    );
}

// Four tiles, for browsing by category.
function CategoriesIcon({ className }: IconProps) {
    return (
        <Svg className={className}>
            <rect x="4.5" y="4.5" width="10" height="10" rx="3" fill={CORAL} stroke={INK} strokeWidth="1.75" />
            <rect x="17.5" y="4.5" width="10" height="10" rx="5" fill={CREAM} stroke={INK} strokeWidth="1.75" />
            <rect x="4.5" y="17.5" width="10" height="10" rx="5" fill={CREAM} stroke={INK} strokeWidth="1.75" />
            <rect x="17.5" y="17.5" width="10" height="10" rx="3" fill={INK} stroke={INK} strokeWidth="1.75" />
        </Svg>
    );
}

// A shop front with a striped awning, for independent businesses.
function BusinessesIcon({ className }: IconProps) {
    return (
        <Svg className={className}>
            <path d="M6.5 13.5V26a1.5 1.5 0 0 0 1.5 1.5h16a1.5 1.5 0 0 0 1.5-1.5V13.5" fill={CREAM} stroke={INK} strokeWidth="1.75" />
            <path
                d="M4.5 9.5 7 4.5h18l2.5 5v1.5a3 3 0 0 1-5.75 1.2 3 3 0 0 1-5.75 0 3 3 0 0 1-5.75 0A3 3 0 0 1 4.5 11z"
                fill={CORAL}
                stroke={INK}
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <path d="M12.6 4.5 11.5 12M19.4 4.5l1.1 7.5" stroke={CREAM} strokeWidth="1.5" />
            <path d="M13 27.5v-6a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5v6" fill={INK} />
        </Svg>
    );
}

// A calendar page, for events.
function EventsIcon({ className }: IconProps) {
    return (
        <Svg className={className}>
            <rect x="4.5" y="6.5" width="23" height="21" rx="3.5" fill={CREAM} stroke={INK} strokeWidth="1.75" />
            <path d="M4.5 10a3.5 3.5 0 0 1 3.5-3.5h16a3.5 3.5 0 0 1 3.5 3.5v3h-23z" fill={CORAL} stroke={INK} strokeWidth="1.75" />
            <path d="M11 4v5M21 4v5" stroke={INK} strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="16" cy="20" r="3" fill={INK} />
        </Svg>
    );
}

// Three steps in order, for the walk-through. Bars with an arrow over
// them would say "growth" instead, which is a different page.
function HowItWorksIcon({ className }: IconProps) {
    return (
        <Svg className={className}>
            <circle cx="7.5" cy="8" r="3.5" fill={CORAL} stroke={INK} strokeWidth="1.75" />
            <path d="M15 8h12.5" stroke={INK} strokeWidth="1.75" strokeLinecap="round" />

            <circle cx="7.5" cy="16" r="3.5" fill={CREAM} stroke={INK} strokeWidth="1.75" />
            <path d="M15 16h9" stroke={INK} strokeWidth="1.75" strokeLinecap="round" />

            <circle cx="7.5" cy="24" r="3.5" fill={INK} />
            <path d="M15 24h11.5" stroke={INK} strokeWidth="1.75" strokeLinecap="round" />
        </Svg>
    );
}

// A sparkle, for what the product can do.
function FeaturesIcon({ className }: IconProps) {
    return (
        <Svg className={className}>
            <path
                d="M16 4.5c.6 4.9 1.9 7.4 4.6 8.4-2.7 1-4 3.5-4.6 8.4-.6-4.9-1.9-7.4-4.6-8.4 2.7-1 4-3.5 4.6-8.4z"
                fill={CORAL}
                stroke={INK}
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <path
                d="M24.5 17.5c.35 2.9 1.1 4.4 2.7 5-1.6.6-2.35 2.1-2.7 5-.35-2.9-1.1-4.4-2.7-5 1.6-.6 2.35-2.1 2.7-5z"
                fill={CREAM}
                stroke={INK}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <circle cx="7.5" cy="22.5" r="2.5" fill={INK} />
        </Svg>
    );
}

// A stack of coins, for what it costs. A tag would read as an offer,
// which is the customers' side of the site.
function PricingIcon({ className }: IconProps) {
    return (
        <Svg className={className}>
            <ellipse cx="16" cy="23" rx="10.5" ry="4.25" fill={INK} />
            <ellipse cx="16" cy="17.5" rx="10.5" ry="4.25" fill={CREAM} stroke={INK} strokeWidth="1.75" />
            <ellipse cx="16" cy="11.5" rx="10.5" ry="4.25" fill={CORAL} stroke={INK} strokeWidth="1.75" />
            <path d="M14 10.2h4M15 12.8h3" stroke={CREAM} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
    );
}

// A screen with a play button, for seeing it in action.
function DemoIcon({ className }: IconProps) {
    return (
        <Svg className={className}>
            <rect x="3.5" y="5.5" width="25" height="17" rx="3" fill={CREAM} stroke={INK} strokeWidth="1.75" />
            <path d="M13.5 10.5 20 14l-6.5 3.5z" fill={CORAL} stroke={INK} strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M16 22.5v4M11 27.5h10" stroke={INK} strokeWidth="1.75" strokeLinecap="round" />
        </Svg>
    );
}

// A page with its corner turned, for reading.
function BlogIcon({ className }: IconProps) {
    return (
        <Svg className={className}>
            <path
                d="M6.5 6A2.5 2.5 0 0 1 9 3.5h9.5l7 7V26a2.5 2.5 0 0 1-2.5 2.5H9A2.5 2.5 0 0 1 6.5 26z"
                fill={CREAM}
                stroke={INK}
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <path d="M18.5 3.5l7 7h-7z" fill={CORAL} stroke={INK} strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M11 16h10M11 21h7" stroke={INK} strokeWidth="1.75" strokeLinecap="round" />
        </Svg>
    );
}

export const navIcons = {
    explore: ExploreIcon,
    offers: OffersIcon,
    categories: CategoriesIcon,
    businesses: BusinessesIcon,
    events: EventsIcon,
    howItWorks: HowItWorksIcon,
    features: FeaturesIcon,
    pricing: PricingIcon,
    demo: DemoIcon,
    blog: BlogIcon,
};

export type NavIconName = keyof typeof navIcons;
