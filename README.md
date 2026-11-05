# StudioSpace API deployment

The API is an Express/Node service backed by MongoDB. `render.yaml` defines a Render Blueprint with a health check at `/api/health`.

## Local development

1. Copy `.env.example` to `.env` and fill in the MongoDB URI, database name, and Better Auth secret.
2. Run `npm ci`, `npm run dev`.
3. Check `http://localhost:4000/api/health`.

## Deploy to Render

1. Push this repository to GitHub and create a Render Blueprint from it.
2. Supply `MONGODB_URI`, `DB_NAME`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `CLIENT_URL` when prompted.
3. Set `BETTER_AUTH_URL` to this service's public HTTPS origin without `/api`. The service uses it for Better Auth and JWT issuer verification.
4. Set `CLIENT_URL` to the frontend's public origin. Multiple origins can be comma-separated.
5. After deployment, verify `<API origin>/api/health` returns a successful response.

Keep the API origin consistent in the frontend's `NEXT_PUBLIC_AUTH_URL` and `NEXT_PUBLIC_API_URL` (`<API origin>` and `<API origin>/api`, respectively). Keep `.env` local; the Render Blueprint does not contain secret values.
