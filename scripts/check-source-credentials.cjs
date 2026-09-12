// Report locations only, never credential contents.
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const patterns = [
  /(?:api[_-]?key|secret[_-]?key|access[_-]?token|password|SPOONACULAR_KEY)\s*[:=]\s*['"][A-Za-z0-9_\-.]{24,}['"]/gi,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /\b(?:ghp_|github_pat_|sk_live_|sb_secret_)[A-Za-z0-9_]{15,}/g,
];
let findings = 0;
for (const file of files) {
  if (!/\.(?:[cm]?[jt]sx?|json|sql|md|ya?ml|toml)$/.test(file) || !fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      console.log(`${file}:${content.slice(0, match.index).split('\n').length}: possible embedded credential (value suppressed)`);
      findings++;
    }
  }
}
console.log(`Scanned ${files.length} source paths; ${findings} possible embedded credentials.`);
process.exitCode = findings ? 1 : 0;
