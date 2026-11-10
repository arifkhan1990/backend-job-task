#!/usr/bin/env bash
# Fails if forbidden files are tracked by git. Run locally before commit and in CI.
set -euo pipefail

tracked="$(git ls-files)"
pattern='(^|/)(AGENTS\.md|CLAUDE\.md|GEMINI\.md|\.opencode/|\.ai/|\.claude/|\.cursor/|\.cursorrules|SUMMARY[^/]*\.md|PLAN[^/]*\.md|NOTES[^/]*\.md|IMPLEMENTATION[^/]*\.md|node_modules/|vendor/|dist/|build/|\.next/|coverage/|\.env($|\.)|.*\.log$|.*\.bak$|.*\.old$|.*\.orig$|.*\.pem$|.*\.key$|\.DS_Store|Thumbs\.db)'

bad="$(echo "$tracked" | grep -E "$pattern" | grep -v -E '(^|/)\.env\.example$' || true)"

if [ -n "$bad" ]; then
  echo "Forbidden files are tracked by git:"
  echo "$bad"
  echo
  echo "Fix: git rm -r --cached <path>  (then make sure it is in .gitignore)"
  exit 1
fi
echo "Repo hygiene OK"
