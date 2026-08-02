# PV Tools

Internal PV field and review tools, collected in one repo so they can be served from a
single GitHub Pages site and eventually share code.

Each tool is a self-contained static page — no build step, no dependencies, no network
calls. Open any `index.html` directly, or use the hosted page.

| Tool | Path | What it does | Name |
|---|---|---|---|
| **PW3 String Analyzer** | [`pw3-string-analyzer/`](pw3-string-analyzer/) | Tesla Powerwall 3 MPPT string diagnostic — flags overcurrent, overvoltage, missing or faulty jumpers, dead strings, imbalance | Literal — analyzes PW3 strings |
| **Lynx** | [`lynx/`](lynx/) | PV CT data reviewer | A lynx catches the faint movement a slower eye misses |
| **Magpie** | [`magpie/`](magpie/) | Note builder | A magpie gathers scattered pieces into one nest |
| **Job Photo Packet** | `job-photo-packet/` (local only, gitignored) | Builds a formatted photo packet from job-site photos | Literal — builds the photo packet |

Per-tool documentation lives in each directory. `pw3-string-analyzer/` has a full
[README](pw3-string-analyzer/README.md) and [SPECS](pw3-string-analyzer/SPECS.md) with
Tesla source URLs.

---

## Consolidation status

This repo is the home for all three tools.

| Tool | Standalone repo | Status |
|---|---|---|
| PW3 String Analyzer | none — never created | **hub is the only home** |
| Lynx | `gonzobonzob-bit/pv-ct-review` | still live — copy here will drift |
| Magpie | `gonzobonzob-bit/magpie-notes` | still live — copy here will drift |

PW3 String Analyzer exists only here, so it has no drift risk.

Lynx and Magpie are **copies**, and their originals are still live with their own Pages
sites. **A fix applied in an original repo does not reach the copy here, and vice versa.**
This matters most for Lynx: per `lynx/CLAUDE.md` its normal workflow is to iterate in the
Claude.ai web app, download `index.html`, and drop the new file in — a flow that lands in
whichever checkout is open at the time, which is exactly how the two copies diverge
silently.

Pick one side as authoritative per tool and retire the other before doing real work on
them. Once this repo's Pages site is confirmed working, the originals can be archived on
GitHub (Settings → Archive), which keeps their URLs alive read-only.

One deliberate difference from the originals: the Lynx and Magpie copies here carry the
full four-tag crawler block (`robots`, `googlebot`, `bingbot`, `referrer`) matching pw3.
The originals ship a weaker single `robots` tag. Nothing else in either tool was touched.

Toward an actual hub, the obvious shared pieces are: CSV parsing, the readings-table UI,
the severity/status model, and the light/dark styling. Nothing is shared yet — each tool
is still fully independent.

---

## Testing

```bash
node pw3-string-analyzer/test.js
```

24-case scenario matrix plus an 8,100-combination fuzz sweep. Lynx and Magpie have no
test harness yet; `lynx/tests/site_review/` holds CSV fixtures but no runner.

CI runs the pw3 suite on every push and PR to `main`
([`.github/workflows/test.yml`](.github/workflows/test.yml)). Add further tools to that
file as they gain tests.

---

## Search indexing

Public repo, Pages on, kept out of search results by `noindex` meta tags in every page —
the hub index and all three tools.

Two limits worth knowing:

1. **This is not access control.** The Pages URL is unlisted, not secret — anyone holding
   it can open the page. Don't put customer names, addresses, or site data into the tools.
2. **`robots.txt` in this repo is inert**, and always was. Crawlers only read robots.txt
   from a host root (`gonzobonzob-bit.github.io/robots.txt`), never from
   `gonzobonzob-bit.github.io/pv-tools/`. The file is kept here only so it takes effect
   automatically if this ever moves to a custom domain.

   **The real fix now exists** in the `gonzobonzob-bit.github.io` user-site repo. That is
   the only repo that can publish at this host's root, so its `robots.txt` is the only one
   crawlers actually read — and it covers every project site on the hostname at once, this
   one included. See that repo's README for the full picture.

3. **The Pages URLs are enumerable, not secret.** The GitHub account is public, so anyone
   can read off every repo name and derive its Pages URL mechanically. `noindex` keeps
   these pages out of search results; it does not stop someone looking at the account from
   finding them. Closing that gap means private repos, which disables Pages on a free plan.

The repository page itself is indexable on github.com — GitHub controls those headers and
there's no opt-out short of going private.

---

## License

All rights reserved — internal tools, not open source. See [LICENSE](LICENSE).
