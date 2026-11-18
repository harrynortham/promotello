import assert from "node:assert/strict";
import { test } from "node:test";

import {
    bestEmail,
    contactPaths,
    emailsFromHtml,
    matchCompany,
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
