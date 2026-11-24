// What following this business is actually worth -- not what it is
// worth on the best plan.
//
// Each of these is somebody else's switch: new-offer emails go out only
// on Pro and above (claim_new_offer_email_recipients checks
// business_has_pro), and the two rewards need Growth and the automation
// turned on. A sheet in a window promising a birthday treat from a
// business that cannot send one is a promise made to a customer, in
// print, by us.
//
// First person, because the poster is the business talking. The page a
// scan opens says the same three lines, under their logo, so it talks
// the same way.
export type FollowPromises = {
    // business_has_pro: followers are emailed a new offer.
    emailsOffers: boolean;
    // Growth, and the automation switched on.
    welcome: boolean;
    birthday: boolean;
};

export function followReasons(promises: FollowPromises): string[] {
    const reasons: string[] = [];

    // Soonest first: the welcome lands within seconds of the scan.
    if (promises.welcome) {
        reasons.push("A welcome reward, on us");
    }

    if (promises.birthday) {
        reasons.push("A treat from us on your birthday");
    }

    if (promises.emailsOffers) {
        reasons.push("An email whenever we post a new offer");
    }

    return reasons;
}
