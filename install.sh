#!/usr/bin/env bash
set -euo pipefail

echo "=== Nova Browser One-Line Installer ==="
echo ""

OS=$(uname -s)
ARCH=$(uname -m)

RELEASES_API="https://api.github.com/repos/unitybtw/nova-browser/releases/latest"
CHECKSUMS_URL=""

# Secure isolated temporary working directory via mktemp
TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'nova-install')
chmod 0700 "$TMP_DIR"

MOUNT_DIR=""
cleanup() {
  if [ -n "$MOUNT_DIR" ] && [ -d "$MOUNT_DIR" ]; then
    hdiutil detach "$MOUNT_DIR" -quiet 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

# Fetch the SHA256SUMS.txt URL from the latest release assets
fetch_checksums_url() {
  local api_response
  api_response=$(curl -fsSL "$RELEASES_API" 2>/dev/null) || {
    echo "Error: Failed to fetch release metadata from GitHub." >&2
    exit 1
  }
  CHECKSUMS_URL=$(echo "$api_response" | grep -o '"browser_download_url": *"[^"]*SHA256SUMS\.txt"' | grep -o 'https://[^"]*' | head -1)
  if [ -z "$CHECKSUMS_URL" ]; then
    echo "Error: Could not find SHA256SUMS.txt in latest release assets." >&2
    echo "       Installation aborted: checksum manifest is required for verified installs." >&2
    exit 1
  fi
}

# Verify the SHA-256 checksum of a downloaded file
verify_sha256() {
  local file="$1"
  local expected_hash="$2"
  local filename
  filename=$(basename "$file")

  echo "Verifying SHA-256 checksum for $filename..."

  local actual_hash
  if command -v sha256sum >/dev/null 2>&1; then
    actual_hash=$(sha256sum "$file" | awk '{print $1}')
  elif command -v shasum >/dev/null 2>&1; then
    actual_hash=$(shasum -a 256 "$file" | awk '{print $1}')
  else
    echo "Error: Neither sha256sum nor shasum is available. Cannot verify checksum." >&2
    echo "  Please install coreutils (macOS: brew install coreutils) or ensure shasum is in PATH." >&2
    exit 1
  fi

  if [ "$actual_hash" != "$expected_hash" ]; then
    echo "" >&2
    echo "CHECKSUM MISMATCH — installation aborted." >&2
    echo "  Expected : $expected_hash" >&2
    echo "  Got      : $actual_hash" >&2
    echo "" >&2
    echo "The downloaded file does not match the official release." >&2
    echo "Do NOT install this binary. Please open an issue at:" >&2
    echo "  https://github.com/unitybtw/nova-browser/issues" >&2
    exit 1
  fi

  echo "Checksum verified."
}

# ─── macOS ───────────────────────────────────────────────────────────────────

if [ "$OS" = "Darwin" ]; then
  if [ "$ARCH" = "arm64" ]; then
    DMG_NAME="Nova-Browser-arm64.dmg"
  else
    DMG_NAME="Nova-Browser-x64.dmg"
  fi

  DOWNLOAD_URL="https://github.com/unitybtw/nova-browser/releases/latest/download/${DMG_NAME}"
  DEST="${TMP_DIR}/${DMG_NAME}"
  CHECKSUMS_LOCAL="${TMP_DIR}/SHA256SUMS.txt"

  echo "Fetching release metadata..."
  fetch_checksums_url

  echo "Downloading SHA-256 checksum manifest..."
  if ! curl -fsSL "$CHECKSUMS_URL" -o "$CHECKSUMS_LOCAL"; then
    echo "Error: Failed to download SHA256SUMS.txt from $CHECKSUMS_URL" >&2
    exit 1
  fi
  if [ ! -s "$CHECKSUMS_LOCAL" ]; then
    echo "Error: Checksum manifest at $CHECKSUMS_LOCAL is empty." >&2
    exit 1
  fi

  echo "Downloading Nova Browser for macOS (${ARCH})..."
  curl -fsSL --progress-bar "$DOWNLOAD_URL" -o "$DEST"

  EXPECTED=$(grep -F "$DMG_NAME" "$CHECKSUMS_LOCAL" | awk '{print $1}' | head -1)
  if [ -z "$EXPECTED" ]; then
    echo "Error: $DMG_NAME not found in SHA256SUMS.txt — aborting unverified install." >&2
    exit 1
  fi
  verify_sha256 "$DEST" "$EXPECTED"

  echo "Mounting disk image..."
  MOUNT_DIR="${TMP_DIR}/mount"
  mkdir -p "$MOUNT_DIR"
  hdiutil attach "$DEST" -mountpoint "$MOUNT_DIR" -nobrowse -quiet

  echo "Installing Nova Browser to /Applications..."
  cp -R "${MOUNT_DIR}/Nova Browser.app" /Applications/

  hdiutil detach "$MOUNT_DIR" -quiet
  MOUNT_DIR=""

  echo ""
  echo "Nova Browser installed successfully to /Applications/Nova Browser.app"
  exit 0
fi

# ─── Linux ───────────────────────────────────────────────────────────────────

if [ "$OS" = "Linux" ]; then
  if [ "$ARCH" = "x86_64" ]; then
    TARGET_ARCH="x86_64"
  elif [ "$ARCH" = "aarch64" ]; then
    TARGET_ARCH="arm64"
  else
    echo "Error: Unsupported architecture $ARCH" >&2
    exit 1
  fi

  APPIMAGE_NAME="Nova-Browser-${TARGET_ARCH}.AppImage"
  DOWNLOAD_URL="https://github.com/unitybtw/nova-browser/releases/latest/download/${APPIMAGE_NAME}"
  DEST="${HOME}/.local/bin/nova-browser"
  DEST_TMP="${TMP_DIR}/${APPIMAGE_NAME}"
  CHECKSUMS_LOCAL="${TMP_DIR}/SHA256SUMS.txt"

  mkdir -p "${HOME}/.local/bin"

  echo "Fetching release metadata..."
  fetch_checksums_url

  echo "Downloading SHA-256 checksum manifest..."
  if ! curl -fsSL "$CHECKSUMS_URL" -o "$CHECKSUMS_LOCAL"; then
    echo "Error: Failed to download SHA256SUMS.txt from $CHECKSUMS_URL" >&2
    exit 1
  fi
  if [ ! -s "$CHECKSUMS_LOCAL" ]; then
    echo "Error: Checksum manifest at $CHECKSUMS_LOCAL is empty." >&2
    exit 1
  fi

  echo "Downloading Nova Browser for Linux (${TARGET_ARCH})..."
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --progress-bar "$DOWNLOAD_URL" -o "$DEST_TMP"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$DEST_TMP" "$DOWNLOAD_URL"
  else
    echo "Error: curl or wget required." >&2
    exit 1
  fi

  EXPECTED=$(grep -F "$APPIMAGE_NAME" "$CHECKSUMS_LOCAL" | awk '{print $1}' | head -1)
  if [ -z "$EXPECTED" ]; then
    echo "Error: $APPIMAGE_NAME not found in SHA256SUMS.txt — aborting unverified install." >&2
    exit 1
  fi
  verify_sha256 "$DEST_TMP" "$EXPECTED"

  # Atomic replacement: only move to final path after checksum passes
  mv "$DEST_TMP" "$DEST"
  chmod +x "$DEST"

  echo ""
  echo "Nova Browser installed to $DEST"
  echo "You can launch it with: nova-browser"
  exit 0
fi

# ─── Unsupported OS ──────────────────────────────────────────────────────────

echo "Error: Unsupported operating system: $OS" >&2
echo "Please download Nova Browser manually from:" >&2
echo "  https://github.com/unitybtw/nova-browser/releases" >&2
exit 1
