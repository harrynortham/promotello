import type { Metadata } from "next";

import HelpCentre, {
    type HelpGuide,
} from "@/components/help-centre";

export const metadata: Metadata = {
    title: "Business Help Centre",
    description:
        "Practical guides to promotions, vouchers, loyalty cards, QR posters, followers, automations, your team and billing.",
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
        title: "Redeem a customer’s voucher",
        description: "Scan it at the till and mark it as used.",
        steps: [
            "Sign in to Promotello on your phone with your business account.",
            "Point your phone camera at the QR code on the customer’s voucher and open the link.",
            "Check the promotion shown matches what the customer is asking for.",
            "Tap Mark as used, then give them the deal.",
            "No QR code? Find the customer’s code on your Redemptions page instead.",
        ],
        note:
            "You’ll see a warning if the voucher was already used, the promotion has ended, or it’s outside its set hours. Gift vouchers from automations (codes starting with G) work the same way.",
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
            "Use Privacy to request a copy of your data or delete your account.",
        ],
        note:
            "If you’re the only owner of a business with a team or a subscription, hand it over or cancel the subscription before deleting your account.",
        link: {
            label: "Open Account settings",
            href: "/account",
        },
    },
    {
        id: "loyalty-card",
        category: "Loyalty cards",
        title: "Start a loyalty card",
        description: "Set up a digital stamp card on Pro.",
        steps: [
            "Open your business and choose Loyalty card.",
            "Choose how many stamps it takes, from 3 to 20.",
            "Describe the reward and add any terms.",
            "Save it. Customers can now join from your page or your QR poster.",
        ],
        note: "Loyalty cards are part of Pro and Growth.",
        link: { label: "Open business dashboard", href: "/business/dashboard" },
    },
    {
        id: "stamp-card",
        category: "Loyalty cards",
        title: "Stamp a customer’s card",
        description: "Add a stamp by scanning at the till.",
        steps: [
            "Ask the customer to open their loyalty card on their phone.",
            "Scan the QR code on their card with your phone camera and open the link.",
            "Tap Add stamp.",
            "When the card is full, give them the reward and it starts again.",
        ],
        note: "Only members of your team can add stamps. Customers can’t stamp their own cards.",
    },
    {
        id: "qr-posters",
        category: "QR posters",
        title: "Make and print a QR poster",
        description: "Turn passers-by into followers and customers.",
        steps: [
            "Open your business and choose QR posters.",
            "Create a poster and name it after where it will go, like Front window.",
            "Choose what it promotes, then print it at A4 or A5.",
            "Check its scan count after a few days to see which spots work best.",
        ],
        note: "The Free plan includes one poster. Pro and Growth have no limit.",
    },
    {
        id: "followers",
        category: "Followers and emails",
        title: "How followers and offer emails work",
        description: "Customers who follow you hear about new promotions.",
        steps: [
            "Customers follow you from your page, a promotion page or your QR poster.",
            "On Pro and Growth, each new promotion is emailed to your followers when it goes live.",
            "Your follower count is shown in Analytics.",
        ],
        note: "You see how many followers you have, but not who they are. Every email has an unsubscribe link.",
    },
    {
        id: "google-reviews",
        category: "Followers and emails",
        title: "Get more Google reviews",
        description: "Ask customers who just visited for a review.",
        steps: [
            "In Google Business Profile, choose Ask for reviews and copy your link.",
            "Open your business, choose Edit business and paste it into Google review link.",
            "Customers who used a voucher or got a stamp in the last two weeks are asked for a review.",
        ],
        note: "Review prompts are part of Pro and Growth. Customers aren’t asked again for three months after clicking.",
    },
    {
        id: "automations",
        category: "Growth",
        title: "Switch on automations",
        description: "Welcome, birthday and win-back rewards.",
        steps: [
            "Open your business and choose Automations.",
            "Write the reward for each automation, like A free coffee.",
            "Choose how long the gift voucher lasts, and for win-back, how long since their last visit.",
            "Tick Send this automatically and save.",
        ],
        note: "Automations go to followers only, once a day. Gift vouchers are redeemed by scanning, like any voucher.",
    },
    {
        id: "quiet-hours",
        category: "Growth",
        title: "Make a quiet-hours promotion",
        description: "A promotion that only works at set times.",
        steps: [
            "Create or edit a promotion.",
            "Tick Only on set days and times.",
            "Choose the days, and the start and end times.",
            "Save. Customers can claim it any time but only use it in that window.",
        ],
        note: "Times are UK time. Staff see a warning if a customer tries to use it outside the window.",
    },
    {
        id: "hand-over",
        category: "Your team",
        title: "Hand over a business",
        description: "Make someone else the owner.",
        steps: [
            "Open your business and choose Team.",
            "In Hand over this business, enter the new owner’s email address.",
            "Send the hand-over. You can also copy the link and send it yourself.",
            "When they accept, they become the owner and you leave the team.",
        ],
        note: "The link lasts 14 days. Sending a new hand-over replaces any pending one.",
    },
    {
        id: "plans",
        category: "Plans and billing",
        title: "Choose, change or cancel a plan",
        description: "Free, Pro and Growth.",
        steps: [
            "Open your business and choose Billing.",
            "Pick Pro or Growth to start a 30-day free trial.",
            "Already subscribed? Switch between Pro and Growth from the same page.",
            "Use Manage billing to update your card, see invoices or cancel.",
        ],
        note: "If you cancel, you keep your plan until the end of the paid period, then move to Free.",
        link: { label: "See pricing", href: "/business/pricing" },
    },
];

export default function BusinessHelpPage() {
    return (
        <HelpCentre
            audience="Business help centre"
            title="Let’s keep your business moving."
            description="Practical guides for promotions, loyalty cards, QR posters, scanning at the till, automations and more."
            searchPlaceholder="Search scanning, loyalty, posters, billing…"
            guides={guides}
            contactHref="/business/contact"
            alternateHref="/help"
            alternateLabel="Looking for customer support?"
            gettingStartedHref="/business/getting-started"
        />
    );
}