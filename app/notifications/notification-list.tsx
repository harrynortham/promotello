"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { FiBell, FiTrash2 } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { NOTIFICATIONS_CHANGED } from "@/components/site/use-unread-notifications";
import { timeAgo } from "@/lib/uk-time";
import { deleteNotification, markAllNotificationsRead, markNotificationRead } from "./actions";

export type NotificationRow = {
    id: string;
    title: string;
    body: string | null;
    href: string | null;
    readAt: string | null;
    createdAt: string;
    // Shown only when this person runs more than one business, so a row
    // says which of them it is about.
    businessName: string | null;
};

// The list, and the three things a person does to it. Each change shows
// at once and is then confirmed by the server: marking something read is
// not worth watching a spinner for.
//
// Reading and deleting also refresh the route and tell the header, so
// the dot on the avatar agrees with the list without a reload.
export function NotificationList({
    notifications,
    showBusinessNames,
    pageSize,
}: {
    notifications: NotificationRow[];
    showBusinessNames: boolean;
    pageSize: number;
}) {
    const router = useRouter();
    const [, startTransition] = useTransition();

    // The header is above this list, not inside it, and nothing it
    // listens to has changed: the route is the same one.
    function tellTheHeader() {
        router.refresh();
        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    }

    const [shown, setShown] = useState(pageSize);

    type Change = { kind: "read"; id: string } | { kind: "read-all" } | { kind: "delete"; id: string };

    const [rows, apply] = useOptimistic(notifications, (current: NotificationRow[], change: Change) => {
        if (change.kind === "delete") return current.filter((row) => row.id !== change.id);

        const stamp = new Date().toISOString();

        return current.map((row) =>
            change.kind === "read-all" || row.id === change.id ? { ...row, readAt: row.readAt ?? stamp } : row,
        );
    });

    const unread = rows.filter((row) => !row.readAt).length;
    const visible = rows.slice(0, shown);

    function read(id: string) {
        startTransition(async () => {
            apply({ kind: "read", id });
            await markNotificationRead(id);
            tellTheHeader();
        });
    }

    if (rows.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-[#17233B]/20 bg-white px-6 py-14 text-center">
                <span
                    aria-hidden="true"
                    className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#FF593F]/10 text-[#FF593F]"
                >
                    <FiBell className="size-5" />
                </span>

                <p className="mx-auto mt-4 max-w-md leading-7 text-[#17233B]/65">
                    Nothing yet. We&apos;ll tell you here when something happens with your
                    offers, vouchers and the businesses you follow.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {unread > 0 && (
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            startTransition(async () => {
                                apply({ kind: "read-all" });
                                await markAllNotificationsRead();
                                tellTheHeader();
                            })
                        }
                    >
                        Mark all as read
                    </Button>
                </div>
            )}

            <ul className="space-y-3">
                {visible.map((row) => {
                    const unreadRow = !row.readAt;

                    const inside = (
                        <>
                            {/* Not colour alone: the dot is decoration and
                                the word is what is read out. */}
                            <span className="mt-1.5 flex size-2.5 shrink-0 items-center justify-center">
                                {unreadRow && (
                                    <>
                                        <span aria-hidden="true" className="size-2.5 rounded-full bg-[#FF593F]" />
                                        <span className="sr-only">Unread</span>
                                    </>
                                )}
                            </span>

                            <span className="min-w-0 flex-1">
                                <span
                                    className={`block ${unreadRow ? "font-semibold text-[#17233B]" : "text-[#17233B]/80"}`}
                                >
                                    {row.title}
                                </span>

                                {row.body && (
                                    <span className="mt-1 block text-sm leading-6 text-[#17233B]/65">
                                        {row.body}
                                    </span>
                                )}

                                <span className="mt-1.5 block text-xs text-[#17233B]/65">
                                    {timeAgo(row.createdAt)}
                                    {showBusinessNames && row.businessName && ` · ${row.businessName}`}
                                </span>
                            </span>
                        </>
                    );

                    return (
                        <li
                            key={row.id}
                            data-slot="notification"
                            className="flex items-start gap-3 rounded-xl border border-[#17233B]/10 bg-white p-4"
                        >
                            {row.href ? (
                                <Link
                                    href={row.href}
                                    onClick={() => unreadRow && read(row.id)}
                                    className="flex min-w-0 flex-1 items-start gap-3 rounded-lg transition hover:opacity-80"
                                >
                                    {inside}
                                </Link>
                            ) : (
                                <span className="flex min-w-0 flex-1 items-start gap-3">{inside}</span>
                            )}

                            <span className="flex shrink-0 items-center gap-1">
                                {/* Somewhere to go marks it read on the way;
                                    a row with nowhere needs its own button. */}
                                {!row.href && unreadRow && (
                                    <Button type="button" variant="ghost" size="sm" onClick={() => read(row.id)}>
                                        Mark as read
                                    </Button>
                                )}

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Delete notification: ${row.title}`}
                                    onClick={() =>
                                        startTransition(async () => {
                                            apply({ kind: "delete", id: row.id });
                                            await deleteNotification(row.id);
                                            tellTheHeader();
                                        })
                                    }
                                >
                                    <FiTrash2 aria-hidden="true" className="size-4" />
                                </Button>
                            </span>
                        </li>
                    );
                })}
            </ul>

            {rows.length > shown && (
                <div className="flex justify-center">
                    <Button type="button" variant="outline" onClick={() => setShown(shown + pageSize)}>
                        Show more
                    </Button>
                </div>
            )}
        </div>
    );
}
