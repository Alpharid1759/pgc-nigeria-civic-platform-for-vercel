# Porting status: WordPress (PHP + MySQL) to Next.js

## Direction change: from civic institution to political party

The WordPress original described PGC Nigeria as a non-partisan civic institution. This Next.js version repositions it as a
**proposed political party** founded on **Governance by Objective**: every candidate is bound by a signed, public
Governance Mandate of predetermined development projects. What changed:

| Area | Change |
|---|---|
| Constitution (`src/content/constitution.html`) | v0.2: party status and INEC registration path, new Articles 18 to 21 (Governance by Objective, candidate selection, the Mandate, delivery and sanctions), non-partisan article replaced, discipline and assessment articles renumbered |
| Rules (`src/content/party-rules.html`, `/party/rules`) | New: Mandate Rules, Candidate Code, screening, sanctions procedure |
| `/party` | New: ideology, how it works, what a Mandate does not do, legal status |
| `db/migrations/002_candidates_mandates.sql` | New tables `candidates`, `mandate_items` |
| `src/lib/mandates.ts` | Rules engine: predetermined-project test, jurisdiction scope, lock on signing, screening, delivery read from the Development Register (only `verified` counts) |
| `/candidates`, `/candidates/[id]`, `/candidates/apply`, `/api/candidates` | Public candidate register, Mandate view, aspirant registration with Mandate |
| `npm run candidates` | Screening and Mandate Committee commands |
| Copy | Home, footer, nav, membership declaration, scorecard pages |

Rules deliberately built in: the Party cannot remove anyone from office; no undated resignation letters; sanctions need a fair
hearing; documented obstacles beyond the office holder's control are not sanctioned. Figures in square brackets in the
documents (6 months membership, 3 projects, 30 days, 50%) are proposals; the first two are constants in `src/lib/constants.ts`.

These are drafts. Have a Nigerian lawyer review them and check INEC's current registration requirements before applying.

This repository is a Next.js 15 (App Router, TypeScript) port of the PGC Nigeria WordPress platform
(`pgc-core` plugin + `pgc-theme`). The original WordPress project is unchanged.

## Ported

| WordPress source | Next.js |
|---|---|
| `pgc-theme/style.css` | `src/app/globals.css` (same tokens and rules) |
| `header.php`, `footer.php`, `assets/js/main.js` | `src/components/Header.tsx`, `Footer.tsx`, `RevealObserver.tsx`, `FilterList.tsx` |
| `front-page.php` | `src/app/page.tsx` |
| `assets/img/logo*.svg` | `public/brand/`, `src/app/icon.svg` |
| `data/nigeria-directory.json` | `src/data/nigeria-directory.json`, loaded by `src/lib/directory.ts` |
| `single-pgc_jurisdiction.php`, `archive` | `src/app/states/**` (states, FCT, LGAs, Area Councils) |
| `class-pgc-scoring.php` | `src/lib/scoring.ts` (with tests in `tests/scoring.test.ts`) |
| `/methodology/` | `src/app/methodology/page.tsx` |
| `data/constitution-draft.html` | `src/content/constitution.html`, `src/app/constitution/page.tsx` |
| REST `GET /pgc/v1/stats`, `/jurisdictions`, `/jurisdictions/<id>/children` | `/api/stats`, `/api/jurisdictions`, `/api/jurisdictions/<slug>/children` |
| SEO: noindex on empty jurisdiction pages, sitemap | `generateMetadata` robots, `src/app/sitemap.ts`, `src/app/robots.ts` |

Figures that need records (members, projects, scorecards) show **Unavailable** rather than zero, as in the
WordPress theme when a figure cannot be read.

## Ported with Postgres (`DATABASE_URL`)

| Module | WordPress source | Next.js |
|---|---|---|
| Membership application (honeypot, time-trap, rate limit, consents, application/membership numbers) | `class-pgc-membership.php` | `src/app/membership/**`, `src/lib/membership.ts` |
| Development register | `class-pgc-projects.php` | `src/app/projects/**`, `src/lib/projects.ts`, `/api/projects` |
| Scorecards (weights, "Not Yet Rated" under 60% evidence, trend) | `class-pgc-scorecards.php` | `src/app/scorecards/**`, `src/lib/scorecards.ts`, `/api/scorecards` |
| National dashboard | `class-pgc-analytics.php` | `src/app/dashboard/page.tsx`, `src/lib/stats.ts` |
| Schema | MySQL custom tables | `db/migrations/001_init.sql`, `002_candidates_mandates.sql` |

Demo rows (`is_demo`) are never counted or listed unless `PGC_SHOW_DEMO=1`. Jurisdictions stay in the bundled
JSON; database rows reference them by slug. Approve or reject applications with `npm run review`.

## Not yet ported

| Module | WordPress source |
|---|---|
| Sign-in, roles, admin screens, member dashboard | `class-pgc-roles.php` |
| Email notifications (no mail provider is wired up) | `class-pgc-notify.php` |
| Funding ledger and project verification workflow | `class-pgc-projects.php` |
| Officials management and right-of-reply workflow | `class-pgc-officials.php` |
| Citizen reports | `class-pgc-citizen-reports.php` |
| Chapters, elections, finance, ethics | `class-pgc-chapters.php`, `class-pgc-elections.php`, `class-pgc-finance.php`, `class-pgc-ethics.php` |
| Petitions, consultations, meetings | `class-pgc-participation.php` |
| CSV exports | `class-pgc-analytics.php` |
| Launch plan, pilots, partnerships | `class-pgc-launch.php` |

Until sign-in exists, records are added to the database directly (SQL or scripts).

## Not carried over

- WordPress admin screens, WP-Cron, WP-CLI commands and the Hostinger deployment guide.
- Dev-only files (`dev/`, the mail catcher) and the WordPress end-to-end suite.
