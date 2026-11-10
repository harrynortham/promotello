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
};

const steps: { id: SetupStepId; nav: string; title: string; blurb: string; done: (state: SetupState) => boolean }[] = [
    {
        id: "logo",
        nav: "Logo",
        title: "Add your logo",
        blurb: "Customers recognise you by it — on your page, your offers and your stamp card.",
        done: (state) => state.hasLogo,
    },
    {
        id: "description",
        nav: "About you",
        title: "Say what you're known for",
        blurb: "Two or three sentences. This sits under your name wherever people find you.",
        done: (state) => state.hasDescription,
    },
    {
        id: "address",
        nav: "Address",
        title: "Where to find you",
        blurb: "So customers can get directions, and so you turn up when they browse your area.",
        done: (state) => state.hasAddress,
    },
    {
        id: "hours",
        nav: "Hours",
        title: "When you're open",
        blurb: "Shown on your page, so nobody arrives at a closed door.",
        done: (state) => state.hasHours,
    },
    {
        id: "cover",
        nav: "Cover photo",
        title: "The photo across the top",
        blurb: "The first thing people see in the directory. Your shop front, counter or best dish.",
        done: (state) => state.hasCover,
    },
    {
        id: "review",
        nav: "Send it",
        title: "Send your page to us",
        blurb: "We read every page before it goes live — usually the same day.",
        done: (state) => state.sentForReview,
    },
    {
        id: "offer",
        nav: "First offer",
        title: "Give people a reason to come in",
        blurb: "Your first offer goes on your page, and on a poster for your window.",
        done: (state) => state.hasOffer,
    },
];

export function setupSteps(state: SetupState): SetupStep[] {
    return steps.map(({ done, ...step }) => ({ ...step, done: done(state) }));
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
    return list.slice(0, list.findIndex((step) => step.id === "review")).filter((step) => !step.done);
}

export function stepAt(list: SetupStep[], id: SetupStepId | null | undefined) {
    return list.find((step) => step.id === id) ?? null;
}

export function isSetupStepId(value: string | null | undefined): value is SetupStepId {
    return steps.some((step) => step.id === value);
}
