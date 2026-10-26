import Markdoc, { type RenderableTreeNode } from "@markdoc/markdoc";
import Link from "next/link";
import React from "react";
import { FiAlertTriangle, FiArrowRight, FiBookOpen, FiZap } from "react-icons/fi";

import { Button } from "@/components/ui/button";

// Blog post content from Keystatic, with its custom blocks.

const ctaLinks: Record<string, { href: string; label: string }> = {
    signup: { href: "/business/register", label: "Start free" },
    pricing: { href: "/business/pricing", label: "See pricing" },
    features: { href: "/business/features", label: "See all features" },
    demo: { href: "/business/demo", label: "Try the demo" },
};

function CallToAction({ heading, text, target = "signup" }: { heading?: string; text?: string; target?: string }) {
    const link = ctaLinks[target] ?? ctaLinks.signup;

    return (
        <aside className="not-prose my-10 rounded-3xl bg-[#17233B] p-7 text-white sm:p-9">
            {heading && <p className="text-xl font-semibold sm:text-2xl">{heading}</p>}
            {text && <p className="mt-2 max-w-xl leading-7 text-white/80">{text}</p>}
            <Button render={<Link href={link.href} />} nativeButton={false} size="lg" className="mt-5">
                {link.label}
                <FiArrowRight aria-hidden="true" />
            </Button>
        </aside>
    );
}

const tones = {
    tip: { icon: FiZap, label: "Tip", className: "border-[#FF593F]/30 bg-[#FF593F]/5" },
    example: { icon: FiBookOpen, label: "Example", className: "border-[#17233B]/15 bg-white" },
    warning: { icon: FiAlertTriangle, label: "Watch out", className: "border-amber-300 bg-amber-50" },
};

function Callout({ tone = "tip", children }: { tone?: string; children?: React.ReactNode }) {
    const style = tones[tone as keyof typeof tones] ?? tones.tip;
    const Icon = style.icon;

    return (
        <div className={`not-prose my-8 rounded-2xl border p-5 sm:p-6 ${style.className}`}>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em]">
                <Icon aria-hidden="true" className="text-[#FF593F]" />
                {style.label}
            </p>
            <div className="mt-2 leading-7 text-[#17233B]/80 [&_p+p]:mt-3">{children}</div>
        </div>
    );
}

export function PostBody({ body }: { body: RenderableTreeNode }) {
    return (
        <div className="blog-prose">
            {Markdoc.renderers.react(body, React, { components: { CallToAction, Callout } })}
        </div>
    );
}
