// Loaded with `node --import` before the tests, so "@/..." imports resolve.
import { register } from "node:module";

register("./alias-hook.mjs", import.meta.url);
