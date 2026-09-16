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

As of 2026-09-10: Unit 01 is being taught and ends Tue 10/6. Unit 02 is built
and deployed and not yet scheduled. Unit 03 does not exist in any layer.

## What "closed" means in a vault

A vault `STATUS.md` that calls a unit closed means closed to development, not
closed to teaching. A closed unit is usually the one being taught right now.

A vault `CALENDAR.md` is a copy of the sheet and goes stale. The sheet wins.

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
