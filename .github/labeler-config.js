/**
 * Kepler Automatic Labeler Configuration
 * 
 * This file contains the definitions for all repository labels, as well as the rules
 * used to automatically apply them to issues and pull requests.
 */

module.exports = {
  // Metadata for creating labels if they do not exist in the repository
  labels: {
    "assigned": { color: "cccccc", description: "Issue is currently assigned to a contributor" },
    "bug": { color: "d73a4a", description: "Something isn't working" },
    "type:bug": { color: "d73a4a", description: "Something isn't working" },
    "documentation": { color: "0075ca", description: "Improvements or additions to documentation" },
    "type:documentation": { color: "0075ca", description: "Improvements or additions to documentation" },
    "enhancement": { color: "a2eeef", description: "New feature or request" },
    "type:feature": { color: "a2eeef", description: "New feature or request" },
    "good first issue": { color: "7057ff", description: "Good for newcomers" },
    "good-first-issue": { color: "7057ff", description: "Good for newcomers" },
    "help wanted": { color: "008672", description: "Extra attention is needed" },
    "help-wanted": { color: "008672", description: "Extra attention is needed" },
    "backend": { color: "c5def5", description: "Backend development" },
    "type:backend": { color: "c5def5", description: "Backend development" },
    "frontend": { color: "1d76db", description: "Frontend development" },
    "type:frontend": { color: "1d76db", description: "Frontend development" },
    "AI": { color: "d4c5f9", description: "Artificial Intelligence and Machine Learning" },
    "database": { color: "bfd4f2", description: "Database and schema related changes" },
    "GitHub Actions": { color: "5319e7", description: "GitHub Actions workflows and CI/CD" },
    "github-actions": { color: "5319e7", description: "GitHub Actions workflows and CI/CD" },
    "type:devops": { color: "5319e7", description: "DevOps or CI/CD" },
    "docker": { color: "0997e2", description: "Docker and containerization" },
    "testing": { color: "cc317c", description: "Tests added or improved" },
    "type:testing": { color: "cc317c", description: "Tests added or improved" },
    "priority:low": { color: "fef2c0", description: "Low priority" },
    "priority:medium": { color: "fbca04", description: "Medium priority" },
    "priority:high": { color: "d93f0b", description: "High priority" },
    "priority:critical": { color: "b60205", description: "Critical priority" },
    "size:XS": { color: "3cb44b", description: "Extra small size" },
    "size:S": { color: "ffe119", description: "Small size" },
    "size:M": { color: "f58231", description: "Medium size" },
    "size:L": { color: "e6194b", description: "Large size" },
    "size/XS": { color: "3cb44b", description: "Extra small size" },
    "size/S": { color: "ffe119", description: "Small size" },
    "size/M": { color: "f58231", description: "Medium size" },
    "size/L": { color: "e6194b", description: "Large size" },
    "size/XL": { color: "800000", description: "Extra large size" },
    "website": { color: "0052cc", description: "Website platform" },
    "mobile": { color: "1d76db", description: "Mobile platform" },
    "api": { color: "0075ca", description: "API platform" },
    "ECSoC26": { color: "0052cc", description: "Event specific label for ECSoC26" },
    "mentor:Krish-Khinchi": { color: "1d76db", description: "Assigned mentor" },
    "pr-valid": { color: "0e8a16", description: "Pull request is valid" },
    "issue-valid": { color: "0e8a16", description: "Issue is valid" }
  },

  // Auto-labeling rules for issues
  issueRules: {
    // Keyword pattern matching on Title and Body
    keywords: [
      { label: "bug", patterns: [/bug/i, /error/i, /fail/i, /broken/i, /crash/i, /incorrect/i] },
      { label: "type:bug", patterns: [/bug/i, /error/i, /fail/i, /broken/i, /crash/i, /incorrect/i] },
      { label: "documentation", patterns: [/documentation/i, /docs?\b/i, /readme/i, /tutorial/i, /guide/i] },
      { label: "type:documentation", patterns: [/documentation/i, /docs?\b/i, /readme/i, /tutorial/i, /guide/i] },
      { label: "enhancement", patterns: [/enhancement/i, /feature/i, /request/i, /improve/i] },
      { label: "type:feature", patterns: [/enhancement/i, /feature/i, /request/i, /improve/i] },
      { label: "good first issue", patterns: [/good first issue/i, /beginner-friendly/i] },
      { label: "good-first-issue", patterns: [/good first issue/i, /beginner-friendly/i] },
      { label: "help wanted", patterns: [/help wanted/i, /need help/i] },
      { label: "help-wanted", patterns: [/help wanted/i, /need help/i] },
      { label: "backend", patterns: [/backend/i, /server/i, /express/i, /django/i, /flask/i, /spring/i] },
      { label: "type:backend", patterns: [/backend/i, /server/i, /express/i, /django/i, /flask/i, /spring/i] },
      { label: "frontend", patterns: [/frontend/i, /client/i, /\bui\b/i, /react/i, /vue/i, /angular/i] },
      { label: "type:frontend", patterns: [/frontend/i, /client/i, /\bui\b/i, /react/i, /vue/i, /angular/i] },
      { label: "AI", patterns: [/\bai\b/i, /\bml\b/i, /openai/i, /\bllm\b/i, /tensorflow/i, /pytorch/i, /model/i] },
      { label: "database", patterns: [/database/i, /\bdb\b/i, /postgres/i, /mysql/i, /mongo/i, /prisma/i, /sqlite/i, /redis/i] },
      { label: "GitHub Actions", patterns: [/github actions/i, /workflow/i, /ci\/cd/i, /pipeline/i] },
      { label: "github-actions", patterns: [/github actions/i, /workflow/i, /ci\/cd/i, /pipeline/i] }
    ],

    // Mapping fields parsed from issue templates (e.g. Markdown headers ### Platform)
    formMappings: [
      {
        field: "Priority",
        mappings: {
          "Critical": ["priority:critical", "priority:high"],
          "High": ["priority:high"],
          "Medium": ["priority:medium"],
          "Low": ["priority:low"]
        }
      },
      {
        field: "Platform",
        mappings: {
          "Website": ["website", "type:frontend", "frontend"],
          "Backend": ["type:backend", "backend"],
          "Frontend": ["type:frontend", "frontend"],
          "API": ["api", "type:backend", "backend"],
          "Mobile": ["mobile", "type:frontend", "frontend"]
        }
      },
      {
        field: "Difficulty",
        mappings: {
          "Beginner": ["level:beginner", "good first issue", "good-first-issue", "size:S", "size/S"],
          "Intermediate": ["level:intermediate", "size:M", "size/M"],
          "Advanced": ["level:advanced", "size:L", "size/L"]
        }
      }
    ]
  },

  // Auto-labeling rules for pull requests
  prRules: {
    // Keyword pattern matching on Title and Body
    keywords: [
      { label: "bug", patterns: [/bug/i, /fix/i, /error/i, /fail/i, /broken/i, /crash/i] },
      { label: "type:bug", patterns: [/bug/i, /fix/i, /error/i, /fail/i, /broken/i, /crash/i] },
      { label: "documentation", patterns: [/documentation/i, /docs?\b/i, /readme/i, /tutorial/i, /guide/i] },
      { label: "type:documentation", patterns: [/documentation/i, /docs?\b/i, /readme/i, /tutorial/i, /guide/i] },
      { label: "enhancement", patterns: [/enhancement/i, /feature/i, /request/i, /improve/i] },
      { label: "type:feature", patterns: [/enhancement/i, /feature/i, /request/i, /improve/i] },
      { label: "AI", patterns: [/\bai\b/i, /\bml\b/i, /openai/i, /\bllm\b/i, /tensorflow/i, /pytorch/i, /model/i] },
      { label: "database", patterns: [/database/i, /\bdb\b/i, /postgres/i, /mysql/i, /mongo/i, /prisma/i, /sqlite/i, /redis/i] },
      { label: "GitHub Actions", patterns: [/github actions/i, /workflow/i, /ci\/cd/i, /pipeline/i] },
      { label: "github-actions", patterns: [/github actions/i, /workflow/i, /ci\/cd/i, /pipeline/i] }
    ],

    // Glob pattern mappings for changed files
    filePatterns: [
      { label: "frontend", globs: ["frontend/**", "public/**", "assets/**"] },
      { label: "type:frontend", globs: ["frontend/**", "public/**", "assets/**"] },
      { label: "backend", globs: ["backend/**"] },
      { label: "type:backend", globs: ["backend/**"] },
      { label: "github-actions", globs: [".github/workflows/**"] },
      { label: "type:devops", globs: [".github/workflows/**", "docker/**", "**/Dockerfile", "**/docker-compose.yml"] },
      { label: "testing", globs: ["tests/**", "**/tests/**", "**/test_*.py"] },
      { label: "type:testing", globs: ["tests/**", "**/tests/**", "**/test_*.py"] },
      { label: "docker", globs: ["docker/**", "**/Dockerfile", "**/docker-compose.yml"] },
      { label: "database", globs: ["backend/database/**", "**/db/**", "**/database/**", "**/schema.prisma", "**/migrations/**"] },
      { label: "documentation", globs: ["docs/**", "README.md", "*.md"] },
      { label: "type:documentation", globs: ["docs/**", "README.md", "*.md"] }
    ],

    // Glob patterns indicating documentation files
    documentationGlobs: ["docs/**", "README.md", "*.md"],

    // Pull request size (line additions + deletions) rules
    sizeRules: [
      { maxLines: 10, labels: ["size:XS", "size/XS"] },
      { maxLines: 50, labels: ["size:S", "size/S"] },
      { maxLines: 200, labels: ["size:M", "size/M"] },
      { maxLines: 500, labels: ["size:L", "size/L"] },
      { maxLines: Infinity, labels: ["size/XL"] }
    ]
  }
};
