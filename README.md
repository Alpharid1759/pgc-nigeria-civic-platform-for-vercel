# PGC Nigeria for Vercel

**Democracy Beyond the Ballot.** Next.js (App Router, TypeScript) version of the PGC Nigeria
platform, ready to deploy on Vercel. See [PORTING.md](PORTING.md) for what is ported and what is not.

## Run locally (PowerShell)

```powershell
npm install
npm run dev
```

Open http://localhost:3000.

```powershell
npm test
npm run typecheck
npm run build
```

## Deploy on Vercel

1. Push this repo to GitHub.
2. Go to vercel.com/new and import the repo. Vercel detects Next.js; leave the build settings as they are.
3. Create a Postgres database (Neon, Supabase or Vercel Postgres) and add `DATABASE_URL` and `PGC_SECRET`
   (16+ random characters) in Vercel's environment variables. Without them the site still runs, and the
   database-backed pages say they are unavailable.
4. Deploy.
5. Create the tables once, from your PC (PowerShell):

```powershell
$env:DATABASE_URL = "postgres://..."
npm run db:migrate
```

Other commands: `npm run db:seed` (one flagged demo project), `npm run review -- list|approve <id>|reject <id>`.

## Environment variables

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL, used for the sitemap and metadata |
| `PGC_CONTACT_PHONE` | Phone shown in the footer and contact page |
| `PGC_CONTACT_WHATSAPP_URL` | WhatsApp link |
| `PGC_CONTACT_EMAIL` | Contact email |
| `DATABASE_URL` | Postgres connection string |
| `PGC_SECRET` | Signs the form token and hashes IPs (16+ chars) |
| `PGC_SHOW_DEMO` | `1` shows demonstration rows (leave unset in production) |
| `PGC_DB_POOL_MAX` | Max DB connections per instance (default 5) |

Never commit `.env` files.
