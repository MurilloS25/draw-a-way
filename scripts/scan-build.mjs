// Reviews production build output. Run after `npm run build`: npm run scan:build
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}
if (!existsSync(".next/static")) {
  console.error("No build found. Run `npm run build` first.");
  process.exit(1);
}
const problems = [];
const client = walk(".next/static");
for (const f of client) {
  if (f.endsWith(".map")) problems.push(`${f}: source map in client output`);
  const text = readFileSync(f, "utf8");
  for (const needle of ["GROQ_API_KEY", "api.groq.com", "INTERPRETER_MODE", "x-fake-scenario"]) {
    if (text.includes(needle)) problems.push(`${f}: client bundle mentions ${needle}`);
  }
  if (/gsk_[A-Za-z0-9]{20,}/.test(text)) problems.push(`${f}: key-shaped string`);
  if (/https?:\/\/(?!127\.0\.0\.1|localhost|www\.w3\.org|react\.dev|nextjs\.org)[a-z0-9.-]+\.[a-z]{2,}/i.test(text.replace(/https?:\/\/(?:www\.w3\.org|react\.dev|nextjs\.org)[^"'`\s)]*/gi, ""))) {
    // Informational: list third-party URLs embedded in client code (framework error links etc.).
    const urls = [...new Set(text.match(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}[^"'`\s)]*/gi) ?? [])].filter((u) => !/w3\.org|react\.dev|nextjs\.org/.test(u));
    if (urls.length) console.log(`note: ${f} contains URL strings (not requested at runtime): ${urls.slice(0, 5).join(", ")}`);
  }
}
const bytes = client.reduce((n, f) => n + statSync(f).size, 0);
const js = client.filter((f) => f.endsWith(".js"));
const jsBytes = js.reduce((n, f) => n + statSync(f).size, 0);
console.log(`Client output: ${client.length} files, ${(bytes / 1024).toFixed(0)} KiB total, ${(jsBytes / 1024).toFixed(0)} KiB JS.`);
if (problems.length) {
  console.error("Build review failed:\n" + problems.join("\n"));
  process.exit(1);
}
console.log("Build review: no secrets, provider hosts, or source maps in client output.");
