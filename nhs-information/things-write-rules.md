# Things 3 write rules — what Claude may and may not do to Ray's tasks

A standing fact. Present tense. If it becomes wrong, edit this file.

## The MCP is the only route

Claude reaches Things 3 only through the local `things` MCP. Nothing else,
ever. Not the SQLite database, not AppleScript of Claude's own, not a script,
not the x-callback URL scheme, not a copy of the file.

The database file is not reachable anyway — the shell on Ray's Mac sees only
the connected folders — and no one should make it reachable. If an MCP call
fails, the answer is that Things is unavailable this run. It is never to go
around the MCP.

Added 2026-09-12.

## The MCP cannot delete

There is no delete tool. The server exposes reads, `add_todo`, `add_project`,
`update_todo`, `update_project` and `show_item`, and nothing that removes
anything. So the no-delete rule below is not only policy — there is no
mechanism to break it with.

Recorded 2026-09-13.

## The three iron rules

**1. Claude never deletes anything from Things. Ever.**

Not a task, not a project, not a heading, not a checklist item, not something
Claude created five minutes ago. There is no exception and no "unless."
Deletion is Ray's, alone.

When a task looks wrong but the fix is deletion, leave it and name it in the
report.

**2. Claude never completes a task.**

Not marked off, not rescheduled out of sight. If Ray typed it, it stays until
Ray closes it himself. A task Ray adds to Things must never disappear.

**3. Claude never changes a project's title or area.**

Adding tasks to a project Ray created is fine. Renaming it or moving it is not.

## What Claude may do

- Create tasks and projects, after showing Ray the full proposed list and
  getting a yes.
- When Ray says to just write it — "just update my Things list", "don't ask,
  write it" — that is the yes. Claude writes, then shows the table of what
  landed. It does not stall for a second confirmation he already gave.
- Change dates on any task, including tasks Ray wrote, when the sheet or the
  calendar moved under it.
- Edit the notes on a task it created, and on any task whose notes it wrote,
  to correct reasoning that turned out wrong.

That is the whole list. Everything not on it is Ray's.

When Claude cannot tell whether Ray or Claude wrote a task, it is Ray's. Ask,
do not guess.

## Someday is Ray's

Claude does not read Someday and does not write to it. Ray reviews it himself
on a Check Someday task that repeats three months after each completion.

Someday also holds his five `[Template]` projects. That is correct — it is how
a template stays out of Anytime. Template projects are never dated and their
tasks are never counted as open.

Recorded 2026-09-13.

## Rows Ray cannot see

Things keeps hidden copies of repeating projects and their children. The MCP
returns those rows as ordinary undated to-dos. The Things window never shows
them, so Ray cannot open them, date them, or delete them.

Every one of them lacks both a project and an area, and every real task has
one or the other. That test is the only way to tell them apart. Never name one
in a report — it is work Ray has no way to act on.

Found 2026-09-13, when a sweep of undated tasks returned about a hundred rows
Ray could not find in Things. None were in the trash.

## The daily-brief standing approval

The `daily-brief` skill writes without asking, every run. Ray runs it at his
desk each morning and expects the list to be correct when it finishes. It
creates tasks and moves dates on its own authority. It still never deletes and
never completes.

This is the only standing approval. Every other thread shows Ray the proposed
list first.

## Naming a task for its layer

**Build** means the source does not exist. **Deploy** means it exists in the
vault and not in Drive. **Print** means it is deployed and needs paper.
**Schedule** means it exists everywhere and is missing from the sheet. See
`course-material-layers.md`. A task named for the wrong layer sends Ray to
remake something he already has.

## Dates mean something

A date on a task is a commitment to do it that day, not a way to keep it from
being forgotten. A task that slips past its date means either the date was
wrong or the work is sliding, and both are worth knowing the day it happens.

A deadline is not a date. A deadline with no start date has no mechanism for
beginning the work in time to finish it, so it surfaces on the day it is
already too late.

An undated task inside a project is correct. The tasks in a repeating project
sit undated until the project goes active.

Recorded 2026-09-13.

## Why the rules exist

Nothing enforces them. Cowork has no read-only tier, so these sentences are
most of the protection. Unlike the Obsidian vaults there is no git undo, and
unlike Google Calendar the connector is not scope-limited.

Ray's trust in Things depends on it holding what he puts in it. A task that
vanishes costs more than a task Claude never created.

## Where this came from

Ray, 2026-09-07. Tightens the earlier posture in DECISIONS 2026-09-06, which
barred Claude from writing to Things 3 at all. Writing is now allowed with
Ray's approval; destroying Ray's own entries is not.

Changed 2026-09-10: the "just write it" exception, the project-editing limit,
and the layer naming rule.

Changed 2026-09-11: the daily-brief standing approval, the blanket no-delete
rule, and permission to move dates on Ray's own tasks.

Changed 2026-09-12: use only the MCP, and never delete anything. The old file
said "Claude may delete or edit tasks Claude created" in the permissions list
while rule 3 said never delete any task — a contradiction that left a thread
room to argue itself into a deletion.

Changed 2026-09-13: Someday handed to Ray, the hidden rows recorded, the
absence of a delete tool recorded, and the meaning of a date written down.

Moved here from Google Drive `FACTS/` on 2026-09-16. Things 3 runs on both of
Ray's Macs, so these rules have to travel with him. Drive does not. See
`teaching-schedule.md`, "Why this file is here and not in Drive".
