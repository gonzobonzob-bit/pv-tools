# Idea: "Solar Flare" color scheme (shelved 2026-07-31)

Explored as a high-energy "pop" direction for the hub, fully applied to Lynx,
then shelved — the glow/luminous status colors read as neon on first look.
Kept here as an idea to revisit.

## Where the work lives

- **Full working implementation:** commit `671290c` restyled Lynx v1.14 onto
  this scheme (reverted by `9a3be47`). Recover any of it with
  `git show 671290c:lynx/index.html` or `git show 671290c:DESIGN.md`.
- **Visual mockup** (three directions; this was "A"):
  https://claude.ai/code/artifact/0c35d5f5-9593-46f6-8e48-d17ca7e8cd98

## The scheme

```css
:root{
  /* Surfaces — warm near-black, ember undertone */
  --bg:#131008; --surface:#1c1710; --surface-2:#241d13;
  --field:#0f0c07; --line:#382c1a; --line-strong:#4d3d24;

  /* Text */
  --ink:#fdf6ec; --muted:#b3a58e; --faint:#7d735f;

  /* Brand — the gradient is the identity */
  --g:linear-gradient(120deg,#ffc53d 0%,#ff7a18 55%,#ff4d6d 115%);
  --sun:#ffb43a; --sun-deep:#ff7a18; --sun-bg:#2a1f0e;
  --on-sun:#1a0c02;
  --glow-sun:0 0 18px rgba(255,122,24,.45);

  /* Status — luminous (this is what read as "neon") */
  --ok:#5df0b2;   --warn:#ffd166;   --danger:#ff6b81;   --info:#6fc9ff;
}
```

Signature moves: 3px gradient "glowline" under the app bar; one gradient-filled
hero per screen region (`--g` fill, `--on-sun` ink, soft orange drop glow);
gradient-clipped text accents; off-corner radial "ember wash" on hero cards;
800-weight tight headings; pill status chips in mono with per-status glow.

## If revisited, likely fixes for the neon reaction

- Halve or drop all glow box-shadows (spec already required states to work
  without them).
- Warm/mute the status+chart palette toward the amber family — the mint
  (#5df0b2) and sky (#6fc9ff) tones were the most "neon" offenders.
- Keep the gradient hero + glowline; they were the core of the look.
