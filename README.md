# example-ai-joke

Small W7S fullstack example that uses a React frontend, a bundled Hono backend,
and Cloudflare Workers AI to generate one random joke at a time.

## What It Deploys

- `backend/src/index.ts`: Hono backend source.
- `backend/index.js`: generated Worker backend bundle deployed by W7S.
- `frontend/src`: React frontend source.
- `frontend/dist`: generated static frontend served by W7S.
- `w7s.json`: declares the Workers AI runtime values that the deploy action passes
  into the backend.
- `.github/workflows/deploy.yml`: deploys this repo with `w7s-io/w7s-cloud@v1`.

## How It Works

The frontend calls:

```text
POST /api/joke
```

The backend builds a short prompt, then calls Cloudflare's Workers AI REST API:

```text
POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct
```

The API token stays in the backend as a secret binding. The browser never sees
the token or the Cloudflare account ID.

## Required GitHub Secrets

Set these repository secrets before deploying:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

The token needs Workers AI permissions for the target Cloudflare account.

Optional repository variable:

```text
CLOUDFLARE_AI_MODEL=@cf/meta/llama-3.1-8b-instruct
```

## Local Commands

```sh
npm install
npm run check
npm run dev
```

To smoke test the backend against Workers AI locally:

```sh
CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npm run smoke:backend
```

## Deploy

Push to `main`. GitHub Actions will install dependencies, build the backend and
frontend, then deploy with W7S.

The production deployment is served at:

```text
https://w7s-io.w7s.cloud/example-ai-joke/
```
