import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export type LegalSection = {
    id: string;
    title: string;
    content: ReactNode;
};

type LegalDocumentProps = {
    title: string;
    description: string;
    updatedAt: string;
    effectiveDate?: string;
    version?: string;
    summary?: string[];
    sections: LegalSection[];
    draft?: boolean;
};

const policies = [
    { label: "Privacy", href: "/legal/privacy" },
    { label: "Terms", href: "/legal/terms" },
    { label: "Cookies", href: "/legal/cookies" },
    { label: "Refunds", href: "/legal/refunds" },
];

export function LegalDocument({
    title,
    description,
    updatedAt,
    effectiveDate,
    version,
    summary,
    sections,
    draft = false,
}: LegalDocumentProps) {
    return (
        <main>
            <section className="border-b bg-muted/30">
                <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
                    <Badge variant="outline">
                        Promotello legal
                    </Badge>

                    <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                        {title}
                    </h1>

                    <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                        {description}
                    </p>

                    <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-4 text-sm">
                        <div>
                            <dt className="text-muted-foreground">
                                Last updated
                            </dt>
                            <dd className="mt-1 font-medium">
                                {updatedAt}
                            </dd>
                        </div>

                        {effectiveDate && (
                            <div>
                                <dt className="text-muted-foreground">
                                    Effective from
                                </dt>
                                <dd className="mt-1 font-medium">
                                    {effectiveDate}
                                </dd>
                            </div>
                        )}

                        {version && (
                            <div>
                                <dt className="text-muted-foreground">
                                    Version
                                </dt>
                                <dd className="mt-1 font-medium">
                                    {version}
                                </dd>
                            </div>
                        )}
                    </dl>

                    {draft && (
                        <p
                            role="note"
                            className="mt-6 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
                        >
                            Draft template. The sections below are placeholders
                            for the final policy.
                        </p>
                    )}
                </div>
            </section>

            <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
                <aside>
                    <div className="lg:sticky lg:top-8">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            On this page
                        </p>

                        <nav
                            aria-label={`${title} contents`}
                            className="mt-4 space-y-1"
                        >
                            {sections.map((section, index) => (
                                <Button
                                    key={section.id}
                                    render={
                                        <Link href={`#${section.id}`} />
                                    }
                                    nativeButton={false}
                                    variant="ghost"
                                    className="h-auto w-full justify-start whitespace-normal py-2.5 text-left"
                                >
                                    <span className="mr-2 shrink-0 text-muted-foreground">
                                        {index + 1}.
                                    </span>
                                    {section.title}
                                </Button>
                            ))}
                        </nav>

                        <div className="mt-8 border-t pt-6">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                Other policies
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {policies.map((policy) => (
                                    <Button
                                        key={policy.href}
                                        render={
                                            <Link href={policy.href} />
                                        }
                                        nativeButton={false}
                                        variant="outline"
                                        size="sm"
                                    >
                                        {policy.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                <article className="min-w-0 max-w-3xl">
                    {summary && summary.length > 0 && (
                        <Card className="mb-10 rounded-2xl shadow-none">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    At a glance
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <ul className="list-disc space-y-3 pl-5 text-sm leading-7 text-muted-foreground">
                                    {summary.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>

                                <p className="mt-5 text-xs leading-6 text-muted-foreground">
                                    This overview does not replace the full
                                    policy below.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    <div className="divide-y">
                        {sections.map((section, index) => (
                            <section
                                key={section.id}
                                id={section.id}
                                aria-labelledby={`${section.id}-heading`}
                                className="scroll-mt-8 py-8 first:pt-0"
                            >
                                <h2
                                    id={`${section.id}-heading`}
                                    className="text-xl font-semibold tracking-tight sm:text-2xl"
                                >
                                    <span className="mr-2 text-muted-foreground">
                                        {index + 1}.
                                    </span>
                                    {section.title}
                                </h2>

                                <div className="mt-4 space-y-4 leading-8 text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
                                    {section.content}
                                </div>
                            </section>
                        ))}
                    </div>

                    <div className="mt-8 rounded-2xl border bg-muted/30 p-6">
                        <h2 className="text-lg font-semibold">
                            Have a question?
                        </h2>

                        <p className="mt-2 leading-7 text-muted-foreground">
                            Get in touch if you need help understanding this
                            document.
                        </p>

                        <Button
                            render={<Link href="/contact" />}
                            nativeButton={false}
                            variant="outline"
                            className="mt-4"
                        >
                            Contact Promotello
                        </Button>
                    </div>
                </article>
            </div>
        </main>
    );
}