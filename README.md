# BigBillionDay — bigbillionday.store

A premium watch store built with Next.js 15 (App Router, JavaScript), PostgreSQL + Prisma, a 3D/scroll-animated storefront, and an AI-assisted admin panel powered by NVIDIA NIM.

## Why the rebuild (audit of the old premiumshopy.com)

| Old site | Problem | New build |
|---|---|---|
| Create-React-App SPA + Bootstrap CDN | Empty HTML until JS runs, which hurts Google ranking and LCP | Server-rendered pages, real HTML, JSON-LD, sitemap |
| Hash-less client routes (`/viewproduct/:id`) | ID URLs carry no keywords | `/watches/{brand-model}` slugs, brand/category/collection landing pages |
| Separate API (`api.premiumshopy.com`) with an AES "secret" in the public JS bundle | Anyone can read the key and forge tokens | Same-origin API routes, httpOnly JWT cookie, server-side price recomputation |
| ~890 KB main bundle on every page | Slow INP/LCP on mobile | Code-split per route; 3D loads only on the home hero, after first paint |
| No admin automation | Manual product entry | AI product-from-photo, bulk CSV import with AI enrichment, SEO fixer |

## Architecture

```
Browser ──► Ingress (nginx, TLS, brotli) ──► web pods (Next.js standalone, HPA 2→10)
                                                │   ├─ Storefront (RSC + ISR/caching)
                                                │   ├─ /admin (protected by middleware + requireAdmin)
                                                │   ├─ /api/*  (route handlers)
                                                │   └─ /uploads/* (served from the shared RWX volume)
                                                ├──► PostgreSQL (StatefulSet or managed)
                                                └──► NVIDIA NIM (Nemotron 3 Super text, Nemotron 3.5 Super VL vision)
```

```
src/
  app/
    (store)/            storefront: home, watches, PDP, brands, collections, cart, checkout, account…
    admin/              admin panel
    api/                public APIs (orders, auth, reviews, search, AI concierge…)
    api/admin/          admin APIs (all require ADMIN/STAFF)
    uploads/[...path]/  serves uploaded images from UPLOAD_DIR
    sitemap.js robots.js manifest.js
  components/
    three/              procedural 3D watch (react-three-fiber)
    home/ motion/       landing sections, GSAP/Lenis/framer-motion helpers
    layout/ product/ listing/ cart/ ai/ admin/ seo/
  lib/
    db.js auth.js session-token.js api.js settings.js catalog.js pricing.js storage.js ai.js cart-store.js utils.js
prisma/  schema.prisma, migrations, seed.mjs
k8s/     namespace+config, postgres, storage, web (+HPA/PDB), ingress, migrate job
.github/workflows/deploy.yml  CI/CD
```

### Order flow (COD)
Cart (localStorage) → `/checkout` → `POST /api/orders`. The server re-reads prices and stock from the DB, applies the coupon and shipping/COD rules from Settings, then creates the order, decrements stock and writes the first timeline event in one transaction. After that an AI COD-risk score is attached in the background (never blocks the order). Admins move orders through Confirmed → Packed → Shipped (courier + AWB) → Delivered (COD marked paid).

Razorpay is built behind a switch: **Admin → Settings → Payment**. It stays "Coming soon" until enabled and `RAZORPAY_KEY_ID/SECRET` are set.

### AI features (NVIDIA NIM, `src/lib/ai.js`)
- **Product from photo:** upload a watch photo. The vision model detects brand, specs, dial and strap, and maps them to the store's filter values. The text model then writes the title, description, highlights, tags, SEO title/description and alt text. Every field stays editable, and each one can be accepted or undone.
- **AI Studio:** drop many photos to get draft products, fix weak SEO across the catalog, moderate reviews, write homepage copy, and ask questions about your store's numbers.
- **Bulk CSV import** with AI enrichment of missing fields and remote image download.
- **Dashboard insights:** 5 actionable recommendations from the last 30 days of data.
- **COD risk scoring** on new orders.
- **Watch Concierge** chat on the storefront. It recommends only from the live catalog, and replies stream in as they are generated.

All AI calls are logged in **Admin → AI Logs**. Models: `nvidia/nemotron-3-super-120b-a12b` (text) and `nvidia/nemotron-3.5-super-vl-120b-a12b` (vision), with reasoning turned off for speed. You can override them with `NVIDIA_TEXT_MODEL` / `NVIDIA_VISION_MODEL`. NVIDIA retires hosted models from time to time, so if the primary model returns 404/410/5xx, `src/lib/ai.js` automatically falls back to the next model.

## Local development

```bash
cp .env.example .env              # add NVIDIA_API_KEY, AUTH_SECRET
docker compose up -d db           # PostgreSQL 16 on :5432
npm install
npx prisma migrate dev            # create tables
npm run db:seed                   # admin user + brands + demo watches
npm run dev                       # http://localhost:3000   admin: /admin
```

On Windows keep `DATABASE_URL` on `127.0.0.1`, not `localhost`. Docker Desktop may not answer on IPv6 `::1`.

`node scripts/import-legacy.mjs` re-imports products and photos from the old premiumshopy.com API. It is safe to run again: products are matched by their old ID. Add `--replace` to also remove demo products.

`node scripts/make-og.mjs` regenerates the default social share image (`public/og-default.jpg`).

Default admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`. **Change the password after first login.**

## Single-server deploy (Docker Compose)

```bash
docker compose --profile app up -d --build
```

## Kubernetes deploy (auto via GitHub)

1. Create a GitHub repo and push this project to `main`.
2. Set up a cluster with **ingress-nginx**, **cert-manager**, **metrics-server** (for HPA), and a **ReadWriteMany** storage class (NFS/Longhorn/EFS/Filestore). Set it in `k8s/15-storage.yaml`.
3. Create the secrets shown in `k8s/00-namespace-config.yaml`.
4. Add repo secret `KUBE_CONFIG` (base64 kubeconfig).
5. Point DNS for `bigbillionday.store` and `www` at the ingress IP.

From then on, every push to `main` runs these steps: lint, build, push the web and migrator images to GHCR, run DB migrations as a Job, then a zero-downtime rolling update (`maxUnavailable: 0`, readiness probe on `/api/health?ready=1`). The HPA scales between 2 and 10 pods on CPU and memory.

## Performance notes (Core Web Vitals)
- LCP: the hero headline is real HTML, and the 3D canvas mounts after idle, only while it is in view. On reduced-motion, low-end and mobile devices it shows a static poster or a lighter mesh.
- Images: `next/image` serves AVIF/WebP with blur placeholders, and uploads are converted to WebP (max 1600px) by sharp.
- Fonts: `next/font` (self-hosted, `display: swap`). The standalone output keeps the image small.
