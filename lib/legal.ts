// Who runs Promotello. UK law (the Companies Act trading disclosures)
// requires a company's registered name, number, place of registration and
// registered office on its website and in its business emails.
export const company = {
  name: "Promotello Ltd",
  number: "17546946",
  registeredIn: "England and Wales",
  incorporated: "2026-10-27",
  address: "71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom",
  // General enquiries, shown on the contact pages.
  email: "hello@promotello.com",
  // Account, billing and refund help.
  supportEmail: "support@promotello.com",
};

// Registration with the Information Commissioner's Office. A UK controller
// processing names, emails, birthdays and visit history has to register and
// pay the data protection fee, and the reference belongs on the privacy
// policy. It lapses on `expires` unless the fee is paid again, so that date
// is here and not only on the certificate.
export const ico = {
  reference: "ZC305565",
  registered: "2026-11-17",
  expires: "2027-11-16",
  tier: "Tier 1",
  // Served from public/documents, linked from the privacy policy.
  certificate: "/documents/ico-registration-zc305565.pdf",
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
