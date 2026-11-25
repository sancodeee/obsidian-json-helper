import { readFile } from "node:fs/promises";
import { build } from "esbuild";

const thirdPartyLicense = await readFile(new URL("../THIRD-PARTY-LICENSES.txt", import.meta.url), "utf8");

await build({
    entryPoints: ["src/main.mjs"],
    outfile: "main.js",
    bundle: true,
    platform: "neutral",
    mainFields: ["module", "main"],
    format: "cjs",
    target: "es2018",
    external: ["obsidian", "@codemirror/*"],
    minify: true,
    banner: { js: `/*! Bundled dependency: jsonc-parser\n${thirdPartyLicense.replace(/\r\n/g, "\n").trim()}\n*/` },
});
