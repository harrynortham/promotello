export type Offer = {
  slug: string;
  category: string;
  discount: string;
  title: string;
  description: string;
  availability: string;
  business: string;
  businessId: string;
  expiresAt: string;
  terms: string;
};

export const offers: Offer[] = [
  {
    slug: "local-coffee-spot",
    category: "Food & drink",
    discount: "20% off",
    title: "Your local coffee spot",
    description: "Enjoy 20% off your next visit.",
    availability: "Available nearby",
    business: "Harbor Coffee",
    businessId: "1",
    expiresAt: "2026-12-31",
    terms: "Valid once per customer. Cannot be combined with other offers.",
  },
  {
    slug: "weekend-dining",
    category: "Food & drink",
    discount: "15% off",
    title: "Weekend dining",
    description: "Save on your next local dining experience.",
    availability: "Available this weekend",
    business: "The Corner Table",
    businessId: "2",
    expiresAt: "2026-12-31",
    terms: "Valid once per customer. Cannot be combined with other offers.",
  },
];
