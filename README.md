# StudioSpace API deployment

The API is an Express/Node service backed by MongoDB. `render.yaml` defines a Render Blueprint with a health check at `/api/health`.

## Local development

1. Copy `.env.example` to `.env` and fill in the MongoDB URI, database name, and Better Auth secret.
2. Run `npm ci`, `npm run dev`.
3. Check `http://localhost:4000/api/health`.

## Deploy to Vercel

1. Import the `studio-space-backend` repository/folder into Vercel with the root directory set to `studio-space-backend`.
2. Leave the framework preset as **Other**. Vercel automatically detects the `api/index.js` serverless function.
3. Add `MONGODB_URI`, `DB_NAME`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `CLIENT_URL` in Vercel's Environment Variables.
4. Set `BETTER_AUTH_URL` to this API's public HTTPS origin (without `/api`) and `CLIENT_URL` to the frontend's public origin. Multiple client origins can be comma-separated.
5. Deploy, then open `<API origin>/api/health` to verify it returns a success response.

`vercel.json` rewrites every request to the Express handler, so routes such as `/api/studios` and `/api/auth/*` continue to work unchanged.

## Deploy to Render

1. Push this repository to GitHub and create a Render Blueprint from it.
2. Supply `MONGODB_URI`, `DB_NAME`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `CLIENT_URL` when prompted.
3. Set `BETTER_AUTH_URL` to this service's public HTTPS origin without `/api`. The service uses it for Better Auth and JWT issuer verification.
4. Set `CLIENT_URL` to the frontend's public origin. Multiple origins can be comma-separated.
5. After deployment, verify `<API origin>/api/health` returns a successful response.

Keep the API origin consistent in the frontend's `NEXT_PUBLIC_AUTH_URL` and `NEXT_PUBLIC_API_URL` (`<API origin>` and `<API origin>/api`, respectively). Keep `.env` local; the Render Blueprint does not contain secret values.
