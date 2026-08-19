#!/bin/bash
# Build the printable guides from markdown, pad odd page counts, and report.
# V06
#
#   ./build-all.sh            build every guide that needs it
#   ./build-all.sh e02.md     build just one
#
# Add -d to copy the results into the unit's folder in Class Development.
# Add -f to rebuild even the guides that are already up to date.
#
# A unit usually has one or two things that ship with the guides but are not
# guides -- a checkoff sheet, a worksheet. Those are listed in extras.txt beside
# the guides, one per line:
#
#   Completed Electronics Projects.docx :: node tracker.js
#
# The part before :: is the file, the part after is the command that makes it,
# run in the guides' folder. It is remade when it is missing or when the first
# file named in its command is newer, and with -d it deploys with everything
# else. A line with no :: is a file that is not generated at all and only needs
# deploying.
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
#   HERE     where the guides live: the eNN.md or pNN.md, images/, course.js,
#            and the built PDFs.
#
# They are separate folders: the builder is a submodule (checked out as
# shared/) used by nhsengineering, nhsrobotics, advrobotics, and any future
# vault, so nothing below may assume it sits beside the guides. Run this
# script from the folder holding the guides. The old layout, where they
# were one folder, still works.
BUILDER=$(cd "$(dirname "$0")" && pwd)
HERE=${GUIDE_SRC:-$(pwd)}
# A guide is a letter and two digits: e07.md here, p07.md in robotics. Never
# *.md, which would sweep up a README or a note left in the folder.
GLOB='[a-z][0-9][0-9].md'
if ! ls "$HERE"/$GLOB >/dev/null 2>&1 && ls "$BUILDER"/$GLOB >/dev/null 2>&1; then
    HERE=$BUILDER          # old layout: guides sit beside the builder
fi
cd "$HERE"

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

# Where the finished guides go. This is course-specific, so it is not in the
# builder: put it in deploy.txt beside the guides, as a path relative to the
# Class Development folder. Override the whole thing with GUIDES=... if needed.
#
# Only looked up on a -d run. Building a guide does not need Class Development
# mounted, and this used to refuse to build at all on a machine without it --
# a sandbox, or a thread that mounted only the repo.
if [ "$DEPLOY" = true ] && [ -z "$GUIDES" ] && [ -f deploy.txt ]; then
    rel=$(grep -v '^[[:space:]]*#' deploy.txt | grep -v '^[[:space:]]*$' | head -1)
    for root in \
        "$HOME/Library/CloudStorage/GoogleDrive-rdsalemi@gmail.com/My Drive/Teaching/Class Development" \
        /sessions/*/mnt/"Class Development"
    do
        if [ -d "$root/$rel" ]; then GUIDES="$root/$rel"; break; fi
    done
    if [ -z "$GUIDES" ]; then
        echo "ERROR: deploy.txt names '$rel' and no Class Development has it" >&2
        exit 1
    fi
fi
# Was a guide named on the command line? If not this is a full run, and a full
# run is the only one that touches extras.txt.
NAMED=true
if [ ${#FILES[@]} -eq 0 ]; then FILES=($GLOB); NAMED=false; fi

# Change any of these and every guide is stale: they decide what lands on the
# page. course.js counts too -- it holds the course's {{GRADING}} and the rest,
# and it lives here with the guides, not in the builder.
BUILDER_FILES=("$BUILDER/build.js" "$BUILDER/parse.js" "$BUILDER/make.js")
[ -f course.js ] && BUILDER_FILES+=("course.js")

# node writes the .docx, LibreOffice paginates it, poppler counts the pages.
# All three have to be on PATH, and when one is not this script used to die
# saying nothing at all: the conversion runs in a subshell with its output
# redirected, so `set -e` ended the run with a blank screen. Check up front and
# name what is missing.
#
# The macOS installer does not put soffice on PATH, so look where it lands.
if ! command -v soffice >/dev/null 2>&1 \
   && [ -x "/Applications/LibreOffice.app/Contents/MacOS/soffice" ]; then
    PATH="/Applications/LibreOffice.app/Contents/MacOS:$PATH"
fi
missing=()
for tool in node soffice pdftoppm; do
    command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
done
if [ ${#missing[@]} -ne 0 ]; then
    echo "ERROR: not on PATH: ${missing[*]}" >&2
    echo >&2
    for tool in "${missing[@]}"; do
        case "$tool" in
            node)     echo "  node      brew install node" >&2 ;;
            soffice)  echo "  soffice   LibreOffice, from libreoffice.org or" >&2
                      echo "            brew install --cask libreoffice" >&2 ;;
            pdftoppm) echo "  pdftoppm  brew install poppler" >&2 ;;
        esac
    done
    exit 1
fi

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

        # Count pages off a first conversion. A failure here must NOT take the
        # script down through `set -e` -- it would do so having printed nothing,
        # and the real complaint is the "produced no PDF" check further down.
        ( cd "$WORK" && soffice --headless --convert-to pdf "$out" > /dev/null 2>&1 \
            && pdftoppm -jpeg -r 30 "$pdf" pg ) || true
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

# The things that ship with the guides but are not guides. Only done on a full
# run: asking for one guide by name should not drag the checkoff sheet along.
if [ "$NAMED" = false ]; then
    if [ -f extras.txt ]; then
        while IFS= read -r entry || [ -n "$entry" ]; do
            case "$entry" in ""|\#*) continue ;; esac
            target=${entry%%::*}
            recipe=${entry#*::}
            [ "$recipe" = "$entry" ] && recipe=""      # no :: means not generated
            # Trim the spaces around each half.
            target=$(printf '%s' "$target" | sed 's/[[:space:]]*$//; s/^[[:space:]]*//')
            recipe=$(printf '%s' "$recipe" | sed 's/[[:space:]]*$//; s/^[[:space:]]*//')

            if [ -n "$recipe" ]; then
                # The generator is the first thing in the recipe that is a file
                # here -- `node tracker.js` depends on tracker.js.
                gen=""
                for word in $recipe; do
                    if [ -f "$word" ]; then gen=$word; break; fi
                done
                stale=false
                [ ! -f "$target" ] && stale=true
                [ -n "$gen" ] && [ "$gen" -nt "$target" ] && stale=true
                [ "$FORCE" = true ] && stale=true
                if [ "$stale" = true ]; then
                    sh -c "$recipe" > /dev/null
                    printf "%-38s remade\n" "$target"
                    built=$((built + 1))
                else
                    printf "%-38s up to date\n" "$target"
                    skipped=$((skipped + 1))
                fi
            fi

            if [ ! -f "$target" ]; then
                echo "ERROR: extras.txt lists $target and nothing made it" >&2
                exit 1
            fi
            if [ "$DEPLOY" = true ]; then
                if [ ! -f "$GUIDES/$target" ] || [ "$target" -nt "$GUIDES/$target" ]; then
                    cp "$target" "$GUIDES/"
                    printf "%-38s -> deployed\n" "$target"
                fi
            fi
        done < extras.txt
    fi
fi

echo "$built built, $skipped already current"
if [ "$DEPLOY" = true ]; then echo "deploy target: $GUIDES"; fi
