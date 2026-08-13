#!/bin/bash
# Build the printable guides from markdown, pad odd page counts, and report.
# V04
#
#   ./build-all.sh            build every eNN.md that needs it
#   ./build-all.sh e02.md     build just one
#
# Add -d to copy the results into the unit's folder in Class Development.
# Add -f to rebuild even the guides that are already up to date.
#
# The guide you print is a PDF. Word is not involved anywhere: the .docx is an
# intermediate the PDF is made from, it is written to a temp folder, and it is
# gone when the script finishes. Nothing to hand-edit means nothing to lose at
# the next build.
#
# Like make, a guide is only rebuilt when something it is made from is newer
# than the PDF: its own markdown, any picture it uses, or the builder itself.
# This is worth doing because pagination is measured by running the file through
# LibreOffice, which is slow -- a full no-op run drops from about a minute to
# about a second.
#
# With -d, the deployed copy is checked too, so a guide that was built but never
# deployed still gets copied.

set -e

# Two folders, not one.
#
#   BUILDER  where build.js, parse.js and make.js live.
#   HERE     where the guides live: the eNN.md, images/, and the built PDFs.
#
# They are the same folder today. They will not be once the builder is a
# submodule shared with nhsrobotics, so nothing below may assume it. Run this
# script from the folder holding the guides; if you run it from the builder
# itself and the guides are there too, that still works.
BUILDER=$(cd "$(dirname "$0")" && pwd)
HERE=${GUIDE_SRC:-$(pwd)}
if ! ls "$HERE"/e*.md >/dev/null 2>&1 && ls "$BUILDER"/e*.md >/dev/null 2>&1; then
    HERE=$BUILDER          # old layout: guides sit beside the builder
fi
cd "$HERE"

# Where the finished guides go. Override with GUIDES=... if needed.
if [ -z "$GUIDES" ]; then
    for candidate in \
        "$HOME/Library/CloudStorage/GoogleDrive-rdsalemi@gmail.com/My Drive/Teaching/Class Development/Engineering/Projects/Unit 01—Electronics" \
        /sessions/*/mnt/"Class Development"/Engineering/Projects/"Unit 01—Electronics"
    do
        if [ -d "$candidate" ]; then GUIDES="$candidate"; break; fi
    done
fi
DEPLOY=false
FORCE=false
FILES=()

for arg in "$@"; do
    case "$arg" in
        -d) DEPLOY=true ;;
        -f) FORCE=true ;;
        *)  FILES+=("$arg") ;;
    esac
done
if [ ${#FILES[@]} -eq 0 ]; then FILES=(e*.md); fi

# Change any of these and every guide is stale: they decide what lands on the
# page, and the shared SAVE / PARTA / GRADING text lives in build.js.
BUILDER_FILES=("$BUILDER/build.js" "$BUILDER/parse.js" "$BUILDER/make.js")

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# Every picture a guide uses, as a path from this folder. Handles both
# ![alt](images/x.png) and Obsidian's ![[x.png]].
images_used() {
    {
        sed -n 's/.*!\[[^]]*\](\([^)]*\)).*/\1/p' "$1"
        sed -n 's/.*!\[\[\([^]|]*\)\([|][^]]*\)\{0,1\}\]\].*/\1/p' "$1"
    } | while read -r img; do
        [ -z "$img" ] && continue
        if   [ -f "$img" ];                      then echo "$img"
        elif [ -f "images/$(basename "$img")" ]; then echo "images/$(basename "$img")"
        fi
    done
}

built=0
skipped=0

for md in "${FILES[@]}"; do
    out=$(grep -m1 '^out:' "$md" | sed 's/^out:[[:space:]]*//')
    pdf="${out%.docx}.pdf"

    # Is anything the guide is made from newer than the guide?
    stale=false
    if [ ! -f "$pdf" ]; then
        stale=true
    else
        for dep in "$md" "${BUILDER_FILES[@]}" $(images_used "$md"); do
            if [ "$dep" -nt "$pdf" ]; then stale=true; break; fi
        done
    fi
    [ "$FORCE" = true ] && stale=true

    if [ "$stale" = false ]; then
        printf "%-38s up to date\n" "$pdf"
        skipped=$((skipped + 1))
    else
        rm -f "$WORK"/*
        ( cd "$WORK" && node "$BUILDER/make.js" "$HERE/$md" > /dev/null )

        # Count pages off a first conversion.
        ( cd "$WORK" && soffice --headless --convert-to pdf "$out" > /dev/null 2>&1 \
            && pdftoppm -jpeg -r 30 "$pdf" pg )
        pages=$(ls "$WORK"/pg-*.jpg 2>/dev/null | wc -l | tr -d ' ')
        rm -f "$WORK"/pg-*.jpg

        # An odd guide is rebuilt with a blank page, so its first PDF is stale
        # and has to be made again. An even one is already right.
        if [ $((pages % 2)) -ne 0 ]; then
            rm -f "$WORK/$pdf"
            ( cd "$WORK" && PAD_EVEN=1 node "$BUILDER/make.js" "$HERE/$md" > /dev/null \
                && soffice --headless --convert-to pdf "$out" > /dev/null 2>&1 )
            printf "%-38s %s pages -> padded to %s\n" "$pdf" "$pages" "$((pages + 1))"
        else
            printf "%-38s %s pages\n" "$pdf" "$pages"
        fi

        if [ ! -f "$WORK/$pdf" ]; then
            echo "ERROR: LibreOffice produced no PDF for $md" >&2
            exit 1
        fi
        # cp, not mv: the temp folder is often on another device, and an
        # overwrite in place does not need permission to unlink the old file.
        cp "$WORK/$pdf" "$pdf"
        rm -f "$WORK"/*
        built=$((built + 1))
    fi

    if [ "$DEPLOY" = true ]; then
        if [ -z "$GUIDES" ] || [ ! -d "$GUIDES" ]; then
            echo "ERROR: Project Guides folder not found. Set GUIDES=/path/to/it" >&2
            exit 1
        fi
        if [ ! -f "$GUIDES/$pdf" ] || [ "$pdf" -nt "$GUIDES/$pdf" ]; then
            cp "$pdf" "$GUIDES/"
            printf "%-38s -> deployed\n" "$pdf"
        fi
    fi
done

echo "$built built, $skipped already current"
if [ "$DEPLOY" = true ]; then echo "deploy target: $GUIDES"; fi
