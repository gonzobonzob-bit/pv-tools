# PV Tools

Internal PV field and review tools, collected in one repo so they can be served from a
single GitHub Pages site and eventually share code.

Each tool is a self-contained static page — no build step, no dependencies, no network
calls. Open any `index.html` directly, or use the hosted page.

| Tool | Path | What it does |
|---|---|---|
| **PW3 String Analyzer** | [`pw3-string-analyzer/`](pw3-string-analyzer/) | Tesla Powerwall 3 MPPT string diagnostic — flags overcurrent, overvoltage, missing or faulty jumpers, dead strings, imbalance |
| **Lynx** | [`lynx/`](lynx/) | PV CT data reviewer |
| **Magpie** | [`magpie/`](magpie/) | Note builder |

Per-tool documentation lives in each directory. `pw3-string-analyzer/` has a full
[README](pw3-string-analyzer/README.md) and [SPECS](pw3-string-analyzer/SPECS.md) with
Tesla source URLs.

---

## Consolidation status

This repo is the intended long-term home for all three tools. Right now Lynx and Magpie
are **copies** — their original standalone repos still exist and still have their own
Pages sites:

| Tool | Original repo | Status |
|---|---|---|
| Lynx | `gonzobonzob-bit/pv-ct-review` | still live — copy here will drift |
| Magpie | `gonzobonzob-bit/magpie-notes` | still live — copy here will drift |

**A fix applied in an original repo does not reach the copy here, and vice versa.** Pick
one side as authoritative per tool and retire the other before doing real work on them.
The originals can be archived on GitHub (Settings → Archive) once this repo's Pages site
is confirmed working, which keeps their URLs alive read-only.

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
2. **`robots.txt` is inert on a project Pages site.** Crawlers only read robots.txt from a
   domain root (`gonzobonzob-bit.github.io/robots.txt`), never from
   `gonzobonzob-bit.github.io/pv-tools/`. The meta tags do the actual work. Consolidating
   here does make the root-robots.txt fix viable for the first time: a single
   `gonzobonzob-bit.github.io` user-site repo would cover every tool in one shot.

The repository page itself is indexable on github.com — GitHub controls those headers and
there's no opt-out short of going private, which would cost Pages on a free plan.

---

## License

All rights reserved — internal tools, not open source. See [LICENSE](LICENSE).
