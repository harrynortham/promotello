export type Offer = {
  slug: string;
  category: string;
  discount: string;
  title: string;
  description: string;
  availability: string;
};

export const offers: Offer[] = [
  {
    slug: "local-coffee-spot",
    category: "Food & drink",
    discount: "20% off",
    title: "Your local coffee spot",
    description: "Enjoy 20% off your next visit.",
    availability: "Available nearby",
  },
  {
    slug: "weekend-dining",
    category: "Food & drink",
    discount: "15% off",
    title: "Weekend dining",
    description: "Save on your next local dining experience.",
    availability: "Available this weekend",
  },
];
