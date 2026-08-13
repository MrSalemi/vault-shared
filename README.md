# Guide Builder

Generates printed lab guides. **The guide is a PDF.** A Word file is built on
the way there, in a temp folder, and deleted.

**This repo is shared.** It is a submodule of both `nhsengineering` and
`nhsrobotics`, and each course pins its own commit. It holds no guides and no
pictures — those live with the course, and the builder is told where they are.

```bash
cd <the folder the guides are in>
/path/to/builder/build-all.sh          # build what is stale
/path/to/builder/build-all.sh -f       # rebuild everything
```

What is course-specific lives in the course, not here: the `SIMREAL` and
`GRADING` text, and the deploy folder. A change made for one course lands in
the other the moment its pin moves, so **bumping a pin means rebuilding and
eyeballing both courses.** Pagination is the shared failure mode.

*V01*

## Where these came from

The guides were Google Docs. `tools/docx_to_md.py` turned the exported `.docx`
into the markdown here and pulled the 59 pictures into `images/`. That import is
**raw** — it carries the words and the pictures across faithfully, and nothing
else. The headings, the voice and the WORK/FLEX shape are still to be written.

The originals are still in Drive at
`Class Development/Engineering/Projects/Unit 01—Electronics`. Nothing has been
deleted.

## Build

```bash
npm install docx          # once
./build-all.sh            # build every guide that needs it
./build-all.sh e02.md     # build just one
./build-all.sh -d         # build and copy into Project Guides
./build-all.sh -f         # rebuild everything, current or not
node test-build.js        # check the builder
```

A guide is only rebuilt when its markdown, one of its pictures, or the builder
itself is newer than the PDF. Page counts are measured with LibreOffice, which
is slow, so this matters.

Built guides are not committed. Deployed copies go to
`Class Development/Engineering/Project Guides/`.

## How this differs from the robotics builder

Same code, separate copy — Engineering is its own course and its guides answer
to nothing in Robotics.

- Guides are `eNN.md`, not `pNN.md`.
- The shared strings are different. Robotics has `{{SAVE}}`, `{{PARTA}}` and
  `{{GRADING}}`. Engineering has `{{SIMREAL}}` — simulate it, then build it —
  and a `{{GRADING}}` that is **not written yet**, because what a flex is worth
  in electronics has not been decided.

Everything else — the markdown it understands, the print rules, the link
handling — matches `nhsrobotics/guide_builder/README.md`.

## Re-importing a Google Doc

```bash
python3 ../tools/docx_to_md.py "Some Doc.docx" . e05
```

Pictures land in `images/` named after the slug, in the order they appear, and
JPEGs are re-saved as PNG because the builder refuses anything else.
