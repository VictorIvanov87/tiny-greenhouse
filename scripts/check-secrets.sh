#!/usr/bin/env bash
# check-secrets.sh — lightweight pre-commit scan for leaked credentials.
# Scans staged files for patterns that indicate real secrets.
# Exit 0 = clean, Exit 1 = secrets detected.

set -euo pipefail

PATTERNS=(
  '-----BEGIN PRIVATE KEY-----'
  '-----BEGIN RSA PRIVATE KEY-----'
  'sk-proj-'
  'sk-live-'
  'postgresql://[^:]+:[^@]+@'
  'AIzaSy'
)

staged_files=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)

if [ -z "$staged_files" ]; then
  exit 0
fi

found=0

for pattern in "${PATTERNS[@]}"; do
  # Search staged content (not working tree) via git show :path
  for file in $staged_files; do
    # Skip binary files and .env.example files
    case "$file" in
      *.env.example) continue ;;
      *.png|*.jpg|*.gif|*.ico|*.woff|*.woff2|*.ttf|*.eot) continue ;;
    esac

    if git show ":$file" 2>/dev/null | grep -qE "$pattern"; then
      echo "ERROR: Potential secret found in staged file: $file"
      echo "       Pattern matched: $pattern"
      found=1
    fi
  done
done

if [ "$found" -ne 0 ]; then
  echo ""
  echo "Commit blocked — staged files contain patterns that look like secrets."
  echo "If this is a false positive, use: git commit --no-verify"
  exit 1
fi

exit 0
