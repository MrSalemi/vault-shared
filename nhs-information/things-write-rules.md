# Things 3 write rules — what Claude may and may not do to Ray's tasks

A standing fact. Present tense. If it becomes wrong, edit this file.

## When the MCP fails, read the log before guessing

The `things` MCP server can fail in ways that look alike from here. Claude sees
only `get_device_info`, which reports `failed` and the server's own last words.
That is not a diagnosis. The logs are:

```
~/Library/Logs/Claude/mcp-server-things.log     what Claude Desktop saw
~/.things-mcp/logs/                             what the server itself wrote
```

### The AppleScript permission hang

This is what happened on 2026-09-17, and it is the one to check first.

**A timeout can mean a dialog is waiting on the screen right now.**

**It asks every session.** Confirmed 2026-09-19. Granting the permission once
does not make it stick; a fresh session raises the prompt again, and the first
Things call of every run is the one that trips it. So a timeout on the first
call is the expected case, not an outage. Ray answers the dialog and re-runs.
This is why `daily-brief` touches Things before it reads anything else.

**Count the dialogs: four.** Seen 2026-09-26. Three appear when Claude Desktop
starts, and one more when a run makes its first Things call. Miss any of them
and the server can come up `failed`. So after a restart, stay at the screen
until the first Things call has gone through, not just until the app opens.

The server drives Things through **AppleScript**, so macOS Automation
permission governs it. When the grant is missing, macOS puts up a prompt. The
server blocks until someone clicks it, and the handshake times out at about
sixty seconds. Answer it slowly and you get the timeout even though nothing is
broken.

In the Claude log it looks like this:

```
[things] Server started and connected successfully
[things] Message from client: method="initialize" id=0
[things] error Couldn't start ... Error: Request timed out
```

About sixty seconds between the second line and the third, with the process
alive the whole time. A crash looks nothing like this — it exits, with a
traceback.

**The grant is on the Python interpreter, not on Claude.** System Settings,
Privacy & Security, Automation lists `python3.13` (or whichever version runs
the server), with `Things.app` and `System Events.app` under it. Claude does
not appear. So:

- Reinstalling the server against a different Python starts over with no
  grant, and reproduces this exact hang.
- Running the server by hand in Terminal can go through a different
  interpreter than Claude Desktop uses. That is a misleading test.

Which interpreter: `head -1 ~/.local/bin/Things3-MCP-server`.

**After the permission is settled, quit and reopen Claude Desktop.** The app
does not re-spawn a failed server on its own, so until it restarts the session
still sees `failed`.

### The server never starts

A traceback in the log, or an exit. The usual cause is the server's unpinned
dependency; reinstall with `--with "mcp<2"`.

### Notes

The error line may name `context: 'shared-pool'`, which is the path that serves
Cowork and Code sessions.

Claude cannot debug any of this. `device_bash` sees only the connected folders,
so the logs, the config and Things itself are all out of reach. Claude's job is
to say Things is unavailable, skip every write, and put the held tasks in the
report.

Recorded 2026-09-17. Three runs named three causes — the Things app being
closed, Full Disk Access, and the wrong Python version — and all three were
wrong. The real cause was that the Automation prompt was on screen and was not
clicked within sixty seconds. Say Things is unavailable and stop. Do not name a
cause the log has not shown.

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

## The write test

`daily-brief` and `physics-lesson-tasks` prove Things accepts writes before they
depend on it. **Use `update_todo` with `when` set to the task's current start
date.** Nothing changes, and every task in `get_today` has a start date.

Do not use `notes` for this. A task with no notes has nothing to set it back to,
and an empty `notes` value cannot be sent — the call fails before it reaches
Things. Found 2026-09-21.

## Which Mac this session reads

A Cowork session reads Things on whichever Mac it is linked to — usually the home
Mac. Ray often works from the school laptop. A change he makes there reaches the
home Mac only when Things Cloud syncs, so for a while the session reads the old
list.

When Ray says a task is gone, it is gone. Do not argue from a read, and do not
raise it again that run. Found 2026-09-22.

## An appointment is not a task

A meeting on Ray's calendar is already handled. He accepted it, it has a time,
and it will happen. It does not need a task, and inventing prep for it is how a
list fills with work nobody asked for.

An appointment earns a task only when it displaces something dated, and then
the task is the displaced work's new date, not the meeting.

Visitors are the easy case to get wrong. Someone coming to see a class or a
club during its normal meeting costs no extra time and usually needs nothing
done. Do not write "have something ready" against it. If Ray wants to prepare,
he knows.

Recorded 2026-09-19. A daily-brief run turned a MathWorks visit to RoboNatick
into a prep task, having first called it a conflict on the grounds that it
overlapped the club it was visiting.

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

Changed 2026-09-17: recorded the AppleScript permission hang and how to tell
it from a server that never starts.

Moved here from Google Drive `FACTS/` on 2026-09-16. Things 3 runs on both of
Ray's Macs, so these rules have to travel with him. Drive does not. See
`teaching-schedule.md`, "Why this file is here and not in Drive".
