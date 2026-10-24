import Image from "next/image";
import type { ReactNode } from "react";
import {
    FiBarChart2,
    FiBell,
    FiCamera,
    FiCheck,
    FiCheckCircle,
    FiGift,
    FiGrid,
    FiHeart,
    FiHome,
    FiStar,
} from "react-icons/fi";

import { DailyBars } from "@/components/daily-bars";
import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { VoucherQr } from "@/components/voucher-qr";

// Illustrations of the product for the business marketing pages, built from
// the app's real components with made-up data for a café, so they always
// match what businesses actually get.

const business = "Harbour Grind";

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

export function PhoneFrame({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
    return (
        <figure
            aria-label={label}
            className={`w-64 shrink-0 rounded-[2.5rem] border-[10px] border-[#17233B] bg-[#FFF8F0] shadow-2xl shadow-[#17233B]/20 ${className}`}
        >
            <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-[#17233B]/15" aria-hidden="true" />
            <div className="px-4 pb-6 pt-4 text-[#17233B]">{children}</div>
        </figure>
    );
}

export function BrowserFrame({ children, url, label, className = "" }: { children: ReactNode; url: string; label: string; className?: string }) {
    return (
        <figure
            aria-label={label}
            className={`overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white shadow-2xl shadow-[#17233B]/15 ${className}`}
        >
            <div className="flex items-center gap-2 border-b border-[#17233B]/10 bg-[#FFF8F0] px-4 py-2.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-[#FF593F]/60" />
                <span className="size-2.5 rounded-full bg-[#17233B]/15" />
                <span className="size-2.5 rounded-full bg-[#17233B]/15" />
                <span className="ml-3 truncate rounded-md bg-white px-3 py-0.5 text-[11px] text-[#17233B]/50">{url}</span>
            </div>
            <div className="text-[#17233B]">{children}</div>
        </figure>
    );
}

// ---------------------------------------------------------------------------
// Customer screens
// ---------------------------------------------------------------------------

export function LoyaltyCardScreen({ stamps = 7 }: { stamps?: number }) {
    return (
        <PhoneFrame label="A customer's loyalty card on their phone">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF593F]">My loyalty cards</p>
            <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-[#17233B]/55">{business}</p>
                <p className="mt-0.5 font-semibold leading-snug">Buy 9 coffees, get the 10th free</p>
                <div className="mt-3">
                    <LoyaltyStamps stamps={stamps} required={10} size="sm" />
                </div>
                <p className="mt-3 text-xs text-[#17233B]/55">{10 - stamps} more to a free coffee</p>
            </div>
            <div className="mt-3 rounded-2xl bg-white p-4 text-center shadow-sm">
                <VoucherQr code="HGCARD7Q2K" className="mx-auto w-28" />
                <p className="mt-2 text-[11px] text-[#17233B]/55">Show this to be stamped</p>
            </div>
        </PhoneFrame>
    );
}

export function VoucherScreen() {
    return (
        <PhoneFrame label="A customer's voucher on their phone">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF593F]">My vouchers</p>
            <div className="mt-3 rounded-2xl bg-white p-4 text-center shadow-sm">
                <span className="inline-flex rounded-full bg-[#FF593F] px-3 py-1 text-xs font-semibold text-white">Free pastry</span>
                <p className="mt-2 text-sm font-semibold leading-snug">With any coffee before 10am</p>
                <p className="text-xs text-[#17233B]/55">{business}</p>
                <VoucherQr code="HG7K2Q4M8P" className="mx-auto mt-3 w-32" />
                <p className="mt-2 font-mono text-sm font-semibold tracking-widest">HG7K2Q4M8P</p>
                <p className="mt-1 text-[11px] text-[#17233B]/55">Staff scan this to redeem</p>
            </div>
        </PhoneFrame>
    );
}

// ---------------------------------------------------------------------------
// Staff screen
// ---------------------------------------------------------------------------

export function StaffScanScreen() {
    return (
        <PhoneFrame label="A member of staff stamping a card after scanning it">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#17233B]/55">
                <FiCamera aria-hidden="true" className="text-[#FF593F]" />
                Scanned
            </div>
            <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-[#17233B]/55">Loyalty card</p>
                <p className="mt-0.5 font-semibold">Ellie · 7 of 10 stamps</p>
                <div className="mt-3">
                    <LoyaltyStamps stamps={7} required={10} size="sm" />
                </div>
                <div className="mt-4 rounded-xl bg-[#FF593F] py-2.5 text-center text-sm font-semibold text-white">Add stamp</div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                <FiCheckCircle aria-hidden="true" className="shrink-0" />
                No app, no card reader: just the staff member&apos;s phone camera.
            </div>
        </PhoneFrame>
    );
}

// ---------------------------------------------------------------------------
// QR poster
// ---------------------------------------------------------------------------

export function PosterVisual({ qrSvg, className = "" }: { qrSvg: string; className?: string }) {
    return (
        <figure
            aria-label="A printable QR poster for a shop window"
            className={`w-60 rotate-[-2deg] rounded-2xl border-[6px] border-[#17233B] bg-white p-6 text-center text-[#17233B] shadow-2xl shadow-[#17233B]/20 ${className}`}
        >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF593F]">Scan me</p>
            <p className="mt-2 text-xl font-semibold leading-tight">Get a free pastry with your coffee</p>
            <div
                aria-hidden="true"
                className="mx-auto mt-4 w-36 [&_svg]:h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-4 text-xs text-[#17233B]/60">{business} · on Promotello</p>
        </figure>
    );
}

export function PosterScansCard() {
    const posters = [
        { name: "Front window", scans: 214 },
        { name: "By the till", scans: 131 },
        { name: "Table cards", scans: 58 },
    ];

    return (
        <div className="w-64 rounded-2xl border border-[#17233B]/10 bg-white p-5 text-[#17233B] shadow-xl shadow-[#17233B]/10">
            <p className="text-sm font-semibold">Scans this month</p>
            <ul className="mt-4 space-y-3">
                {posters.map((poster) => (
                    <li key={poster.name}>
                        <div className="flex justify-between text-xs">
                            <span>{poster.name}</span>
                            <span className="font-semibold tabular-nums">{poster.scans}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-[#17233B]/5">
                            <div className="h-1.5 rounded-full bg-[#FF593F]" style={{ width: `${(poster.scans / 214) * 100}%` }} />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Business dashboard
// ---------------------------------------------------------------------------

// A fixed month of daily views with quieter Mondays, so the picture is
// stable between builds.
const sampleDays = Array.from({ length: 30 }, (_, index) => ({
    day: `2026-09-${String(index + 1).padStart(2, "0")}`,
    value: [70, 38, 46, 52, 58, 84, 96][index % 7] + ((index * 37) % 17) - 8 + Math.round(index * 0.8),
}));

export function DashboardScreen({ className = "" }: { className?: string }) {
    const nav = [
        { icon: FiHome, label: "Overview", active: true },
        { icon: FiGift, label: "Promotions" },
        { icon: FiGrid, label: "QR posters" },
        { icon: FiHeart, label: "Loyalty card" },
        { icon: FiBell, label: "Automations" },
        { icon: FiBarChart2, label: "Analytics" },
    ];

    return (
        <BrowserFrame url="promotello.com/business" label="The Promotello business dashboard" className={className}>
            <div className="grid grid-cols-[9.5rem_1fr]">
                <div className="hidden border-r border-[#17233B]/10 bg-[#FFF8F0]/60 p-3 sm:block">
                    <p className="px-2 text-xs font-semibold">{business}</p>
                    <ul className="mt-3 space-y-1">
                        {nav.map(({ icon: Icon, label, active }) => (
                            <li
                                key={label}
                                className={`flex items-center gap-2 rounded-full px-2 py-1.5 text-[11px] ${active ? "bg-[#FF593F]/10 font-semibold text-[#C2341F]" : "text-[#17233B]/60"}`}
                            >
                                <Icon aria-hidden="true" className="size-3" />
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="col-span-2 p-4 sm:col-span-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF593F]">Last 30 days</p>
                    <p className="text-sm font-semibold">What Promotello brought you</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                        {[
                            ["Visits", "312", "▲ 27%"],
                            ["Followers", "186", "▲ 32"],
                            ["QR scans", "403", "▲ 40%"],
                        ].map(([label, value, change]) => (
                            <div key={label} className="rounded-lg border border-[#17233B]/10 p-2">
                                <p className="text-[10px] text-[#17233B]/55">{label}</p>
                                <p className="text-lg font-semibold tabular-nums">{value}</p>
                                <p className="text-[10px] text-emerald-700">{change}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 [&_p]:text-[10px]">
                        <DailyBars data={sampleDays} unit="views" emptyMessage="" />
                    </div>
                </div>
            </div>
        </BrowserFrame>
    );
}

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------

function EmailShell({ from, subject, children, label }: { from: string; subject: string; children: ReactNode; label: string }) {
    return (
        <figure aria-label={label} className="w-full max-w-sm rounded-2xl border border-[#17233B]/10 bg-white text-[#17233B] shadow-xl shadow-[#17233B]/10">
            <div className="border-b border-[#17233B]/10 px-5 py-3">
                <p className="text-xs font-semibold">{from}</p>
                <p className="truncate text-xs text-[#17233B]/55">{subject}</p>
            </div>
            <div className="p-5">{children}</div>
        </figure>
    );
}

export function NewOfferEmail() {
    return (
        <EmailShell
            label="The email followers get when a business posts a new offer"
            from={`${business} via Promotello`}
            subject="2 for £5: Two flat whites on Mondays"
        >
            <div className="relative -mx-5 -mt-5 mb-4 aspect-[2/1] overflow-hidden">
                <Image src="/images/marketing/harbour-grind-cafe.jpg" alt="" fill sizes="384px" className="object-cover" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF593F]">New from {business}</p>
            <p className="mt-2 text-lg font-semibold leading-snug">Two flat whites for £5 on Mondays</p>
            <span className="mt-2 inline-flex rounded-full bg-[#FF593F]/10 px-2.5 py-0.5 text-xs font-semibold text-[#C2341F]">2 for £5</span>
            <div className="mt-4 inline-flex rounded-lg bg-[#FF593F] px-4 py-2 text-sm font-semibold text-white">Claim this offer</div>
            <p className="mt-4 text-[10px] text-[#17233B]/45">You follow {business} · Unsubscribe</p>
        </EmailShell>
    );
}

export function BirthdayEmail() {
    return (
        <EmailShell
            label="An automatic birthday email with a gift voucher"
            from={`${business} via Promotello`}
            subject={`Happy birthday from ${business}`}
        >
            <p className="text-lg font-semibold">Happy birthday, Ellie! 🎂</p>
            <p className="mt-2 text-sm leading-6 text-[#17233B]/70">Everyone at {business} hopes you have a lovely day. Here&apos;s a treat from us.</p>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#FFF8F0] px-3 py-2 text-sm">
                <FiGift aria-hidden="true" className="text-[#FF593F]" />
                <span>A free slice of cake · code <span className="font-mono font-semibold">G4K9QX2M7</span></span>
            </div>
            <p className="mt-4 text-[10px] text-[#17233B]/45">Sent automatically · Unsubscribe</p>
        </EmailShell>
    );
}

export function MonthlyReportEmail() {
    const rows = [
        ["Customer visits", "312", "▲ 27%"],
        ["Vouchers claimed", "149", "▲ 23%"],
        ["New followers", "32", "▲ 45%"],
        ["Google review clicks", "21", "▲ 133%"],
    ];

    return (
        <EmailShell label="The monthly value report email" from="Promotello" subject="Your September on Promotello">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF593F]">{business} · September</p>
            <p className="mt-2 font-semibold leading-snug">312 customer visits came through Promotello in September.</p>
            <table className="mt-3 w-full text-xs">
                <tbody>
                    {rows.map(([label, value, change]) => (
                        <tr key={label} className="border-b border-[#17233B]/5 last:border-0">
                            <td className="py-1.5 text-[#17233B]/65">{label}</td>
                            <td className="py-1.5 text-right font-semibold tabular-nums">{value}</td>
                            <td className="py-1.5 pl-2 text-right text-emerald-700">{change}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </EmailShell>
    );
}

// ---------------------------------------------------------------------------
// Small floating notes used around the visuals
// ---------------------------------------------------------------------------

export function FloatingNote({ icon, title, detail, className = "" }: { icon: "check" | "star" | "heart"; title: string; detail: string; className?: string }) {
    const Icon = { check: FiCheck, star: FiStar, heart: FiHeart }[icon];

    return (
        <div className={`flex items-center gap-3 rounded-2xl border border-[#17233B]/10 bg-white p-3 pr-5 text-[#17233B] shadow-lg ${className}`}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FF593F]/10 text-[#FF593F]">
                <Icon aria-hidden="true" />
            </span>
            <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-[#17233B]/55">{detail}</span>
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Review prompt, quiet hours and share image
// ---------------------------------------------------------------------------

export function ReviewPromptScreen() {
    return (
        <PhoneFrame label="A customer being asked for a Google review after a visit">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF593F]">My dashboard</p>
            <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-1 text-[#FF593F]" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <FiStar key={star} className="size-4 fill-current" />
                    ))}
                </div>
                <p className="mt-2 font-semibold leading-snug">How was your visit to {business}?</p>
                <p className="mt-1 text-xs text-[#17233B]/55">You used a voucher there yesterday.</p>
                <div className="mt-3 rounded-xl bg-[#17233B] py-2 text-center text-sm font-semibold text-white">Leave a Google review</div>
            </div>
            <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-[#17233B]/55">Ready to use</p>
                <p className="mt-0.5 text-sm font-semibold">Two flat whites for £5</p>
            </div>
        </PhoneFrame>
    );
}

export function QuietHoursCard() {
    const days = [
        ["Mon", true],
        ["Tue", true],
        ["Wed", true],
        ["Thu", true],
        ["Fri", false],
        ["Sat", false],
        ["Sun", false],
    ] as const;

    return (
        <div className="w-full max-w-sm rounded-2xl border border-[#17233B]/10 bg-white p-6 text-[#17233B] shadow-xl shadow-[#17233B]/10">
            <p className="text-sm font-semibold">Only on set days and times</p>
            <div className="mt-4 flex flex-wrap gap-2">
                {days.map(([day, on]) => (
                    <span
                        key={day}
                        className={`rounded-full border px-3 py-1 text-xs ${on ? "border-[#FF593F] bg-[#FF593F] text-white" : "border-[#17233B]/15"}`}
                    >
                        {day}
                    </span>
                ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-[#17233B]/10 px-3 py-2">From 2:00pm</div>
                <div className="rounded-lg border border-[#17233B]/10 px-3 py-2">Until 4:00pm</div>
            </div>
            <p className="mt-4 text-xs text-[#17233B]/60">Customers can claim it any time, and use it Mon–Thu, 2pm–4pm.</p>
        </div>
    );
}

export function StoryImagePreview() {
    return (
        <figure
            aria-label="An Instagram story image made from an offer"
            className="flex aspect-[9/16] w-52 flex-col justify-between rounded-2xl bg-[#17233B] p-5 text-[#FFF8F0] shadow-2xl shadow-[#17233B]/25"
        >
            <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#FF8F7D]">Offer</p>
                <p className="mt-1 text-sm opacity-80">{business}</p>
            </div>
            <div>
                <span className="inline-flex rounded-full bg-[#FF593F] px-3 py-1 text-xs font-semibold text-white">Free pastry</span>
                <p className="mt-3 text-2xl font-semibold leading-tight">With any coffee before 10am</p>
            </div>
            <div>
                <p className="text-[10px] opacity-70">Find it on</p>
                <p className="text-lg font-semibold text-[#FF593F]">promotello</p>
            </div>
        </figure>
    );
}

// ---------------------------------------------------------------------------
// Claiming a promotion
// ---------------------------------------------------------------------------

export function OfferClaimScreen() {
    return (
        <PhoneFrame label="A customer claiming a promotion on their phone">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Image src="/images/marketing/pastry-counter.jpg" alt="" fill sizes="220px" className="object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-[#FF593F] px-2.5 py-0.5 text-[11px] font-semibold text-white">Free pastry</span>
            </div>
            <p className="mt-3 text-xs text-[#17233B]/55">{business} · Gloucester Road</p>
            <p className="mt-0.5 font-semibold leading-snug">Free pastry with any coffee before 10am</p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[#17233B]/60">
                <span>Weekdays before 10am</span>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-[#FF593F]/10 px-2 py-0.5 font-semibold text-[#C2341F]">16 of 100 left</span>
            </div>
            <div className="mt-4 rounded-xl bg-[#FF593F] py-2.5 text-center text-sm font-semibold text-white">Claim this offer</div>
            <p className="mt-2 text-center text-[10px] text-[#17233B]/50">Free to claim · Use it in store</p>
        </PhoneFrame>
    );
}

// ---------------------------------------------------------------------------
// Photos and sharing
// ---------------------------------------------------------------------------

export function PhotoCard({ src, caption, detail, className = "", sizes = "(min-width: 1024px) 40vw, 90vw" }: { src: string; caption: string; detail?: string; className?: string; sizes?: string }) {
    return (
        <figure className={`relative overflow-hidden rounded-3xl shadow-2xl shadow-[#17233B]/15 ${className}`}>
            <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
            <figcaption className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#17233B] shadow">
                {caption}
                {detail && <span className="font-normal text-[#17233B]/60"> · {detail}</span>}
            </figcaption>
        </figure>
    );
}

// A WhatsApp chat with the promotion's link preview: photo, deal, business.
export function WhatsAppShareScreen() {
    return (
        <PhoneFrame label="A promotion shared in a WhatsApp group, with its link preview">
            <div className="-mx-4 -mt-4 flex items-center gap-2 bg-[#075E54] px-4 py-3 text-white">
                <span className="flex size-7 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold">GR</span>
                <span>
                    <span className="block text-xs font-semibold">Gloucester Rd mums</span>
                    <span className="block text-[10px] text-white/70">Jo, Sam, Priya, you</span>
                </span>
            </div>
            <div className="-mx-4 space-y-2 bg-[#ECE5DD] px-3 py-4">
                <div className="ml-auto w-[88%] overflow-hidden rounded-lg bg-[#DCF8C6] text-[#17233B] shadow-sm">
                    <div className="m-1 overflow-hidden rounded-md bg-white/70">
                        <div className="relative aspect-[1.9/1]">
                            <Image src="/images/marketing/pastry-counter.jpg" alt="" fill sizes="200px" className="object-cover" />
                        </div>
                        <div className="px-2 py-1.5">
                            <p className="text-[11px] font-semibold leading-snug">Free pastry at {business}: with any coffee before 10am</p>
                            <p className="text-[10px] text-[#17233B]/55">promotello.com</p>
                        </div>
                    </div>
                    <p className="px-2 pb-1.5 text-[11px]">Free pastry before 10am this week 🥐 who&apos;s in?</p>
                </div>
                <div className="w-[60%] rounded-lg bg-white px-2 py-1.5 text-[11px] shadow-sm">Ooh yes, Thursday? ☕️</div>
                <div className="w-[48%] rounded-lg bg-white px-2 py-1.5 text-[11px] shadow-sm">Claimed mine!</div>
            </div>
        </PhoneFrame>
    );
}

// The square image businesses download for Instagram and Facebook posts.
export function SquarePostPreview({ className = "" }: { className?: string }) {
    return (
        <figure aria-label="A square Instagram post made from a promotion" className={`relative aspect-square w-60 overflow-hidden rounded-2xl shadow-2xl shadow-[#17233B]/25 ${className}`}>
            <Image src="/images/marketing/pastry-counter.jpg" alt="" fill sizes="240px" className="object-cover" />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-b from-transparent via-[#17233B]/30 to-[#17233B]/95 p-4 text-[#FFF8F0]">
                <p className="text-[9px] uppercase tracking-[0.18em] text-[#FF8F7D]">{business}</p>
                <span className="mt-1.5 inline-flex self-start rounded-full bg-[#FF593F] px-2 py-0.5 text-[10px] font-semibold text-white">Free pastry</span>
                <p className="mt-1.5 text-base font-semibold leading-tight">With any coffee before 10am</p>
                <p className="mt-2 text-right text-xs font-semibold text-[#FF593F]">promotello</p>
            </div>
        </figure>
    );
}
