import type { Metadata } from "next";

import HelpCentre, {
    type HelpGuide,
} from "@/components/help-centre";

export const metadata: Metadata = {
    title: "Business Help Centre",
    description:
        "Practical guides to business profiles, promotions, claim limits, customer redemptions, team access, and notifications.",
};

const guides: HelpGuide[] = [
    {
        id: "add-business",
        category: "Business setup",
        title: "Add your business",
        description: "Create a profile and prepare for review.",
        steps: [
            "Create an account or sign in.",
            "Open the business dashboard and choose Add business.",
            "Complete the onboarding form with your business details.",
            "After creation, open Manage business to continue setting up your profile.",
            "Check the approval status shown in your business overview.",
        ],
        note:
            "Your business must be approved before its promotions can appear publicly.",
        link: {
            label: "Add a business",
            href: "/onboarding",
        },
    },
    {
        id: "update-business",
        category: "Business setup",
        title: "Update your public business profile",
        description: "Manage your logo, description, location, and hours.",
        steps: [
            "Open your business dashboard and choose Manage business.",
            "Choose Edit business from the business navigation.",
            "Update the information you want customers to see.",
            "Save your changes and check the public profile.",
        ],
        note:
            "Owners and business admins can edit business details. Your personal profile is managed separately in Account settings.",
        link: {
            label: "Open business dashboard",
            href: "/business/dashboard",
        },
    },
    {
        id: "switch-business",
        category: "Business setup",
        title: "Switch between businesses",
        description: "Move between the businesses you belong to.",
        steps: [
            "Open the business dashboard to see your business cards.",
            "Choose Manage business for the business you want.",
            "On desktop, use the business switcher in the sidebar to change businesses.",
            "On mobile, open the business menu to find the switcher.",
        ],
        note:
            "Only businesses you belong to are available. The switcher appears when you have more than one business.",
    },
    {
        id: "create-promotion",
        category: "Promotions",
        title: "Create a promotion",
        description: "Prepare an offer customers can understand.",
        steps: [
            "Open Manage business and choose Promotions.",
            "Choose Create promotion.",
            "Add a title, description, image, and offer details.",
            "Set availability, expiry, terms, and an optional total claim limit.",
            "Submit the promotion and check its approval status.",
        ],
        note:
            "Owners and business admins can create promotions. Both the business and promotion must be approved for public visibility.",
        link: {
            label: "Open business dashboard",
            href: "/business/dashboard",
        },
    },
    {
        id: "claim-limits",
        category: "Promotions",
        title: "Understand promotion claim limits",
        description: "Choose how many customers can claim a promotion.",
        steps: [
            "Set an optional total claim limit when creating or editing the promotion.",
            "Choose a limit your stock, staffing, and capacity can accommodate.",
            "Follow the recorded claim count and remaining availability.",
            "Further claims stop when the configured limit is reached.",
        ],
        note:
            "The limit counts claims, not completed visits. A customer can claim a code without using it.",
    },
    {
        id: "approval",
        category: "Promotions",
        title: "Check why a promotion is not public",
        description: "Review approval and availability before contacting support.",
        steps: [
            "Check that the business is approved.",
            "Check that the promotion is approved.",
            "Check the promotion has not expired.",
            "Review any feedback and correct the information requested.",
            "Contact support if the status or visibility still looks incorrect.",
        ],
        note:
            "Do not treat an approved status alone as proof that an offer is currently available to claim. Expiry and claim limits also matter.",
        link: {
            label: "Contact business support",
            href: "/business/contact",
        },
    },
    {
        id: "edit-promotion",
        category: "Promotions",
        title: "Edit a promotion",
        description: "Keep your offer information accurate.",
        steps: [
            "Open your business and choose Promotions.",
            "Find the promotion and choose Edit promotion.",
            "Update the relevant details and save.",
            "Check its approval status after saving.",
        ],
        note:
            "Before changing an offer that already has claims, consider the terms customers saw when they claimed. Contact support if you need help handling existing claims.",
    },
    {
        id: "validate-code",
        category: "Customer redemptions",
        title: "Check a customer’s code",
        description: "Record a deal as used when your team fulfils it.",
        steps: [
            "Open the correct business and choose Redemptions.",
            "Find the code shown by the customer.",
            "Check the promotion details and whether the code is already used.",
            "Check the offer’s applicable terms and expiry.",
            "Mark it as used when providing the deal.",
        ],
        note:
            "Only validate a code presented for fulfilment. Unused claims do not mean customers are waiting at your business.",
    },
    {
        id: "unused-claims",
        category: "Customer redemptions",
        title: "Understand unused claims",
        description: "Why claims and completed redemptions are different.",
        steps: [
            "Treat a claim as a customer receiving a redemption code.",
            "Treat a used redemption as a code your team has marked as fulfilled.",
            "Leave codes unused when the customer has not received the deal.",
            "Compare claims and used redemptions when reviewing promotion activity.",
        ],
        note:
            "Do not mark unused codes as used to clear the list. An unused code is not proof of a visit or a sale.",
    },
    {
        id: "redemption-problem",
        category: "Customer redemptions",
        title: "Resolve a code or redemption issue",
        description: "What to check when a redemption does not look right.",
        steps: [
            "Confirm you are viewing the correct business.",
            "Check the code carefully against the customer’s screen.",
            "Review whether the code has already been marked as used.",
            "Check the promotion’s expiry and terms.",
            "Contact support with the promotion name and a description of the issue if you cannot resolve it.",
        ],
        note:
            "Do not ask a customer to claim from another account to work around a code problem.",
        link: {
            label: "Contact business support",
            href: "/business/contact",
        },
    },
    {
        id: "invite-team",
        category: "Team & access",
        title: "Invite a team member",
        description: "Give colleagues access to your business.",
        steps: [
            "As the business owner, open the business and choose Team.",
            "Enter the colleague’s email address and choose an available role.",
            "Send the invitation.",
            "Ask the colleague to open the invitation while signed in with the invited email address.",
            "Check the team page after they accept.",
        ],
        note:
            "An invitation sent to one email cannot be accepted by an account using a different email.",
    },
    {
        id: "team-permissions",
        category: "Team & access",
        title: "Understand team permissions",
        description: "Give each colleague the access they need.",
        steps: [
            "Owners manage team access and invitations.",
            "Owners and business admins can manage business details and promotions.",
            "Team members can view customer redemptions and mark codes as used.",
            "Ask the owner to review your role if an expected management link is missing.",
        ],
        note:
            "Personal account settings apply to the individual user. Business membership does not grant access to another person’s password or personal account.",
    },
    {
        id: "business-emails",
        category: "Notifications & reporting",
        title: "Choose business email notifications",
        description: "Manage summaries and promotion availability updates.",
        steps: [
            "As an owner or business admin, open the relevant business.",
            "Choose Notifications.",
            "Set preferences for daily summaries, fully claimed promotions, and low inventory.",
            "Adjust the low-inventory threshold if needed and save.",
        ],
        note:
            "These settings are separate from personal email preferences under Account settings.",
    },
    {
        id: "performance",
        category: "Notifications & reporting",
        title: "Review promotion activity",
        description: "Use your dashboard to understand the response.",
        steps: [
            "Open the individual business overview to see promotion metrics.",
            "Review the performance and claim counts for your promotions.",
            "Open Redemptions to check which codes have been marked as used.",
            "Use the Analytics page for the reporting available to your role.",
        ],
        note:
            "Claims and used redemptions measure different events. Neither should be described as revenue without supporting sales information.",
    },
    {
        id: "personal-account",
        category: "Your account",
        title: "Update your own account",
        description: "Manage your personal profile, login, and preferences.",
        steps: [
            "Open the account menu in the header and choose Account settings.",
            "Use Profile for your name and photo.",
            "Use Security for password and email changes.",
            "Use Notifications for optional personal emails.",
            "Use Privacy for information about data and deletion requests.",
        ],
        note:
            "Deleting a personal account can affect business access. Business owners should contact support to review ownership before requesting deletion.",
        link: {
            label: "Open Account settings",
            href: "/account",
        },
    },
];

export default function BusinessHelpPage() {
    return (
        <HelpCentre
            audience="Business help centre"
            title="Let’s keep your business moving."
            description="Practical guides for setting up your business, managing promotions, and helping your team welcome customers."
            searchPlaceholder="Search promotions, codes, team access…"
            guides={guides}
            contactHref="/business/contact"
            alternateHref="/help"
            alternateLabel="Looking for customer support?"
            gettingStartedHref="/business/getting-started"
        />
    );
}