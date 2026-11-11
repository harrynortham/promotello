import assert from "node:assert/strict";
import { test } from "node:test";

import { CODE_LENGTH, codeField, signInProblem } from "@/lib/sign-in-code";

test("a code is six digits, however it arrives", () => {
    assert.equal(codeField.parse("123456"), "123456");
    // Copied out of an email, with whatever came with it.
    assert.equal(codeField.parse(" 123 456 "), "123456");

    for (const wrong of ["12345", "1234567", "12345a", ""]) {
        assert.equal(codeField.safeParse(wrong).success, false, wrong);
    }

    assert.equal(CODE_LENGTH, 6);
});

test("an address nobody has is offered the other door", () => {
    const problem = signInProblem("Signups not allowed for otp", "sign-in");

    assert.match(problem.message, /couldn't find an account/);
    assert.equal(problem.otherWay, true);
});

test("the same refusal while signing up is not an invitation to sign up", () => {
    // It can't mean "you already have an account" here, so it says the
    // plain thing instead of sending them round a loop.
    const problem = signInProblem("Signups not allowed for otp", "sign-up");

    assert.equal(problem.otherWay, false);
});

test("asking for codes too fast is explained, not repeated back", () => {
    const problem = signInProblem(
        "For security purposes, you can only request this after 48 seconds.",
        "sign-in",
    );

    assert.match(problem.message, /Wait a minute/);
    assert.equal(problem.otherWay, false);

    // The form reads this to decide whether to take somebody back to the
    // code they already have, rather than leaving them on a screen whose
    // advice they can't follow.
    assert.equal(problem.rateLimited, true);
});

test("only the refusal to send again is a rate limit", () => {
    assert.equal(signInProblem("Signups not allowed for otp", "sign-in").rateLimited, false);
    assert.equal(signInProblem("Unable to validate email address: invalid format", "sign-in").rateLimited, false);
    assert.equal(signInProblem("Email provider is disabled", "sign-in").rateLimited, false);
});

test("anything else is shown as it came", () => {
    assert.equal(signInProblem("Email provider is disabled", "sign-in").message, "Email provider is disabled");
    assert.match(signInProblem("", "sign-in").message, /couldn't send your code/);
});
