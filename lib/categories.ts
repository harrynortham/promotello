import type { SupabaseClient } from "@supabase/supabase-js";

export type Category = {
    id: string;
    parent_id: string | null;
    slug: string;
    name: string;
    description: string | null;
    image_url: string | null;
    // SVG path on a 24-box, drawn behind the business name on a
    // generated cover. Null means the shop front.
    icon_path: string | null;
    sort_order: number;
    is_active: boolean;
};

export type CategoryGroup = Category & {
    subcategories: Category[];
};

export const CATEGORY_COLUMNS =
    "id, parent_id, slug, name, description, image_url, icon_path, sort_order, is_active";

function bySortOrder(a: Category, b: Category) {
    return a.sort_order - b.sort_order || a.name.localeCompare(b.name);
}

// Top-level categories with their subcategories, both in admin sort order.
export function groupCategories(categories: Category[]): CategoryGroup[] {
    return categories
        .filter((category) => category.parent_id === null)
        .sort(bySortOrder)
        .map((parent) => ({
            ...parent,
            subcategories: categories
                .filter((category) => category.parent_id === parent.id)
                .sort(bySortOrder),
        }));
}

// RLS returns only active categories to everyone except platform admins.
export async function getCategoryGroups(supabase: SupabaseClient) {
    const { data, error } = await supabase
        .from("categories")
        .select(CATEGORY_COLUMNS);

    if (error) {
        throw error;
    }

    return groupCategories(data as Category[]);
}

// The top-level category a subcategory (or top-level category) belongs to.
export function topLevelFor(
    categoryId: string | null | undefined,
    groups: CategoryGroup[],
) {
    if (!categoryId) {
        return null;
    }

    return (
        groups.find(
            (group) =>
                group.id === categoryId ||
                group.subcategories.some((sub) => sub.id === categoryId),
        ) ?? null
    );
}

// True when categoryId is the given category or one of its subcategories.
export function isInCategory(
    categoryId: string | null | undefined,
    slug: string,
    groups: CategoryGroup[],
) {
    if (!categoryId) {
        return false;
    }

    const group = groups.find((item) => item.slug === slug);

    if (group) {
        return topLevelFor(categoryId, groups)?.id === group.id;
    }

    return groups.some((item) =>
        item.subcategories.some(
            (sub) => sub.slug === slug && sub.id === categoryId,
        ),
    );
}

// An example offer in the business's own trade, for the title field's
// placeholder.
//
// It used to say "20% off your next coffee" to everybody, so a bike
// shop, a barber and a hotel were all shown an example from a café. A
// placeholder is the one piece of copy a business reads while deciding
// what to write, and an example from somebody else's trade is worse
// than none: it is the first thing that says we were not really
// thinking about them.
//
// Keyed on the six top-level groups rather than the forty-odd
// categories under them, because that is a list somebody can keep true.
// Each one has to fit every trade under its group, not just the
// first: "£5 off your first cut" is no use to the optician and the
// dentist filed beside the barber, and "two for one on tickets" is no
// use to the gym filed beside the cinema.
const titleExamples: Record<string, string> = {
    "food-drink": "20% off your next coffee",
    "health-beauty": "10% off your first appointment",
    services: "10% off your first booking",
    shopping: "10% off your first purchase",
    "things-to-do": "Bring a friend for free",
    "travel-stays": "10% off a midweek stay",
};

// Never empty: a business whose category we cannot place still gets an
// example, just a plainer one.
export const DEFAULT_TITLE_EXAMPLE = "10% off your first visit";

export function offerTitleExample(
    categoryId: string | null | undefined,
    groups: CategoryGroup[],
) {
    const group = topLevelFor(categoryId, groups);

    return (group && titleExamples[group.slug]) || DEFAULT_TITLE_EXAMPLE;
}
