# Storage Setup (Cloudflare R2, S3-compatible)

## Current state

- **Catalog images** (migrated from Shopify) hotlink `cdn.shopify.com` —
  allowed in `next.config.ts`. These keep working as long as the Shopify
  store exists; migrating them to R2 is part of the storage phase and must
  happen **before decommissioning Shopify**.
- **Admin uploads** save to `public/uploads/` on the local filesystem. This
  works locally but **not on Vercel** (serverless filesystems are ephemeral) —
  R2 must be connected before admins upload images on the deployed site.

**Status: planned integration.** Env vars are reserved (`R2_*`). Setup below
can be done anytime.

## Why R2 (vs AWS S3)

R2 is S3-API-compatible with **zero egress fees** — image-heavy storefronts
pay S3 mostly for bandwidth, which R2 gives away. S3 works identically if you
prefer AWS; the integration will use the S3 SDK either way, so switching is a
matter of env vars + endpoint.

## Cloudflare R2 setup

1. https://dash.cloudflare.com → sign up (free plan OK; R2 free tier:
   10 GB storage, no egress charges).
2. **R2 → Create bucket** → name it (e.g. `aquavida365-images`), location
   automatic → note the name into `R2_BUCKET`.
3. **R2 → Manage R2 API Tokens → Create API Token** → permissions
   "Object Read & Write" scoped to that bucket → copy:
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`
   - Account ID (shown on the R2 overview page) → `R2_ACCOUNT_ID`
4. **Public access**: bucket → Settings → Public access. Best practice:
   connect a custom domain like `img.aquavida365.com` (Cloudflare handles
   the DNS since the domain will be on Cloudflare or via CNAME). The
   resulting base URL → `R2_PUBLIC_URL`.
5. Add `img.aquavida365.com` (or the `r2.dev` URL while testing) to
   `next.config.ts` `images.remotePatterns` when the integration lands.

## AWS S3 alternative

1. Create bucket (block public access OFF for the public prefix, or use
   CloudFront in front — recommended).
2. IAM user with `s3:PutObject`/`GetObject`/`DeleteObject` on the bucket.
3. Map the same env vars (endpoint changes from R2's
   `https://<account>.r2.cloudflarestorage.com` to S3's regional endpoint).

## Security notes

- Upload path already enforces an **extension/MIME allowlist** (images only) —
  that guard carries over to R2 uploads.
- Keep the API token scoped to the single bucket, write-only where possible.
- Never expose `R2_SECRET_ACCESS_KEY` in `NEXT_PUBLIC_*` vars or client code;
  uploads go through the server.

## Migration plan (when this phase runs)

1. Script downloads all `cdn.shopify.com` image URLs from the DB, uploads to
   R2, rewrites `ProductImage.url`.
2. Admin upload path switches from `public/uploads` to R2 `PutObject`.
3. Existing `public/uploads/*` files copied to R2 the same way.
4. `next.config.ts` drops the Shopify CDN allowance once zero rows reference it.
