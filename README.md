# Guide Builder

Turns a folder of markdown into printed lab guides. **The guide is a PDF.** A
Word file is built on the way there, in a temp folder, and deleted — no office
suite is needed to make a guide or to print one, and there is no editable copy
to hand-edit by mistake. The markdown is the only copy anyone can edit. That
used to be a rule people had to remember; now it is just true.

**This repo is shared.** It is a submodule of `nhsengineering`, `nhsrobotics`,
`advrobotics` and `physics` (and any future vault), each pinning its own
commit, checked out as `shared/`. It holds no guides, no pictures and no
course text — all of that lives with the course, and the builder is told
where to find it.

*V04*

## What a guides folder looks like

The builder is run **from the folder the guides are in**, and everything it
needs is there:

```
guides/unit01/
  e00.md … e09.md      one guide per file, a letter and two digits
  images/              every picture the guides use
  course.js            what this course's {{PLACEHOLDERS}} say   (required)
  extras.txt           things that ship with the guides          (optional)
  E00_….pdf            the built guides, gitignored
```

```bash
cd guides/unit01
../../shared/build-all.sh             # build every guide that needs it
../../shared/build-all.sh e02.md      # build just one
../../shared/build-all.sh -d          # build and deploy
../../shared/build-all.sh -f          # rebuild everything, current or not
node ../../shared/test-build.js       # check the builder against these guides
```

A guide is only rebuilt when its markdown, one of its pictures, or the builder
itself is newer than the PDF. Page counts are measured by running the file
through LibreOffice, which is slow, so this is the difference between a minute
and a second. Odd page counts are padded to even, because printing is
double-sided.

Needs `node`, `soffice` (LibreOffice) and `pdftoppm` (Poppler) on `PATH`;
`build-all.sh` checks and names whichever is missing.

## course.js

The one thing that genuinely differs between courses is the text a guide prints
for its placeholders — one course grades a circuit that works, the other grades
a robot and a worksheet. So the builder ships none of it. Each guides folder
exports a function of the guide's frontmatter:

```js
module.exports = meta => ({
  GRADING: "This lab is worth 20 points…",
  SAVE:    `…save it as /workspace/p${meta.number}.py…`,
});
```

`{{GRADING}}` in the markdown is replaced by that string. Taking `meta` means a
value can be built from the guide's own `number`, `scaffold` or `title`. A
guides folder without a `course.js` is refused rather than guessed at.

## extras.txt

A unit usually has one or two things that ship with the guides but are not
guides — a checkoff sheet, a worksheet. One per line:

```
Completed Electronics Projects.docx :: node tracker.js
```

Left of `::` is the file, right is the command that makes it, run in the guides
folder. It is remade when the file is missing or the command's script is newer,
and it deploys with everything else under `-d`. Drop the `::` half for a file
that is not generated and only needs copying. Naming a single guide on the
command line skips extras.

## The markdown it understands

| Written | Becomes |
|---|---|
| `# Heading` | part heading |
| `## Heading` | section heading |
| `> text` | grey italic note |
| `**whole paragraph**` | bold lead line |
| `- item` / `1. item` | bullet / numbered list |
| ` ``` ` fence | code block, monospace, boxed |
| `![[thing.png]]` | picture, resolved against `images/` |
| `![alt](images/thing.png)` | the same thing |
| `\| a \| b \|` + separator | table, first row is the header |
| `` `code` `` `**bold**` `*italic*` | inline runs |
| `$\frac{a}{b}$` | a real equation — see below |
| `[label](target)`, `[[target\|label]]` | **the label only** |
| `{{NAME}}` | whatever `course.js` says |

Frontmatter carries `out` (the filename to write), `version`, `title`, `number`,
and anything else a course's `course.js` wants to read.

## Math

`$ ... $` prints a real Word equation, so a fraction is stacked with a bar
rather than flattened to a slash. The syntax is a small slice of LaTeX,
picked because Obsidian already renders it — the equation looks right while
you write it and again on the page.

| Written | Prints |
|---|---|
| `$\frac{v_f - v_i}{\Delta t}$` | a stacked fraction |
| `$v_f$` | v with a subscript f |
| `$m/s^2$` | m/s squared |
| `$q_1^2$` | q with both scripts |
| `$\sqrt{\frac{2d}{a}}$` | a root over a fraction |

Also `\Delta \delta \Omega \omega \alpha \beta \gamma \theta \lambda \mu \pi
\rho \sigma \tau \phi \times \cdot \div \pm \approx \neq \leq \geq \degree
\infty \rightarrow \leftarrow`.

**That list is the whole language.** Anything else — `\int`, a misspelled
command, a missing brace — stops the build and names the file and the
problem. That is the point: a full LaTeX library would accept things Word
cannot draw, and the mistake would then surface as a wrong equation in a
student's hand instead of an error on your screen.

Dollar signs in ordinary prose are safe. Both delimiters must sit against
non-space, so "a $20 and $30 item" is money, not an equation. A single `$`
has nothing to pair with. Write `\$` for a literal dollar next to another.

## Rules that bite

- **A link prints as its label and nothing else.** A guide is read on paper,
  where a target is worthless and a filename is noise. A *bare* link to another
  guide — `[[p07]]` — is refused by the build, because "p07" is a name no
  student has ever seen. Write `[[p07|Project 07]]`.
- **Pictures must be real PNGs.** The header is read and anything else refused.
- **A picture is capped at 6.5 × 4.5 inches**, proportions kept. Without the
  height cap a portrait screenshot renders seven inches tall and owns a sheet.
  In a table cell the height cap is 1.56 inches instead.
- **A picture does not glue itself to a following picture or heading.** Both
  make one unbreakable block, and a block taller than a page shunts the whole
  run to the next sheet and leaves the current one nearly empty.
- **`***bold italic***` is not in the grammar** — only `**bold**` and
  `*italic*` separately. Triple asterisks print as literal asterisks.
- **A table's first row is its header.** A parts list whose first row is really
  data needs a header written for it.
- **Math needs a base inside the `$`.** `m/s$^2$` is legal LaTeX and is
  refused anyway: Word draws the empty base as nothing, LibreOffice draws a
  small empty box, and the PDF is what a student holds. Write `$m/s^2$`.
- **A heading takes no math.** Word sets a heading from its own style, which
  takes plain text, so an equation there would print as its own source.
  Refused rather than shipped.
- **Length costs sheets, not pages.** 3 and 4 pages are both 2 sheets. Only an
  even-to-odd crossing matters.

## Changing this repo

A change lands in the other course the moment its pin moves. **Bumping a pin
means rebuilding and eyeballing the guides in both courses** — pagination is the
shared failure mode and it fails quietly. `test-build.js` covers the link rules,
the placeholder contract and build determinism, but it cannot see a page.
