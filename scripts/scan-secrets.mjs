// Scans tracked files for secret-shaped strings. Run: npm run scan:secrets
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const rules = [
  ["Groq key", /gsk_[A-Za-z0-9]{20,}/],
  ["OpenAI-style key", /sk-[A-Za-z0-9]{32,}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{30,}/],
  ["Private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Assigned API key", /(?:API_KEY|SECRET|TOKEN)\s*[=:]\s*["']?(?!replace-with|your-|example|<)[A-Za-z0-9_-]{24,}/],
];
// Tests use obviously fake keys on purpose.
const allowFiles = [/\.test\.tsx?$/, /^e2e\//];
const hits = [];
for (const f of files) {
  if (/(^|\/)\.env($|\.)/.test(f) && !f.endsWith(".env.example")) hits.push(`${f}: tracked env file`);
  if (/\.(png|jpg|jpeg|webp|woff2?|lock)$|package-lock\.json$/.test(f)) continue;
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  for (const [name, re] of rules) {
    if (re.test(text) && !allowFiles.some((a) => a.test(f))) hits.push(`${f}: ${name}`);
  }
}
if (hits.length) {
  console.error("Possible secrets found:\n" + hits.join("\n"));
  process.exit(1);
}
console.log(`Secret scan: ${files.length} tracked files, no findings.`);
