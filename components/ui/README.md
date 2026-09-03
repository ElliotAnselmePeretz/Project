# UI kit — the design system

**Every visual change to this site starts here.** These are the shared building
blocks; features are assembled from them. If you find yourself writing raw
colours or one-off Tailwind classes in a feature component, stop — either use a
primitive, or add one here so the next person gets it too.

## Where things live

```
app/globals.css                  ← DESIGN TOKENS: colours, radii, shadows
components/ui/                   ← the design system (this folder)
components/layout/               ← site chrome: AppShell, nav, sign-in
components/features/<feature>/   ← one folder per feature, built from ui/
```

## The two rules

1. **Never hard-code a colour.** No `text-blue-600`, no `#c2622d`, no
   `bg-[var(--surface)]`. Use the token utilities: `bg-surface`, `text-muted`,
   `border-border`, `text-accent`. They adapt to dark mode for free; hard-coded
   colours do not.
2. **Import from the barrel**, not from individual files:
   ```tsx
   import { Button, Card, Badge } from "@/components/ui";
   ```

## Tokens

Defined once in [`app/globals.css`](../../app/globals.css) and exposed as Tailwind
utilities. Change a value there and the whole site follows.

| Purpose | Utilities |
| --- | --- |
| Surfaces | `bg-bg` `bg-surface` `bg-surface-alt` |
| Text | `text-fg` `text-muted` `text-faint` |
| Lines | `border-border` `border-border-strong` |
| Brand | `bg-accent` `text-accent` `bg-accent-soft` `text-accent-fg` |
| Status | `success` `warning` `danger` `info` — each with a `-soft` background |
| Shape | `rounded-sm` `rounded-md` `rounded-lg` `rounded-xl` |
| Depth | `shadow-soft` `shadow-soft-lg` |

### Theming

Three states, handled entirely by tokens:

- **Light** — cool neutrals, light blue accent (`--accent: #0f76b4`)
- **Dark** — warm neutrals, orange accent (`--accent: #f0873d`)
- **System** — follows `prefers-color-scheme` (the default)

A user's explicit choice sets `data-theme` on `<html>` and is stored in
`localStorage`; "System" removes the attribute. An inline script in
`app/layout.tsx` applies the stored theme before first paint, so there is no
flash of the wrong theme — do not remove it.

Because the accent flips hue between themes, **never assume the brand is blue**.
Use `text-accent` / `bg-accent` and it is correct in both.

## Components

| Component | Use it for |
| --- | --- |
| `Button` | Any action. `variant`: `primary` \| `secondary` \| `ghost` \| `danger`. `size`: `sm` \| `md` |
| `Card` / `CardBody` / `CardHeader` | Grouping related content in a bordered panel |
| `Badge` | Short status labels. `tone`: neutral \| accent \| success \| warning \| danger \| info |
| `Banner` | A full-width message: errors, warnings, notices |
| `Input` / `Select` / `Field` | Form controls. `Field` adds the label and hint |
| `Page` | Page wrapper — consistent max width and padding |
| `PageHeader` | Page title, optional subtitle, back link and action |
| `SectionTitle` | A heading within a page, with an optional action on the right |
| `EmptyState` | "Nothing here yet" placeholders |

## Motion

Use these rather than writing keyframes in a component:

| Class | Effect |
| --- | --- |
| `animate-fade-up` | Fade in while rising slightly — page and section entrances |
| `animate-fade-in` | Plain fade — overlays and backdrops |
| `animate-slide-in` | Slide in from the left — the mobile drawer |
| `stagger` | On a parent: children enter one after another |

Hover and press states are built into the primitives (cards lift, buttons press
in), so you rarely need to add them yourself.

**Every animation is switched off by `prefers-reduced-motion`**, handled globally
in `globals.css`. Do not write inline keyframes that bypass it — drifting
backgrounds and moving content can be genuinely unpleasant for people with
vestibular disorders.

## Ambient glow

`AppShell` renders a `.glow-field` — two slow-drifting blurred blobs behind
everything, built from `--accent` and `--info`. It is decorative and
`aria-hidden`. Adjust the intensity via the `.glow-field::before/::after`
opacity rules in `globals.css`.

## Adding a component

1. One file per component in this folder
2. Accept `className` and spread the remaining props, so callers can adjust
3. Tokens only — no literal colours
4. Export it from `index.ts`
5. Add a row to the table above

## Changing how the site looks

Retheming is a token edit, not a component rewrite. To change the brand colour,
edit `--accent` (and its dark counterpart) in `app/globals.css` — every button,
badge and focus ring updates at once.
