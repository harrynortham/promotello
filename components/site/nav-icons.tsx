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

export const navIcons = {
    explore: ExploreIcon,
    offers: OffersIcon,
    categories: CategoriesIcon,
    businesses: BusinessesIcon,
    events: EventsIcon,
};

export type NavIconName = keyof typeof navIcons;
