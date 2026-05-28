import app from "../backend/index.js";

const response = await app.fetch(
  new Request("https://example.local/api/joke", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ topic: "deployment workflows" })
  }),
  {
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_AI_MODEL: process.env.CLOUDFLARE_AI_MODEL
  }
);

const body = await response.json();
console.log(JSON.stringify({ status: response.status, body }, null, 2));

if (!response.ok) {
  process.exitCode = 1;
}
