import assert from "node:assert/strict";
import { test } from "node:test";

import {
    addressFromHtml,
    compare,
    bestEmail,
    contactPaths,
    emailsFromHtml,
    matchCompany,
    postcodeFrom,
    splitAddress,
} from "@/lib/lead-enrichment";

test("an address is taken from a mailto before anything else on the page", () => {
    const html = `
        <footer>
          <a href="mailto:hello@littleloaf.co.uk">Email us</a>
          <p>Built by studio@someagency.com</p>
        </footer>`;

    const found = emailsFromHtml(html);

    assert.ok(found.includes("hello@littleloaf.co.uk"));
    assert.ok(found.includes("studio@someagency.com"));

    // Theirs wins: the domain matches the site we fetched.
    assert.equal(bestEmail(found, "littleloaf.co.uk"), "hello@littleloaf.co.uk");
});

test("machinery and platform addresses are never written to", () => {
    const html = `
        no-reply@littleloaf.co.uk
        postmaster@littleloaf.co.uk
        wix-support@wixpress.com
        abuse@littleloaf.co.uk
        logo@littleloaf.png`;

    assert.deepEqual(emailsFromHtml(html), []);
});

test("a generic enquiries address is preferred to a personal one", () => {
    // Not a slight on Dave: info@ is the address somebody is paid to
    // read, and a first approach to a named person reads as scraped.
    const found = ["dave@littleloaf.co.uk", "info@littleloaf.co.uk"];

    assert.equal(bestEmail(found, "littleloaf.co.uk"), "info@littleloaf.co.uk");
});

test("their own domain beats a free address on the same page", () => {
    const found = ["littleloafbristol@gmail.com", "orders@littleloaf.co.uk"];

    assert.equal(bestEmail(found, "www.littleloaf.co.uk"), "orders@littleloaf.co.uk");
});

test("nothing usable on the page is nothing, not a guess", () => {
    assert.equal(bestEmail([], "littleloaf.co.uk"), null);
    assert.deepEqual(emailsFromHtml("<p>Call us on 0117 123 4567</p>"), []);
});

test("only a couple of the site's own pages are worth a second request", () => {
    const html = `
        <a href="/contact">Contact</a>
        <a href="/about-us">About</a>
        <a href="/menu">Menu</a>
        <a href="https://instagram.com/littleloaf/contact">Instagram</a>`;

    const paths = contactPaths(html, "https://littleloaf.co.uk/");

    assert.equal(paths.length, 2);
    assert.ok(paths.every((path) => path.startsWith("https://littleloaf.co.uk")));
    // Somebody else's server is not ours to crawl.
    assert.ok(!paths.some((path) => path.includes("instagram.com")));
});

// The gate. What this function returns decides whether a business can be
// emailed at all, so everything doubtful has to come back false: a lead
// that is not confidently a limited company gets a letter, which needs
// no consent, rather than an email that might need one.
test("an obvious match is confident", () => {
    const match = matchCompany("The Little Loaf", "BS7 8NU", [
        { company_number: "11112222", title: "LITTLE LOAF LTD", company_status: "active" },
    ]);

    assert.equal(match.confident, true);
    assert.equal(match.confident && match.company.company_number, "11112222");
});

test("no match, a dissolved company, and two of the same name are all refused", () => {
    assert.equal(matchCompany("Little Loaf", "BS7 8NU", []).confident, false);

    const dissolved = matchCompany("Little Loaf", "BS7 8NU", [
        { company_number: "11112222", title: "LITTLE LOAF LTD", company_status: "dissolved" },
    ]);
    assert.equal(dissolved.confident, false);
    assert.equal(dissolved.confident === false && dissolved.reason, "dissolved");

    const twins = matchCompany("Little Loaf", null, [
        { company_number: "11112222", title: "LITTLE LOAF LTD", company_status: "active" },
        { company_number: "33334444", title: "Little Loaf Limited", company_status: "active" },
    ]);
    assert.equal(twins.confident, false);
    assert.equal(twins.confident === false && twins.reason, "ambiguous");
});

test("a postcode separates two companies sharing a name", () => {
    const match = matchCompany("Little Loaf", "BS7 8NU", [
        { company_number: "11112222", title: "LITTLE LOAF LTD", company_status: "active", address_snippet: "1 High Street, London, N1 1AA" },
        { company_number: "33334444", title: "LITTLE LOAF LIMITED", company_status: "active", address_snippet: "214 Gloucester Road, Bristol, BS7 8NU" },
    ]);

    assert.equal(match.confident, true);
    assert.equal(match.confident && match.company.company_number, "33334444");
});

test("a business whose name merely contains the company's is not a match", () => {
    // "Loaf" is not "Little Loaf", and emailing the wrong company is
    // both a complaint and a wasted founding place.
    const match = matchCompany("Loaf", "BS7 8NU", [
        { company_number: "11112222", title: "LITTLE LOAF LTD", company_status: "active" },
    ]);

    assert.equal(match.confident, false);
});

// The address a business publishes on its own contact page. Google's
// terms let a place_id be kept and restrict storing the rest, so the
// address we keep should come from somewhere we may keep it — and
// unlike a registered office, this is where the shop actually is, which
// is what a letter needs.
test("schema.org markup is used before anything is guessed", () => {
    const html = `
        <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Bakery","name":"Little Loaf",
         "address":{"@type":"PostalAddress","streetAddress":"214 Gloucester Road",
         "addressLocality":"Bristol","postalCode":"BS7 8NU"}}
        </script>
        <footer>Some other postcode BS1 1AA that is not ours</footer>`;

    assert.equal(
        addressFromHtml(html),
        "214 Gloucester Road, Bristol, BS7 8NU",
    );
});

test("a footer address is found when there is no markup", () => {
    const html = `
        <footer>
          <p>Little Loaf<br>214 Gloucester Road<br>Bristol<br>BS7 8NU</p>
        </footer>`;

    const found = addressFromHtml(html);

    assert.ok(found, "an address should be found");
    assert.match(found!, /214 Gloucester Road/);
    assert.match(found!, /BS7 8NU/);
});

test("a page with no postcode yields nothing rather than a guess", () => {
    // An address we invented is worse than none: a letter goes to it.
    assert.equal(addressFromHtml("<p>Find us on Gloucester Road, opposite the Arches.</p>"), null);
    assert.equal(addressFromHtml(""), null);
});

test("a postcode is read whatever the spacing and case", () => {
    assert.equal(postcodeFrom("bs7 8nu"), "BS7 8NU");
    assert.equal(postcodeFrom("BS78NU"), "BS7 8NU");
    assert.equal(postcodeFrom("Call us on 0117 123 4567"), null);
});

test("a locality on its own is not an address worth posting to", () => {
    const html = `
        <script type="application/ld+json">
        {"@type":"PostalAddress","addressLocality":"Bristol"}
        </script>`;

    assert.equal(addressFromHtml(html), null);
});

// From Joe's Bakery, the first real site this was run against. The
// postcode was found correctly and the prose before it came too:
// "ime, you can find us at either shop or get in touch below., Joe's
// Bakery 240 – 242 Gloucester Road…" — the sentence attached and its
// first word sliced in half. Not something to put on an envelope.
test("prose before the address is left behind", () => {
    const html = `
        <p>We are open from 7am at either time, you can find us at either shop
        or get in touch below.</p>
        <p>Joe's Bakery, 240 Gloucester Road, Bishopston, Bristol, BS7 8NZ</p>`;

    const found = addressFromHtml(html);

    assert.ok(found, "an address should still be found");
    assert.ok(!/get in touch/.test(found!), "the sentence must not come with it");
    assert.ok(!/^ime/.test(found!), "and must not start mid-word");
    assert.match(found!, /240 Gloucester Road/);
    assert.match(found!, /BS7 8NZ$/);
});

test("a postcode mentioned in a sentence is not an address", () => {
    // "We deliver to most of Bristol, including BS7 8NZ" has a postcode
    // and no street number, which is how a delivery-area paragraph is
    // told apart from somewhere a letter can go.
    assert.equal(
        addressFromHtml("<p>We deliver to most of Bristol, including BS7 8NZ and nearby.</p>"),
        null,
    );

    // The cost of that rule, stated rather than discovered later: an
    // address with no number is missed, and gets typed in by hand.
    assert.equal(
        addressFromHtml("<p>The Old Bakehouse, Church Lane, Bristol, BS7 8NZ</p>"),
        null,
    );
});

// The preview form takes a street line, a city, an area and a postcode.
// A lead has one line of text, so it is split to fill that form in.
test("an address is split into the parts the preview asks for", () => {
    assert.deepEqual(
        splitAddress("Joe's Bakery, 240 Gloucester Road, Bishopston, Bristol, BS7 8NZ"),
        { line1: "Joe's Bakery, 240 Gloucester Road, Bishopston", town: "Bristol", postcode: "BS7 8NZ" },
    );

    // The common shape from a footer, where the town and postcode share a
    // line: "…, Bristol BS7 8NZ".
    assert.deepEqual(splitAddress("214 Gloucester Road, Bristol BS7 8NU"), {
        line1: "214 Gloucester Road",
        town: "Bristol",
        postcode: "BS7 8NU",
    });
});

test("splitting keeps the street when there is nothing else to take", () => {
    assert.deepEqual(splitAddress("214 Gloucester Road"), {
        line1: "214 Gloucester Road",
        town: null,
        postcode: null,
    });

    assert.deepEqual(splitAddress(null), { line1: null, town: null, postcode: null });
});

// Found by running the Companies House check on a real lead: "Joes
// Bakery" matched nothing, though the API returns JOE'S BAKERY LIMITED
// for it. The apostrophe became a space, so "joe s bakery" was compared
// with "joes bakery" and every shop named after a person was quietly
// unemailable — failing safe, into a letter, but losing the lead.
test("an apostrophe does not stop a company matching", () => {
    const candidates = [
        { company_number: "08423930", title: "JOE'S BAKERY LIMITED", company_status: "active" },
    ];

    const match = matchCompany("Joes Bakery", "BS7 8NZ", candidates);

    assert.equal(match.confident, true);
    assert.equal(match.confident && match.company.company_number, "08423930");
});

test("a curly apostrophe matches too", () => {
    // A name pasted from a website carries U+2019 far more often than a
    // typed one does.
    const candidates = [
        { company_number: "08423930", title: "JOE’S BAKERY LIMITED", company_status: "active" },
    ];

    assert.equal(matchCompany("Joe's Bakery", "BS7 8NZ", candidates).confident, true);
    assert.equal(matchCompany("Joe’s Bakery", "BS7 8NZ", candidates).confident, true);
});

test("losing the apostrophe does not make different companies look alike", () => {
    // The fix must not widen what counts as obvious: the thing a match
    // unlocks is permission to email somebody.
    const candidates = [
        { company_number: "11111111", title: "SAMS KITCHEN LIMITED", company_status: "active" },
    ];

    assert.equal(matchCompany("Sams Kitchens", "BS1 1AA", candidates).confident, false);
    assert.equal(matchCompany("Sam Kitchen", "BS1 1AA", candidates).confident, false);
});

// The same normalisation now decides whether a lead is already written
// down, so the two answers to "are these the same shop" cannot disagree.
test("the comparison key folds the ways a name is written", () => {
    const key = (value: string) => compare(value);

    assert.equal(key("Joe's Bakery"), key("Joes Bakery"));
    assert.equal(key("JOE'S BAKERY LIMITED"), key("Joes Bakery"));
    assert.equal(key("The Little Loaf"), key("LITTLE LOAF LTD"));
    assert.equal(key("  Joes   Bakery  "), key("Joes Bakery"));

    // And does not fold two shops that are genuinely different.
    assert.notEqual(key("Joes Bakery"), key("Joes Butchers"));
    assert.notEqual(key("Sams Kitchen"), key("Sams Kitchens"));
});
