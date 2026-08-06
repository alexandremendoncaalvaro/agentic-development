#!/usr/bin/env bash
#
# Local release step for the kit (task-0032). Bumps package.json (+ lockfile),
# rotates CHANGELOG.md's [Unreleased] into the new version heading, creates
# the signed release commit and the annotated tag — and deliberately stops
# there. Pushing the branch/tag and `npm publish` (2FA) stay human steps:
# see README.md "Release and publish".
#
# Usage: scripts/release.sh <patch|minor|major|prerelease> [--dry-run]
set -euo pipefail

usage() {
  echo "usage: scripts/release.sh <patch|minor|major|prerelease> [--dry-run]" >&2
}

KIND=""
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    patch|minor|major|prerelease) KIND="$arg" ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "error: unknown argument \"$arg\"" >&2; usage; exit 1 ;;
  esac
done
if [ -z "$KIND" ]; then
  usage
  exit 1
fi

cd "$(dirname "$0")/.."

# Every mutating step goes through run() so --dry-run previews the exact
# commands without touching the tree, the index, or the tag namespace.
run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

# --- Preflight: fail before anything is written ---

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "error: working tree has uncommitted changes — commit or stash first" >&2
  exit 1
fi

if [ ! -f CHANGELOG.md ]; then
  echo "error: CHANGELOG.md not found" >&2
  exit 1
fi

DATE="$(date +%F)"

# Compute (and validate: parseable version, non-empty [Unreleased]) without
# writing, so every remaining preflight check can use the target version.
NEW_VERSION="$(node scripts/release-apply.js "$KIND" --date "$DATE" --dry-run 2>/dev/null)" || {
  node scripts/release-apply.js "$KIND" --date "$DATE" --dry-run >/dev/null
  exit 1
}

BRANCH="$(git branch --show-current)"
if [ "$BRANCH" = "main" ]; then
  echo "error: refusing to commit a release on main — releases go through a PR" >&2
  echo "create a release branch first: git switch -c chore/release-$NEW_VERSION" >&2
  exit 1
fi

if git rev-parse -q --verify "refs/tags/v$NEW_VERSION" >/dev/null; then
  echo "error: tag v$NEW_VERSION already exists — delete it or pick another bump" >&2
  exit 1
fi

# --- Apply: bump + rotate + lockfile + commit + tag ---

TAG_MSG_FILE="$(mktemp)"
trap 'rm -f "$TAG_MSG_FILE"' EXIT

if [ "$DRY_RUN" -eq 1 ]; then
  echo "[dry-run] node scripts/release-apply.js $KIND --date $DATE (writes package.json + CHANGELOG.md)"
  node scripts/release-apply.js "$KIND" --date "$DATE" --dry-run >/dev/null
else
  node scripts/release-apply.js "$KIND" --date "$DATE" --tag-message-file "$TAG_MSG_FILE" >/dev/null
fi

run npm install --package-lock-only
run git add package.json package-lock.json CHANGELOG.md
run git commit --signoff -m "chore(release): $NEW_VERSION"
# --cleanup=whitespace: the tag body is the changelog section, whose markdown
# headings start with '#' — the default cleanup would strip them as comments.
run git tag -a --cleanup=whitespace "v$NEW_VERSION" -F "$TAG_MSG_FILE"

echo
if [ "$DRY_RUN" -eq 1 ]; then
  echo "[dry-run] nothing was written, committed, or tagged."
  echo "[dry-run] a real run would commit and tag $NEW_VERSION, then stop (no push, no publish)."
else
  echo "release $NEW_VERSION committed and tagged locally (nothing pushed, nothing published)."
  echo "next steps:"
  echo "  git push -u origin $BRANCH        # then open the PR: /ad-pr"
  echo "  # after the PR merges:"
  echo "  git push origin v$NEW_VERSION"
  echo "  npm publish                        # npm OTP (2FA); publishConfig tags it beta"
  echo "  npm dist-tag ls @alexandrealvaro/agentic   # verify; see README 'Release and publish'"
fi
