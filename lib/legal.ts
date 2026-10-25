// Who runs Promotello, for the privacy policy and terms. UK law requires a
// company's registered name, number and office address on its website:
// add the number once the company is incorporated.
export const company = {
  name: "Promotello",
  number: "",
  address: "71-75 Shelton Street, Covent Garden, London, WC2H 9JQ",
  email: "hello@promotello.com",
};

// "Promotello Ltd (company number 12345678), 71-75 Shelton Street, …",
// or without the number until there is one.
export function companyLine() {
  if (!company.name || !company.address) {
    return "the company that owns Promotello (registered details to follow)";
  }

  return company.number
    ? `${company.name} (company number ${company.number}), ${company.address}`
    : `${company.name}, ${company.address}`;
}
