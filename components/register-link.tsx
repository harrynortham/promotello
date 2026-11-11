"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { useCurrentUser } from "@/components/site/use-current-user";

// Every "Start free" on the sales pages. Somebody signed in has already
// started free, so the button takes them to their dashboard instead of a
// form asking them to make the account they are using.
//
// Drop-in for the <Link href="/business/register" /> these buttons used
// to render, so each one keeps its own label and styling:
//
//     <Button render={<RegisterLink />} nativeButton={false} size="lg">
//
// While the answer is still on its way it points at the form, which is
// where a signed-out visitor is going; /business/register sends anyone
// signed in on from there, so an early click lands in the same place.
export function RegisterLink({ next, ...props }: { next?: string } & Omit<ComponentProps<typeof Link>, "href">) {
    const { user } = useCurrentUser();

    const href = user
        ? "/business/dashboard"
        : next
            ? `/business/register?next=${encodeURIComponent(next)}`
            : "/business/register";

    return <Link href={href} {...props} />;
}
