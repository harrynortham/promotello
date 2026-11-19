"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

// All writes go through the signed-in user's client: RLS only lets
// platform admins insert, update or delete categories.

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function readFields(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const slug = slugify(String(formData.get("slug") ?? "").trim() || name);
    const description = String(formData.get("description") ?? "").trim();
    const imageUrl = String(formData.get("imageUrl") ?? "").trim();
    const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);

    return {
        name,
        slug,
        description: description || null,
        image_url: imageUrl || null,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    };
}

function fail(message: string): never {
    redirect(`/admin/categories?error=${encodeURIComponent(message)}`);
}

function describeError(error: { code?: string; message: string }) {
    if (error.code === "23505") {
        return "That name or slug is already used. Choose another.";
    }

    if (error.code === "23503") {
        return "This category is still used by businesses or offers, or has subcategories. Deactivate it instead.";
    }

    if (error.code === "23514") {
        return "Check the name (2–60 characters), slug (lowercase letters, numbers and dashes) and description (up to 300 characters).";
    }

    return error.message;
}

export async function createCategory(formData: FormData) {
    const parentId = String(formData.get("parentId") ?? "") || null;
    const fields = readFields(formData);

    if (!fields.name) {
        fail("Enter a category name.");
    }

    const supabase = await createClient();
    const { error } = await supabase
        .from("categories")
        .insert({ ...fields, parent_id: parentId });

    if (error) {
        fail(describeError(error));
    }

    revalidatePath("/admin/categories");
    redirect("/admin/categories?saved=1");
}

export async function updateCategory(formData: FormData) {
    const id = String(formData.get("id") ?? "");
    const fields = readFields(formData);

    if (!fields.name) {
        fail("Enter a category name.");
    }

    const supabase = await createClient();
    const { error } = await supabase
        .from("categories")
        .update({
            ...fields,
            is_active: formData.get("isActive") === "on",
        })
        .eq("id", id);

    if (error) {
        fail(describeError(error));
    }

    revalidatePath("/admin/categories");
    redirect("/admin/categories?saved=1");
}

export async function deleteCategory(formData: FormData) {
    const id = String(formData.get("id") ?? "");
    const supabase = await createClient();

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
        fail(describeError(error));
    }

    revalidatePath("/admin/categories");
    redirect("/admin/categories?saved=1");
}
