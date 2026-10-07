#!/usr/bin/env bash
# Builds a static copy of the front-end into out/ (no backend: in-browser mock agents,
# bundled evaluation snapshot). Scripts are served from /assets/_next/ because some hosts
# reserve top-level names starting with "_".
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf out
JUNI_STATIC_EXPORT=1 npx next build
mkdir -p out/assets
mv out/_next out/assets/_next
# Only used by the root route and the internal not-found route; reserved names on some hosts.
rm -rf out/_not-found out/__next.*.txt
# Some hosts reject the literal U+FFFD character; in JS string literals the escape is identical.
python3 - <<'PY'
import pathlib
for f in pathlib.Path("out").rglob("*.js"):
    s = f.read_text(encoding="utf-8")
    if "\ufffd" in s:
        f.write_text(s.replace("\ufffd", "\\ufffd"), encoding="utf-8")
PY
echo "Static site in out/ ($(find out -type f | wc -l) files)"
