# LearnNexus Architecture

LearnNexus is organized around feature ownership. Routes and UI paths stay stable, but new code should enter through feature modules instead of reaching into unrelated internals.

## Frontend

```text
client/src/
  features/
    auth/       login, signup, reset password, session context, auth API
    dashboard/  dashboard page and dashboard-only UI
    learning/   setup, settings, study plan, task card, learning APIs/config
    videos/     video player, classroom modal, playlist UI, YouTube helpers
  common/       reusable UI components with no feature business logic
  services/     shared API transport and cross-feature endpoint services
  utils/        formatting, token storage, catalog helpers
```

Feature pages may import shared code from `common`, `services`, and `utils`. They should not mutate another feature's internal state directly. If a feature needs to expose behavior, export it from that feature's `index.js`.

## Backend

```text
server/src/
  modules/
    auth/       routes, controller, validation, public module entrypoint
    users/      current user and preferences
    learning/   study plan routes/controllers plus learning services
    progress/   progress routes/controllers plus progress service
    videos/     video search and playlist import services
    admin/      admin recommendation resources and cleanup
  config/       env and database configuration
  middleware/   auth, RBAC, validation, sanitization, rate limits
  models/       Mongoose models
  services/     compatibility adapters and shared infrastructure services
  utils/        logger, JWT, errors, async helpers
```

`server/src/modules/index.js` is the backend module registry. `server/src/app.js` mounts only module routes, keeping public API paths stable.

## Security Baseline

- JWT access tokens use issuer, audience, expiry, and unique token IDs.
- Refresh tokens are opaque, hashed, persisted server-side, and stored in HTTP-only cookies.
- Passwords are hashed with bcrypt using 12 salt rounds.
- Sensitive values are required through environment variables in every runtime environment.
- Request body, params, and query objects are sanitized against NoSQL/prototype pollution keys.
- Sensitive auth and password-reset endpoints are rate limited.
- Admin routes require authenticated admin role.

## Reliability Baseline

- The API has a health endpoint at `/api/health`.
- Startup validates required environment variables before the HTTP server starts.
- MongoDB connection failures stop startup so auth and user data never use temporary storage.
- External YouTube import/search failures have fallbacks and retry handling.
- Structured logging includes request IDs and avoids exposing secrets.

## Adding A Feature

1. Add frontend code under `client/src/features/<feature>`.
2. Add backend code under `server/src/modules/<feature>`.
3. Export the public feature surface from `<feature>/index.js`.
4. Put reusable UI in `client/src/common`, cross-feature API helpers in `client/src/services`, and generic helpers in `utils`.
5. Put backend shared middleware/config/models outside modules only when multiple modules truly need them.
6. Register backend routes in `server/src/modules/index.js` and mount them in `server/src/app.js`.
7. Add validation before controller logic and keep database work inside services.
8. Run `npm run check`, `npm --workspace server test`, and `npm audit --omit=dev`.

## Removing A Feature

Remove its frontend `features/<feature>` folder, backend `modules/<feature>` folder, module registry export, and route mount. Compatibility adapters can be deleted after all imports have moved to the module entrypoint.
