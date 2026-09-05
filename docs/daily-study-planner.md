# Daily study planner: research and proposed behaviour

Status: design proposal, 5 September 2026. Branch: `feature/daily-study-planner`.
The accompanying conversation prototype uses example data. This document does
not claim that the planner or its database integration is implemented.

## Purpose

Turn upcoming deadlines and subject goals into a realistic plan with a concrete
study method for each block. Flashcards remain a separate feature; the planner
can later link to due reviews without building another flashcard system.

## Evidence and limits

| Finding | Product decision | Evidence / limit |
| --- | --- | --- |
| Retrieval practice and distributed practice have broad support. | For revision, prompt closed-book questions, recall, or explanation followed by checking and correction. Offer a later return to the material. | [Dunlosky et al., 2013](https://pubmed.ncbi.nlm.nih.gov/26173288/); [Agarwal et al., 2021](https://link.springer.com/article/10.1007/s10648-021-09595-9). These support methods, not a precise scheduling formula. |
| Interleaving depends on the material; mathematical practice shows benefits, while effects for texts and words differ. | Mix related problem types within an appropriate practice block once the student can attempt them. | [Brunmair & Richter, 2019](https://pubmed.ncbi.nlm.nih.gov/31556629/). Do not equate interleaving with frequently switching between unrelated subjects. |
| The hardest material is not always the most productive use of limited study time. | Distinguish challenging-but-doable work from being stuck. For stuck tasks, plan a prerequisite, worked example, or a precise question for help. | [Metcalfe & Kornell, 2003](https://pubmed.ncbi.nlm.nih.gov/14640846/). Item-learning experiments support adapting to readiness; they do not establish an optimal order for an entire IB afternoon. |
| Self-explanation is promising in suitable contexts. | While studying a worked example, explain why each step works; then attempt a similar question independently. | [Dunlosky et al., 2013](https://pubmed.ncbi.nlm.nih.gov/26173288/). Context-dependent evidence; use as support, not a guaranteed learning boost. |
| Short breaks reduce fatigue; overall performance benefits are uncertain. | Include editable breaks within the available time. | [Albulescu et al., 2022](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0272460). No universally optimal 25/5 or 50/10 interval follows from this evidence. |
| Specific if-then plans can improve follow-through. | Optionally save a cue and first action: “After dinner, I will attempt the first two equilibrium questions at my desk.” | [Gollwitzer & Sheeran, 2006](https://doi.org/10.1016/S0065-2601(06)38002-1), [author publication record](https://www.socmot.uni-konstanz.de/publications/implementation-intentions-and-goal-achievement-meta-analysis-effects-and-processes). General goal-attainment evidence, not validation of this app. |

No reviewed source establishes “always do the hardest task first.” Matching a
challenging task to self-reported focus is an editable product heuristic. The
rank order, urgency windows, block lengths, and survey timing must be evaluated
with students rather than described as scientifically optimal.

## Daily check-in

Aim for about a minute when saved task estimates already exist; this is a UX
target to measure, not a promise. More tasks or first-time setup take longer.

1. Ask how much time is available **including breaks**, and current focus:
   low / okay / focused. Ask again when generating a new session, while allowing
   an existing saved plan to reopen without a forced survey.
2. Prefill confirmed overdue work, work due today, and upcoming work. For each,
   confirm difficulty (comfortable / challenging / stuck) and estimated minutes
   of work remaining. Reuse previous answers and ask only for changes.
3. Keep editable task purpose (learn / practise / write or produce / submit)
   and a concrete next action under task details. The source title alone cannot
   reliably determine either. Treat suggested classifications as unconfirmed.
4. Build a draft plan. Show the method, reason for priority, and any work that
   does not fit. Let students change the order, duration, method, or selection.

The app supplies source dates, names and previous progress; students should not
retype those daily. Show all urgent tasks even if this exceeds a small initial
survey page. Do not silently omit them to meet the one-minute target.

## Ranking and allocation

Use an explainable sequence rather than an opaque “science score”:

1. Confirm uncertain imported dates. Surface source links and pending date
   checks. A guessed Outlook date must not become an authoritative deadline.
2. Separate overdue work requiring triage, work due today, next-three-day work,
   later upcoming work, and undated goals/reviews. Use the student's timezone
   and exact known submission times. An earlier hard cutoff wins within today.
3. Respect prerequisites. A blocked assignment needs an unblocking action;
   spending ten minutes diagnosing it does not complete the assignment.
4. Protect near deadlines. Within a comparable upcoming urgency window, use
   explicit importance and remaining effort to select meaningful progress on
   large projects. Escalate a later project's priority when its remaining work
   exceeds **known** future available time; do not invent that availability.
5. Among otherwise comparable tasks, a focused student can put a challenging,
   doable task earlier. Low focus should shorten blocks and clarify the first
   step; it should not automatically bury urgent difficult work under easy tasks.
   An optional brief warm-up is a preference, not an evidence-backed guarantee.
6. Fit work, breaks and spare time inside the session. Distinguish total effort
   remaining from today's block. Never label a partial block as task completion.
7. List unscheduled work with its deadline and remaining effort. If urgent work
   cannot fit, explicitly show the shortfall and allow replanning. Never claim
   the plan is feasible merely because blocks were truncated to fit.

For the prototype only: today first, then days 1–3, then later. Today is sorted
by due time. Upcoming tasks within a bucket use difficulty when focus is high,
then due date. Low/okay focus uses due date. Comfortable/challenging/stuck map to
0/1/0 for that tie-break, so “stuck” does not win simply by being harder. Regular
blocks are capped at 40 minutes (25 with low focus), with 5-minute breaks. Stuck
tasks receive at most 10 minutes of unblocking. These are illustrative defaults.

## Methods shown on task cards

- **Practise:** attempt without notes, check the solution, correct the error,
  and retry. For known maths/science material, mix related problem types.
- **Learn / stuck:** inspect one explanation or worked example, explain its
  reasoning, attempt one similar question. Record a specific blocker if needed.
- **Write / produce:** work toward one concrete output, such as an outline or
  a paragraph supported by evidence. This is task decomposition, not a claim
  that retrieval practice alone writes an IA or EE.
- **Submit:** use the task requirements to check and submit the deliverable.
  A planner button must not claim submission happened in ManageBac.

After a block, offer “finished / made progress / still stuck,” optional actual
minutes, and one quick performance check for learning tasks. Use successful
independent attempts to inform later suggestions; confidence alone is not
proof of mastery. Offer a later review before the assessment; exact spacing
depends on the target date and performance, not a universal 1/3/7-day rule.

## Fit with this repository

- Add `/planner` and `components/features/daily-study-planner/` using the current
  `AppShell`, UI primitives and theme tokens.
- Existing deadlines and goals lack difficulty, estimates and learning state.
  Store planner metadata separately with a source type and source ID; preserve
  imported source dates. Scope all records to the signed-in user.
- Coordinate completion semantics with the `pet` branch. Completing a study
  block is different from completing an assignment, dismissing a deadline, or
  submitting externally. Do not create an incompatible parallel task schema.
- Future IA/EE/TOK milestones should connect to the same planner adapter.
- Persist the plan date, timezone, check-in, source references, block order,
  estimates and outcomes. Replanning preserves completed work and user edits.
- Add automated checks for midnight/DST, uncertain dates, expired deadlines,
  insufficient time, long/stuck tasks, stable ordering, ownership boundaries,
  and study-block versus source-task completion when the feature is implemented.

## Example

A comfortable maths assignment due today still comes before a hard chemistry
test due in two days. Chemistry receives a practice-and-correction block; an EE
draft due in three days receives a concrete writing block. If chemistry is
marked stuck, its block becomes a short unblocking step with unfinished work
still visible. Reducing available time shows what no longer fits.
