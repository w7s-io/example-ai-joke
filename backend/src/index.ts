import { Hono } from "hono";

type Bindings = {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_AI_MODEL?: string;
};

type JokeRequest = {
  topic?: string;
};

type WorkersAiResponse = {
  result?: {
    response?: string;
    text?: string;
  };
  success?: boolean;
  errors?: Array<{ message?: string }>;
};

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const JOKE_TOPICS = [
  "deploy previews",
  "edge functions",
  "frontend builds",
  "API routes",
  "cache invalidation",
  "pull requests",
  "late-night debugging",
  "environment variables"
];

const app = new Hono<{ Bindings: Bindings }>();

const jsonHeaders = {
  "cache-control": "no-store"
};

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders,
      "content-type": "application/json; charset=utf-8"
    }
  });

const randomIndex = (length: number) => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % length;
};

const randomTopic = () => JOKE_TOPICS[randomIndex(JOKE_TOPICS.length)] ?? "software deployment";

const cleanJoke = (value: string) =>
  value
    .replace(/^["'`\s]+|["'`\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const promptFor = (topic: string) =>
  [
    "Write one short, original, developer-friendly joke.",
    `Topic: ${topic}.`,
    "Return only the joke.",
    "No markdown. No explanation. Keep it under 220 characters.",
    `Random seed: ${crypto.randomUUID()}`
  ].join(" ");

const parseJokeRequest = async (request: Request): Promise<JokeRequest> => {
  if (request.method === "GET") return {};

  try {
    const body = await request.json<JokeRequest>();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
};

const workersAiUrl = (accountId: string, model: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;

const extractWorkersAiError = (payload: WorkersAiResponse | null, fallback: string) => {
  const message = payload?.errors?.map((error) => error.message).filter(Boolean).join("; ");
  return message || fallback;
};

const generateJoke = async (env: Bindings, topic: string) => {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = env.CLOUDFLARE_API_TOKEN?.trim();
  const model = env.CLOUDFLARE_AI_MODEL?.trim() || DEFAULT_MODEL;

  if (!accountId || !apiToken) {
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "Cloudflare Workers AI is not configured.",
        setup: [
          "Set CLOUDFLARE_ACCOUNT_ID as a GitHub secret.",
          "Set CLOUDFLARE_API_TOKEN as a GitHub secret with Workers AI permissions.",
          "Redeploy with the W7S GitHub Action."
        ]
      }
    };
  }

  let response: Response;
  let payload: WorkersAiResponse | null = null;

  try {
    response = await fetch(workersAiUrl(accountId, model), {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        prompt: promptFor(topic)
      })
    });
    payload = await response.json<WorkersAiResponse>();
  } catch (error) {
    return {
      ok: false as const,
      status: 502,
      body: {
        error: "Workers AI request failed.",
        detail: error instanceof Error ? error.message : String(error)
      }
    };
  }

  if (!response.ok || payload?.success === false) {
    return {
      ok: false as const,
      status: response.status || 502,
      body: {
        error: "Workers AI returned an error.",
        detail: extractWorkersAiError(payload, `HTTP ${response.status}`)
      }
    };
  }

  const joke = cleanJoke(payload?.result?.response ?? payload?.result?.text ?? "");

  if (!joke) {
    return {
      ok: false as const,
      status: 502,
      body: {
        error: "Workers AI did not return a joke."
      }
    };
  }

  return {
    ok: true as const,
    status: 200,
    body: {
      joke,
      topic,
      model,
      source: "cloudflare-workers-ai",
      generatedAt: new Date().toISOString()
    }
  };
};

app.get("/api/status", (c) =>
  c.json(
    {
      service: "example-ai-joke",
      status: "healthy",
      aiConfigured: Boolean(
        c.env.CLOUDFLARE_ACCOUNT_ID?.trim() && c.env.CLOUDFLARE_API_TOKEN?.trim()
      ),
      model: c.env.CLOUDFLARE_AI_MODEL?.trim() || DEFAULT_MODEL
    },
    200,
    jsonHeaders
  )
);

app.get("/api/joke", async (c) => {
  const topic = c.req.query("topic")?.trim() || randomTopic();
  const result = await generateJoke(c.env, topic);
  return jsonResponse(result.body, result.status);
});

app.post("/api/joke", async (c) => {
  const body = await parseJokeRequest(c.req.raw);
  const topic = body.topic?.trim() || randomTopic();
  const result = await generateJoke(c.env, topic);
  return jsonResponse(result.body, result.status);
});

app.notFound((c) =>
  c.json(
    {
      error: "Not found",
      method: c.req.method,
      path: new URL(c.req.url).pathname
    },
    404
  )
);

export default app;
