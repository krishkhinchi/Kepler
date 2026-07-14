/**
 * ECSoC26 Automatic PR Labeler
 * ─────────────────────────────────────────────────────────────────────────────
 * This script is invoked by the `ecsoc26-auto-label.yml` workflow via
 * `actions/github-script`. It receives the standard `{ github, context, core }`
 * injected objects.
 *
 * Responsibilities:
 *  1. Check whether the PR body contains an ECSoC26 section.
 *  2. Parse the selected difficulty level from that section (L1, L2, or L3).
 *  3. Fail loudly with a helpful message if:
 *       – No difficulty is selected.
 *       – More than one difficulty is selected.
 *  4. Remove any stale ECSoC26 difficulty labels that no longer match.
 *  5. Ensure `ECSoC26` and exactly one `ECSoC26-Lx` label are applied.
 *  6. Never touch labels that are unrelated to ECSoC26.
 *
 * Detection strategy:
 *   The PR template contains a section headed `## ECSoC26 Submission`.
 *   Under it, contributors tick a GitHub-flavoured-markdown checkbox for their
 *   chosen difficulty level:
 *
 *     - [x] `ECSoC26-L1` – Beginner
 *     - [ ] `ECSoC26-L2` – Intermediate
 *     - [ ] `ECSoC26-L3` – Advanced
 *
 *   A "checked" checkbox in rendered Markdown is represented as `[x]` or `[X]`
 *   in the raw body text.  The parser looks for lines that match:
 *
 *     /^\s*-\s*\[x\]\s*`?ECSoC26-(L[123])`?/i
 *
 *   This intentionally supports minor whitespace variation and optional
 *   backtick wrapping around the label name for readability.
 *
 * Label invariants enforced after every run:
 *   ✔  `ECSoC26` is always present.
 *   ✔  Exactly one of `ECSoC26-L1`, `ECSoC26-L2`, `ECSoC26-L3` is present.
 *   ✔  No other labels are added, modified, or removed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

/** The umbrella label every ECSoC26 PR must carry. */
const ECSOC26_BASE_LABEL = 'ECSoC26';

/** The three valid difficulty labels – ordered L1 → L3. */
const DIFFICULTY_LABELS = ['ECSoC26-L1', 'ECSoC26-L2', 'ECSoC26-L3'];

/**
 * Label metadata used when creating labels that do not yet exist in the repo.
 * Colors follow the project's existing palette from labeler-config.js.
 */
const LABEL_METADATA = {
  'ECSoC26':    { color: '0052cc', description: 'ECSoC26 event submission' },
  'ECSoC26-L1': { color: '0e8a16', description: 'ECSoC26 – Level 1 (Beginner)' },
  'ECSoC26-L2': { color: 'fbca04', description: 'ECSoC26 – Level 2 (Intermediate)' },
  'ECSoC26-L3': { color: 'd93f0b', description: 'ECSoC26 – Level 3 (Advanced)' },
};

// ── Regex helpers ─────────────────────────────────────────────────────────────

/**
 * Detects whether the PR body contains the ECSoC26 submission section.
 * Matches the heading `## ECSoC26` (case-insensitive, allows trailing text).
 */
const ECSOC26_SECTION_RE = /##\s+ECSoC26/i;

/**
 * Matches a *checked* checkbox line for a specific difficulty level.
 *
 * Examples that match:
 *   - [x] `ECSoC26-L1` – Beginner
 *   - [X] ECSoC26-L2 – Intermediate
 *   -[x]`ECSoC26-L3`
 *
 * Capture group 1: the level identifier, e.g. "L1", "L2", "L3".
 */
const CHECKED_DIFFICULTY_RE = /^\s*-\s*\[[xX]\]\s*`?ECSoC26-(L[123])`?/m;

/**
 * Matches *any* checkbox line (checked or unchecked) for a difficulty level.
 * Used to extract all difficulty lines within the section for richer error
 * messages.
 */
const ANY_DIFFICULTY_RE = /^\s*-\s*\[[ xX]\]\s*`?ECSoC26-(L[123])`?/gm;

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Entry point called by the `actions/github-script` action.
 *
 * @param {object} params
 * @param {object} params.github  - Octokit REST client injected by github-script
 * @param {object} params.context - GitHub Actions event context
 * @param {object} params.core    - @actions/core for logging and failure control
 */
module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;

  // ── 1. Guard: only run on pull_request_target events ─────────────────────
  if (context.eventName !== 'pull_request_target') {
    core.info(`Skipping: event is "${context.eventName}", expected "pull_request_target".`);
    return;
  }

  const pr = context.payload.pull_request;
  if (!pr) {
    core.warning('No pull_request payload found. Skipping.');
    return;
  }

  const prNumber = pr.number;
  const prBody   = pr.body || '';

  core.info(`\n${'─'.repeat(60)}`);
  core.info(`ECSoC26 Auto Labeler – PR #${prNumber}`);
  core.info(`${'─'.repeat(60)}`);

  // ── 2. Guard: skip PRs that don't include the ECSoC26 section ────────────
  if (!ECSOC26_SECTION_RE.test(prBody)) {
    core.info('PR body does not contain an ECSoC26 section. Skipping ECSoC26 labeling.');
    return;
  }

  core.info('ECSoC26 section detected in PR body. Proceeding with difficulty detection.');

  // ── 3. Parse all checked difficulty checkboxes ───────────────────────────
  const selectedLevels = [];
  let match;
  const checkedRe = new RegExp(CHECKED_DIFFICULTY_RE.source, 'gim');

  while ((match = checkedRe.exec(prBody)) !== null) {
    const level = match[1].toUpperCase(); // e.g. "L1", "L2", "L3"
    selectedLevels.push(`ECSoC26-${level}`);
  }

  core.info(`Detected checked difficulty labels: ${JSON.stringify(selectedLevels)}`);

  // ── 4. Validate: exactly one difficulty must be selected ─────────────────
  if (selectedLevels.length === 0) {
    core.setFailed(
      '❌ No ECSoC26 difficulty level selected.\n\n' +
      'Please check exactly ONE of the following in your PR description:\n' +
      '  - [x] `ECSoC26-L1` – Beginner\n' +
      '  - [x] `ECSoC26-L2` – Intermediate\n' +
      '  - [x] `ECSoC26-L3` – Advanced\n\n' +
      'Edit your PR description and select one difficulty level to continue.'
    );
    return;
  }

  if (selectedLevels.length > 1) {
    core.setFailed(
      `❌ Multiple ECSoC26 difficulty levels selected: ${selectedLevels.join(', ')}.\n\n` +
      'Exactly ONE difficulty level must be selected. ' +
      'Please uncheck all but one option and update your PR description.'
    );
    return;
  }

  const targetDifficultyLabel = selectedLevels[0]; // e.g. "ECSoC26-L2"
  core.info(`Target difficulty label: "${targetDifficultyLabel}"`);

  // ── 5. Fetch current labels on the PR ────────────────────────────────────
  let currentLabels = [];
  try {
    const { data: issue } = await github.rest.issues.get({
      owner,
      repo,
      issue_number: prNumber,
    });
    currentLabels = issue.labels.map(l => l.name);
  } catch (err) {
    core.error(`Failed to fetch current labels for PR #${prNumber}: ${err.message}`);
    throw err;
  }

  core.info(`Current labels on PR #${prNumber}: ${JSON.stringify(currentLabels)}`);

  // ── 6. Ensure required repo-level labels exist (create if missing) ────────
  const labelsNeeded = [ECSOC26_BASE_LABEL, targetDifficultyLabel];
  await ensureLabelsExist({ github, context, core, labelsNeeded });

  // ── 7. Remove stale ECSoC26 difficulty labels ─────────────────────────────
  // Only remove labels from the DIFFICULTY_LABELS set that don't match the
  // target – never touch unrelated labels.
  const staleLabels = DIFFICULTY_LABELS.filter(
    l => l !== targetDifficultyLabel && currentLabels.includes(l)
  );

  for (const stale of staleLabels) {
    core.info(`Removing stale label: "${stale}"`);
    try {
      await github.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: prNumber,
        name: stale,
      });
      core.info(`✔ Removed stale label "${stale}".`);
    } catch (err) {
      // 404 means the label isn't on the PR – safe to ignore
      if (err.status === 404) {
        core.info(`Label "${stale}" was not present (404). Skipping removal.`);
      } else {
        core.warning(`Could not remove label "${stale}": ${err.message}`);
      }
    }
  }

  // ── 8. Apply missing required labels ─────────────────────────────────────
  // Re-check what's currently on the PR after removals so we stay idempotent.
  const labelsToAdd = labelsNeeded.filter(l => !currentLabels.includes(l));

  if (labelsToAdd.length === 0 && staleLabels.length === 0) {
    core.info('✔ All required labels are already correctly applied. Nothing to do.');
    return;
  }

  if (labelsToAdd.length > 0) {
    core.info(`Applying labels: ${JSON.stringify(labelsToAdd)}`);
    try {
      await github.rest.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels: labelsToAdd,
      });
      core.info(`✔ Successfully applied: ${JSON.stringify(labelsToAdd)}`);
    } catch (err) {
      core.error(`Failed to apply labels: ${err.message}`);
      throw err;
    }
  }

  core.info(`\n✅ ECSoC26 labeling complete for PR #${prNumber}.`);
  core.info(`   Base label : "${ECSOC26_BASE_LABEL}"`);
  core.info(`   Difficulty : "${targetDifficultyLabel}"`);
  if (staleLabels.length > 0) {
    core.info(`   Removed    : ${JSON.stringify(staleLabels)}`);
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Ensures that every label in `labelsNeeded` exists at the repository level.
 * If a label is missing, it is created using metadata from `LABEL_METADATA`.
 * This prevents `addLabels` from failing with a 422 when a label doesn't exist.
 *
 * @param {object} params
 * @param {object} params.github       - Octokit REST client
 * @param {object} params.context      - GitHub Actions event context
 * @param {object} params.core         - @actions/core
 * @param {string[]} params.labelsNeeded - Labels to verify/create
 */
async function ensureLabelsExist({ github, context, core, labelsNeeded }) {
  const { owner, repo } = context.repo;

  // Fetch all repo-level labels (paginated)
  core.info('Validating that required labels exist in the repository...');
  const existingRepoLabels = new Set();
  let page = 1;

  while (true) {
    const response = await github.rest.issues.listLabelsForRepo({
      owner,
      repo,
      per_page: 100,
      page,
    });
    if (response.data.length === 0) break;
    for (const label of response.data) {
      existingRepoLabels.add(label.name);
    }
    page++;
  }

  // Create any missing labels
  for (const name of labelsNeeded) {
    if (!existingRepoLabels.has(name)) {
      const meta = LABEL_METADATA[name] || {
        color: 'cccccc',
        description: `Automatically created label for ${name}`,
      };
      core.info(`Label "${name}" not found in repo. Creating it...`);
      try {
        await github.rest.issues.createLabel({
          owner,
          repo,
          name,
          color: meta.color,
          description: meta.description,
        });
        core.info(`✔ Created label "${name}".`);
      } catch (err) {
        // 422 Unprocessable Entity often means the label already exists due to
        // a race condition; safe to continue.
        if (err.status === 422) {
          core.info(`Label "${name}" already exists (race condition). Continuing.`);
        } else {
          core.warning(`Could not create label "${name}": ${err.message}`);
        }
      }
    } else {
      core.info(`Label "${name}" already exists in the repository. ✔`);
    }
  }
}
