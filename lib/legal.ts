// Who runs Promotello. UK law (the Companies Act trading disclosures)
// requires a company's registered name, number, place of registration and
// registered office on its website and in its business emails.
export const company = {
  name: "Promotello Ltd",
  number: "17546946",
  registeredIn: "England and Wales",
  incorporated: "2026-10-27",
  address: "71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom",
  email: "hello@promotello.com",
};

// For legal pages: "Promotello Ltd, a company registered in England and
// Wales (company number 17546946), whose registered office is at …".
export function companyLine() {
  return `${company.name}, a company registered in ${company.registeredIn} (company number ${company.number}), whose registered office is at ${company.address}`;
}

// The short disclosure for footers on the site and in emails.
export function companyDisclosure() {
  return `${company.name}, registered in ${company.registeredIn}, company number ${company.number}. Registered office: ${company.address}.`;
}
