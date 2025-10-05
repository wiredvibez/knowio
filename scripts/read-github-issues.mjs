// Reads GitHub issues for a repo and saves them to scripts/github-issues.json
// Usage (PowerShell):
//   $env:GITHUB_TOKEN="<your_gh_token>"
//   $env:GITHUB_REPO="wiredvibez/knowio"  # optional, defaults to wiredvibez/knowio
//   node --experimental-fetch scripts/read-github-issues.mjs

import fs from "node:fs/promises";
import path from "node:path";

async function loadEnvLocalIfNeeded() {
  const needsToken = !process.env.GITHUB_TOKEN;
  const needsRepo = !process.env.GITHUB_REPO;
  if (!needsToken && !needsRepo) return;
  const envPath = path.resolve(process.cwd(), ".env.local");
  try {
    const raw = await fs.readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // silently ignore if .env.local is missing
  }
}

await loadEnvLocalIfNeeded();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "wiredvibez/knowio";

if (!GITHUB_TOKEN) {
  console.error("GITHUB_TOKEN is required. Set it in your environment and re-run.");
  process.exit(1);
}

const [GH_OWNER, GH_REPO] = GITHUB_REPO.split("/");
if (!GH_OWNER || !GH_REPO) {
  console.error("GITHUB_REPO must be in the form 'owner/repo'.");
  process.exit(1);
}

const gitHubApiBase = "https://api.github.com";

async function fetchAllGitHubIssues(owner, repo, token) {
  const all = [];
  let page = 1;
  const perPage = 100;
  // Include both open and closed issues, exclude pull requests
  while (true) {
    const url = `${gitHubApiBase}/repos/${owner}/${repo}/issues?state=all&per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub issues fetch failed (${res.status}): ${text}`);
    }
    const batch = await res.json();
    // Filter out pull requests (issues API returns PRs too)
    const onlyIssues = batch.filter(item => !item.pull_request);
    all.push(...onlyIssues);
    if (batch.length < perPage) break;
    page += 1;
  }
  return all;
}

async function main() {
  console.log(`Reading GitHub issues from ${GITHUB_REPO} ...`);
  const issues = await fetchAllGitHubIssues(GH_OWNER, GH_REPO, GITHUB_TOKEN);
  const outPath = new URL("./github-issues.json", import.meta.url);
  await fs.writeFile(outPath, JSON.stringify(issues, null, 2), "utf8");
  console.log(`Saved ${issues.length} issues to scripts/github-issues.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


