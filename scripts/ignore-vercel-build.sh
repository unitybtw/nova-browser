#!/usr/bin/env bash
# Exit 0 = Skip Vercel build (no website changes)
# Exit 1 = Proceed with Vercel build (website changes detected)

PREV_SHA="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

# If PREV_SHA is not a valid git object, fallback to HEAD^
if ! git rev-parse --verify "$PREV_SHA" >/dev/null 2>&1; then
  PREV_SHA="HEAD^"
fi

# Compare changes in website directory and vercel configuration
if git diff --quiet "$PREV_SHA" HEAD -- website/ vercel.json; then
  echo "[Vercel] No website changes detected between $PREV_SHA and HEAD. Skipping deployment."
  exit 0
else
  echo "[Vercel] Changes detected in website/ or vercel.json. Proceeding with deployment."
  exit 1
fi
