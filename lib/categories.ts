import type { SupabaseClient } from "@supabase/supabase-js";

export type Category = {
    id: string;
    parent_id: string | null;
    slug: string;
    name: string;
    description: string | null;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
};

export type CategoryGroup = Category & {
    subcategories: Category[];
};

export const CATEGORY_COLUMNS =
    "id, parent_id, slug, name, description, image_url, sort_order, is_active";

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
