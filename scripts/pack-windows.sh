#!/usr/bin/env bash
# Pack a portable Windows x64 zip for open-claude-code (occ).
# Run on macOS or Linux (cross-download Node + ripgrep for Windows).
# For best native-module support, re-run the same script on a Windows machine
# after `bun install` there — this Mac-built zip is for CLI + API use;
# Computer Use native addons may still need a Windows-side build.
#
# Usage:
#   bash scripts/pack-windows.sh
#   bash scripts/pack-windows.sh --skip-build
#   NODE_VERSION=22.14.0 bash scripts/pack-windows.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NODE_VERSION="${NODE_VERSION:-20.19.4}"
RG_VERSION="${RG_VERSION:-15.0.1}"
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
  esac
done

OCC_VERSION="$(node -p "require('./package.json').version" 2>/dev/null || bun -p "require('./package.json').version")"
STAMP="$(date +%Y%m%d)"
NAME="occ-windows-x64-v${OCC_VERSION}-${STAMP}"
OUT_ROOT="${ROOT}/release"
STAGE="${OUT_ROOT}/${NAME}"
CACHE="${OUT_ROOT}/.cache"
ZIP_PATH="${OUT_ROOT}/${NAME}.zip"

NODE_ZIP_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip"
RG_ZIP_URL="https://github.com/microsoft/ripgrep-prebuilt/releases/download/v${RG_VERSION}/ripgrep-v${RG_VERSION}-x86_64-pc-windows-msvc.zip"

mkdir -p "$CACHE" "$OUT_ROOT"
rm -rf "$STAGE"
mkdir -p "$STAGE"/{runtime,dist,vendor/ripgrep}

echo "==> occ Windows packer"
echo "    version: ${OCC_VERSION}"
echo "    node:    ${NODE_VERSION} (win-x64)"
echo "    ripgrep: ${RG_VERSION} (win-x64)"
echo "    stage:   ${STAGE}"

download() {
  local url="$1" dest="$2"
  if [[ -f "$dest" ]]; then
    echo "    cache hit: $(basename "$dest")"
    return 0
  fi
  echo "    downloading: $url"
  # Prefer curl without forced proxy; respect env if user set it.
  if command -v curl >/dev/null 2>&1; then
    curl -fL --retry 3 --retry-delay 2 -o "$dest.partial" "$url"
  else
    wget -O "$dest.partial" "$url"
  fi
  mv "$dest.partial" "$dest"
}

# --- build JS bundle (platform-agnostic chunks) ---
if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "==> building dist/"
  # ensure ripgrep for host exists so build.ts copy does not fail
  if [[ ! -d src/utils/vendor/ripgrep ]]; then
    echo "    fetching host ripgrep via postinstall..."
    node scripts/postinstall.cjs --force || bun run scripts/postinstall.cjs --force || true
  fi
  bun run build
else
  echo "==> skip build (using existing dist/)"
  [[ -f dist/cli-node.js ]] || { echo "dist/cli-node.js missing; run without --skip-build"; exit 1; }
fi

# --- Node.js portable (Windows) ---
NODE_ZIP="${CACHE}/node-v${NODE_VERSION}-win-x64.zip"
download "$NODE_ZIP_URL" "$NODE_ZIP"
echo "==> extracting Node.js win-x64"
TMP_NODE="${CACHE}/node-extract-$$"
rm -rf "$TMP_NODE"
mkdir -p "$TMP_NODE"
unzip -q "$NODE_ZIP" -d "$TMP_NODE"
NODE_DIR="$(find "$TMP_NODE" -maxdepth 1 -type d -name 'node-v*-win-x64' | head -1)"
[[ -n "$NODE_DIR" && -f "$NODE_DIR/node.exe" ]] || { echo "node.exe not found in zip"; exit 1; }
# Full portable node tree (includes needed DLLs alongside node.exe)
cp -R "$NODE_DIR"/. "$STAGE/runtime/"
rm -rf "$TMP_NODE"

# --- ripgrep Windows ---
RG_ZIP="${CACHE}/ripgrep-v${RG_VERSION}-x86_64-pc-windows-msvc.zip"
download "$RG_ZIP_URL" "$RG_ZIP"
echo "==> extracting ripgrep win-x64"
TMP_RG="${CACHE}/rg-extract-$$"
rm -rf "$TMP_RG"
mkdir -p "$TMP_RG" "$STAGE/dist/vendor/ripgrep/x64-win32"
unzip -q "$RG_ZIP" -d "$TMP_RG"
RG_BIN="$(find "$TMP_RG" -type f \( -name 'rg.exe' -o -name 'rg' \) | head -1)"
[[ -n "$RG_BIN" ]] || { echo "rg.exe not found"; exit 1; }
cp "$RG_BIN" "$STAGE/dist/vendor/ripgrep/x64-win32/rg.exe"
# also mirror under top-level vendor for tools that look there
mkdir -p "$STAGE/vendor/ripgrep/x64-win32"
cp "$RG_BIN" "$STAGE/vendor/ripgrep/x64-win32/rg.exe"
rm -rf "$TMP_RG"

# --- app dist ---
echo "==> copying dist/"
# Prefer rsync if available; fall back to cp
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude '*.map' dist/ "$STAGE/dist/"
else
  cp -R dist/. "$STAGE/dist/"
  find "$STAGE/dist" -name '*.map' -delete 2>/dev/null || true
fi
# ensure win rg not overwritten by host-only tree without win binary
mkdir -p "$STAGE/dist/vendor/ripgrep/x64-win32"
[[ -f "$STAGE/dist/vendor/ripgrep/x64-win32/rg.exe" ]] || \
  cp "$STAGE/vendor/ripgrep/x64-win32/rg.exe" "$STAGE/dist/vendor/ripgrep/x64-win32/rg.exe"

# host audio-capture may be darwin-only; keep if present (optional on Windows)
if [[ -d dist/vendor/audio-capture ]]; then
  mkdir -p "$STAGE/dist/vendor"
  cp -R dist/vendor/audio-capture "$STAGE/dist/vendor/" 2>/dev/null || true
fi

# minimal package.json so Node treats .js as ESM where needed
cat > "$STAGE/package.json" <<EOF
{
  "name": "@sweetcornna/open-claude-code",
  "version": "${OCC_VERSION}",
  "private": true,
  "type": "module",
  "description": "Portable Windows x64 build of open-claude-code (occ)"
}
EOF

# --- launchers ---
# occ.cmd: primary entry (no PATH install)
cat > "$STAGE/occ.cmd" <<'EOF'
@echo off
setlocal
set "OCC_HOME=%~dp0"
set "OCC_HOME=%OCC_HOME:~0,-1%"
set "NODE_EXE=%OCC_HOME%\runtime\node.exe"
set "CLI=%OCC_HOME%\dist\cli-node.js"
if not exist "%NODE_EXE%" (
  echo [occ] runtime\node.exe not found under %OCC_HOME%
  exit /b 1
)
if not exist "%CLI%" (
  echo [occ] dist\cli-node.js not found under %OCC_HOME%
  exit /b 1
)
rem Prefer package-local config if user sets OCC_CONFIG_DIR; default stays %%USERPROFILE%%\.occ
"%NODE_EXE%" "%CLI%" %*
exit /b %ERRORLEVEL%
EOF

# occ.ps1 for PowerShell users
cat > "$STAGE/occ.ps1" <<'EOF'
$ErrorActionPreference = "Stop"
$OccHome = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeExe = Join-Path $OccHome "runtime\node.exe"
$Cli = Join-Path $OccHome "dist\cli-node.js"
if (-not (Test-Path $NodeExe)) { throw "runtime\node.exe missing" }
if (-not (Test-Path $Cli)) { throw "dist\cli-node.js missing" }
& $NodeExe $Cli @args
exit $LASTEXITCODE
EOF

# Placeholder note: true single-file exe needs Windows-side bun compile;
# we ship occ.cmd as the supported entry. Optional copy as "run-occ.bat".
cp "$STAGE/occ.cmd" "$STAGE/run-occ.bat"

cat > "$STAGE/README.txt" <<EOF
open-claude-code (occ) — Windows x64 portable package
=====================================================
Version: ${OCC_VERSION}
Node:    ${NODE_VERSION} (bundled under runtime\\)
Built:   ${STAMP}

Quick start
-----------
1. Unzip this folder anywhere, e.g. D:\\tools\\occ\\
2. Open a terminal IN this folder and run:

     occ.cmd
     occ.cmd --version
     occ.cmd -p "hello"

3. Optional: add this folder to your User PATH so you can type "occ.cmd"
   from any directory. (Manual — this package does not modify PATH.)

Config
------
User config:  %USERPROFILE%\\.occ\\
  - settings.json
  - provider-profiles.json   (per-provider proxy: "proxy": { "mode": "direct"|"http", "url": "..." })

Docs in source: docs/zh/features/provider-proxy-policy.md

Proxy tip
---------
For OpenAI via local proxy and DeepSeek direct, set proxy on each profile
in provider-profiles.json (feature provider-proxy-policy).

Notes
-----
- Entry point is occ.cmd (Node portable runtime + dist). Not a single native exe.
- Computer Use / some native modules may need a build performed ON Windows.
  Coding + multi-model API workflows are the primary target of this portable zip.
- Do not commit API keys into this folder.

Upgrade
-------
Replace the whole folder with a newer zip. Your %USERPROFILE%\\.occ config is kept.
EOF

cat > "$STAGE/BUILD_INFO.txt" <<EOF
occ_version=${OCC_VERSION}
node_version=${NODE_VERSION}
ripgrep_version=${RG_VERSION}
pack_host=$(uname -s)-$(uname -m)
pack_date=$(date -u +%Y-%m-%dT%H:%M:%SZ)
git_commit=$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)
git_branch=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
EOF

# --- zip ---
echo "==> creating zip"
rm -f "$ZIP_PATH"
(
  cd "$OUT_ROOT"
  if command -v ditto >/dev/null 2>&1; then
    # macOS: ditto makes Windows-friendly zips
    ditto -c -k --sequesterRsrc --keepParent "$NAME" "${NAME}.zip"
  else
    zip -r -q "${NAME}.zip" "$NAME"
  fi
)

SIZE="$(du -h "$ZIP_PATH" | awk '{print $1}')"
echo ""
echo "Done."
echo "  Folder: $STAGE"
echo "  Zip:    $ZIP_PATH  ($SIZE)"
echo ""
echo "Copy the zip to a Windows machine, unzip, run occ.cmd"
echo "Optional PATH: add the unzipped folder to User Path (manual)."
