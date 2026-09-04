# Project

## Before changing anything visual — read this first

The site has a design system at **[`components/ui/`](components/ui/README.md)**,
with design tokens in **`app/globals.css`**. It is the single place the site's
look is defined, and it is meant to be built on.

**Do not write raw colours or one-off styles in feature components.** Use the
token utilities (`bg-surface`, `text-muted`, `border-border`, `text-accent`) and
the shared primitives (`Button`, `Card`, `Badge`, `Banner`, `Input`, `Page`).
If something you need does not exist, add it to `components/ui/` and export it —
do not style around it locally.

Read `components/ui/README.md` before any styling work.

### Where code lives

```
app/                             routes and API handlers
app/globals.css                  design tokens — colours, radii, shadows
components/ui/                   the design system (shared primitives)
components/layout/               site chrome: AppShell, nav, sign-in
components/features/<feature>/   one folder per feature, built from ui/
lib/                             server logic, integrations, database
```

Features so far: `deadlines/` (manual + synced, streaks), `subjects/`, `pet/`.

New feature? Add `components/features/<your-feature>/` and a route under `app/`.
Keep feature code inside its own folder — that is what stops two people
colliding.

## Collaboration rules

Two people work in this repo, each with their own Claude Code session. **The two
sessions share no state.** Neither knows what the other is editing right now, and
neither will find out until a push collides. Everything below exists to keep one
session from destroying the other's work.

### Never, on any branch you don't solely own

- `git push --force` or `--force-with-lease` — this silently deletes commits that
  are not yours. There is no undo for the other person.
- `git reset --hard`, `git checkout .`, `git clean -fd` to throw away changes you
  did not create.
- Committing directly to `main`. Always branch, always open a PR.
- Resolving a merge conflict by taking one whole side. If the conflicting code
  isn't obviously yours, stop and ask the human — don't guess.

### Standard flow

1. `git pull --rebase origin main` before starting anything
2. `git checkout -b feature/<short-name>`
3. Small commits; push early and often
4. Open a PR; the other person reviews and merges
5. Delete the branch after merge

### Staying out of each other's way

- Split work by directory or module, not by task. Two agents in separate
  directories rarely conflict; two in the same file conflict constantly.
- If you must touch a shared file, keep the change tight and push immediately.
- Long-lived branches are the enemy. Merge within a day or two.
- Never rewrite history that has been pushed.

### If you are a Claude session reading this

Before any destructive git operation — force push, hard reset, history rewrite,
branch deletion — stop and ask the user, even if it seems obviously correct.
Another person's uncommitted or unpushed work may depend on the current state,
and you cannot see it.
