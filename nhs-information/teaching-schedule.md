# Teaching schedule — Natick High School, 2026-2027

A standing fact. Present tense. If it becomes wrong, edit this file.

## Day types

School days alternate Red, Blue, Red, Blue. Holidays are skipped and the
alternation never resets. A section meets on every day of its color.

Never label a day R1, R2, B1 or B2. Say Red or Blue. Those numbers are block
positions, not day types, and using them as day labels is confusing.

## Blocks

A block is 80 minutes.

**Red day**

| Block | What |
| ----- | ---- |
| 1 | Robotics and Advanced Robotics, together in room 200F |
| 2 | Physics Red 2, room 202 |
| 3 | Physics Red 3, room 202 |
| 4 | Prep |

**Blue day**

| Block | What |
| ----- | ---- |
| 1 | Engineering |
| 2 | Physics Blue 2 |
| 3 | Prep |
| 4 | Hallway duty |

## Hallway duty

Ray sits in a hallway. He cannot reach room 200F, so no robot prep. He can
grade papers and do laptop work.

## Usable time

A Red day gives one usable block. A Blue day gives two — prep plus hallway
duty. So Blue days carry most of the available working time, and anything
needing room 200F has to be a block that reaches it.

## What costs a block and what does not

Only three things cost a whole 80-minute block: grading one physics section's
exam, grading one physics section's lab, and a build job.

Everything else on the task list is minutes. Entering PowerSchool zeros,
printing, sending an email, a phone call, a file fix — none of these occupy a
block, and none of them compete with a build for prep time. A day whose only
other task is "Put P03 zeros into PowerSchool" is a day with its block free.

Never add up task counts to call a day full. Count blocks, and count only the
three things above.

## Self-paced classes

Engineering and Robotics are self-paced. Students work through a numbered
sequence of projects at their own rate. The sheet's work days and due days
pace the class; they are not the day a handout appears.

## Grading

Robotics and Engineering generate no grading work outside class. Ray marks
the projects done in the room and enters them in PowerSchool there. He never
carries that work away with him.

The one task a project due date does create is closing it out: entering
zeros in PowerSchool for the students who did not finish. Phrase it as
"Put P01 zeros into PowerSchool", naming the project. It follows the due
date; it is not grading, and it takes a few minutes.

Physics grading is not only exams. A lab also creates a grading task, at
the same cost as an exam. Grading one section — exam or lab — takes at
least 80 minutes, one full block. Three physics sections needing grading
means three blocks. A Blue day can absorb two; a Red day can absorb one.

## Print prep — physics

Everything made for physics gets printed, and printed the school day before
the class that uses it. Not evals and exams only — worksheets, labs, activity
sheets, review sheets, all of it.

Ray prints for all three physics sections in one pass. So the print task
belongs to the material, not the section, and its deadline is set by the
**first** of the three sections to use it — which is often Red, and often not
the section Ray is thinking about. Phrase it "Print W0109 and W0110 for all
three physics sections".

Work backward from the first section, then step back one school day. When
that day is a holiday, or a day Ray is out, step back again to the last school
day he is actually in the building.

A print task has a build task behind it. Material that does not exist on disk
cannot be printed, so the thing that makes it must land a day earlier still.

Each piece of material has its own first use, so a task covering two lessons
can carry two different deadlines. Red and Blue do not take the same lessons
on the same day, and Red sometimes splits what Blue takes together. Derive the
deadline per worksheet, not per task title.

## Work it by hand

Every physics worksheet Ray prints, he then works himself, start to finish.
The scan of his copy becomes the answer key. Claude never writes an answer
sheet — see the physics vault, DECISIONS #47.

So each worksheet creates **three** tasks, not two: build, print, and work by
hand. The work task sits on the print day, and its deadline is the day before
first use. Phrase it "Work W0109 and W0110 by hand".

This applies to labs and activity sheets too, not worksheets only. Anything
students will hand back with answers on it, Ray does first.

A build task is not finished until its work-by-hand task exists.

## Print prep — engineering and robotics

Different rule. All engineering and robotics projects are printed **before**
the semester starts, in one pass, because the classes are self-paced and
students pull the next project when they are ready.

So never create a per-exercise or per-project print task for these two
courses. An "Exercise 07" or "P04" work day in the sheet needs no print task.
The only print task they get is the one that covers a whole unit before it is
first taught — and if the unit is being taught already, that print happened.

## Course lengths

Physics runs all year.
Robotics and Advanced Robotics are Semester 1 only, ending 2027-01-15.

## Sections

Physics Red 2 and Physics Red 3 run lockstep, so one physics lesson is taught
twice on a Red day.

## Where this came from

These facts lived only in the planning vault's STATUS.md, which Ray deleted on
2026-09-06. That vault's own DECISIONS #1 claimed they had been written into
`shared/nhs-information/`, but they had not.

They were then rebuilt in Google Drive as `FACTS/teaching-schedule`, and
corrected there through 2026-09-14. Moved here 2026-09-16 — see "Why this file
is here" below.

The Grading section was corrected 2026-09-07, twice. An earlier version
described only exam grading, which let a thread invent grading tasks for
Robotics and Engineering project due dates. Ray does not grade those outside
class; he enters zeros for the unfinished.

The Grading section was corrected again 2026-09-08. An earlier version
covered only exams, which missed that labs in Physics Red 2 and Red 3 also
need grading.

Print prep was added 2026-09-09 and widened the same day. The first version
covered only evals and exams and set the deadline per section. Ray corrected
it: everything created gets printed, he prints all three sections in one pass,
and the deadline is the day before the first of the three. He caught the miss
on the morning of the eval, with no print task anywhere.

Print prep was split in two on 2026-09-12. The single rule said everything
gets printed the school day before its class, which is true for physics only.
Ray: all engineering and robotics projects are printed before the semester
starts, because those classes are self-paced.

"What costs a block and what does not" was added 2026-09-12. A daily-brief run
had counted "Put P03 zeros into PowerSchool" as consuming a whole block. Ray:
it does not take 80 minutes to put a few zeros into PowerSchool.

"Work it by hand" was added 2026-09-13. Ray noticed 1.9 and 1.10 had build and
print tasks but nothing for doing the problems himself. The rule already lived
in the physics vault's DECISIONS #47, which nothing reads when tasks are made,
so the task was never created.

## Why this file is here and not in Drive

Google Drive `FACTS/` sits in Ray's personal My Drive / Life folder. His school
laptop cannot reach it. This is classroom knowledge and he uses it at school,
so it lives in `shared/`, which is a git submodule and travels to both
computers and both accounts.

The test for any rule: **does it need to travel?** If yes, it belongs here. If
it only describes the Drive system, the Spark or the personal side, it stays in
Drive.

Nothing lives in both places. If a Drive file needs to mention a rule from
here, it points at this file rather than copying it. Two copies drift, and
neither one knows the other exists.

Moved 2026-09-16.
