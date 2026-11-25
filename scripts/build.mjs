import { readFile } from "node:fs/promises";
import { build } from "esbuild";

const [projectLicense, thirdPartyLicense] = await Promise.all([
    readFile(new URL("../LICENSE", import.meta.url), "utf8"),
    readFile(new URL("../THIRD-PARTY-LICENSES.txt", import.meta.url), "utf8"),
]);
const licenseNotice = [projectLicense, "Bundled dependency: jsonc-parser", thirdPartyLicense]
    .map((notice) => notice.replace(/\r\n/g, "\n").trim())
    .join("\n\n");

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
    banner: { js: `/*!\n${licenseNotice}\n*/` },
});
