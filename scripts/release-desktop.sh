#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/desktop/release"
VERSION="${1:-$(date +%Y%m%d-%H%M%S)}"

echo "=== Midas Desktop Release Build ($VERSION) ==="
echo ""

# 1. Install dependencies
echo ">>> Installing dependencies..."
cd "$ROOT_DIR"
npm ci

# 2. Build backend
echo ""
echo ">>> Building backend..."
npm run build --workspace=backend

# 3. Build frontend
echo ""
echo ">>> Building frontend..."
npm run build --workspace=frontend

# 4. Clean previous release artifacts
echo ""
echo ">>> Cleaning previous release..."
rm -rf "$RELEASE_DIR"
rm -rf "$ROOT_DIR/desktop/release-backend-deps"

# 5. Package for current platform
echo ""
echo ">>> Packaging desktop app..."

case "$(uname -s)" in
  Darwin)
    echo "    Platform: macOS"
    npm run package:mac --workspace=desktop
    ;;
  Linux)
    echo "    Platform: Linux"
    npm run package:linux --workspace=desktop
    ;;
  MINGW*|MSYS*|CYGWIN*)
    echo "    Platform: Windows"
    npm run package:win --workspace=desktop
    ;;
  *)
    echo "    Unknown platform, building for current platform only"
    npm run package:dist --workspace=desktop
    ;;
esac

# 6. Show results
echo ""
echo "=== Release Build Complete ==="
echo ""
echo "Artifacts:"
find "$RELEASE_DIR" -type f \( -name "*.dmg" -o -name "*.AppImage" -o -name "*.exe" -o -name "*.zip" -o -name "*.deb" -o -name "*.snap" -o -name "*.rpm" -o -name "*.flatpak" \) 2>/dev/null | while read -r f; do
  size=$(du -h "$f" | cut -f1)
  echo "  $size  $f"
done

if [ -z "$(find "$RELEASE_DIR" -type f \( -name "*.dmg" -o -name "*.AppImage" -o -name "*.exe" \) 2>/dev/null)" ]; then
  echo "  (none found — check $RELEASE_DIR for output)"
fi

echo ""
echo "To distribute:"
echo "  git tag v$VERSION"
echo "  git push origin v$VERSION"
