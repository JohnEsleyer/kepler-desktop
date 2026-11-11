#!/usr/bin/env bash
set -euo pipefail

# Kepler - automatic system installer for Linux and macOS.
#
# Usage after installation:
#   kepler                         # open the previously active workspace
#   kepler .                       # open the current directory as a workspace
#   kepler Documents/physics       # open (or switch to) a workspace folder
#
# Existing workspaces remain available in Kepler's left sidebar.

APP_NAME="Kepler"
BIN_NAME="kepler"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

echo "=================================================="
echo "          Kepler Installation Script"
echo "=================================================="

# ---------------------------------------------------------------------------
# 1. Toolchain checks
# ---------------------------------------------------------------------------
command -v go >/dev/null 2>&1 || fail "Go is not installed or not in PATH."
command -v npm >/dev/null 2>&1 || fail "npm is not installed or not in PATH."

# ---------------------------------------------------------------------------
# 2. Build the frontend
# ---------------------------------------------------------------------------
info "Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"
if [ -f package-lock.json ]; then
  npm ci --silent
else
  npm install --silent
fi

info "Building frontend..."
npm run build

cd "$PROJECT_DIR"

# ---------------------------------------------------------------------------
# 3. Build the Go desktop binary
# ---------------------------------------------------------------------------
info "Compiling $APP_NAME..."
CGO_ENABLED=1 go build \
  -tags production \
  -trimpath \
  -buildvcs=false \
  -ldflags="-w -s" \
  -o "$BIN_NAME" .

# ---------------------------------------------------------------------------
# 4. Install the binary
# ---------------------------------------------------------------------------
info "Choosing installation destination..."
if [ -w "/usr/local/bin" ]; then
  INSTALL_DIR="/usr/local/bin"
  USE_SUDO=0
elif [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
  INSTALL_DIR="/usr/local/bin"
  USE_SUDO=1
else
  INSTALL_DIR="${HOME}/.local/bin"
  USE_SUDO=0
fi

mkdir -p "$INSTALL_DIR" 2>/dev/null || true

info "Installing binary to $INSTALL_DIR/$BIN_NAME..."
if [ "$USE_SUDO" -eq 1 ]; then
  sudo install -m 755 "$BIN_NAME" "$INSTALL_DIR/$BIN_NAME"
else
  install -m 755 "$BIN_NAME" "$INSTALL_DIR/$BIN_NAME"
fi

case ":${PATH}:" in
  *":${INSTALL_DIR}:"*) ;;
  *)
    warn "$INSTALL_DIR is not currently in your PATH."
    warn "Add this line to your shell profile:"
    warn "  export PATH=\"$INSTALL_DIR:\$PATH\""
    ;;
esac

# ---------------------------------------------------------------------------
# 5. Desktop integration (Linux)
# ---------------------------------------------------------------------------
ICON_SRC="$PROJECT_DIR/frontend/public/icon.svg"

if [ "$(uname -s)" = "Linux" ]; then
  info "Creating Linux desktop launcher..."
  ICON_DIR="${HOME}/.local/share/icons/hicolor/scalable/apps"
  DESKTOP_DIR="${HOME}/.local/share/applications"
  mkdir -p "$ICON_DIR" "$DESKTOP_DIR"

  if [ -f "$ICON_SRC" ]; then
    cp "$ICON_SRC" "$ICON_DIR/kepler.svg"
  fi

  cat > "$DESKTOP_DIR/kepler.desktop" <<EOF
[Desktop Entry]
Name=$APP_NAME
Comment=Kepler - Offline Knowledge & Interactive Vault
Exec=$INSTALL_DIR/$BIN_NAME %F
Icon=kepler
Terminal=false
Type=Application
Categories=Office;Development;Education;Utility;
MimeType=inode/directory;
StartupWMClass=kepler
EOF
  chmod 644 "$DESKTOP_DIR/kepler.desktop"

  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
  command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -f -t "${HOME}/.local/share/icons/hicolor" >/dev/null 2>&1 || true

  info "Desktop launcher created at $DESKTOP_DIR/kepler.desktop"
fi

# Generate an application PNG when an SVG converter is available.
if command -v rsvg-convert >/dev/null 2>&1 && [ -f "$ICON_SRC" ]; then
  rsvg-convert -w 512 -h 512 "$ICON_SRC" -o "$PROJECT_DIR/build/appicon.png" 2>/dev/null || true
elif command -v convert >/dev/null 2>&1 && [ -f "$ICON_SRC" ]; then
  convert -background none -resize 512x512 "$ICON_SRC" "$PROJECT_DIR/build/appicon.png" 2>/dev/null || true
fi

echo ""
echo "=================================================="
echo "          Installation Complete!"
echo "=================================================="
echo ""
echo "Run Kepler from any terminal:"
echo "  kepler                       # open the previous workspace"
echo "  kepler .                     # open the current folder as a workspace"
echo "  kepler Documents/notebooks   # open a specific workspace"
echo ""
