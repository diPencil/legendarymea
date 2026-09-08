# Production Deployment Checklist

Use this checklist whenever backend or frontend changes are promoted to production.

## Backend

Deploy backend changes before frontend changes when new API routes or response fields are introduced.

Run these commands from the production backend release directory:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Then confirm the runtime sees the expected routes:

```bash
curl -fsS https://legendarymea.com/dashboard-api/api/v1/health
```

The response must include:

- `data.ready: true`
- `data.required_routes.api/v1/portal/overview: true`
- `data.required_routes.api/v1/employees/managers: true`

If `ready` is false, stop the release and clear/rebuild Laravel caches again before testing the dashboard.

## Frontend

Build after backend is ready:

```bash
npm run build
```

After publishing the frontend, verify:

- `/portal` opens for a client account.
- `/dashboard/employees` loads without a managers route error.
- `/dashboard/companies` loads without a managers route error.
- Media previews show a fallback instead of broken cards when production storage is missing files.

## Runtime Storage

Uploaded files under `storage/app/public` are runtime data, not Git data. Production storage must be persistent across deploys and linked through `public/storage`.
