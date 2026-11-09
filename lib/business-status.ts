// How a business's approval status reads to its owner and team.
export const approvalLabels: Record<string, string> = {
    approved: "Live",
    pending: "Pending approval",
    rejected: "Needs changes",
    suspended: "Suspended",
};

export function approvalLabel(status: string) {
    return approvalLabels[status] ?? status;
}

// "Pending approval" is only true once the business has asked. Before
// that nothing is pending: the page is theirs, unsent, and nobody is
// looking at it — saying otherwise tells them to wait for us.
export function statusLabel(status: string, reviewRequested: boolean) {
    return status === "pending" && !reviewRequested ? "Not sent yet" : approvalLabel(status);
}
