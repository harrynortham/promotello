import test from "node:test";
import assert from "node:assert/strict";

import { wifiPayload, wifiProblem } from "@/lib/wifi";

test("an ordinary network", () => {
    assert.equal(
        wifiPayload({ ssid: "Harbour Grind", password: "flatwhite", security: "WPA" }),
        "WIFI:T:WPA;S:Harbour Grind;P:flatwhite;;",
    );
});

// The whole of the difficulty. Every one of these means something to
// the parser, and a password is likelier to contain them than a name.
//
// Asserted by reading it back the way a phone does rather than against
// a literal: the literal needs five levels of escaping to write down,
// which is how a wrong one gets committed looking right.
test("a name and password survive the characters that would break them", () => {
    const ssid = "Joe's Caf\u00e9; upstairs";
    const password = ['a:b', 'c,d', 'e;f', 'g' + String.fromCharCode(92) + 'h', 'i"j'].join("");

    const payload = wifiPayload({ ssid, password, security: "WPA" });
    assert.ok(payload);

    const fields = readBackLikeAPhone(payload);

    assert.equal(fields.S, ssid);
    assert.equal(fields.P, password);
    assert.equal(fields.T, "WPA");
});

// Splits on the separators a parser would honour -- a semicolon that
// was escaped is part of the value, not the end of it.
function readBackLikeAPhone(payload: string) {
    const body = payload.replace(/^WIFI:/, "").replace(/;;$/, "");
    const fields: Record<string, string> = {};

    let key = "";
    let value = "";
    let onKey = true;
    let escaped = false;

    for (const ch of body) {
        if (escaped) {
            value += ch;
            escaped = false;
            continue;
        }
        if (ch === String.fromCharCode(92)) {
            escaped = true;
            continue;
        }
        if (ch === ":" && onKey) {
            onKey = false;
            continue;
        }
        if (ch === ";") {
            fields[key] = value;
            key = "";
            value = "";
            onKey = true;
            continue;
        }
        if (onKey) key += ch;
        else value += ch;
    }

    if (key) fields[key] = value;

    return fields;
}

test("an open network carries no password at all", () => {
    assert.equal(
        wifiPayload({ ssid: "Café Free", security: "nopass", password: "ignored" }),
        "WIFI:T:nopass;S:Café Free;;",
    );
});

test("a hidden network says so, and only when it is", () => {
    assert.match(wifiPayload({ ssid: "Back room", password: "x", hidden: true }) ?? "", /;H:true;;$/);
    assert.doesNotMatch(wifiPayload({ ssid: "Back room", password: "x" }) ?? "", /H:/);
});

// A code that joins no network is worse than no code: somebody has to
// hold a phone up to it to find out.
test("nothing to encode gives nothing", () => {
    assert.equal(wifiPayload({ ssid: "" }), null);
    assert.equal(wifiPayload({ ssid: "   " }), null);
    assert.equal(wifiPayload({ ssid: "Harbour Grind", password: "", security: "WPA" }), null);
});

test("what is wrong with it, in words", () => {
    assert.match(wifiProblem({ ssid: "" }) ?? "", /network name/);
    assert.match(wifiProblem({ ssid: "Grind", password: "" }) ?? "", /password/);
    assert.equal(wifiProblem({ ssid: "Grind", security: "nopass" }), null);
    assert.equal(wifiProblem({ ssid: "Grind", password: "flatwhite" }), null);
    assert.match(wifiProblem({ ssid: "x".repeat(33) }) ?? "", /32 characters/);
});
