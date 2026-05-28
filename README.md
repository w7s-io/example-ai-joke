# example-ai-joke

Small W7S fullstack example that uses a React frontend, a bundled Hono backend,
and the W7S-provided AI service binding to generate one random joke at a time.

## What It Deploys

- `backend/src/index.ts`: Hono backend source.
- `backend/index.js`: generated Worker backend bundle deployed by W7S.
- `frontend/src`: React frontend source.
- `frontend/dist`: generated static frontend served by W7S.
- `w7s.json`: declares the W7S AI service binding.
- `.github/workflows/deploy.yml`: deploys this repo with `w7s-io/w7s-cloud@v1`.

## How It Works

The frontend calls:

```text
POST /api/joke
```

The backend builds a short prompt, then calls the W7S AI service binding:

```text
POST https://w7s.internal/api/v1/ai/run
```

W7S owns the provider credentials and injects `W7S_AI`, `W7S_AI_TOKEN`,
`W7S_AI_CALLER`, and `W7S_AI_ENVIRONMENT` when the repo declares:

```json
{
  "bindings": {
    "ai": ["W7S_AI"]
  }
}
```

No Cloudflare account, Cloudflare API token, W7S account, or GitHub secret is
required for this example repo.

## Local Commands

```sh
npm install
npm run check
npm run dev
```

To smoke test the backend locally with a mock W7S AI binding:

```sh
npm run smoke:backend
```

## Deploy

Push to `main`. GitHub Actions will install dependencies, build the backend and
frontend, then deploy with W7S.

The production deployment is served at:

```text
https://w7s-io.w7s.cloud/example-ai-joke/
```
