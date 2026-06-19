#!/bin/sh
#
# Auto-increment the build number (CFBundleVersion) on every build/archive so
# each upload to App Store Connect is unique and strictly increasing — no manual
# bumping required. The number is derived from the git commit count, which only
# ever grows.
#
# This also syncs any embedded app extensions (e.g. the widget) to the app's
# CFBundleVersion and CFBundleShortVersionString, which Apple requires to match
# the containing app or App Store validation fails.
#
# Wired in as the LAST Run Script build phase of the "App" target (after
# "Embed Foundation Extensions"), so the extensions are already embedded when
# this runs. Reads/writes the *built* Info.plists, leaving source files alone.

set -eu

if ! command -v git >/dev/null 2>&1; then
  echo "warning: git not found; leaving CFBundleVersion unchanged"
  exit 0
fi

build_number=$(git -C "$PROJECT_DIR" rev-list --count HEAD 2>/dev/null || true)
if [ -z "${build_number:-}" ]; then
  echo "warning: could not derive build number from git; leaving CFBundleVersion unchanged"
  exit 0
fi

plistbuddy=/usr/libexec/PlistBuddy

set_key() { # file key value
  "$plistbuddy" -c "Set :$2 $3" "$1" 2>/dev/null \
    || "$plistbuddy" -c "Add :$2 string $3" "$1" 2>/dev/null \
    || true
}

app_plist="${TARGET_BUILD_DIR}/${INFOPLIST_PATH}"
set_key "$app_plist" CFBundleVersion "$build_number"
echo "Set ${FULL_PRODUCT_NAME:-app} CFBundleVersion = $build_number"

# The app's user-facing version (e.g. 6.2) — embedded extensions must match it.
app_short=$("$plistbuddy" -c "Print :CFBundleShortVersionString" "$app_plist" 2>/dev/null || echo "")

plugins_dir="${TARGET_BUILD_DIR}/${CONTENTS_FOLDER_PATH}/PlugIns"
if [ -d "$plugins_dir" ]; then
  for appex in "$plugins_dir"/*.appex; do
    [ -e "$appex/Info.plist" ] || continue
    set_key "$appex/Info.plist" CFBundleVersion "$build_number"
    [ -n "$app_short" ] && set_key "$appex/Info.plist" CFBundleShortVersionString "$app_short"
    echo "Synced $(basename "$appex") to version ${app_short:-?} ($build_number)"
  done
fi
