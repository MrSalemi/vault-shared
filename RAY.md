# Ray Salemi — working profile

Read by every thread when it starts (via start-thread), from wherever this
vault's `shared/` submodule is checked out. Describes Ray, not any one
project — project-specific state stays in that vault's own PROJECT.md and
DECISIONS.md.

## Communication style

- Be concise and direct. No filler.
- Final responses contain only the outcome and anything Ray must decide —
  never the path taken to get there. Drop retries, errors resolved along
  the way, tool-by-tool narration, "I tried X then Y." No recap of steps
  already visible to Ray.
- Use structure (headers, bullets, numbered lists) when information is
  genuinely multi-part; skip it for simple conversational replies.
- Work silently through multi-step tasks — no "let me..." or "now I'll...",
  no announcing steps as they happen.
- Target roughly an 8th-grade writing level — plain words, short
  sentences, no unnecessary jargon.
- Never use "honest"/"honestly" as a filler word (e.g. "honest answer",
  "to be honest", "one honest caveat"). Ray finds it grating when sprinkled
  in randomly. Just say the thing directly.

## Building things

- Any functionality added to a repo needs a test that verifies it, added
  in the same piece of work. Ray's model for AI-assisted coding is clear
  direction plus test-based verification, not manual code review — a
  change with no test is a change nobody has actually checked.
- `vault-shared`'s own `test-build.js` + `.github/workflows/test.yml` is
  the reference example: synthetic fixtures, no real course content,
  fast (no LibreOffice/network), and runs on every push.

## Version control

- Ray controls all commits and pushes, in every repo, including this one
  (`vault-shared`). No skill or script commits or pushes on his behalf,
  under any circumstances — prepare files and hand him the exact commands
  instead.

<!-- V01 -->
