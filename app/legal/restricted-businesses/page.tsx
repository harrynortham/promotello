import type { Metadata } from "next";
import Link from "next/link";

import {
    LegalDocument,
    type LegalSection,
} from "@/components/legal-document";
import { company } from "@/lib/legal";

export const metadata: Metadata = {
    title: "Restricted and prohibited businesses",
    description:
        "The trades Promotello can't list, the ones we list once we've seen the right licence, and the offers we won't publish whatever the business.",
};

const summary = [
    "Promotello is for lawful businesses serving customers in person, in the places we cover.",
    "Some trades we can't list at all. Others we can, once we've seen the registration or licence the law asks of them.",
    "A few offers we won't publish whatever the business runs them — a price promotion on tobacco, say, or anything that encourages heavy drinking.",
    "Our own payments run through Stripe, so what Stripe will and won't support applies to us too.",
    "Every new business is checked before its page appears, and offers are read before they go live.",
];

const contact = <Link href="/contact">tell us</Link>;

const sections: LegalSection[] = [
    {
        id: "who-this-applies-to",
        title: "Who this applies to",
        content: (
            <>
                <p>
                    This applies to every business listed on Promotello, to
                    everyone who acts for one, and to everything a business
                    publishes here: its page, its offers, its loyalty card, and
                    the words and photos in them.
                </p>
                <p>
                    It sits alongside our{" "}
                    <Link href="/legal/terms">Terms of Service</Link>, and where
                    the two overlap both apply. It is written for the United
                    Kingdom, which is where we operate; if we open elsewhere,
                    local law will apply there as well.
                </p>
                <p>
                    The lists below are not exhaustive. We can decline a
                    business or an offer that isn&apos;t named here if listing
                    it would break the law, mislead customers, or put people at
                    risk.
                </p>
            </>
        ),
    },
    {
        id: "not-allowed",
        title: "Businesses we can't list",
        content: (
            <>
                <p>
                    We don&apos;t list a business whose trade is mainly any of
                    the following.
                </p>

                <p>
                    <strong>Anything unlawful.</strong> Goods or services that
                    are illegal where the business trades; stolen goods;
                    counterfeits, replicas and unauthorised copies of music,
                    film, games or software; forged documents or identity
                    papers.
                </p>

                <p>
                    <strong>Adult services and adult entertainment.</strong>{" "}
                    Escorting and sexual services, strip clubs and similar
                    venues, and pornography.
                </p>

                <p>
                    <strong>Gambling and paid-entry prize draws.</strong>{" "}
                    Betting, casinos and gaming, lotteries, competitions that
                    charge to enter for the chance of a prize, bidding-fee
                    auctions, and tipping or forecasting services sold on the
                    promise of winnings.
                </p>

                <p>
                    <strong>Drugs.</strong> Cannabis and other controlled
                    drugs, products above the legal THC limit, equipment sold
                    for taking or growing them, and substances sold to be
                    consumed or inhaled for a high.
                </p>

                <p>
                    <strong>Weapons.</strong> Firearms, ammunition and their
                    parts; knives or blades sold as weapons; disguised weapons;
                    stun guns and incapacitant sprays.
                </p>

                <p>
                    <strong>Money, credit and investment.</strong> Lending of
                    any kind, including payday and short-term credit; debt
                    settlement, debt management and credit repair; money
                    transfer, remittance and currency exchange; cheque cashing;
                    cryptocurrency exchanges and wallets; investment and
                    trading schemes, and courses sold on the returns they
                    promise.
                </p>

                <p>
                    <strong>Schemes that pay for recruitment.</strong> Pyramid
                    and matrix schemes; multi-level marketing where the money
                    comes from signing people up rather than selling to the
                    public; get-rich-quick and work-from-home packages sold on
                    what you could earn.
                </p>

                <p>
                    <strong>Health claims we can&apos;t stand behind.</strong>{" "}
                    Cures or treatments for serious illness; unlicensed
                    medicines; prescription-only medicines sold outside a
                    registered pharmacy; and anything sold on claims the
                    advertising rules don&apos;t allow.
                </p>

                <p>
                    <strong>Selling by pressure.</strong> Door-to-door selling,
                    cold-call telemarketing, timeshares and holiday clubs, and
                    &ldquo;you&apos;ve won a holiday&rdquo; promotions.
                </p>

                <p>
                    <strong>Anything that isn&apos;t a local business.</strong>{" "}
                    Promotello is a directory of places near you. A listing
                    needs somewhere a customer can walk into, or a service area
                    we cover that you travel to. We also aren&apos;t a place to
                    collect donations or campaign funds, so charities, political
                    parties and religious organisations can&apos;t list,
                    however good the cause — a shop they run can.
                </p>
            </>
        ),
    },
    {
        id: "with-conditions",
        title: "Businesses we list once we've seen the paperwork",
        content: (
            <>
                <p>
                    These are ordinary businesses and welcome here. Because the
                    law asks something of them, we ask to see it before the page
                    goes live, and we may ask again later. Send it with your
                    application, or we&apos;ll ask when we review you.
                </p>
                <ul>
                    <li>
                        Pubs, bars, restaurants, shops and anyone else selling
                        alcohol: your premises licence. The rules on alcohol
                        offers below apply as well.
                    </li>
                    <li>
                        Shops selling tobacco or vapes: you&apos;re welcome to
                        list; the offer just can&apos;t be on those products.
                    </li>
                    <li>
                        Pharmacies, opticians, dentists and clinics:
                        registration with the GPhC, GOC, GDC or CQC, whichever
                        applies to you.
                    </li>
                    <li>
                        Aesthetics — injectables, fillers, laser and similar:
                        the practitioner&apos;s registration, the prescriber
                        where one is needed, and your council&apos;s licence
                        where it requires one.
                    </li>
                    <li>
                        Tattooists, piercers and electrolysis: registration with
                        your local authority.
                    </li>
                    <li>
                        Food businesses: we look up your Food Hygiene Rating. A
                        very low rating holds a listing until it&apos;s been put
                        right.
                    </li>
                    <li>
                        Anything working with children — childcare, tutoring,
                        clubs and coaching: Ofsted registration or DBS checks,
                        whichever applies.
                    </li>
                    <li>
                        Financial, legal, accountancy and estate agency
                        services: FCA, SRA, CLC or equivalent authorisation. We
                        don&apos;t publish offers on credit, debt advice or
                        investments at all.
                    </li>
                    <li>
                        Driving instructors: a DVSA badge. Taxis and private
                        hire: your council licence.
                    </li>
                    <li>
                        Pet shops, groomers, boarding, day care and breeders:
                        your animal activities licence.
                    </li>
                    <li>
                        Fireworks and other age-restricted goods: the licence
                        where one is needed, and an age check at the till.
                    </li>
                    <li>
                        Second-hand dealers, antiques and anything bought from
                        the public: a licence where your council requires one.
                    </li>
                    <li>
                        Gyms, studios, coaching and therapies: insurance and
                        qualifications on request, and no medical claims.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: "offer-rules",
        title: "Offers we won't publish, whatever the business",
        content: (
            <>
                <p>
                    Your offer is an advert, and the same rules apply to it as
                    to a poster in your window. Beyond those, we won&apos;t
                    publish:
                </p>
                <ul>
                    <li>
                        price promotions on tobacco or vapes, which UK law
                        doesn&apos;t allow;
                    </li>
                    <li>
                        alcohol offers that reward drinking quickly or heavily —
                        unlimited drinks for one price, drinks given for
                        finishing them, or more free the more you buy. Age is
                        still checked at the till, by you, every time;
                    </li>
                    <li>
                        anything aimed at under-18s, or likely to appeal to
                        them, where the product is age-restricted;
                    </li>
                    <li>
                        a discount that isn&apos;t real: a &ldquo;was&rdquo;
                        price you haven&apos;t recently charged, a percentage
                        off nothing, or a &ldquo;free&rdquo; that costs
                        something you haven&apos;t said;
                    </li>
                    <li>
                        offers that depend on the customer taking credit or
                        signing a finance agreement;
                    </li>
                    <li>
                        prize draws and competitions, or anything where the
                        customer pays for a chance of winning;
                    </li>
                    <li>
                        offers on prescription-only medicines, injectables, or
                        any treatment that needs a consultation with a
                        prescriber first;
                    </li>
                    <li>offers on live animals;</li>
                    <li>
                        anything misleading about who you are, where you are, or
                        what the customer gets.
                    </li>
                </ul>
                <p>
                    Loyalty cards follow the same rules: a stamp can&apos;t be
                    given for something we wouldn&apos;t let you offer, and a
                    reward can&apos;t be something we wouldn&apos;t publish.
                </p>
            </>
        ),
    },
    {
        id: "stripe",
        title: "Why Stripe's list applies here too",
        content: (
            <>
                <p>
                    Customers pay you directly, at your till, for whatever they
                    buy — that money never passes through Promotello. The
                    payments we take are the subscriptions businesses pay us,
                    and those run through Stripe.
                </p>
                <p>
                    So Stripe&apos;s own rules about the trades it will support
                    bind us as well. Their list is longer than ours, covers more
                    countries, and changes: if Stripe won&apos;t support a
                    trade, we can&apos;t bill it, and that is sometimes the
                    reason we have to say no to a business that is otherwise
                    perfectly lawful. You can read it at{" "}
                    <a
                        href="https://stripe.com/legal/restricted-businesses"
                        target="_blank"
                        rel="noreferrer noopener"
                    >
                        stripe.com/legal/restricted-businesses
                    </a>
                    .
                </p>
                <p>
                    We hold free and paid listings to the same standard, so that
                    no one loses their page on the day they upgrade.
                </p>
            </>
        ),
    },
    {
        id: "how-we-decide",
        title: "How we decide, and what happens if we get it wrong",
        content: (
            <>
                <p>
                    A person reads every new business before its page appears,
                    and reads offers before they go live. If we decline
                    something we say why, and you can reply — we get it wrong
                    sometimes, and a licence or a bit of context often settles
                    it.
                </p>
                <p>
                    If something is already listed and shouldn&apos;t be, we
                    pause it and tell you. Where there is a risk to people, or
                    the law is clearly being broken, we remove it straight away
                    and may close the account. Vouchers customers already hold
                    stop working when an offer is removed, so this is a last
                    resort rather than a first one.
                </p>
                <p>
                    If you spot something on Promotello that breaks this
                    policy, please {contact}. You can also write to us at{" "}
                    <a href={`mailto:${company.supportEmail}`}>
                        {company.supportEmail}
                    </a>
                    .
                </p>
            </>
        ),
    },
    {
        id: "changes",
        title: "This list will change",
        content: (
            <p>
                We add to this page as we learn, as the law moves and as Stripe
                updates its own list. The date at the top says when it last
                changed. If a change affects a business already listed with us,
                we email them before it takes effect and give them a chance to
                put things right.
            </p>
        ),
    },
];

export default function RestrictedBusinessesPage() {
    return (
        <LegalDocument
            title="Restricted and prohibited businesses"
            description="Promotello is for lawful local businesses. This page says which trades we can't list, which we list once we've seen a licence, and which offers we won't publish."
            updatedAt="5 November 2026"
            version="1.0"
            summary={summary}
            sections={sections}
        />
    );
}
