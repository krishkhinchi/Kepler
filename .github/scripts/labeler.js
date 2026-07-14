const path = require('path');

// Helper function to match paths against glob patterns
function matchGlob(pathStr, glob) {
  // Convert globs to placeholders first
  let tokenized = glob
    .replace(/\*\*\//g, '___DOUBLE_STAR_SLASH___')
    .replace(/\*\*/g, '___DOUBLE_STAR___')
    .replace(/\*/g, '___STAR___');

  // Escape regex characters
  let escaped = tokenized.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

  // Restore placeholders and map to regex equivalents
  let regexStr = escaped
    .replace(/___DOUBLE_STAR_SLASH___/g, '(.*?/)?')
    .replace(/___DOUBLE_STAR___/g, '.*')
    .replace(/___STAR___/g, '[^/]*');

  const regex = new RegExp('^' + regexStr + '$');
  return regex.test(pathStr);
}

module.exports = async ({ github, context, core }) => {
  // Load configuration relative to the runner workspace
  const configPath = path.resolve(process.env.GITHUB_WORKSPACE, '.github/labeler-config.js');
  core.info(`Loading configuration from: ${configPath}`);
  const config = require(configPath);

  const eventName = context.eventName;
  const action = context.payload.action;
  core.info(`Triggered by Event: "${eventName}" with Action: "${action || 'N/A'}"`);

  // Target issue or PR number
  const targetNumber = context.issue.number;
  if (!targetNumber) {
    core.warning('No issue or pull request number found in context. Skipping execution.');
    return;
  }

  // 1. Fetch current labels on the issue/PR to avoid duplicate calls
  let currentLabels = [];
  try {
    const { data: item } = await github.rest.issues.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: targetNumber
    });
    currentLabels = item.labels.map(l => l.name);
    core.info(`Current labels in repository for #${targetNumber}: ${JSON.stringify(currentLabels)}`);
  } catch (err) {
    core.error(`Failed to fetch current labels for #${targetNumber}: ${err.message}`);
    throw err;
  }

  // 2. Identify all labels that we might want to add
  const labelsToAdd = new Set();

  if (eventName === 'issues') {
    // ----------------------
    // Handle Issue Event
    // ----------------------
    if (action === 'assigned' || action === 'unassigned') {
      core.info(`Processing assignment event: ${action}`);
      if (action === 'assigned') {
        labelsToAdd.add('assigned');
      } else if (action === 'unassigned') {
        // Fetch current issue state from API to prevent race conditions
        const { data: issue } = await github.rest.issues.get({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: targetNumber
        });
        if (issue.assignees.length === 0) {
          core.info('No assignees remain. Removing "assigned" label...');
          if (currentLabels.includes('assigned')) {
            try {
              await github.rest.issues.removeLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: targetNumber,
                name: 'assigned'
              });
              core.info('Successfully removed "assigned" label.');
            } catch (err) {
              core.warning(`Error removing "assigned" label: ${err.message}`);
            }
          }
        } else {
          core.info(`Issue still has ${issue.assignees.length} assignee(s). Keeping "assigned" label.`);
        }
      }
    }

    if (['opened', 'edited', 'reopened'].includes(action)) {
      const title = context.payload.issue.title || '';
      const body = context.payload.issue.body || '';

      // Match title/body keywords
      core.info('Scanning issue title and body for keywords...');
      for (const rule of config.issueRules.keywords) {
        for (const pattern of rule.patterns) {
          if (pattern.test(title) || pattern.test(body)) {
            core.info(`Keyword matched: "${pattern}" -> adding label "${rule.label}"`);
            labelsToAdd.add(rule.label);
            break;
          }
        }
      }

      // Match template dropdown forms
      core.info('Parsing markdown fields for template dropdown values...');
      for (const mapping of config.issueRules.formMappings) {
        const escapedField = mapping.field.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`###\\s+${escapedField}\\s*[\\r\\n]+([^#\\r\\n]+)`, 'i');
        const match = body.match(regex);
        if (match) {
          const selectedVal = match[1].trim();
          core.info(`Found field "### ${mapping.field}" with value: "${selectedVal}"`);
          for (const [option, labels] of Object.entries(mapping.mappings)) {
            if (selectedVal.toLowerCase() === option.toLowerCase()) {
              core.info(`Matched option "${option}" -> adding labels: ${JSON.stringify(labels)}`);
              for (const label of labels) {
                labelsToAdd.add(label);
              }
            }
          }
        }
      }
    }
  } else if (eventName === 'pull_request' || eventName === 'pull_request_target') {
    // ----------------------
    // Handle Pull Request Event
    // ----------------------
    const prAction = context.payload.action;
    if (['opened', 'edited', 'reopened', 'synchronize', 'ready_for_review'].includes(prAction)) {
      const title = context.payload.pull_request.title || '';
      const body = context.payload.pull_request.body || '';
      const additions = context.payload.pull_request.additions || 0;
      const deletions = context.payload.pull_request.deletions || 0;
      const totalLines = additions + deletions;

      core.info(`Scanning PR title and body for keywords...`);
      for (const rule of config.prRules.keywords) {
        for (const pattern of rule.patterns) {
          if (pattern.test(title) || pattern.test(body)) {
            core.info(`Keyword matched: "${pattern}" -> adding label "${rule.label}"`);
            labelsToAdd.add(rule.label);
            break;
          }
        }
      }

      // Assign PR size labels
      core.info(`Calculating PR size based on changed lines: ${totalLines} (Additions: ${additions}, Deletions: ${deletions})`);
      for (const rule of config.prRules.sizeRules) {
        if (totalLines <= rule.maxLines) {
          core.info(`PR size matches limit ${rule.maxLines} -> adding labels: ${JSON.stringify(rule.labels)}`);
          for (const label of rule.labels) {
            labelsToAdd.add(label);
          }
          break;
        }
      }

      // Fetch changed files via REST API (handles forks and paging securely)
      core.info('Fetching changed files from GitHub API...');
      const changedFiles = [];
      let page = 1;
      while (true) {
        const response = await github.rest.pulls.listFiles({
          owner: context.repo.owner,
          repo: context.repo.repo,
          pull_number: targetNumber,
          per_page: 100,
          page: page
        });
        if (response.data.length === 0) break;
        changedFiles.push(...response.data.map(f => f.filename));
        page++;
      }
      core.info(`Found ${changedFiles.length} changed file(s): ${JSON.stringify(changedFiles)}`);

      if (changedFiles.length > 0) {
        // Check if documentation-only changes
        let docOnly = true;
        for (const file of changedFiles) {
          let isDoc = false;
          for (const docGlob of config.prRules.documentationGlobs) {
            if (matchGlob(file, docGlob)) {
              isDoc = true;
              break;
            }
          }
          if (!isDoc) {
            docOnly = false;
            break;
          }
        }

        if (docOnly) {
          core.info('PR consists of documentation-only changes. Assigning only documentation labels.');
          labelsToAdd.add('documentation');
          labelsToAdd.add('type:documentation');
        } else {
          // Check file patterns
          core.info('Matching changed files against scope paths...');
          const matchedFileLabels = new Set();
          for (const file of changedFiles) {
            for (const pattern of config.prRules.filePatterns) {
              for (const glob of pattern.globs) {
                if (matchGlob(file, glob)) {
                  core.info(`File "${file}" matched glob "${glob}" -> marking label "${pattern.label}"`);
                  matchedFileLabels.add(pattern.label);
                  break;
                }
              }
            }
          }
          for (const label of matchedFileLabels) {
            labelsToAdd.add(label);
          }
        }
      }
    }
  }

  // 3. Filter out labels that are already applied to prevent duplicate work/logging
  const labelsToEnsure = Array.from(labelsToAdd);
  const labelsToApply = labelsToEnsure.filter(label => !currentLabels.includes(label));
  const labelsAlreadyPresent = labelsToEnsure.filter(label => currentLabels.includes(label));

  core.info(`Labels matched: ${JSON.stringify(labelsToEnsure)}`);
  core.info(`Labels already present: ${JSON.stringify(labelsAlreadyPresent)}`);
  core.info(`Labels to apply: ${JSON.stringify(labelsToApply)}`);

  if (labelsToApply.length === 0) {
    core.info('No new labels to apply.');
    return;
  }

  // 4. Ensure the repository labels exist prior to applying them
  // This prevents the addLabels API from failing if a label does not exist yet.
  await ensureLabelsExist(github, context, labelsToApply);

  // Helper function to check and create missing labels
  async function ensureLabelsExist(github, context, labels) {
    core.info('Validating label existence in the repository...');
    const existingRepoLabels = new Set();
    let page = 1;
    while (true) {
      const response = await github.rest.issues.listLabelsForRepo({
        owner: context.repo.owner,
        repo: context.repo.repo,
        per_page: 100,
        page: page
      });
      if (response.data.length === 0) break;
      for (const label of response.data) {
        existingRepoLabels.add(label.name);
      }
      page++;
    }

    for (const name of labels) {
      if (!existingRepoLabels.has(name)) {
        const metadata = config.labels[name] || { color: 'cccccc', description: 'Automatically created label' };
        core.info(`Label "${name}" not found. Creating label...`);
        try {
          await github.rest.issues.createLabel({
            owner: context.repo.owner,
            repo: context.repo.repo,
            name: name,
            color: metadata.color,
            description: metadata.description
          });
          core.info(`Label "${name}" created successfully.`);
        } catch (err) {
          core.warning(`Failed to create label "${name}": ${err.message}`);
        }
      }
    }
  }

  // 5. Apply new labels to the issue/PR
  try {
    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: targetNumber,
      labels: labelsToApply
    });
    core.info(`Successfully applied labels: ${JSON.stringify(labelsToApply)}`);
  } catch (err) {
    core.error(`Failed to apply labels: ${err.message}`);
    throw err;
  }
};
