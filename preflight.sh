#!/bin/bash
# Everything that must pass before this repo is pushed.
#
# There is a GitHub Action on every push, and it runs on a bare Ubuntu runner
# with node and nothing else -- no LibreOffice, no Poppler, no fonts. A change
# can pass on a Mac with the full toolchain and still fail there. This script
# runs the suite BOTH ways so that cannot happen:
#
#   1. as your machine is, with whatever tools you have
#   2. with NO_SOFFICE=1, which is what the runner looks like
#
# Run it from anywhere:  ~/vaults/shared/preflight.sh
#
# Exit 0 means the Action will pass. Nothing here touches git, deploys
# anything, or writes outside a temp folder.

set -u
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$HERE" || exit 1

fail=0
say() { printf '\n\033[1m%s\033[0m\n' "$1"; }

say "1. Tools"
for t in node npm; do
    if command -v "$t" >/dev/null 2>&1; then
        printf '   %-10s %s\n' "$t" "$($t --version 2>&1 | head -1)"
    else
        printf '   %-10s MISSING -- required\n' "$t"; fail=1
    fi
done
for t in soffice pdftoppm; do
    if command -v "$t" >/dev/null 2>&1; then
        printf '   %-10s present\n' "$t"
    elif [ "$t" = soffice ] && [ -x /Applications/LibreOffice.app/Contents/MacOS/soffice ]; then
        printf '   %-10s present (/Applications)\n' "$t"
    else
        printf '   %-10s absent -- PDF checks will be skipped\n' "$t"
    fi
done

say "2. Dependencies"
if [ ! -d node_modules ]; then
    echo "   node_modules missing -- running npm install"
    npm install --silent || { echo "   npm install FAILED"; exit 1; }
fi
# npm ci is what the Action runs, and it fails outright when package.json and
# package-lock.json disagree. Catch that here rather than on the runner.
if ! npm ls --depth=0 >/dev/null 2>&1; then
    echo "   package.json and the installed tree disagree -- run: npm install"
    fail=1
else
    echo "   node_modules present and consistent"
fi

say "3. Test suite, as this machine is"
if node test-build.js test-fixtures; then
    echo "   OK"
else
    echo "   FAILED"; fail=1
fi

say "4. Test suite, as the CI runner sees it (NO_SOFFICE=1)"
if NO_SOFFICE=1 node test-build.js test-fixtures >/tmp/preflight-ci.log 2>&1; then
    grep -E "SKIP|skipped|All checks" /tmp/preflight-ci.log | sed 's/^/   /'
    echo "   OK"
else
    echo "   FAILED -- this is what the Action will do:"
    sed 's/^/   /' /tmp/preflight-ci.log
    fail=1
fi

say "Result"
if [ "$fail" -eq 0 ]; then
    echo "   Safe to push."
    exit 0
else
    echo "   Do not push. Fix the above first."
    exit 1
fi
