# Usage rules — keep the work small and the checking proportional

Status: v1, 2026-11-10. These rules exist to avoid wasted work. They never override a hard rule in `CLAUDE.md` or a security rule in the technical rulebook.

## 1. Start of a session

- Read, in this order: `CLAUDE.md`, `docs/progress-tracker.md`, the step file you were given. That is enough to begin.
- Read rulebook sections only when the work needs them (doc map in `CLAUDE.md`). Read all rulebooks in full only in the very first session of Step 0, or if the owner asks.
- Trust the tracker. Do not re-explore the repository, list the whole tree, or re-audit finished work to "get oriented". The tracker's file map and "Next action" are the orientation.

## 2. Scope of work

- Do only the unchecked items of the current step. Do not redo, polish or refactor items already ticked.
- Do not start the next step, even if time remains.
- No unrequested extras: no extra pages, features, libraries, reformatting, renaming, or "while I'm here" fixes. If you spot a real problem outside scope, add one line to "Known issues" in the tracker and carry on.

## 3. Checking and regression: only what the change needs

- **No full regression runs.** Never re-run every earlier step's verification after a change.
- Use this table. Run only the row(s) matching what you changed.

| You changed | Run | Do not run |
|---|---|---|
| `cart.js`, `pickup.js`, `whatsapp.js`, price helpers | `npm test` | browser flows for unrelated pages |
| One page's HTML or CSS | Open that page at 360 px and at desktop width; check the changed part only | Lighthouse (unless the change affects images, scripts or layout shift) |
| `build.mjs` | `npm run build` and the validations it prints | live deploy unless the step says to |
| Migrations or row-level security | The backend test script in `backend/README.md` | unrelated frontend checks |
| `place-order` function | One real order (all fields empty) and one with all fields filled | the admin flows |
| One admin page | That page, plus the one database policy it relies on | other admin pages |
| Docs only | Nothing | any tests |

- The step file's own "Verify" list is the full scope for that step. Do each item once. If an item fails, fix it and re-check **only that item**.
- Whole-flow smoke test (one real order from shop to WhatsApp): only at the end of Steps 3, 4 and 5, once each.
- Lighthouse and the Rich Results Test: Step 1, Step 5, and after a change that affects images, scripts or layout shift.
- Lint or format only the files you changed. Never reformat the repository.

## 4. Reading and editing files

- Use targeted `Grep` and `Glob`, and read parts of large files with `offset` and `limit`.
- Do not re-read a file you just wrote or edited. Do not open files unrelated to the task.
- Use small edits for small changes. Do not rewrite a whole file to change a few lines.
- Do not paste file contents or long logs into the conversation or the report.

## 5. Tools and helpers

- Batch independent tool calls together.
- Do not spawn subagents unless the owner asks.
- Do not install new dependencies. The only allowed one is `sharp`.
- Generate or convert images only when the step asks for it, and only once per image.

## 6. Loops and blockers

- If something fails twice with the same approach, stop and report. Do not retry in a loop or try workarounds.
- If a step needs an owner action (accounts, keys, settings, decisions), say so in the first message of the step, list exactly what you need, and do all the work that does not depend on it.
- If a rule or decision looks wrong, stop and ask. Do not work around it.

## 7. Recording what is done (mandatory)

At the end of every phase, as the last action before reporting, update `docs/progress-tracker.md`:

1. Tick the items you completed. Add the commit hash and a one-line evidence note for each.
2. Update "Current step" and write one precise line under "Next action".
3. Update the file map: add new files, change the purpose of changed ones, remove deleted ones. One line each.
4. Append one line to the verification log: what you ran and what you saw.
5. Update "Known issues", "TODO placeholders" and "Owner actions".
6. Commit the tracker with the code in the same commit.

Edit only the lines that changed. Keep the tracker under about 200 lines; compress old verification lines instead of deleting history.

## 8. Reports

- Follow the format in `CLAUDE.md`. Keep it under about 40 lines.
- No recap of earlier steps, no restating of the instructions, no descriptions of tools you used.
- Evidence means what you saw: a URL, a count, a number, a one-line result.

## 9. Long sessions

If the conversation is getting long, stop at a clean point: update the tracker (including "Next action"), commit, and tell the owner that a fresh session can continue from the tracker. Never rely on remembering earlier turns.
