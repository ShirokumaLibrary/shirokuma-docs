#!/bin/bash
#
# shirokuma-docs installer
#
# Installs shirokuma-docs to ~/.local/ without requiring sudo.
# Claude Code users already have ~/.local/bin in PATH.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash
#   curl -fsSL ... | bash -s -- --lang ja   # non-interactive: Japanese
#   curl -fsSL ... | bash -s -- --lang en   # non-interactive: English
#
# Requirements:
#   - Node.js 20.0.0 or later
#   - npm (comes with Node.js)

set -eo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Installation directories
INSTALL_DIR="$HOME/.local/share/shirokuma-docs"
BIN_DIR="$HOME/.local/bin"
PACKAGE_NAME="@shirokuma-library/shirokuma-docs"
BIN_NAME="shirokuma-docs"
SELECTED_LANG=""

# Print colored output (defined early for use in parse_args/select_language)
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Parse command-line arguments
# Note: --lang only affects the post-install "Next steps" message
# (e.g., which --lang value is shown in the `shirokuma-docs init` command).
# Actual language configuration happens during `shirokuma-docs init`.
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --lang)
        if [[ -n "$2" && "$2" =~ ^(en|ja)$ ]]; then
          SELECTED_LANG="$2"
          shift 2
        else
          error "Invalid --lang value. Use 'en' or 'ja'."
          exit 1
        fi
        ;;
      --lang=*)
        local val="${1#--lang=}"
        if [[ "$val" =~ ^(en|ja)$ ]]; then
          SELECTED_LANG="$val"
          shift
        else
          error "Invalid --lang value. Use 'en' or 'ja'."
          exit 1
        fi
        ;;
      *)
        shift
        ;;
    esac
  done
}

# Set language (default: en, override with --lang)
select_language() {
  if [ -n "$SELECTED_LANG" ]; then
    info "Language: $SELECTED_LANG (from --lang argument)"
    return
  fi

  SELECTED_LANG="en"
  info "Language: en (default, use --lang ja for Japanese)"
}

# Check Node.js version
check_node() {
  if ! command -v node &> /dev/null; then
    error "Node.js is not installed."
    echo "Please install Node.js 20.0.0 or later: https://nodejs.org/"
    exit 1
  fi

  local node_version
  node_version=$(node -v | sed 's/v//')
  local major_version
  major_version=$(echo "$node_version" | cut -d. -f1)

  if [ "$major_version" -lt 20 ]; then
    error "Node.js version $node_version is too old."
    echo "shirokuma-docs requires Node.js 20.0.0 or later."
    exit 1
  fi

  info "Node.js version: $node_version"
}

# Check npm availability
check_npm() {
  if ! command -v npm &> /dev/null; then
    error "npm is not installed."
    echo "Please install npm (usually comes with Node.js)."
    exit 1
  fi

  local npm_version
  npm_version=$(npm -v)
  info "npm version: $npm_version"
}

# Create directories
create_directories() {
  info "Creating installation directories..."
  mkdir -p "$INSTALL_DIR"
  mkdir -p "$BIN_DIR"
}

# Install the package
install_package() {
  info "Installing $PACKAGE_NAME..."

  # Clean up existing installation if present
  if [ -d "$INSTALL_DIR/node_modules" ]; then
    warn "Removing existing installation..."
    rm -rf "$INSTALL_DIR/node_modules"
    rm -f "$INSTALL_DIR/package.json"
    rm -f "$INSTALL_DIR/package-lock.json"
  fi

  # Install the package (capture output for filtering)
  local npm_output
  if ! npm_output=$(npm install --prefer-online --prefix "$INSTALL_DIR" "$PACKAGE_NAME" 2>&1); then
    error "npm install failed:"
    echo "$npm_output" | grep -v '^npm WARN\|^npm notice' | head -20
    exit 1
  fi

  # Show filtered output (excluding npm notices/warnings)
  echo "$npm_output" | grep -v '^npm WARN\|^npm notice' | while read -r line; do
    if [ -n "$line" ]; then
      echo "  $line"
    fi
  done

  if [ ! -f "$INSTALL_DIR/node_modules/.bin/$BIN_NAME" ]; then
    error "Installation failed: binary not found."
    exit 1
  fi
}

# Create symlink in bin directory
create_symlink() {
  info "Creating symlink in $BIN_DIR..."

  local target="$INSTALL_DIR/node_modules/.bin/$BIN_NAME"
  local link="$BIN_DIR/$BIN_NAME"

  # Remove existing symlink if present
  if [ -L "$link" ] || [ -f "$link" ]; then
    rm -f "$link"
  fi

  ln -sf "$target" "$link"
  chmod +x "$link"

  success "Symlink created: $link -> $target"
}

# Check if PATH includes BIN_DIR
check_path() {
  if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    warn "$BIN_DIR is not in your PATH."
    echo ""
    echo "Add the following line to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
    echo ""
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "Then restart your terminal or run:"
    echo ""
    echo "  source ~/.bashrc  # or ~/.zshrc"
    echo ""
  fi
}

# Verify installation
verify_installation() {
  info "Verifying installation..."

  if [ -x "$BIN_DIR/$BIN_NAME" ]; then
    local version
    version=$("$BIN_DIR/$BIN_NAME" --version 2>/dev/null || echo "unknown")
    success "$BIN_NAME $version installed successfully!"
  else
    error "Installation verification failed."
    exit 1
  fi
}

# Print next steps
print_next_steps() {
  local lang_flag=" --lang ${SELECTED_LANG}"

  echo ""
  echo "========================================="
  echo "  Installation Complete!"
  echo "========================================="
  echo ""
  echo "Next steps:"
  echo ""
  echo "  1. Add required GitHub scopes for Projects V2:"
  echo ""
  echo "     gh auth refresh -s read:project,project"
  echo ""
  echo "     (required for session start, issues list, and project field updates)"
  echo ""
  echo "  2. Initialize shirokuma-docs in your project:"
  echo ""
  echo "     cd /path/to/your/project"
  echo "     shirokuma-docs init --with-skills${lang_flag}"
  echo ""
  echo "  3. The init command will:"
  echo "     - Create shirokuma-docs.config.yaml"
  echo "     - Install shirokuma-skills-${SELECTED_LANG} plugin"
  echo "     - Deploy rules to .claude/rules/shirokuma/"
  echo "     - Set language to ${SELECTED_LANG} in .claude/settings.json"
  echo "     - Register plugin in Claude Code's cache"
  echo ""
  echo "  4. Start a new Claude Code session to use the skills"
  echo ""
  echo "Documentation: https://github.com/ShirokumaLibrary/shirokuma-docs"
  echo ""
}

# Main installation flow
main() {
  parse_args "$@"

  echo ""
  echo "========================================="
  echo "  shirokuma-docs Installer"
  echo "========================================="
  echo ""

  select_language
  check_node
  check_npm
  create_directories
  install_package
  create_symlink
  check_path
  verify_installation
  print_next_steps
}

main "$@"
