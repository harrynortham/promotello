// Who runs Promotello, for the privacy policy and terms. UK law requires a
// company's registered name, number and office address on its website.
// Until `name` is filled in, the legal pages show a "details to follow"
// note in their place.
export const company = {
    name: "",
    number: "",
    address: "",
    email: "hello@promotello.com",
};

export const companyComplete = Boolean(company.name && company.number && company.address);

// "Promotello Ltd (company number 12345678), 1 Example Street, Bristol"
export function companyLine() {
    return companyComplete
        ? `${company.name} (company number ${company.number}), ${company.address}`
        : "the company that owns Promotello (registered details to follow)";
}
