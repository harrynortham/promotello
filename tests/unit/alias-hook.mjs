// Teaches Node's loader the "@/..." paths from tsconfig.json, so the unit
// tests can import the same modules the app does. Node runs the TypeScript
// directly (type stripping), so there is no build step.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = new URL("../../", import.meta.url);

export function resolve(specifier, context, next) {
    if (!specifier.startsWith("@/")) {
        return next(specifier, context);
    }

    const base = new URL(specifier.slice(2), root);
    const candidate = [base, new URL(`${base.pathname}.ts`, root), new URL(`${base.pathname}.tsx`, root)]
        .find((url) => existsSync(fileURLToPath(url)));

    return next(candidate ? pathToFileURL(fileURLToPath(candidate)).href : specifier, context);
}
