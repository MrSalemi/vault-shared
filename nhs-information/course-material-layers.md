# Course material layers — where Ray's class material lives

A standing fact. Present tense. If it becomes wrong, edit this file.

## The three layers

| Layer | Where | Answers |
| ----- | ----- | ------- |
| Scheduled | Red Blue 2627 Calendar | What day is this taught? |
| Built | `~/vaults/<course>/guides/` | Does the source exist? |
| Deployed | `Class Development/<course>/` | Can a student get it? |

The class happens either way. The show goes on. What the layers decide is
whether Ray walks into the room with the material or without it. When they
drift apart, he teaches from nothing.

Built is not deployed. A guide can build to PDF in the vault and never reach
the Drive folder the class uses. Checking only the vault says "it exists" about
something no student can open.

**Never say a thing does not exist without checking all three.**

## Where Class Development is

A folder in Ray's personal My Drive, shared with his school account. It also
holds the Red Blue 2627 Calendar. Both computers can reach it.

```
Class Development/
  Red Blue 2627 Calendar          the sheet
  Engineering/Projects/           deployed engineering units
  Physics/                        deployed physics packets
  Robotics/, Advanced Robotics/   their own material
  RoboNatick/                     the FTC program
```

Two traps. A root-level `Unit 02—Software Engineering` folder sits directly in
Class Development and holds the previous version of that class. Nothing deploys
there. The live one is nested under `Engineering/Projects/`. Also, Class
Development is itself a git repo, so `.git` and `.gitignore` show up in a
listing.

## One exercise, three names

The same piece of work is named differently in each layer. Match on the number,
not the word.

| Sheet | Guide title | Vault file |
| ----- | ----------- | ---------- |
| Exercise 03 | Project 03: Arduino Blink | `E03_Arduino_Blink_Guide.pdf` |
| Exercise 09 Due (Simon) | Project 09: The Simon Game | `E09_Simon_Game_Guide.pdf` |

## Engineering units

Unit 01 is E00 through E09, Electronics. Unit 02 is P01 through P05, Software
Engineering. The sheet calls both "Exercise NN", so an Exercise number does not
tell you which unit it belongs to. Check where the numbering restarts.

As of 2026-09-19: Unit 01 is being taught and ends Fri 10/2. Unit 02 is built
and deployed and not yet scheduled. Unit 03 does not exist in any layer.

That end date has moved twice. Take it from the sheet, not from here.

## Who owns which layer

Two kinds of Claude project, and they do not overlap.

| Project | Owns | Means |
|---|---|---|
| Life Planning | Scheduled | the Red Blue 2627 sheet, every `CALENDAR.md`, and every dated task in Things 3 |
| One per vault | Built, Deployed | lessons, worksheets, labs, guides — making them and putting them in Class Development |

**Life Planning is the only writer of dates.** It re-cuts the `CALENDAR.md`
files from the sheet and it creates the build, print and work-by-hand tasks with
their deadlines already worked out. A vault thread reads its own `CALENDAR.md`
and never edits it, and never writes to Things 3.

**Life Planning may edit anything in a vault except curriculum.** `STATUS.md`,
`DECISIONS.md`, `CALENDAR.md` and the notes around them are all fair game — when
dates move, the `STATUS.md` line that states them moves too, in the same run.
What it never modifies is curriculum: lectures, worksheets, evals, labs, guides
and lesson plans. Those belong to the vault's own project.

**A vault project is the only writer of material.** It builds what the schedule
asks for and deploys it. Life Planning names the work and dates it; it does not
make it.

The seam is a dated task. "Build 1.11 and 1.12, due Mon 9/21" is written by Life
Planning, because the date comes off the sheet. The building happens in the
physics project. Ray checks the task off; neither project completes anything.

One writer per thing is the whole point. Two projects re-cutting the same
calendar from the same sheet on different days is how they drift apart, and a
vault thread that cannot see the other courses cannot tell whether a date it is
about to write is already spoken for.

Recorded 2026-09-19, stated by Ray.

## What "closed" means in a vault

A vault `STATUS.md` that calls a unit closed means closed to development, not
closed to teaching. A closed unit is usually the one being taught right now.

A vault `CALENDAR.md` is a copy of the sheet and goes stale. The sheet wins.

## Before calling something missing from a vault

This session reads the home Mac's copy of the vaults. Work done on the school
laptop is not there until Ray pulls. **Ask Ray to run `pullvaults` before saying
a file is missing, and before writing that into any `STATUS.md`.**

## Naming work by layer

**Build** means the source does not exist. **Deploy** means it exists in the
vault and not in Drive. **Print** means it is deployed and needs paper.
**Schedule** means it exists everywhere and is missing from the sheet. A task
named for the wrong layer sends Ray to remake what he has.

## Where this came from

Ray, 2026-09-10. A thread reported that Engineering Unit 03 had to be built by
Tue 10/6, having checked the sheet and the vault but not Class Development.
Unit 02 was already built and deployed.

Corrected 2026-09-11. An earlier version opened with "A class can only run if
all three line up." Ray: the class always runs. The show must go on. The layers
govern whether he has the material, not whether the class happens.

Moved here from Google Drive `FACTS/` on 2026-09-16. Both computers reach the
vaults and Class Development, so this belongs where both can read it. See
`teaching-schedule.md`, "Why this file is here and not in Drive".
