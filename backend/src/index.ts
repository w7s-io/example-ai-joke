import { Hono } from "hono";

type Bindings = {
  W7S_AI?: Fetcher;
  W7S_AI_TOKEN?: string;
  W7S_AI_CALLER?: string;
  W7S_AI_ENVIRONMENT?: string;
};

type JokeRequest = {
  topic?: string;
};

type W7SAiResponse = {
  status?: string;
  data?: {
    model?: string;
    result?: {
      response?: string;
      text?: string;
    };
  };
  error?: string;
  details?: unknown;
};

type JokeResult =
  | {
      ok: true;
      status: number;
      body: {
        joke: string;
        topic: string;
        model: string;
        source: string;
        generatedAt: string;
      };
    }
  | {
      ok: false;
      status: number;
      body: {
        error: string;
        detail?: string;
        setup?: string[];
      };
    };

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
const W7S_AI_RUN_URL = "https://w7s.internal/api/v1/ai/run";
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

const generateJoke = async (env: Bindings, topic: string): Promise<JokeResult> => {
  const token = env.W7S_AI_TOKEN?.trim();
  const caller = env.W7S_AI_CALLER?.trim();
  const environment = env.W7S_AI_ENVIRONMENT?.trim();

  if (!env.W7S_AI || !token || !caller || !environment) {
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "W7S AI is not configured for this deployment.",
        setup: [
          "Declare bindings.ai in w7s.json.",
          "Redeploy with the W7S GitHub Action."
        ]
      }
    };
  }

  let response: Response;
  let payload: W7SAiResponse | null = null;

  try {
    response = await env.W7S_AI.fetch(W7S_AI_RUN_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-w7s-ai-caller": caller,
        "x-w7s-ai-environment": environment
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        input: {
          prompt: promptFor(topic)
        }
      })
    });
    payload = (await response.json()) as W7SAiResponse;
  } catch (error) {
    return {
      ok: false as const,
      status: 502,
      body: {
        error: "W7S AI request failed.",
        detail: error instanceof Error ? error.message : String(error)
      }
    };
  }

  if (!response.ok || payload?.status === "error") {
    return {
      ok: false as const,
      status: response.status || 502,
      body: {
        error: "W7S AI returned an error.",
        detail: payload?.error ?? `HTTP ${response.status}`
      }
    };
  }

  const joke = cleanJoke(payload?.data?.result?.response ?? payload?.data?.result?.text ?? "");

  if (!joke) {
    return {
      ok: false as const,
      status: 502,
      body: {
        error: "W7S AI did not return a joke."
      }
    };
  }

  return {
    ok: true as const,
    status: 200,
    body: {
      joke,
      topic,
      model: payload?.data?.model ?? DEFAULT_MODEL,
      source: "w7s-ai",
      generatedAt: new Date().toISOString()
    }
  };
};

app.get("/api/status", (c) =>
  c.json(
    {
      service: "example-ai-joke",
      status: "healthy",
      aiConfigured: Boolean(c.env.W7S_AI && c.env.W7S_AI_TOKEN?.trim()),
      model: DEFAULT_MODEL
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
