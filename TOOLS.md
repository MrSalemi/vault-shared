# Working on `shared` — what every tool is, and what it needs

Read this before changing anything in this repo, and before assuming how a
guide gets built. [README.md](README.md) is the *user* manual — the markdown
grammar, `course.js`, the rules that bite. This file is the *operator* manual:
the tools, their dependencies, how to be on the current version, and the gate
that has to pass before a push.

*V01 — 2026-08-30*

---

## 1. What this repo is, and where it lives

One clone, shared by every vault:

```
~/vaults/
    shared/            ← this repo, MrSalemi/vault-shared, branch master
    nhsrobotics/       shared -> ../shared
    nhsengineering/    shared -> ../shared
    advrobotics/       shared -> ../shared
    physics/           shared -> ../shared
    robonatick/        shared -> ../shared
```

Each vault holds `shared` as a **committed relative symlink**, not a submodule.
That changed on 2026-08-29; anything you read that says "submodule" or "pin" is
stale. See nhsrobotics DECISIONS #45 for why.

**What this means for you, and it is the whole point:** there is no pin to bump
and no per-vault update. Edit `~/vaults/shared/build.js` and every vault sees it
on the next build, immediately. You are always on the version that is checked
out here — there is no such thing as one vault being behind another on the same
machine.

**What it means across machines:** Ray has two Macs and they are separate
clones. `git pull` in `~/vaults/shared` on one machine does not touch the other.

### Being on the latest version

**If you cannot see `shared/` at all** — the symlink dangles, `ls shared/` says
no such file — then only one vault is mounted and the target sits outside it.
Ask for `~/vaults` to be mounted rather than a single vault. Nothing else in
this file will work until then.

**If you are a thread:** check the state, do not change it.

```bash
git -C ~/vaults/shared log --oneline -3        # safe
git -C ~/vaults/shared symbolic-ref -q --short HEAD || echo DETACHED
```

Those two touch no index. **`git status` is not read-only** — it refreshes the
index and takes `.git/index.lock`, and through a Cowork mount that lock can be
left behind and block Ray's next git command. If you need it, run it once and
report any lock error rather than retrying.

If the branch check says **DETACHED**, or the log looks behind, hand Ray the
commands below and wait. Do not run them yourself; see §5.

**If you are Ray, at a terminal:**

```bash
cd ~/vaults/shared
git status                 # expect: On branch master, working tree clean
git pull
```

A **detached HEAD** must be fixed before editing. It was this repo's normal
state until 2026-08-29, when it was a submodule, and an old clone may still be
in it. You can commit while detached — the commit is real — but `push` has no
branch to send as and fails at the very end, after the work looks done.

```bash
git switch master          # vault-shared uses master, NOT main
```

If `origin/master` does not exist and every diagnostic says "unknown revision",
the clone has no fetch refspec. Add it once:

```bash
git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
git fetch origin
```

If that fails with "could not lock config file", a stale lock is in the way:
`find ~/vaults/shared/.git -name '*.lock' -delete`.

**Branch names are not consistent across Ray's repos.** `vault-shared` is
`master`. `nhsrobotics` is `main`. Never guess — `git branch -r` after a fetch,
or read the branch dropdown on GitHub.

---

## 2. The tools

Everything is plain node and bash. Nothing is compiled, nothing is generated,
nothing has a build step of its own.

### `build-all.sh` — the entry point

The only thing anyone runs directly. **Run it from the folder the guides are
in**, never from here:

```bash
cd ~/vaults/nhsrobotics/guides
../shared/build-all.sh              # build every guide that needs it
../shared/build-all.sh p02.md       # build just one
../shared/build-all.sh -f           # rebuild everything, current or not
../shared/build-all.sh -d           # build and deploy to Class Development
```

`-d` and `-f` are the only flags; anything else on the line is taken as a guide
filename. What it does, in order:

1. Works out where it lives (`BUILDER`) and where the guides are (`$(pwd)`, or
   `GUIDE_SRC`). Those are two different folders and it never assumes otherwise.
2. Globs `[a-z][0-9][0-9].md` — a letter and two digits, so `p07.md` and `e01.md`
   are guides and a `README.md` sitting in the folder is not.
3. On a `-d` run only, resolves the deploy target (§4).
4. For each guide, decides whether it is stale: is the markdown, one of its
   pictures, `course.js`, or one of the builder's own `.js` files newer than the
   PDF? If not, it says "up to date" and does nothing. This is why a no-op run
   takes a second rather than a minute.
5. Builds a `.docx` in a temp folder via `make.js`, converts it with LibreOffice,
   counts the pages, and pads odd counts to even by rebuilding with `PAD_EVEN=1`.
   Printing is double-sided; an odd guide would put the next one on its back.
6. Deletes the `.docx`. There is never an editable copy of a guide anywhere.
7. Handles `extras.txt` — files that ship with the guides but are not guides.
   Naming a single guide on the command line skips extras deliberately.

### `make.js` — build one guide

```bash
node ~/vaults/shared/make.js p02.md          # writes the .docx named in frontmatter
PAD_EVEN=1 node ~/vaults/shared/make.js p02.md
```

Reads the markdown, calls `parse.js` then `build.js`, writes the `.docx` named
by the guide's `out:` frontmatter. Useful on its own when you want to inspect
the intermediate rather than the PDF.

### `parse.js` — markdown to blocks

Pure function, no I/O. Markdown text in, a list of typed blocks out (`h1`, `h2`,
`note`, `b`, `n`, `code`, `image`, `table`, …). If a construct is misreading,
this is where to look first, and it is testable without touching a PDF.

### `build.js` — blocks to a Word document

The biggest file and where nearly every layout decision lives: fonts, sizes,
spacing, alignment, picture caps, table shapes, page furniture. Three settings
near the top are overridable from the environment for one-off comparisons
without editing:

```bash
BODY_FONT="Calibri"    ../shared/build-all.sh -f p00.md
CODE_FONT="Roboto Mono" ../shared/build-all.sh -f p00.md
LINE=312                ../shared/build-all.sh -f p00.md
```

Current defaults, and why, are in §3.

### `math.js` — `$…$` to real Word equations

A deliberately small slice of LaTeX. Anything outside it **stops the build and
names the file**, which is the point: a full LaTeX library would accept things
Word cannot draw, and the mistake would then reach a student's hand as a wrong
equation instead of reaching you as an error. The supported list is in
[README.md](README.md).

### `topdf.js` — a Document straight to PDF

```js
const {writePdf} = require(path.resolve(__dirname, '../shared/topdf.js'));
writePdf(doc, "Some Sheet.pdf");
```

Used by the guide chain and by course-side scripts that make things which are
not guides — Robotics' `guides/worksheet.js` is the example. It lives here
rather than being copied into each course precisely because two copies in two
repos is the drift that made this repo shared.

**A course script that borrows from here must reference `../shared/…`.**
`worksheet.js` still said `../builder/…` after the 2026-08-16 rename and was
silently broken for two weeks. If you rename anything here, grep the vaults.

### `test-build.js` — the suite

```bash
cd ~/vaults/nhsrobotics/guides && node ../shared/test-build.js
node ~/vaults/shared/test-build.js test-fixtures      # what CI runs
NO_SOFFICE=1 node test-build.js test-fixtures         # what CI *sees*
```

300+ lines of checks: the link rules, the placeholder contract, picture sizing,
math failures, print readability, deploy behaviour, and build determinism. It
takes an optional folder argument; with none it uses the current directory, so
it can be run against a real course's guides as well as the fixtures.

**It cannot see a page.** It reads the `.docx` XML. Pagination — the shared
failure mode, and the one that fails quietly — is invisible to it.

### `preflight.sh` — the gate before pushing

```bash
~/vaults/shared/preflight.sh
```

See §5. Run this, not just the suite.

### What makes a guide stale

`build-all.sh` rebuilds a guide when anything it is made from is newer than the
PDF: its own markdown, any picture it uses, the course's `course.js`, and the
builder files listed in `BUILDER_FILES` — currently `build.js`, `parse.js`,
`make.js` and `math.js`.

**If you add a file that `build.js` or `parse.js` requires, add it to
`BUILDER_FILES`.** `math.js` was missing from that list until 2026-08-29: an
edit to it left every guide looking current, the next build reported "up to
date", and the change silently did not appear. `topdf.js` is correctly absent —
the guide chain converts with `soffice` directly and only course-side scripts
use it.

When in doubt, `-f` forces everything and costs about a minute.

### Adding a check to the suite

Two functions, and which you use is the whole decision:

```js
check('what should be true', someBoolean, 'detail shown only on failure');
skip('what would be true', 'no soffice');
```

`check` fails the run and the Action. `skip` prints loudly, counts, and does
not fail. Guard anything needing a real PDF with `HAS_SOFFICE`, or CI goes red
on a runner that was never going to have LibreOffice:

```js
if (!HAS_SOFFICE) {
  skip('deploys into a subfolder', 'no soffice');
} else {
  // … the real check
}
```

Assert the *decision*, not the digit. A check that read
`/w:line="360"/` had to be rewritten the first time the spacing changed, even
though nothing it was protecting had broken. `lineVal >= 276` guards the same
thing and survives tuning.

### `test-fixtures/` — synthetic guides for CI

Two fake guides and a `course.js`, so CI has something to build without any real
course being mounted. Not a course; do not read it as an example of good guide
writing.

### `nhs-information/` — the school calendar

`red-blue-2026-2027-schedule-calendar.md`, the Red/Blue day schedule, kept here
so every course reads one copy. Nothing in the build touches it.

### `RAY.md` — the working profile

Read by every thread at start, via `start-thread`. Describes how Ray works, not
any one project.

---

## 3. External tools, and the exact versions known to work

Installed **once per machine**, then local forever. Both of Ray's Macs were
brought to these on 2026-08-29.

They do **not** produce byte-identical PDFs, and should not be expected to: one
has real Courier New and embeds `CourierNewPSMT`, the other falls back to
`LiberationMono`. Those are metric clones, so the page counts, line breaks and
object structure match exactly. **Matching page counts is the standard**, not
matching bytes.

| Tool | Needed for | Verified version | Install |
|---|---|---|---|
| `node` | everything | v26.8.1 (CI floor: 22) | `brew install node` |
| `npm` | the one dependency | 11.6.2 | ships with node |
| `soffice` | `.docx` → PDF, page counting | LibreOffice 26.8.0.3 | `brew install --cask libreoffice` |
| `pdftoppm` | page counting | Poppler 22.02.0 | `brew install poppler` |
| `git` | — | 2.39.5 | Xcode CLT |

Plus **one npm dependency**, `docx@9.7.1`, installed into this repo:

```bash
cd ~/vaults/shared && npm install
```

`node_modules/` is gitignored, so it is per-machine and per-clone. A fresh clone
has none, and the failure is `Error: Cannot find module 'docx'`.

### Fonts

| Font | Used for | Must be installed? |
|---|---|---|
| **Carlito** | all body text and headings | **Yes** — `brew install --cask font-carlito` |
| **Courier New** | code blocks and inline code | No — ships with macOS and Windows |
| ~~Roboto Mono~~ | — | **No longer used.** See below. |

Verify with `fc-list | grep -ic carlito` — a complete family is **4** faces.

**Why these two and not the obvious ones.** Calibri ships with Microsoft Office,
so whether a machine has it, and how many of its four faces, is an accident of
what else is installed. A Mac with only Regular and Bold *synthesises* a slant
for italic, and a synthesised slant is not the width of a real italic — so the
same guide paginated differently on Ray's two Macs. Carlito is the free
metric-compatible clone and installs as a complete family.

Roboto Mono was the code font until 2026-08-29. It installs as a **variable**
font (`RobotoMono[wght].ttf`) and LibreOffice's handling of those is not
dependable: two Macs with byte-identical font files and the same LibreOffice
build disagreed — one embedded `RobotoMono-Regular`, the other silently fell
back to **Linux Libertine G, a serif proportional face**. Code set in a
proportional font is a broken handout, and the build reports success either way.

**That failure mode is the lesson worth keeping.** A font named in `build.js` is
a *request*, not a guarantee, and the build reports success whether or not it
was honoured.

### Checking your work — look at the artifact

The suite reads `.docx` XML and cannot see a page. After any change to fonts,
sizes, spacing, pictures or tables:

```bash
cd ~/vaults/nhsrobotics/guides
../shared/build-all.sh -f                    # page counts for every guide

pdfinfo  P00_First_Lights_Guide.pdf          # producer, page count, page size
pdffonts P00_First_Lights_Guide.pdf          # what was REALLY embedded
pdftoppm -png -r 80 -f 3 -l 3 P00_First_Lights_Guide.pdf /tmp/page
```

Then open `/tmp/page-3.png` and look at it. A thread can read that PNG directly.

If two machines disagree on page count, run `pdffonts` on both **first**. On
2026-08-29 that step was skipped for well over an hour, and every hypothesis
raised in the meantime — font cache, LibreOffice version, node version, a
reboot — was wrong. The answer was visible in ten seconds of `pdffonts` output.

Also verify the inputs are identical before comparing outputs. Several
comparisons that evening were between two different versions of `build.js`,
because an edit had never been committed and the other machine could not
possibly have had it.

### What the machine check looks like

```bash
for t in node npm git soffice pdftoppm; do
  printf "%-10s " "$t"; command -v $t >/dev/null && echo ok || echo MISSING
done
printf "%-10s %s\n" carlito "$(fc-list | grep -ic carlito) faces (want 4)"
[ -d ~/vaults/shared/node_modules ] && echo "node_modules ok" || echo "node_modules MISSING"
```

**The school network blocks npm and GitHub.** Anything needing a download has to
happen at home or on another network. Install once and it is local afterwards.

---

## 4. How deploying finds Class Development

`deploy.txt`, beside the guides, holds the **whole** path starting with the
shared Drive folder:

```
Class Development/Robotics/Project Guides
```

The builder takes the first component, searches `~/Library/CloudStorage` and
`/sessions/*/mnt` for a folder of that name containing the rest, and appends it.
That is what makes one line work on a machine that **owns** the Drive folder
(`.../My Drive/Teaching/Class Development`) and one that reaches the same folder
**through a shortcut**
(`.../.shortcut-targets-by-id/<id>/Class Development`), where the account name,
the user name and the shape of the path all differ.

- Looked up **only on a `-d` run**, so a machine with no Drive mounted can still
  build.
- Multiple matches are an error that lists them. Two Drive accounts signed in on
  one machine will both mount the same shared folder and produce exactly this.
  `GUIDES=/path/to/it` overrides everything.
- A guide can land in a subfolder of the target with `folder: 1.2` in its
  frontmatter.

Deploy is a plain `cp` over the Drive mount, deliberately. Drive for Desktop
sees the file change and uploads a **new revision of the same file**, so the
Drive file ID survives and any link to a guide keeps working. Uploading through
the Drive API instead would mean trash-and-create and a new ID every build.

---

## 5. The gate: what must pass before pushing

There is a GitHub Action on every push. The runner is bare Ubuntu with node and
nothing else — **no LibreOffice, no Poppler, no fonts**. So a change can pass on
a Mac with the full toolchain and fail there. That is exactly what happened at
`9b109ff`.

**This is automatic.** A `pre-push` hook runs `preflight.sh` and refuses the
push if it fails — on your machine, in a few seconds, rather than letting a red
Action out into the world. A gate you have to remember to run is not a gate.

It needs one config line **per clone**, because git does not track `.git/hooks`
and a fresh clone has no hooks at all:

```bash
cd ~/vaults/shared
git config core.hooksPath .githooks
```

Check it took with `git config --get core.hooksPath` — it should print
`.githooks`. If it prints nothing, the hook is not running and pushes are
unguarded.

To push past it deliberately: `git push --no-verify`.

You can also run the gate on its own, from anywhere:

```bash
~/vaults/shared/preflight.sh
```

It checks the tools, checks `node_modules` is consistent with `package.json`
(which is what `npm ci` will do on the runner), then runs the suite **twice** —
once as your machine is, and once with `NO_SOFFICE=1`, which is what the runner
sees. Exit 0 means the Action will pass.

Checks that need a real PDF report **SKIP**, loudly and by name, when
LibreOffice is absent. A skip is not a pass: if you changed anything about
conversion or deployment, it has to be run on a machine that has LibreOffice.

**`preflight.sh` passing is necessary and not sufficient.** The suite reads
`.docx` XML and cannot see a page. Any change touching fonts, sizes, spacing,
pictures or tables also needs:

```bash
cd ~/vaults/nhsrobotics/guides && ../shared/build-all.sh -f
```

and a look at the page counts and at a rendered page. A change here reaches
**five vaults at once** now — there is no pin holding any of them back.

### Handing off

Threads do not run git in Ray's vaults; write the files and give him the
commands. Cowork mounts a vault at a per-session sandbox path, git writes that
absolute path into its own plumbing, and `git status` alone is enough to leave a
stale `.git/index.lock` behind.

```bash
cd ~/vaults/shared
git commit -am "<what changed>"
git push                          # the hook runs preflight and can refuse
```

---

## 6. Things that have bitten, in one list

- A font named in the source is a request, not a guarantee. `pdffonts` is the
  only honest answer to what rendered.
- Page-count drift between two machines is a *symptom*. Something substituted.
- The test suite cannot see a page. Look at one.
- `git status` counts as a write. Read-only through a Cowork mount means `log`,
  `show`, `ls-tree`, `cat-file`, `rev-list` — nothing that refreshes the index.
- A submodule clone has no fetch refspec, so `origin/master` does not exist and
  every diagnostic returns "unknown revision" instead of telling you why.
- `vault-shared` is `master`. `nhsrobotics` is `main`. Check, do not guess.
- Course-side scripts reference `../shared/…` by hand. Renaming anything here
  requires grepping the vaults; `worksheet.js` was broken for two weeks this way.
- `build-all.sh` resolves the deploy target only on `-d`, on purpose. Do not
  move that check back above the argument parsing.
- A file `build.js` requires but `BUILDER_FILES` does not list means your edit
  does nothing and the build says "up to date".
- `node_modules/`, `*.docx` and `*.pdf` are gitignored here, and built PDFs are
  gitignored in the vaults too. The markdown is the source; a committed PDF is
  a second copy that will disagree with it. Never add one.
- CI runs on **every push to every branch**, not just `master`.
- Never hardcode a list of directories to find a tool in. A check did exactly
  that and broke the day node moved from `/usr/local/bin` to `/opt/homebrew/bin`
  — it then withheld node from its own fixture and failed complaining about the
  wrong program. Search `process.env.PATH`.
- `build-all.sh` adds `/Applications/LibreOffice.app/Contents/MacOS` to PATH as
  a macOS fallback, so a test cannot hide `soffice` from it by trimming PATH on
  a Mac that has LibreOffice installed.
