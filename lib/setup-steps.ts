// What is left to do on a business's page, in the order it is worth doing,
// as plain data so the flow can be tested without rendering anything.
//
// The same seven things the dashboard checklist counts. They are here
// because setting a page up is a journey with a shape — one thing at a
// time, a picture of what it is becoming — and a checklist is a list.

export type SetupStepId =
    | "logo"
    | "description"
    | "address"
    | "hours"
    | "cover"
    | "review"
    | "offer";

export type SetupState = {
    hasLogo: boolean;
    hasDescription: boolean;
    hasAddress: boolean;
    hasHours: boolean;
    hasCover: boolean;
    // Asked us to look, or already live: either way it is out of their hands.
    sentForReview: boolean;
    hasOffer: boolean;
};

export type SetupStep = {
    id: SetupStepId;
    // In the progress list, where there is room for two words.
    nav: string;
    title: string;
    blurb: string;
    done: boolean;
    // Whether the send button waits for it.
    //
    // The logo and the cover photo do not, because the page has a real
    // answer without either: a monogram of the business's initials, and
    // the cover's own empty state. Both steps offer "I'll add it later",
    // and a skip that the send button then refuses to honour is worse
    // than no skip at all — a business with no logo to hand, which is
    // most small ones, could not go live at all.
    //
    // The other three do block, because a page with no description, no
    // address and no hours is not a listing. Nothing here is a judgement
    // about quality: every page is read before it goes live, and that is
    // where a thin one gets its note.
    blocksSend: boolean;
};

const steps: {
    id: SetupStepId;
    nav: string;
    title: string;
    blurb: string;
    blocksSend: boolean;
    done: (state: SetupState) => boolean;
}[] = [
    {
        id: "logo",
        blocksSend: false,
        nav: "Logo",
        title: "Add your logo",
        blurb: "Customers recognise you by it — on your page, your offers and your stamp card.",
        done: (state) => state.hasLogo,
    },
    {
        id: "description",
        blocksSend: true,
        nav: "About you",
        title: "Say what you're known for",
        blurb: "Two or three sentences. This sits under your name wherever people find you.",
        done: (state) => state.hasDescription,
    },
    {
        id: "address",
        blocksSend: true,
        nav: "Address",
        title: "Where to find you",
        blurb: "So customers can get directions, and so you turn up when they browse your area.",
        done: (state) => state.hasAddress,
    },
    {
        id: "hours",
        blocksSend: true,
        nav: "Hours",
        title: "When you're open",
        blurb: "Shown on your page, so nobody arrives at a closed door.",
        done: (state) => state.hasHours,
    },
    {
        id: "cover",
        blocksSend: false,
        nav: "Cover photo",
        title: "The photo across the top",
        blurb: "The first thing people see in the directory. Your shop front, counter or best dish.",
        done: (state) => state.hasCover,
    },
    {
        id: "review",
        blocksSend: false,
        nav: "Send it",
        title: "Send your page to us",
        blurb: "We read every page before it goes live — usually the same day.",
        done: (state) => state.sentForReview,
    },
    {
        id: "offer",
        blocksSend: false,
        nav: "First offer",
        title: "Give people a reason to come in",
        blurb: "Your first offer goes on your page, and on a poster for your window.",
        done: (state) => state.hasOffer,
    },
];

export function setupSteps(state: SetupState): SetupStep[] {
    return steps.map(({ done, ...step }) => ({ ...step, done: done(state) }));
}

// Everything the page needs before it can be sent, whatever order it was
// done in. The one definition: the flow locks its button on this, and
// the setup emails say what is left using the same answer.
export function readyToSend(state: SetupState) {
    return steps.every((step) => !step.blocksSend || step.done(state));
}

export function setupProgress(list: SetupStep[]) {
    const done = list.filter((step) => step.done).length;

    return { done, total: list.length, percent: Math.round((done / list.length) * 100) };
}

// Where to put someone who hasn't said where they want to be. Finished,
// they are sent on to the dashboard instead, so this can be null.
export function firstUnfinished(list: SetupStep[]) {
    return list.find((step) => !step.done)?.id ?? null;
}

export function setupFinished(list: SetupStep[]) {
    return list.every((step) => step.done);
}

// The page is theirs to vouch for, so the steps before it are named where
// one is missing rather than quietly blocking the button.
export function missingBeforeReview(list: SetupStep[]) {
    return list.filter((step) => step.blocksSend && !step.done);
}

export function stepAt(list: SetupStep[], id: SetupStepId | null | undefined) {
    return list.find((step) => step.id === id) ?? null;
}

export function isSetupStepId(value: string | null | undefined): value is SetupStepId {
    return steps.some((step) => step.id === value);
}
