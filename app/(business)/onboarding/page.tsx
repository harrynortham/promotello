import { redirect } from "next/navigation";

// Adding a business is the first screen of the setup flow now, so the two
// wizards people used to walk through back to back are one. This address
// is in old emails and links, so it keeps working.
export default function OnboardingPage() {
    redirect("/business/setup/new");
}
