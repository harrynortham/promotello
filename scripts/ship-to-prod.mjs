// Sends migrations to the live database.
//
// This exists so the live database is never reached by typing a flag
// from memory. It shows what it is about to do, waits for you to type
// the word, and only then does it.
//
//   npm run db:ship
//
// It reads the connection string from PROD_DB_URL, or from
// .env.production.local if that is where you keep it.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import fs from "node:fs";

function connectionString() {
    if (process.env.PROD_DB_URL) return process.env.PROD_DB_URL;

    // .env.production.local, which is gitignored.
    try {
        for (const line of fs.readFileSync(".env.production.local", "utf8").split("\n")) {
            const [key, ...rest] = line.trim().split("=");
            if (key === "PROD_DB_URL") return rest.join("=").replace(/^["']|["']$/g, "");
        }
    } catch {
        // No such file, which is fine: the message below says what to do.
    }

    return null;
}

function run(args) {
    return new Promise((resolve) => {
        const child = spawn("supabase", args, { stdio: "inherit" });
        child.on("close", (code) => resolve(code ?? 1));
    });
}

const url = connectionString();

if (!url) {
    console.error(
        [
            "No PROD_DB_URL.",
            "",
            "It is the connection string from the live project's dashboard:",
            "  Settings → Database → Connection string → URI",
            "",
            "Put it in .env.production.local as PROD_DB_URL=..., or set it in",
            "your shell for this one command. The password inside it has to be",
            "percent-encoded.",
        ].join("\n"),
    );
    process.exit(1);
}

console.log("\nThis is the LIVE database — the one customers use.\n");
console.log("First, what would run. Nothing is changed by this part:\n");

const dryRun = await run(["db", "push", "--dry-run", "--db-url", url]);

if (dryRun !== 0) {
    console.error("\nThe dry run failed, so nothing was sent. Fix that first.");
    process.exit(dryRun);
}

console.log("\nIf that list is not exactly what you meant to send, stop here.");
console.log("Nothing has happened yet.\n");

const ask = createInterface({ input: process.stdin, output: process.stdout });
const answer = await ask.question('Type "ship" to send it to the live database: ');
ask.close();

if (answer.trim().toLowerCase() !== "ship") {
    console.log("\nStopped. Nothing was sent.");
    process.exit(0);
}

console.log("");
const pushed = await run(["db", "push", "--db-url", url]);

if (pushed !== 0) {
    console.error("\nThe push failed. Read the error above before trying again.");
    process.exit(pushed);
}

console.log(
    [
        "",
        "Done. Two things now:",
        "",
        "  1. Check the thing exists — the new column, the new function.",
        "  2. Then merge the pull request, which deploys the code.",
        "",
        "That order matters: the code needs the database to be ready first.",
    ].join("\n"),
);
