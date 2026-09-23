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

"Work it by hand" and "create the answer key" are the same job under two names.
Use "Work <material> by hand".

## What a lesson document creates

A physics lesson produces two source documents in the vault, and each one
creates its own set of tasks. **All of them are done before Ray teaches that
lesson.**

The naming is fixed:

| Document | Where | Builds to |
|---|---|---|
| `lNNNN.md` | `physics/lectures/` | `Teaching Plan — NNNN <name>.pdf` |
| `wNNNN.md` | `physics/guides/unit-NN/` | `WNNNN <name>.pdf` |

`NNNN` is unit and lesson: `l0112` and `w0112` are Unit 01, lesson 1.12. Each
file carries frontmatter, and **the frontmatter is the authority, not the
filename** — `number` gives the lesson and `title` gives its human name ("1.12
Acceleration Formula and Problems"). Take task names from `title`.

`eNNNN` is an eval. It follows the worksheet rules **except PowerSchool** — an
eval is formative, it tells Ray who is lost, and no grade is entered.

`aNNNN` is a **retired answer sheet**, not an activity. Physics `DECISIONS #47`
stopped Claude writing them on 2026-09-05; Ray works the sheet by hand and the
scan goes straight to Drive. The files from `a0101` to `a0107` stay on disk only
so their PDFs remain rebuildable. **They create no tasks**, and the numbering
stopping at `0107` is that decision's fingerprint, not a gap.

### From `lNNNN.md` — the Teaching Plan

1. **Print the Teaching Plan** — Ray's own copy, not the students'.
2. **Make the video** for that lesson.
3. **Post the video to YouTube and link it in Google Classroom.**

**The video tasks get a start date and no deadline.** Ray does not need the
video to teach the class, so nothing hangs on it. Give them a date so they show
up, and never a deadline.

### From `wNNNN.md` — the worksheet

1. **Build** it, if it does not exist yet.
2. **Print it for all three physics sections.**
3. **Work it by hand** — the scan becomes the answer key.
4. **Capture it in PowerSchool.** The one task that comes **after** the class,
   not before. Ray creates the assignment and enters grades in one sitting, right
   after the worksheet is given. Date it for the day the **last** section gets
   it, with the next day as the deadline.

The other worksheet tasks, and all three Teaching Plan tasks, are done before
the class.

**Robotics and Engineering are the opposite.** Their PowerSchool assignments go
in early, ahead of the work — the self-paced classes need the gradebook
waiting. Only physics worksheets are captured after the fact.

### A lecture with no worksheet, or the reverse

Not every lesson has both. Create only the tasks for the documents that exist.
A lab adopted as a ready-made handout — `handouts/unit-01/1.11 Acceleration Lab
2026.pdf` is the example — has no `.md` source at all, so it creates nothing
here; it still needs printing under the print-prep rule above.

### An edit after printing is for next year

Ray often edits a worksheet after it is printed and worked by hand. That edit is
for next year's class, not this one — the printed stack and the scanned key
stay as they are. Do not flag it as drift, and do not create a reprint task.

## Home or school

**Only one of these tasks needs the building: printing the worksheets for
students.** It needs the school copier and the student counts, so its date steps
back to the last school day Ray is actually in.

Everything else is home work — printing the Teaching Plan, working the sheet by
hand, making the video, posting it, capturing in PowerSchool, and every build.
Those can land on a weekend, a holiday or a day Ray is out sick, and they do not
compete for a prep block.

This is why a build can sit on Yom Kippur and why answer keys get done on a
Sunday. Never push a home task forward to the next school day — that throws away
the days Ray actually uses for it and stacks work onto blocks that have none
free.

Recorded 2026-09-20, stated by Ray.

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

## Student information

Named students carry information Ray is trusted with. Their names, absences,
medical reasons, IEP and 504 details, and grades stay inside Things 3 and
inside the school's own systems.

None of it goes into the Drive Life folder. STATUS, DECISIONS, FACTS and the
Daily Report are all read by Gemini, and the Spark emails the Daily Report
back to Ray, so a student's name written there leaves Things, lands in a
Google Doc, and then travels through email.

The Daily Report says a task exists and points at Things for the detail:
"One absent-work tracker to fill in for a student out next week." Never the
name, never the reason.

Inside Things the detail is welcome. That is where the work gets done, it is
on Ray's own machine, and the forwarded email is usually already sitting
there.

The same holds in chat. Name a student only when Ray has named them first in
that conversation.

Recorded 2026-09-19. A daily-brief run read a forwarded email out of Things
and wrote a student's name and her surgery into the Daily Report. Ray caught
it. The skill already kept email senders and subjects out of that doc; it did
not say this.

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
