// The payload a phone reads to join a network.
//
// Format is the de facto one every phone camera understands:
//   WIFI:T:WPA;S:<name>;P:<password>;H:true;;
//
// The escaping is the whole of the difficulty. A network called
// "Joe's Café; upstairs" has two characters in it that mean something
// to the parser, and a password is far likelier to contain them than a
// name is -- ; , : \ and " all have to be backslashed or the phone
// reads half a password and fails with nothing useful to say.

export type WifiSecurity = "WPA" | "WEP" | "nopass";

export const WIFI_SECURITIES: { value: WifiSecurity; label: string; hint: string }[] = [
    { value: "WPA", label: "Password", hint: "WPA or WPA2, which is nearly every network" },
    { value: "WEP", label: "Older password", hint: "WEP. Only if your router is old" },
    { value: "nopass", label: "No password", hint: "An open network anybody can join" },
];

function escape(value: string) {
    return value.replace(/([\\;,:"])/g, "\\$1");
}

export type Wifi = {
    ssid: string;
    password?: string | null;
    security?: WifiSecurity | null;
    hidden?: boolean | null;
};

// Null rather than a broken string when there is nothing to encode: a
// QR code that joins no network is worse than no QR code, because
// somebody has to hold a phone up to it to find that out.
export function wifiPayload({ ssid, password, security, hidden }: Wifi): string | null {
    const name = ssid?.trim();
    if (!name) return null;

    const kind: WifiSecurity = security ?? "WPA";
    const secret = password?.trim() ?? "";

    // A network with a password set but none given would print a code
    // that fails on every phone in the room.
    if (kind !== "nopass" && !secret) return null;

    const parts = [`T:${kind}`, `S:${escape(name)}`];

    if (kind !== "nopass") parts.push(`P:${escape(secret)}`);
    // Only when true. "H:false" is accepted by most phones and ignored
    // by some, and a shorter payload is a denser code at the same size.
    if (hidden) parts.push("H:true");

    return `WIFI:${parts.join(";")};;`;
}

export const SSID_MAX = 32;
export const WIFI_PASSWORD_MAX = 63;

// What is wrong with it, in the words shown under the field.
export function wifiProblem({ ssid, password, security }: Wifi): string | null {
    const name = ssid?.trim() ?? "";
    const kind: WifiSecurity = security ?? "WPA";
    const secret = password?.trim() ?? "";

    if (!name) return "Give us the network name.";
    if (name.length > SSID_MAX) return `A network name is ${SSID_MAX} characters at most.`;
    if (kind === "nopass") return null;
    if (!secret) return "Give us the password, or choose no password.";
    if (secret.length > WIFI_PASSWORD_MAX) {
        return `A password is ${WIFI_PASSWORD_MAX} characters at most.`;
    }

    return null;
}
