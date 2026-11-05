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
3. Add the environment variables from `.env.example` (all optional; defaults are built in).
4. Deploy.

## Environment variables

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL, used for the sitemap and metadata |
| `PGC_CONTACT_PHONE` | Phone shown in the footer and contact page |
| `PGC_CONTACT_WHATSAPP_URL` | WhatsApp link |
| `PGC_CONTACT_EMAIL` | Contact email |

Never commit `.env` files.
