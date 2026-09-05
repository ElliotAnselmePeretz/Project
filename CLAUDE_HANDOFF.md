# Claude handoff: Daily Study Planner

Continue work on `feature/daily-study-planner`. Do not commit to `main`, rewrite
history, force-push, or discard work. Read `CLAUDE.md`,
`components/ui/README.md`, and `docs/daily-study-planner.md` before editing.

## Goal

Build the first working version of Studybase's daily study planner. It should
turn existing deadlines and subject goals into an editable plan that fits the
student's available time and gives each block a suitable study method.

The user approved the visual direction: the planner belongs in the existing
sidebar and should match Studybase's current cards, spacing, motion, and theme
tokens. The agreed interaction begins with a short check-in and then shows the
generated plan.

## Product behaviour already agreed

The check-in asks:

1. Available time, including breaks.
2. Current focus: low, okay, or good.
3. For each relevant task, difficulty: comfortable, challenging but doable, or
   stuck.
4. Estimated work remaining in minutes.

Reuse saved answers so returning users only confirm changes. Titles, subjects,
and due dates should come from existing app data.

Rank tasks in this order:

1. Confirm uncertain imported dates before relying on them.
2. Overdue and due-today work, ordered by exact deadline.
3. Work due in the next three days.
4. Later work and undated goals.
5. Within a comparable urgency group, use difficulty and focus as tie-breakers.
   With good focus, challenging but doable work can move earlier. A stuck task
   gets a short unblocking action rather than winning because it is hardest.

Never silently make an impossible plan. Study blocks, breaks, and spare time
must fit within the user's stated time. Show unscheduled work and warn when
urgent work does not fit. Completing a study block means progress; it must not
complete, dismiss, or claim submission of the source assignment.

Attach a concrete method to each block:

- Practice or test preparation: attempt without notes, check, correct, retry.
- Stuck or new material: identify the blocker, inspect one explanation or
  worked example, explain the reasoning, then attempt a small step.
- Writing or production: define one concrete output and complete that milestone.
- Submission work: finish, check requirements, submit through the school's
  actual system, then verify it arrived.

Flashcards will be a separate feature. The planner may later link to due
flashcard reviews but should not build flashcards now.

## Evidence boundary

`docs/daily-study-planner.md` contains the research and full rules. Retrieval
practice and distributed practice have strong support. Interleaving is useful
in suitable contexts, especially related problem types; it does not mean rapid
switching between unrelated subjects. There is no evidence for a universal
“hardest task first” rule or a universal Pomodoro interval. Present ranking and
block lengths as editable planner choices, not scientific optimisation.

## Repository state

- Branch: `feature/daily-study-planner`
- Latest planner commit at handoff creation: `c85be0c`
- `main` currently has imported deadlines, Outlook suggestions, subject
  selection, grades, targets, subject goals, and notes.
- The `pet` branch has manual deadlines, completion state, statistics, and pet
  rewards. Do not merge or copy its task model blindly. Coordinate semantics so
  completing a study block remains different from completing an assignment.
- `feature/ia-cas-activities` has starter IA, CAS, EE, TOK, and extracurricular
  pages. These can become future planner sources, but they are outside the first
  implementation.

The current database identifies subject goals by user, group number, and goal
ID. Deadlines have user ID, source, source key, due date, confidence, and
dismissed state. Planner metadata should reference its source by type and ID,
remain scoped to the user, and avoid mutating imported source dates.

## Suggested first implementation slice

1. Add pure, tested planner types and allocation logic under
   `lib/daily-study-planner.ts`. Keep ranking deterministic and explain why each
   block was placed.
2. Add planner tables to `lib/db/schema.ts` and the matching idempotent schema
   creation in `lib/db/index.ts`. Store check-in state, source references,
   difficulty, remaining estimate, plan order, block duration, and outcome.
3. Add `/api/planner` endpoints that are user-scoped and combine upcoming
   deadlines with open subject goals. Avoid guessing a subject or study method
   from a title without marking it as a suggestion the user can change.
4. Add `/planner` and components under
   `components/features/daily-study-planner/`. Use only shared UI primitives and
   design tokens. Add `Daily planner` to the sidebar with a tight shared-file
   edit.
5. Support generating, editing, reopening, and replanning today's plan.
   Replanning must preserve completed blocks and manual edits.
6. After a block, record finished, made progress, or still stuck, plus optional
   actual minutes. Do not connect rewards or source-task completion yet.

Test at least:

- Due-today work remains first even when easier.
- Good focus can prioritize challenging but doable work inside the same urgency
  group; low focus shortens blocks.
- Stuck tasks become short unblocking blocks and retain their remaining work.
- Work plus breaks never exceeds the available-time budget.
- Urgent overflow is shown rather than hidden.
- Ordering is stable, records are user-scoped, and date grouping handles the
  user's timezone, midnight, and DST.
- Replanning preserves completed work and user edits.

Run `npm test` and `npm run build`. Review the result at desktop and mobile
widths in both light and dark themes. Commit small changes and push only to
`feature/daily-study-planner`.

## Definition of done for this slice

A signed-in or local-mode student can open Daily planner, complete the check-in,
see real upcoming deadlines and goals in an explainable plan, change the plan,
record study-block outcomes, leave and reopen today's saved plan, and clearly
see urgent work that did not fit. Tests and the production build pass.
