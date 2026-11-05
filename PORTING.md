# Porting status: WordPress (PHP + MySQL) to Next.js

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

## Not yet ported (need a database)

These modules store records in MySQL custom tables or custom post types. They need a hosted database
(for example Postgres on Neon or Supabase) and authentication before they can run on Vercel.

| Module | WordPress source |
|---|---|
| Membership, roles and member dashboard | `class-pgc-membership.php`, `class-pgc-roles.php` |
| Projects, funding ledger, verification | `class-pgc-projects.php` |
| Scorecards, officials, right of reply | `class-pgc-scorecards.php`, `class-pgc-officials.php` |
| Citizen reports | `class-pgc-citizen-reports.php` |
| Chapters, elections, finance, ethics | `class-pgc-chapters.php`, `class-pgc-elections.php`, `class-pgc-finance.php`, `class-pgc-ethics.php` |
| Petitions, consultations, meetings, notifications | `class-pgc-participation.php`, `class-pgc-notify.php` |
| National dashboard and CSV exports | `class-pgc-analytics.php` |
| Launch plan, pilots, partnerships | `class-pgc-launch.php` |

The pages for Development Register, Scorecards, Dashboard and Membership exist and say plainly that they are
not yet available, so no navigation link is dead.

## Not carried over

- WordPress admin screens, WP-Cron, WP-CLI commands and the Hostinger deployment guide.
- Dev-only files (`dev/`, the mail catcher) and the WordPress end-to-end suite.
