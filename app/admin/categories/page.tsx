import { connection } from "next/server";
import { Suspense } from "react";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    CATEGORY_COLUMNS,
    groupCategories,
    type Category,
} from "@/lib/categories";
import { createClient } from "@/utils/supabase/server";
import { createCategory, deleteCategory, updateCategory } from "./actions";

type PageProps = {
    searchParams: Promise<{
        error?: string;
        saved?: string;
    }>;
};

type Usage = Record<string, { businesses: number; offers: number }>;

function LoadingState() {
    return (
        <div>
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="mt-8 h-12 w-64 rounded-md" />
            <div className="mt-10 space-y-4">
                {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-48 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}

function CategoryFields({
    category,
    idPrefix,
}: {
    category?: Category;
    idPrefix: string;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-name`}>Name</Label>
                <Input
                    id={`${idPrefix}-name`}
                    name="name"
                    required
                    minLength={2}
                    maxLength={60}
                    defaultValue={category?.name}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-slug`}>URL slug</Label>
                <Input
                    id={`${idPrefix}-slug`}
                    name="slug"
                    placeholder="Generated from the name"
                    defaultValue={category?.slug}
                />
            </div>

            <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`${idPrefix}-description`}>Description</Label>
                <Textarea
                    id={`${idPrefix}-description`}
                    name="description"
                    maxLength={300}
                    rows={2}
                    defaultValue={category?.description ?? ""}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-image`}>Image URL</Label>
                <Input
                    id={`${idPrefix}-image`}
                    name="imageUrl"
                    type="url"
                    placeholder="Optional"
                    defaultValue={category?.image_url ?? ""}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-sort`}>Sort order</Label>
                <Input
                    id={`${idPrefix}-sort`}
                    name="sortOrder"
                    type="number"
                    defaultValue={category?.sort_order ?? 0}
                />
            </div>
        </div>
    );
}

function EditCategory({
    category,
    usage,
    hasSubcategories = false,
}: {
    category: Category;
    usage: { businesses: number; offers: number };
    hasSubcategories?: boolean;
}) {
    const inUse = usage.businesses + usage.offers > 0 || hasSubcategories;

    return (
        <details className="group rounded-xl border border-[#17233B]/10 bg-white">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-sm text-[#17233B]/65">/{category.slug}</span>
                    {!category.is_active && (
                        <Badge variant="outline">Hidden</Badge>
                    )}
                </div>

                <span className="text-sm text-[#17233B]/70">
                    {usage.businesses} businesses · {usage.offers} offers
                </span>
            </summary>

            <div className="border-t border-[#17233B]/10 p-4">
                <form action={updateCategory} className="space-y-4">
                    <input type="hidden" name="id" value={category.id} />
                    <CategoryFields category={category} idPrefix={category.id} />

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            name="isActive"
                            defaultChecked={category.is_active}
                        />
                        Active (visible to businesses and customers)
                    </label>

                    <Button type="submit" size="sm">
                        Save changes
                    </Button>
                </form>

                <form action={deleteCategory} className="mt-4">
                    <input type="hidden" name="id" value={category.id} />
                    <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        disabled={inUse}
                        title={inUse ? "In use: deactivate it instead" : undefined}
                    >
                        Delete
                    </Button>
                    {inUse && (
                        <p className="mt-2 text-xs text-[#17233B]/70">
                            {hasSubcategories
                                ? "Has subcategories, so it can't be deleted."
                                : "In use, so it can't be deleted."}{" "}
                            Untick Active to hide it from new choices.
                        </p>
                    )}
                </form>
            </div>
        </details>
    );
}

async function CategoriesContent({ searchParams }: PageProps) {
    await connection();

    const { error: errorMessage, saved } = await searchParams;
    const supabase = await createClient();

    const [categoriesResult, businessesResult, offersResult] = await Promise.all([
        supabase.from("categories").select(CATEGORY_COLUMNS),
        supabase.from("businesses").select("category_id"),
        supabase.from("offers").select("category_id"),
    ]);

    const groups = groupCategories((categoriesResult.data ?? []) as Category[]);

    const usage: Usage = {};
    const count = (id: string | null, key: "businesses" | "offers") => {
        if (!id) return;
        usage[id] ??= { businesses: 0, offers: 0 };
        usage[id][key] += 1;
    };
    businessesResult.data?.forEach((row) => count(row.category_id, "businesses"));
    offersResult.data?.forEach((row) => count(row.category_id, "offers"));

    const usageFor = (id: string) => usage[id] ?? { businesses: 0, offers: 0 };

    return (
        <div>

            <header>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Categories
                </h1>

                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    Businesses and offers choose one of these subcategories.
                    Top-level categories group them on the site. Renaming a
                    category updates every business and offer that uses it.
                </p>
            </header>

            {errorMessage && (
                <Alert variant="destructive" className="mt-8">
                    <AlertTitle>That didn&apos;t save</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}

            {saved && !errorMessage && (
                <Alert className="mt-8 border-[#17233B]/10 bg-white">
                    <AlertTitle>Saved</AlertTitle>
                    <AlertDescription>Your category changes are live.</AlertDescription>
                </Alert>
            )}

            {categoriesResult.error ? (
                <Alert variant="destructive" className="mt-8">
                    <AlertTitle>Unable to load categories</AlertTitle>
                    <AlertDescription>Please refresh the page and try again.</AlertDescription>
                </Alert>
            ) : (
                <section className="mt-10 space-y-6">
                    {groups.map((group) => {
                        const groupUsage = group.subcategories.reduce(
                            (total, sub) => total + usageFor(sub.id).businesses,
                            0,
                        );

                        return (
                            <Card key={group.id} className="border-[#17233B]/10">
                                <CardHeader>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <CardTitle className="text-2xl">
                                            {group.name}
                                        </CardTitle>
                                        <span className="text-sm text-[#17233B]/70">
                                            {group.subcategories.length} subcategories ·{" "}
                                            {groupUsage} businesses
                                        </span>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3">
                                    <EditCategory
                                        category={group}
                                        usage={usageFor(group.id)}
                                        hasSubcategories={group.subcategories.length > 0}
                                    />

                                    <div className="space-y-3 border-l-2 border-[#FF593F]/20 pl-4">
                                        {group.subcategories.map((sub) => (
                                            <EditCategory
                                                key={sub.id}
                                                category={sub}
                                                usage={usageFor(sub.id)}
                                            />
                                        ))}

                                        <details className="rounded-xl border border-dashed border-[#17233B]/20">
                                            <summary className="cursor-pointer list-none p-4 text-sm font-medium text-[#FF593F]">
                                                + Add a subcategory to {group.name}
                                            </summary>
                                            <form
                                                action={createCategory}
                                                className="space-y-4 border-t border-[#17233B]/10 p-4"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="parentId"
                                                    value={group.id}
                                                />
                                                <CategoryFields idPrefix={`new-${group.id}`} />
                                                <Button type="submit" size="sm">
                                                    Add subcategory
                                                </Button>
                                            </form>
                                        </details>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    <Card className="border-dashed border-[#17233B]/20">
                        <CardHeader>
                            <CardTitle className="text-xl">
                                Add a top-level category
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <form action={createCategory} className="space-y-4">
                                <CategoryFields idPrefix="new-top" />
                                <Button type="submit" size="sm">
                                    Add category
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </section>
            )}
        </div>
    );
}

export default function CategoriesAdminPage({ searchParams }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <CategoriesContent searchParams={searchParams} />
        </Suspense>
    );
}
