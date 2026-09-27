# Legendary Management MEA - Static Deployment

## Build and upload

1. From `frontend/`, run `pnpm build:static`. Deploy only when it completes successfully; never reuse a partial or stale `out/` directory.
2. Deploy the **contents** of `frontend/out/` to Hostinger `public_html`; `index.html` must be directly inside `public_html`.
3. Include `frontend/public/.htaccess` as `public_html/.htaccess`. Do not omit this dotfile when uploading or packaging the artifact.
4. Replace the previous frontend artifact while preserving unrelated domain configuration. This static export does not require a Hostinger Node.js application.

## Cache policy

- HTML and Next route-data `.txt` files are not stored, so a new deployment is visible immediately.
- Content-hashed files under `/_next/static/` are cached for one year with `immutable`.
- stable-name public images, fonts, CSS, and JavaScript are cached for one day and must revalidate afterward.
- JSON, web manifests, and XML must revalidate before reuse.

## After deployment

1. Purge the website/CDN cache from the Hostinger hPanel cache-management UI after every frontend deployment. Browser headers alone do not clear Hostinger's cached responses.
2. Open the home page and representative nested routes in a fresh private window. Confirm the new release is visible and that scripts, styles, fonts, and images return without errors.
3. Verify response headers: HTML and route data must not be stored, only `/_next/static/` may be immutable, and stable public assets must retain the bounded one-day policy.

Never leave stale cached HTML active: it can reference assets from an older Next.js build and produce a broken or mixed release.
