# PV Tools — Shared Design System (v2.1 "Solar Flare", 2026-07)

> v2.1 supersedes the v2 graphite/amber tokens after the user chose the
> **Solar Flare** direction from the mockup round: warm near-black grounds,
> molten amber→orange→coral gradient accents, luminous glow on status and
> primary actions. Slick and loud, still sunlight-legible. Pages shipped on
> v2 tokens (hub, PW3) need a follow-up pass onto these tokens.

Every page in this hub follows this spec. Each tool remains a single self-contained
HTML file (inline CSS/JS, no external requests, works offline from `file://`).
The tokens below are copied into each file's `<style>` block — duplication is
deliberate; self-containment wins.

## Design tokens

```css
:root{
  /* Surfaces — warm near-black, ember undertone; cards warm up as they nest */
  --bg:#131008;
  --surface:#1c1710;        /* cards */
  --surface-2:#241d13;      /* nested / hover surfaces */
  --field:#0f0c07;          /* input wells — darker than cards */
  --line:#382c1a;           /* hairline borders */
  --line-strong:#4d3d24;

  /* Text */
  --ink:#fdf6ec;
  --muted:#b3a58e;
  --faint:#7d735f;

  /* Brand — Solar Flare. The gradient is the identity; --sun is its solid
     stand-in wherever a gradient can't go (borders, text, focus rings). */
  --g:linear-gradient(120deg,#ffc53d 0%,#ff7a18 55%,#ff4d6d 115%);
  --sun:#ffb43a;
  --sun-deep:#ff7a18;
  --sun-bg:#2a1f0e;
  --on-sun:#1a0c02;         /* ink on gradient/amber fills — never white */
  --glow-sun:0 0 18px rgba(255,122,24,.45);

  /* Status — luminous: colored text + 40%-alpha border + tinted bg + soft glow */
  --ok:#5df0b2;      --ok-bg:rgba(93,240,178,.09);   --glow-ok:0 0 12px rgba(93,240,178,.18);
  --warn:#ffd166;    --warn-bg:rgba(255,209,102,.08);--glow-warn:0 0 12px rgba(255,209,102,.15);
  --danger:#ff6b81;  --danger-bg:rgba(255,107,129,.09);--glow-danger:0 0 12px rgba(255,107,129,.2);
  --info:#6fc9ff;    --info-bg:rgba(111,201,255,.08);--glow-info:0 0 12px rgba(111,201,255,.16);

  /* Shape & type */
  --r-card:16px; --r-ctl:12px;
  --sans:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,'Cascadia Mono','SF Mono',Consolas,monospace;
}
```

Signature moves (use all of them, sparingly placed):
- **Glowline**: a 3px `--g` bar with `--glow-sun` shadow directly under the app
  bar — every page's brand stripe.
- **Gradient fills** for the primary action and the verdict/result banner:
  `--g` background, `--on-sun` ink, 800 weight, soft drop glow
  (`0 4px 22px rgba(255,122,24,.4)`). One gradient-filled element visible per
  screen region — the gradient loses pop if it's everywhere.
- **Gradient text** for hub-card arrows/accents: `background:var(--g)` +
  `background-clip:text` + transparent color, with a plain `--sun` fallback.
- **Ember wash**: hero/hub cards may carry one soft radial warm glow
  (`radial-gradient(closest-side,rgba(255,140,40,.22),transparent 70%)`)
  positioned off-corner. Decorative only; never behind body text.
- Headings go heavier than v2: 800 weight, tight letter-spacing (-.01em to -.02em).
- Status chips are pill-shaped (999px), mono, letter-spaced, glowing per the
  status tokens.

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
- Keep `theme-color` meta at `#131008`.
- Glow is garnish, not signal: every state must remain distinguishable with all
  box-shadows removed (glow can wash out entirely in direct sun).

## Invariants (do not regress)

- Single file, zero network requests, works from `file://`.
- Keep the full `robots`/`googlebot`/`bingbot` noindex meta block and
  `referrer: no-referrer` on every page.
- No customer data baked into any pushed file; the "do not enter customer
  data" notice stays on the hub. `job-photo-packet/` is gitignored — part of
  the hub on disk, never pushed.
- All existing JS behavior, storage keys, and URL/query handling unchanged
  unless the change is a deliberate, named UX improvement.
