#!/usr/bin/env sh
# Exit 0 when there are no staged files under apps/ or packages/ (e.g. docs
# or CHANGELOG only). Exit 1 when the lint/tests step in the pre-commit hook
# should run because there are code changes in tracked workspaces.
#
# Notes:
# - We only inspect staged files (not the full working tree) so that a docs
#   commit alongside unstaged code changes still skips the heavy steps.
# - --diff-filter=ACMR matches Added, Copied, Modified, Renamed entries; this
#   mirrors what scripts/admin-v2-gates/is-affected.mjs uses.

set -e

changed=$(git diff --cached --name-only --diff-filter=ACMR)

if [ -z "$changed" ]; then
  exit 0
fi

if printf '%s\n' "$changed" | grep -Eq '^(apps|packages)/'; then
  exit 1
fi

exit 0
