import type { Metadata } from "next";

import HelpCentre, {
    type HelpGuide,
} from "@/components/help-centre";

export const metadata: Metadata = {
    title: "Help Centre",
    description:
        "Help with finding offers, claiming offers, using redemption codes, and managing your Promotello account.",
};

const guides: HelpGuide[] = [
    {
        id: "find-a-deal",
        category: "Discovering offers",
        title: "Find an offer you’ll enjoy",
        description: "Search, browse categories, and discover businesses.",
        steps: [
            "Open Explore to see what is on near you.",
            "Search for an offer or a business, or pick a category.",
            "Sort by newest, most popular, or ending soon.",
            "Open anything that catches your eye and read the full details before you claim.",
        ],
        link: {
            label: "Explore offers",
            href: "/explore",
        },
    },
    {
        id: "business-details",
        category: "Discovering offers",
        title: "Check a business before visiting",
        description: "Find its location, opening hours, and contact details.",
        steps: [
            "Find the business in the directory.",
            "Open its page to read about it and see what it is offering.",
            "Check the address and opening hours before you set off.",
            "Use its website or contact details for anything you need to ask first.",
        ],
        note:
            "If an offer needs a booking, call ahead rather than turning up.",
        link: {
            label: "Find a business",
            href: "/businesses",
        },
    },
    {
        id: "claim-an-offer",
        category: "Claims & vouchers",
        title: "Claim an offer",
        description: "Get a redemption code for an available offer.",
        steps: [
            "Open the offer and read what you get.",
            "Check when you can use it, when it ends, and any conditions.",
            "Sign in, or create an account if you have not got one.",
            "Choose Get this deal. Your voucher appears straight away.",
            "Have it ready on your phone when you visit.",
        ],
        note:
            "Claiming is not booking. If the offer says to book a table or an appointment, do that too.",
        link: {
            label: "Browse offers",
            href: "/offers",
        },
    },
    {
        id: "find-your-code",
        category: "Claims & vouchers",
        title: "Find a code you’ve already claimed",
        description: "Access your claimed offers from your dashboard.",
        steps: [
            "Sign in with the account you used to claim it.",
            "Open My vouchers in your dashboard.",
            "Find the offer and open it to show its QR code and short code.",
        ],
        note:
            "No confirmation email? Check My vouchers before claiming again — the voucher is there even when the email is not.",
        link: {
            label: "Open my vouchers",
            href: "/dashboard/redemptions",
        },
    },
    {
        id: "use-your-code",
        category: "Claims & vouchers",
        title: "Use your offer at the business",
        description: "Know what to do when you arrive.",
        steps: [
            "Check the offer has not ended and applies to the visit you are making.",
            "Follow anything it says about booking or times.",
            "Show the voucher on your phone to a member of staff.",
            "They scan it and mark it used as they give you the deal.",
        ],
        note:
            "Claimed means the voucher is yours. Used means the business has given you the deal.",
    },
    {
        id: "code-problem",
        category: "Claims & vouchers",
        title: "Get help with a redemption",
        description: "What to check if your code cannot be used.",
        steps: [
            "Check the offer has not ended, and that you are inside any days or times it sets.",
            "Check whether the voucher is already marked as used.",
            "Ask the business to look the code up on their side.",
            "Still stuck? Contact us with the business name, the offer and what happened.",
        ],
        note:
            "If a voucher was marked used by mistake, ask the business or contact us. Making a second account to claim again is not the way round it.",
        link: {
            label: "Contact support",
            href: "/contact",
        },
    },
    {
        id: "join-loyalty",
        category: "Loyalty cards",
        title: "Join a loyalty card",
        description: "Start collecting stamps at a business you like.",
        steps: [
            "Open the business\u2019s page, or scan its QR poster with your phone camera.",
            "Choose Join the loyalty card.",
            "Sign in, or create an account if you haven\u2019t got one yet.",
            "Your card appears under My loyalty cards, ready for its first stamp.",
        ],
        note:
            "The card lives in your Promotello account, so there is nothing to download and nothing to leave at home.",
        link: {
            label: "My loyalty cards",
            href: "/dashboard/loyalty",
        },
    },
    {
        id: "collect-stamp",
        category: "Loyalty cards",
        title: "Collect a stamp",
        description: "What to do at the till.",
        steps: [
            "Open My loyalty cards and pick the card for the business you are in.",
            "Show the QR code on the card to a member of staff when you pay.",
            "They scan it with their own phone and the stamp appears on your card.",
            "If their camera will not scan it, they can type the code printed under the QR instead.",
        ],
        note:
            "Only the business\u2019s team can add stamps, so nobody can stamp their own card.",
        link: {
            label: "My loyalty cards",
            href: "/dashboard/loyalty",
        },
    },
    {
        id: "loyalty-reward",
        category: "Loyalty cards",
        title: "Claim your reward",
        description: "What happens when the card is full.",
        steps: [
            "Collect the number of stamps shown on the card.",
            "The card then says \u201cReward ready: ask staff to redeem it\u201d.",
            "Show it to a member of staff on your next visit and they will hand the reward over.",
            "The card starts again, so you can work towards the next one.",
        ],
        note:
            "Your card keeps a count of the rewards you have had from that business.",
    },
    {
        id: "loyalty-new-phone",
        category: "Loyalty cards",
        title: "Use your card on another phone",
        description: "Your stamps follow your account, not your handset.",
        steps: [
            "Sign in with the same email address you used to join the card.",
            "Open My loyalty cards.",
            "Every card and every stamp is where you left it.",
        ],
        note:
            "Stamps are kept against your account, so a new phone or a cleared browser does not lose them.",
        link: {
            label: "Sign in",
            href: "/login",
        },
    },
    {
        id: "edit-profile",
        category: "Your account",
        title: "Update your profile",
        description: "Change your name, photo, or preferred town.",
        steps: [
            "Open Account settings from the header menu.",
            "Choose Profile.",
            "Update your display name or optional town or city, then save.",
            "Use Upload photo, Change photo, or Remove to manage your profile image.",
        ],
        note:
            "Photos must be JPG, PNG, or WebP and smaller than 2 MB. Your personal profile is shared across customer and business areas.",
        link: {
            label: "Edit my profile",
            href: "/account/profile",
        },
    },
    {
        id: "login-security",
        category: "Your account",
        title: "Change your email address",
        description: "Manage the address you use to sign in.",
        steps: [
            "Open Account settings and choose Security.",
            "Enter the new address and select Update email.",
            "Follow the confirmation instructions sent to both addresses.",
        ],
        note:
            "Your current address keeps working until the change is confirmed, so keep access to it.",
        link: {
            label: "Open Security settings",
            href: "/account/security",
        },
    },
    {
        id: "sign-in-code",
        category: "Your account",
        title: "Sign in with a code",
        description: "No password to remember.",
        steps: [
            "Open the sign-in page and enter your email address.",
            "Check your inbox for a six-digit code from Promotello.",
            "Type the code in to sign in.",
        ],
        note:
            "A code lasts an hour and works once. If it has expired, ask for a new one — and never share a code with anyone, including us.",
        link: {
            label: "Sign in",
            href: "/login",
        },
    },
    {
        id: "notifications",
        category: "Privacy & preferences",
        title: "See what has happened",
        description: "Your offers, vouchers and the businesses you follow.",
        steps: [
            "Open the account menu in the header. A dot on your photo means something is unread.",
            "Choose Notifications.",
            "Open one to go to what it is about, or mark it read and leave it.",
        ],
        note:
            "We email you as well. Which emails arrive is up to you, on Email preferences; what has happened is here either way.",
        link: {
            label: "Open your notifications",
            href: "/notifications",
        },
    },
    {
        id: "email-preferences",
        category: "Privacy & preferences",
        title: "Choose your email preferences",
        description: "Control optional updates from Promotello.",
        steps: [
            "Open Account settings and choose Email preferences.",
            "Switch optional email categories on or off.",
            "Select Save preferences.",
        ],
        note:
            "Password resets, email confirmations, and essential account messages are separate from optional emails.",
        link: {
            label: "Manage email preferences",
            href: "/account/notifications",
        },
    },
    {
        id: "privacy-requests",
        category: "Privacy & preferences",
        title: "Request your data or account deletion",
        description: "Find the right way to contact us about your privacy.",
        steps: [
            "Open Privacy in your account settings.",
            "Read what we hold and what you can ask for.",
            "Email support from your account address and tell us what you need.",
            "We may ask you to confirm it is you before we act.",
        ],
        note:
            "If you also run a business on Promotello, hand it over or cancel its subscription first, because deleting your account affects it too.",
        link: {
            label: "Open Privacy settings",
            href: "/account/privacy",
        },
    },
];

export default function CustomerHelpPage() {
    return (
        <HelpCentre
            audience="Customer help centre"
            title="A little help along the way."
            description="Find clear steps for discovering deals, using your codes, and looking after your account."
            searchPlaceholder="Search claims, sign-in codes, profile photos…"
            guides={guides}
            contactHref="/contact"
            alternateHref="/business/help"
            alternateLabel="Looking for business support?"
        />
    );
}