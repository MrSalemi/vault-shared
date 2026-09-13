#!/bin/bash
# Build the printable guides from markdown, pad odd page counts, and report.
# V10
#
# See TOOLS.md for what this needs installed and what must pass before a push.
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
# They are separate folders: the builder is one clone at ~/vaults/shared,
# symlinked into nhsengineering, nhsrobotics, advrobotics, physics and any
# future vault as shared/, so nothing below may assume it sits beside the
# guides. Run this script from the folder holding the guides. The old layout,
# where they were one folder, still works.
BUILDER=$(cd "$(dirname "$0")" && pwd)
HERE=${GUIDE_SRC:-$(pwd)}

# Wire the builder's pre-push hook, if it is not wired already.
#
# git does not track .git/hooks, so a fresh clone of the builder has none and
# pushes go out unguarded. The fix is one `git config core.hooksPath .githooks`
# per clone -- which is a thing somebody has to remember, and a thing somebody
# has to remember is a bug with a delay on it. So it happens here instead:
# building a guide is the one action that happens on every machine, constantly,
# and this costs a single git call once and nothing ever after.
#
# Silent and best-effort on purpose. A read-only checkout, a locked config, or
# no git at all must never stop a guide from building five minutes before class.
if [ -d "$BUILDER/.githooks" ] && [ -e "$BUILDER/.git" ] \
   && command -v git >/dev/null 2>&1; then
    if [ -z "$(git -C "$BUILDER" config --get core.hooksPath 2>/dev/null)" ]; then
        git -C "$BUILDER" config core.hooksPath .githooks 2>/dev/null \
            && echo "note: wired the builder's pre-push hook (one time)"
    fi
fi

# The builder's one npm dependency. node_modules is gitignored, so it is
# per-machine and a fresh clone has none. Without this the first build dies in
# a node stack trace naming a module nobody asked about, which is a poor way to
# learn you needed one command.
if [ ! -d "$BUILDER/node_modules" ]; then
    echo "ERROR: the builder's dependencies are not installed." >&2
    echo "       cd $BUILDER && npm install" >&2
    echo "" >&2
    echo "       Needs network. The school network blocks npm, so this has to" >&2
    echo "       happen at home. It is a one-time install per machine." >&2
    exit 1
fi
# A guide is a letter and its digits: e07.md here, p07.md in robotics,
# w0107.md and L0108.md in physics. Never *.md, which would sweep up a README
# or a note left in the folder.
#
# Two things were widened here on 2026-09-07, both after the same failure.
#
# The letter may be either case. It was lowercase only, and physics' L18.md was
# then not a guide as far as this script was concerned: a full run never saw
# it, and an edit to it printed nothing at all rather than failing.
#
# The digits are one or more, not exactly two. Physics names a source for the
# unit as well as the lesson -- w0107.md is unit 1, lesson 7 -- because w07.md
# means "the seventh worksheet in whichever folder you are looking at" and
# every unit has one. Two digits ran out at Unit 10. Robotics and Engineering
# still use two and are unaffected.
#
# A silent omission is the worst outcome available here, which is why this is
# a widening rather than a second pattern to keep in step.
#
# Both halves of the letter range are written out on purpose: under some
# LC_COLLATE settings a bare [a-z] already matches an uppercase letter and
# under others it does not, so [A-Za-z] is the only spelling that means the
# same thing everywhere. +([0-9]) needs extglob, switched on just below.
shopt -s extglob
GLOB='[A-Za-z]+([0-9]).md'
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

# Where the finished guides go. This is course-specific, so NONE of it is in
# the builder: deploy.txt beside the guides holds the whole path, starting with
# the shared Drive folder it lives in --
#
#     Class Development/Robotics/Project Guides
#
# The first component is looked for under this machine's Google Drive mounts and
# the rest is appended. That is what makes one line work on a machine that OWNS
# the folder (.../My Drive/Class Development) and on one that reaches the same
# folder through a shortcut (.../.shortcut-targets-by-id/<id>/Class Development),
# where the account name, the user name and the shape of the path all differ.
#
# Override the whole thing with GUIDES=... if needed.
#
# Only looked up on a -d run. Building a guide does not need Class Development
# mounted, and this used to refuse to build at all on a machine without it --
# a sandbox, or a thread that mounted only the repo.
#
# CLASS_DEV_DIR is exported from ~/.zshrc and holds the full path to Class
# Development on this machine. It is per machine because the account name, the
# user name and the shape of the path all differ between a Mac that OWNS the
# Drive folder (.../My Drive/Teaching/Class Development) and one that reaches
# it through a shortcut (.../.shortcut-targets-by-id/<id>/Class Development).
#
# It used to be found instead, with a find over the whole of
# ~/Library/CloudStorage on every -d run. Drive File Stream serves one folder
# listing at a time, so that walk was slow whenever it worked and hung outright
# when nothing matched: proving a folder is absent means visiting every folder,
# and there is no early exit. That stalled the test suite on 2026-09-13.
if [ "$DEPLOY" = true ] && [ -z "$GUIDES" ] && [ -f deploy.txt ]; then
    rel=$(grep -v '^[[:space:]]*#' deploy.txt | grep -v '^[[:space:]]*$' | head -1)
    top=${rel%%/*}                      # the shared folder: "Class Development"
    rest=${rel#*/}                      # the course part: "Robotics/Project Guides"
    [ "$rest" = "$rel" ] && rest=""     # deploy.txt named the top folder only

    if [ -z "$CLASS_DEV_DIR" ]; then
        echo "ERROR: CLASS_DEV_DIR is not set, so '$top' cannot be found." >&2
        echo "       Add this to ~/.zshrc on this machine, with the path as it" >&2
        echo "       is here -- the account and user name differ per machine:" >&2
        echo "" >&2
        echo "       export CLASS_DEV_DIR=\"\$HOME/Library/CloudStorage/GoogleDrive-<account>/My Drive/Teaching/$top\"" >&2
        echo "" >&2
        echo "       Then open a new shell. GUIDES=/path/to/it overrides it for" >&2
        echo "       one run." >&2
        exit 1
    fi

    if [ ! -d "$CLASS_DEV_DIR" ]; then
        echo "ERROR: CLASS_DEV_DIR is set to:" >&2
        echo "       $CLASS_DEV_DIR" >&2
        echo "       That folder is not there. Is Google Drive mounted?" >&2
        exit 1
    fi

    GUIDES="$CLASS_DEV_DIR${rest:+/$rest}"
    if [ ! -d "$GUIDES" ]; then
        echo "ERROR: deploy.txt names '$rel'." >&2
        echo "       CLASS_DEV_DIR points at $CLASS_DEV_DIR," >&2
        echo "       but it holds no '$rest'." >&2
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
#
# math.js was missing from this list until 2026-08-30. build.js requires it, so
# it decides what lands on the page like the rest of them -- but an edit to it
# left every guide looking current, the next build said "up to date", and the
# change silently did not appear. Anything build.js or parse.js requires belongs
# here. topdf.js does not: the guide chain converts with soffice directly, and
# topdf.js is only used by course-side scripts like Robotics' worksheet.js.
BUILDER_FILES=("$BUILDER/build.js" "$BUILDER/parse.js" "$BUILDER/make.js" "$BUILDER/math.js")
[ -f course.js ] && BUILDER_FILES+=("course.js")

# node writes the .docx, LibreOffice paginates it, poppler counts the pages.
# All three have to be on PATH, and when one is not this script used to die
# saying nothing at all: the conversion runs in a subshell with its output
# redirected, so `set -e` ended the run with a blank screen. So the tools are
# checked by name, and what is missing is printed.
#
# The macOS installer does not put soffice on PATH, so look where it lands.
if ! command -v soffice >/dev/null 2>&1 \
   && [ -x "/Applications/LibreOffice.app/Contents/MacOS/soffice" ]; then
    PATH="/Applications/LibreOffice.app/Contents/MacOS:$PATH"
fi

# node 22 and up carry a localStorage global and warn, on every process that
# touches it, that it is not backed by a file. Nothing here asks for web
# storage -- a dependency reads the global to see whether it is in a browser --
# so the warning is noise, and it was printed twice per padded guide. It is
# version-dependent, which is worse than useless: the same build was quiet on
# one Mac and shouting on the other.
#
# Only ExperimentalWarning is silenced, and only for what this script runs.
# Deprecations still print, because those are ours to fix -- DEP0190 was, and
# it was fixed in topdf.js rather than hidden here. Anything already in
# NODE_OPTIONS is kept.
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--disable-warning=ExperimentalWarning"

# The check is made when a guide actually needs converting, not up front.
# A run where every guide is already current converts nothing, so demanding
# LibreOffice from it fails a job that was never going to use the tool -- the
# same mistake #37 fixed for Class Development, in a different costume. It is
# what kept vault-shared's own CI red: the runner has node and no LibreOffice,
# and the one test that runs build-all.sh expects an all-current run to
# succeed.
#
# Checked once per run, not once per guide, so a long build cannot print the
# same complaint ten times.
tools_ok=false
require_tools() {
    [ "$tools_ok" = true ] && return 0
    local missing=()
    local tool
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
    tools_ok=true
}

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
        require_tools
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
        # A guide may ask for a subfolder of the deploy target, with
        # `folder: 1.2` in its frontmatter. Physics wants the worksheet, the
        # answer sheet and the teaching plan for a section sitting together,
        # and the section number is easier to find as a folder than buried in
        # three filenames. Without the line a guide deploys straight into the
        # target, which is what Robotics and Engineering do.
        sub=$(grep -m1 '^folder:' "$md" | sed 's/^folder:[[:space:]]*//' | sed 's/["'\'']//g')
        dest="$GUIDES"
        if [ -n "$sub" ]; then
            dest="$GUIDES/$sub"
            mkdir -p "$dest"
        fi
        if [ ! -f "$dest/$pdf" ] || [ "$pdf" -nt "$dest/$pdf" ]; then
            cp "$pdf" "$dest/"
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
                    # An extra's recipe is arbitrary, but in practice it is
                    # `node tracker.js`, which reaches topdf.js and therefore
                    # LibreOffice. Same rule as a guide: check the tools when
                    # something is actually being made.
                    require_tools
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
