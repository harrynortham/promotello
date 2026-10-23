import type { Metadata } from "next";

import HelpCentre, {
    type HelpGuide,
} from "@/components/help-centre";

export const metadata: Metadata = {
    title: "Help Centre",
    description:
        "Help with finding offers, claiming promotions, using redemption codes, and managing your Promotello account.",
};

const guides: HelpGuide[] = [
    {
        id: "find-a-deal",
        category: "Discovering offers",
        title: "Find an offer you’ll enjoy",
        description: "Search, browse categories, and discover businesses.",
        steps: [
            "Open Explore to browse available promotions.",
            "Search for a promotion or business, or choose a category.",
            "Use the sorting options to view newest, popular, or expiring offers.",
            "Open an offer to read its full details before claiming.",
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
            "Open the business directory and find the business.",
            "Visit its profile to read about it and view available promotions.",
            "Check its published address and opening hours.",
            "Use the website or contact details for booking questions or specific requirements.",
        ],
        note:
            "If an offer requires a booking, contact the business before visiting.",
        link: {
            label: "Find a business",
            href: "/businesses",
        },
    },
    {
        id: "claim-an-offer",
        category: "Claims & vouchers",
        title: "Claim a promotion",
        description: "Get a redemption code for an available offer.",
        steps: [
            "Open the promotion and read what is included.",
            "Check the availability, expiry date, and terms.",
            "Sign in to your account if needed.",
            "Select “Get this deal” and wait for confirmation.",
            "Keep your code available for your visit.",
        ],
        note:
            "Claiming a promotion does not book an appointment or table. Follow any booking instructions in the offer.",
        link: {
            label: "Browse promotions",
            href: "/offers",
        },
    },
    {
        id: "find-your-code",
        category: "Claims & vouchers",
        title: "Find a code you’ve already claimed",
        description: "Access your claimed promotions from your dashboard.",
        steps: [
            "Sign in with the account you used to claim the promotion.",
            "Open your customer dashboard.",
            "Go to My vouchers or My redemptions.",
            "Find the promotion and display its redemption code.",
        ],
        note:
            "If a confirmation email didn’t arrive, check your account records before trying to claim again.",
        link: {
            label: "Open my vouchers",
            href: "/dashboard/redemptions",
        },
    },
    {
        id: "use-your-code",
        category: "Claims & vouchers",
        title: "Use your promotion at the business",
        description: "Know what to do when you arrive.",
        steps: [
            "Check the offer is within its expiry date and applies to your visit.",
            "Follow any booking or availability requirements.",
            "Show your redemption code to a member of staff.",
            "The business checks the code and marks it as used when providing the deal.",
        ],
        note:
            "Claimed means you have a code. Used means the business has recorded that the deal was fulfilled.",
    },
    {
        id: "code-problem",
        category: "Claims & vouchers",
        title: "Get help with a redemption",
        description: "What to check if your code cannot be used.",
        steps: [
            "Check the promotion’s expiry, availability, and conditions.",
            "Check whether the redemption is already marked as used.",
            "Ask the business to check the code against its redemption records.",
            "If the issue remains, contact Promotello with the business name, promotion title, and a description of the problem.",
        ],
        note:
            "If you think a code was marked as used incorrectly, do not try to create another account to claim again. Ask the business or contact support.",
        link: {
            label: "Contact support",
            href: "/contact",
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
        title: "Change your password or email",
        description: "Manage the details you use to sign in.",
        steps: [
            "Open Account settings and choose Security.",
            "For a password change, enter your current password and confirm your new password.",
            "For an email change, enter your new address and current password.",
            "Follow any email confirmation instructions to finish changing your email.",
        ],
        note:
            "If you have forgotten your password, use the password reset link instead.",
        link: {
            label: "Open Security settings",
            href: "/account/security",
        },
    },
    {
        id: "reset-password",
        category: "Your account",
        title: "Reset a forgotten password",
        description: "Get back into your account.",
        steps: [
            "Open the sign-in page and select Forgot password.",
            "Enter the email address used for your account.",
            "Check your inbox and spam folder for reset instructions.",
            "Follow the reset link and choose a new password.",
        ],
        note:
            "If a link has expired, request a new one. Never share password reset links.",
        link: {
            label: "Reset password",
            href: "/forgot-password",
        },
    },
    {
        id: "email-preferences",
        category: "Privacy & preferences",
        title: "Choose your email preferences",
        description: "Control optional updates from Promotello.",
        steps: [
            "Open Account settings and choose Notifications.",
            "Switch optional email categories on or off.",
            "Select Save preferences.",
        ],
        note:
            "Password resets, email confirmations, and essential account messages are separate from optional emails.",
        link: {
            label: "Manage notifications",
            href: "/account/notifications",
        },
    },
    {
        id: "privacy-requests",
        category: "Privacy & preferences",
        title: "Request your data or account deletion",
        description: "Find the right way to contact us about your privacy.",
        steps: [
            "Open the Privacy page in your account.",
            "Read the information about data requests or account deletion.",
            "Contact support using your account email and explain your request.",
            "Follow any identity verification instructions we provide.",
        ],
        note:
            "These requests are handled through support. If you also own a business, account deletion needs a review of business ownership and responsibilities.",
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
            searchPlaceholder="Search claims, passwords, profile photos…"
            guides={guides}
            contactHref="/contact"
            alternateHref="/business/help"
            alternateLabel="Looking for business support?"
        />
    );
}