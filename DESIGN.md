# PV Tools — Shared Design System (v2, 2026-07)

Every page in this hub follows this spec. Each tool remains a single self-contained
HTML file (inline CSS/JS, no external requests, works offline from `file://`).
The tokens below are copied into each file's `<style>` block — duplication is
deliberate; self-containment wins.

## Design tokens

```css
:root{
  /* Surfaces — deep graphite, slightly blue-cool so the amber accent pops */
  --bg:#0f1115;
  --surface:#171a20;        /* cards */
  --surface-2:#1e222a;      /* nested / hover surfaces */
  --line:#2b303a;           /* hairline borders */
  --line-strong:#3a4150;

  /* Text */
  --ink:#f2f4f7;
  --muted:#98a1ad;
  --faint:#6b7280;

  /* Brand — solar amber. --sun for accents/interactive, --sun-deep for fills */
  --sun:#ffb43a;
  --sun-deep:#f5821f;
  --sun-bg:#2a1f0e;         /* tinted background for highlighted blocks */

  /* Status */
  --ok:#3ecf8e;      --ok-bg:#0e2a1e;
  --warn:#ffd166;    --warn-bg:#2a2410;
  --danger:#ff5d5d;  --danger-bg:#2c1414;
  --info:#4fc3f7;    --info-bg:#0e2230;

  /* Shape & type */
  --r-card:12px; --r-ctl:8px;
  --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,'Cascadia Mono','SF Mono',Consolas,monospace;
}
```

Spacing on a 4px scale (4/8/12/16/24/32). Page gutter 16px mobile, 24px desktop.

## Page anatomy

1. **App bar** — sticky, `--bg` with a 1px `--line` bottom border and slight
   translucency (`backdrop-filter:blur(8px)` with solid fallback). Contains:
   `← PV Tools` back link to the hub (`../`), tool name, version tag in `--faint`
   mono. On the hub page itself: wordmark `PV Tools` with an amber `.` dot.
2. **Content column** — `max-width` per tool (640px forms, wider for data
   tables/charts), centered, cards on `--surface` with `--r-card` and 1px
   `--line` border. Card section headings: 12px uppercase, letter-spacing .06em,
   `--muted`.
3. **Primary action** — on mobile, the main button must be reachable without
   scrolling back up: sticky bottom bar (`--bg`, top hairline, safe-area padding)
   or repeated at the natural end of the flow.

## Controls

- Inputs/selects: `--surface-2` fill, 1px `--line-strong` border, `--r-ctl`,
  **16px font-size minimum** (prevents iOS focus zoom), padding for a ≥44px hit
  target. Focus: 2px `--sun` outline, offset -1px.
- Buttons: primary = `--sun-deep` fill, white text, 600 weight, ≥44px tall.
  Secondary = transparent fill, 1px `--line-strong` border, `--ink` text.
  Disabled = `--surface-2` fill, `--faint` text, no cursor tricks.
- Numeric readouts: `--mono` with `font-variant-numeric:tabular-nums`.
- Status chips/blocks: paired token sets above (`--ok`/`--ok-bg` etc.), 1px
  border in the status color at ~40% alpha.

## Mobile & field ergonomics (the tools are used one-handed, outdoors)

- Touch targets ≥44×44px, ≥8px apart. No hover-only affordances.
- No horizontal page scroll ever; wide tables/charts scroll inside their own
  `overflow-x:auto` container.
- `viewport-fit=cover` + `env(safe-area-inset-*)` padding on sticky bars.
- Contrast: body text ≥7:1 against its surface, `--muted` ≥4.5:1 — screens get
  read in direct sunlight.
- `prefers-reduced-motion: reduce` disables transitions/animations.
- Keep `theme-color` meta at `#0f1115`.

## Invariants (do not regress)

- Single file, zero network requests, works from `file://`.
- Keep the full `robots`/`googlebot`/`bingbot` noindex meta block and
  `referrer: no-referrer` on every page.
- No customer data baked into any pushed file; the "do not enter customer
  data" notice stays on the hub. `job-photo-packet/` is gitignored — part of
  the hub on disk, never pushed.
- All existing JS behavior, storage keys, and URL/query handling unchanged
  unless the change is a deliberate, named UX improvement.
