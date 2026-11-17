#!/usr/bin/env bash
# =============================================================================
# tools/build-release.sh <outdir>
#
# Builds the RELEASE version of Shadow Skirr: the repo with every bit of
# developer code removed. The repo itself (and GitHub Pages) is the developer
# build; this script is the only way the release is made.
#
#   1. copies index.html, css/, js/ and README.md into <outdir>
#      (never max, tools/, .github/ or .git)
#   2. deletes js/dev.js and js/dev-config.js
#   3. removes developer-only lines from index.html and README.md:
#        - any line containing          <!-- dev-only -->
#        - every line from a line that is just   <!-- dev-only:begin -->
#          through the next line that is just    <!-- dev-only:end -->
#      and fails if the two expected dev <script> lines are not marked in
#      index.html (that means the markers changed)
#   4. stamps <meta name="shkr-build" content="dev"> with
#      "release · <short-sha> · <UTC date>"
#   5. GUARD: fails if anything in <outdir> still contains developer code or
#      text, or if a <script src> points at a missing file
#
# Exit status is non-zero on any failure. No npm, no dependencies: bash plus
# coreutils, grep, sed, awk and (optionally) git for the stamp.
# Set SHKR_BUILD_SHA to override the commit id in the stamp.
# =============================================================================
set -euo pipefail
export LC_ALL=C

fail() { echo "build-release: FAIL: $*" >&2; exit 1; }
[ $# -eq 1 ] && [ -n "$1" ] || { echo "usage: bash tools/build-release.sh <outdir>" >&2; exit 2; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for f in index.html README.md css js; do [ -e "$ROOT/$f" ] || fail "source is missing $f"; done

# ---------------------------------------------------------------- output dir
mkdir -p "$1"
OUT="$(cd "$1" && pwd)"
case "$ROOT/" in "$OUT/"*) fail "refusing to build into $OUT: it contains the source tree";; esac
case "$OUT/" in "$ROOT/js/"*|"$ROOT/css/"*|"$ROOT/tools/"*|"$ROOT/.github/"*|"$ROOT/.git/"*)
  fail "refusing to build into $OUT: it is inside a source folder";; esac
# only ever wipe an empty folder or a previous release build
for e in "$OUT"/* "$OUT"/.[!.]* "$OUT"/..?*; do
  [ -e "$e" ] || continue
  case "$(basename "$e")" in index.html|README.md|css|js) ;;
    *) fail "refusing to wipe $OUT: it is not empty and does not look like a release build (found $(basename "$e"))";; esac
done
rm -rf "$OUT"
mkdir -p "$OUT"

# ---------------------------------------------------------------- 1-2. copy, drop dev files
cp "$ROOT/index.html" "$ROOT/README.md" "$OUT/"
cp -R "$ROOT/css" "$ROOT/js" "$OUT/"
rm -f "$OUT/js/dev.js" "$OUT/js/dev-config.js"

# ---------------------------------------------------------------- 3. strip dev-only lines
marked="$(grep -F '<!-- dev-only -->' "$ROOT/index.html" || true)"
grep -qF '<script src="js/dev-config.js"></script>' <<<"$marked" \
  || fail 'index.html: the dev-config.js <script> line is not marked <!-- dev-only --> (did the markers change?)'
grep -qF '<script src="js/dev.js"></script>' <<<"$marked" \
  || fail 'index.html: the dev.js <script> line is not marked <!-- dev-only --> (did the markers change?)'

strip_dev() {   # strip_dev <file>: rewrites <file> without its dev-only lines
  local f="$1"
  if ! awk -v F="${f#"$OUT"/}" '
      { t = $0; gsub(/^[ \t]+|[ \t\r]+$/, "", t) }
      t == "<!-- dev-only:begin -->" { if (inb) { print F ":" NR ": nested <!-- dev-only:begin -->" > "/dev/stderr"; bad = 1; exit 1 } inb = NR; next }
      t == "<!-- dev-only:end -->"   { if (!inb) { print F ":" NR ": <!-- dev-only:end --> without a begin" > "/dev/stderr"; bad = 1; exit 1 } inb = 0; next }
      inb { next }
      index($0, "<!-- dev-only -->") { next }
      { print }
      END { if (bad) exit 1; if (inb) { print F ":" inb ": <!-- dev-only:begin --> is never closed" > "/dev/stderr"; exit 1 } }
    ' "$f" > "$f.tmp"; then
    rm -f "$f.tmp"; fail "$f: unbalanced dev-only markers"
  fi
  mv "$f.tmp" "$f"
}
strip_dev "$OUT/index.html"
strip_dev "$OUT/README.md"

# ---------------------------------------------------------------- 4. version stamp
PLACEHOLDER='<meta name="shkr-build" content="dev">'
[ "$(grep -cF "$PLACEHOLDER" "$OUT/index.html")" = 1 ] || fail "index.html must contain exactly one $PLACEHOLDER"
SHA="${SHKR_BUILD_SHA:-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)}"
case "$SHA" in *[!0-9A-Za-z._-]*|"") fail "bad commit id for the stamp: '$SHA'";; esac
STAMP="release · $SHA · $(date -u '+%Y-%m-%d %H:%M UTC')"
sed "s|$PLACEHOLDER|<meta name=\"shkr-build\" content=\"$STAMP\">|" "$OUT/index.html" > "$OUT/index.html.tmp"
mv "$OUT/index.html.tmp" "$OUT/index.html"
grep -qF "<meta name=\"shkr-build\" content=\"$STAMP\">" "$OUT/index.html" || fail "could not stamp the build"

# ---------------------------------------------------------------- 5. guard
# Anything here means developer code or text reached the release. Keep the
# dev panel strings in sync with the UI text in js/dev.js.
leaks=0
leak() { echo "build-release: LEAK: $1" >&2; [ -z "${2:-}" ] || printf '%s\n' "$2" | sed 's/^/    /' >&2; leaks=$((leaks + 1)); }

hits="$(cd "$OUT" && find . \( -name dev.js -o -name dev-config.js \) -print)"
[ -z "$hits" ] || leak "developer files are present" "$hits"

for s in 'dev.js' 'dev-config.js' 'dev-only' 'shadowskirr.dev'; do
  if hits="$(grep -rnF -- "$s" "$OUT")"; then leak "'$s' found" "$hits"; fi
done
for s in 'shkr-dev' 'shkrDev' 'Unlock all' 'Put progress back'; do   # dev panel ids, classes and text
  if hits="$(grep -rniF -- "$s" "$OUT")"; then leak "developer panel text '$s' found" "$hits"; fi
done
# definitions of the dev globals (assignments, object keys, defineProperty); read-only uses are allowed
if hits="$(grep -rnE "SHKR_DEV(_INIT)?['\"]?\]?[[:space:]]*(=([^=]|$)|:)|defineProperty[^;]*SHKR_DEV" "$OUT")"; then
  leak "a definition of SHKR_DEV / SHKR_DEV_INIT was found" "$hits"
fi
# the only place allowed to mention the dev globals at all is the inert hook in game.js
if hits="$(grep -rlF 'SHKR_DEV' "$OUT" | grep -vx "$OUT/js/game.js")"; then
  leak "SHKR_DEV is mentioned outside js/game.js" "$hits"
fi
if grep -qF 'content="dev"' "$OUT/index.html"; then leak "index.html still carries the dev build meta"; fi

# every local <script src> / stylesheet must exist in the release
refs="$(grep -oE '<(script|link)[^>]*(src|href)="[^"]*"' "$OUT/index.html" | sed -E 's/.*(src|href)="([^"]*)"/\2/' || true)"
[ -n "$(grep -oE '<script[^>]*src="' "$OUT/index.html")" ] || leak "index.html has no <script src> at all"
while IFS= read -r ref; do
  case "$ref" in ""|http://*|https://*|//*|data:*) continue;; esac
  [ -f "$OUT/$ref" ] || leak "index.html references $ref, which is not in the release"
done <<<"$refs"

[ "$leaks" -eq 0 ] || fail "$leaks guard check(s) failed; the release in $OUT must not be used"

nfiles="$(find "$OUT" -type f | wc -l | tr -d ' ')"
echo "build-release: ok: $OUT ($nfiles files, $STAMP)"
