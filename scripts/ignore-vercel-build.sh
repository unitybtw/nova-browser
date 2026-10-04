#!/usr/bin/env bash
# Exit 0 = Skip Vercel build (no website changes)
# Exit 1 = Proceed with Vercel build (website changes detected)

# If it is an initial build or forced redeploy without previous sha, proceed
if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ]; then
  echo "[Vercel] Initial or forced deployment. Proceeding with deployment."
  exit 1
fi

CURRENT_SHA=$(git rev-parse HEAD 2>/dev/null)

# If previous SHA is identical to HEAD (manual redeploy in Vercel), always proceed
if [ -n "$CURRENT_SHA" ] && [ "$VERCEL_GIT_PREVIOUS_SHA" = "$CURRENT_SHA" ]; then
  echo "[Vercel] Manual redeploy detected on $CURRENT_SHA. Proceeding with deployment."
  exit 1
fi

PREV_SHA="$VERCEL_GIT_PREVIOUS_SHA"

# If PREV_SHA is not a valid git object, fallback to HEAD^
if ! git rev-parse --verify "$PREV_SHA" >/dev/null 2>&1; then
  PREV_SHA="HEAD^"
fi

if ! git rev-parse --verify "$PREV_SHA" >/dev/null 2>&1; then
  echo "[Vercel] Cannot verify previous commit in shallow clone. Proceeding with deployment."
  exit 1
fi

# Compare changes in website directory and vercel configuration
if git diff --quiet "$PREV_SHA" HEAD -- website/ vercel.json; then
  echo "[Vercel] No website changes detected between $PREV_SHA and HEAD. Skipping deployment."
  exit 0
else
  echo "[Vercel] Changes detected in website/ or vercel.json. Proceeding with deployment."
  exit 1
fi

