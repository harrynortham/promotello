export type Offer = {
  id: string;
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
  businessLogoUrl?: string | null;
};
