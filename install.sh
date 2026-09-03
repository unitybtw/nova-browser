#!/usr/bin/env bash
set -e

echo "=== Nova Browser One-Line Installer ==="
OS=$(uname -s)
ARCH=$(uname -m)

if [ "$OS" = "Darwin" ]; then
  if [ "$ARCH" = "arm64" ]; then
    DMG_NAME="Nova-Browser-arm64.dmg"
  else
    DMG_NAME="Nova-Browser-x64.dmg"
  fi
  DOWNLOAD_URL="https://github.com/unitybtw/nova-browser/releases/latest/download/${DMG_NAME}"
  DEST="/tmp/${DMG_NAME}"
  echo "Downloading Nova Browser for macOS (${ARCH})..."
  curl -fsSL "$DOWNLOAD_URL" -o "$DEST"
  echo "Mounting disk image..."
  MOUNT_DIR=$(mktemp -d /tmp/nova-mount.XXXXXX)
  hdiutil attach "$DEST" -mountpoint "$MOUNT_DIR" -nobrowse -quiet
  echo "Installing Nova Browser to /Applications..."
  cp -R "${MOUNT_DIR}/Nova Browser.app" /Applications/
  hdiutil detach "$MOUNT_DIR" -quiet
  rm -rf "$MOUNT_DIR" "$DEST"
  echo "Nova Browser installed successfully to /Applications/Nova Browser.app"
  exit 0
fi

if [ "$OS" = "Linux" ]; then
  if [ "$ARCH" = "x86_64" ]; then
    TARGET_ARCH="x86_64"
  elif [ "$ARCH" = "aarch64" ]; then
    TARGET_ARCH="arm64"
  else
    echo "Error: Unsupported architecture $ARCH"
    exit 1
  fi
  DOWNLOAD_URL="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-${TARGET_ARCH}.AppImage"
  DEST="${HOME}/.local/bin/nova-browser"
  mkdir -p "${HOME}/.local/bin"

  echo "Downloading Nova Browser for Linux (${TARGET_ARCH})..."
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$DOWNLOAD_URL" -o "$DEST"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$DEST" "$DOWNLOAD_URL"
  else
    echo "Error: curl or wget required."
    exit 1
  fi
  chmod +x "$DEST"
  echo "Nova Browser installed to $DEST"
  exit 0
fi

echo "Error: Unsupported operating system $OS"
exit 1
