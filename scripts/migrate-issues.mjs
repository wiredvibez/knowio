// One-time migration script: GitLab -> GitHub Issues
// Usage (PowerShell):
//   $env:GITHUB_TOKEN="<your_gh_token>"
//   $env:GITHUB_REPO="wiredvibez/knowio"  # optional, defaults to wiredvibez/knowio
//   $env:GITLAB_TOKEN="<optional_gitlab_token>"  # optional
//   $env:GITLAB_PROJECT_ID="74601574"  # optional, defaults to 74601574
//   npm run migrate:issues

import fs from "node:fs/promises";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "wiredvibez/knowio";
const GITLAB_TOKEN = process.env.GITLAB_TOKEN || "";
const GITLAB_PROJECT_ID = process.env.GITLAB_PROJECT_ID || "74601574";
const DRY_RUN = ["1", "true", "yes"].includes(String(process.env.DRY_RUN || "").toLowerCase());

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
const gitLabApiBase = "https://gitlab.com/api/v4";

async function fetchAllGitLabIssues(projectId, token) {
  const all = [];
  let page = 1;
  const perPage = 100;
  // Fetch both opened and closed for completeness
  while (true) {
    const url = `${gitLabApiBase}/projects/${encodeURIComponent(projectId)}/issues?state=all&per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: token ? { "PRIVATE-TOKEN": token } : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitLab issues fetch failed (${res.status}): ${text}`);
    }
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return all;
}

async function fetchIssuesFromFile(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error(`Local issues file is not an array: ${filePath}`);
  }
  return parsed;
}

async function fetchAllGitHubLabels(owner, repo, token) {
  const all = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const url = `${gitHubApiBase}/repos/${owner}/${repo}/labels?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub labels fetch failed (${res.status}): ${text}`);
    }
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return all;
}

async function createGitHubLabel(owner, repo, token, { name, color, description }) {
  const url = `${gitHubApiBase}/repos/${owner}/${repo}/labels`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, color, description }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub create label '${name}' failed (${res.status}): ${text}`);
  }
  return await res.json();
}

async function createGitHubIssue(owner, repo, token, { title, body, labels }) {
  const url = `${gitHubApiBase}/repos/${owner}/${repo}/issues`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body, labels }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub create issue failed (${res.status}): ${text}`);
  }
  return await res.json();
}

function buildLabelMapping(existingGhLabels) {
  const ghLabelNames = new Set(existingGhLabels.map(l => (l.name || "").toLowerCase()));
  // Preferred targets when available; otherwise we'll create them
  const preferred = new Map([
    ["feature", "enhancement"],
    ["ui", "ui"],
    ["bug", "bug"],
    ["note", "documentation"],
    ["prompt", "needs-spec"],
    ["pending review", "needs-review"],
  ]);

  const ensureTarget = (source) => {
    const normalized = source.toLowerCase();
    const target = preferred.get(normalized) || source;
    // If target exists on GH, use it; else we'll create it later
    if (ghLabelNames.has(target.toLowerCase())) return target;
    return target; // not present yet
  };

  return ensureTarget;
}

function chooseLabelColor(name) {
  const key = name.toLowerCase();
  const palette = {
    enhancement: "a2eeef",
    bug: "d73a4a",
    documentation: "0075ca",
    ui: "cfd3d7",
    "needs-spec": "fbca04",
    "needs-review": "bfd4f2",
    feature: "a2eeef",
    note: "0075ca",
    prompt: "fbca04",
    default: "ededed",
  };
  return palette[key] || palette.default;
}

function normalizeGitLabDescription(issue) {
  const original = issue.description || "";
  if (!original) return "";
  // Fix relative upload links so they work on GitHub by prefixing project base
  // Derive project base from web_url: https://gitlab.com/<namespace>/<project>/-/issues/<iid>
  const webUrl = issue.web_url || "";
  const baseMatch = webUrl.match(/^(.*)\/-\/issues\//);
  const projectBase = baseMatch ? baseMatch[1] : "";
  return original.replace(/\]\(\/(uploads\/[^)]+)\)/g, (_m, p1) => `](${projectBase}/${p1})`);
}

function buildIssueBody(issue) {
  const createdAt = issue.created_at || "";
  const authorName = issue.author?.name || "Unknown";
  const authorUsername = issue.author?.username ? `@${issue.author.username}` : "";
  const labelsText = Array.isArray(issue.labels) && issue.labels.length > 0 ? issue.labels.join(", ") : "None";
  const sourceUrl = issue.web_url || "";
  const normalizedDescription = normalizeGitLabDescription(issue);
  const parts = [];
  parts.push(`Imported from GitLab issue #${issue.iid}: ${sourceUrl}`);
  parts.push("");
  parts.push(`Author: ${authorName} ${authorUsername}`.trim());
  parts.push(`Created: ${createdAt}`);
  parts.push(`Original labels: ${labelsText}`);
  parts.push("\n---\n");
  if (normalizedDescription) {
    parts.push("Original description:\n");
    parts.push(normalizedDescription);
  } else {
    parts.push("No original description provided.");
  }
  return parts.join("\n");
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

async function main() {
  console.log(`Starting one-time migration: GitLab project ${GITLAB_PROJECT_ID} -> GitHub ${GITHUB_REPO}`);

  let gitlabIssues;
  if (process.env.GITLAB_ISSUES_FILE) {
    console.log(`Using local issues file: ${process.env.GITLAB_ISSUES_FILE}`);
    gitlabIssues = await fetchIssuesFromFile(process.env.GITLAB_ISSUES_FILE);
  } else {
    gitlabIssues = await fetchAllGitLabIssues(GITLAB_PROJECT_ID, GITLAB_TOKEN);
  }
  console.log(`Fetched ${gitlabIssues.length} GitLab issues.`);

  const existingGhLabels = await fetchAllGitHubLabels(GH_OWNER, GH_REPO, GITHUB_TOKEN);
  const ensureTarget = buildLabelMapping(existingGhLabels);

  // Compute final label names needed across all issues
  const requiredLabelNames = new Set();
  for (const issue of gitlabIssues) {
    for (const lbl of issue.labels || []) {
      const finalName = ensureTarget(String(lbl));
      requiredLabelNames.add(finalName);
    }
  }

  // Ensure labels exist on GitHub
  const existingLower = new Set(existingGhLabels.map(l => (l.name || "").toLowerCase()));
  for (const name of requiredLabelNames) {
    if (!name) continue;
    if (existingLower.has(name.toLowerCase())) continue;
    const color = chooseLabelColor(name);
    const description = `Auto-created for migrated issues (source: GitLab)`;
    if (DRY_RUN) {
      console.log(`[dry-run] Would create label: ${name} (${color})`);
    } else {
      console.log(`Creating label: ${name}`);
      try {
        await createGitHubLabel(GH_OWNER, GH_REPO, GITHUB_TOKEN, { name, color, description });
      } catch (err) {
        console.warn(`Skipping label '${name}' due to error: ${err.message}`);
      }
    }
  }

  // Create issues on GitHub
  let createdCount = 0;
  for (const issue of gitlabIssues) {
    const title = issue.title || `Imported GitLab issue #${issue.iid}`;
    const body = buildIssueBody(issue);
    const mappedLabels = uniq((issue.labels || []).map(l => ensureTarget(String(l))));

    if (DRY_RUN) {
      console.log(`[dry-run] Would create issue: '${title}' with labels [${mappedLabels.join(", ")}]`);
    } else {
      const created = await createGitHubIssue(GH_OWNER, GH_REPO, GITHUB_TOKEN, { title, body, labels: mappedLabels });
      console.log(`Created #${created.number}: ${created.title}`);
      createdCount += 1;
    }
  }

  console.log(`Migration complete. Created ${createdCount} issues.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


