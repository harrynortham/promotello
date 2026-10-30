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
