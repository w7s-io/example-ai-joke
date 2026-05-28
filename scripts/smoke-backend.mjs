import app from "../backend/index.js";

const mockW7sAi = {
  fetch: async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const body = await request.json();
    const hasAuth = request.headers.get("authorization") === "Bearer local-ai-token";
    if (!hasAuth) {
      return Response.json({ status: "error", error: "Invalid AI bearer token." }, { status: 401 });
    }
    return Response.json({
      status: "success",
      data: {
        model: body.model,
        result: {
          response: `I told my deploy workflow a joke about ${body.input?.prompt ? "prompts" : "builds"}; it shipped before the punchline cached.`
        }
      }
    });
  }
};

const response = await app.fetch(
  new Request("https://example.local/api/joke", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ topic: "deployment workflows" })
  }),
  {
    W7S_AI: mockW7sAi,
    W7S_AI_TOKEN: "local-ai-token",
    W7S_AI_CALLER: "w7s-io/example-ai-joke",
    W7S_AI_ENVIRONMENT: "production"
  }
);

const body = await response.json();
console.log(JSON.stringify({ status: response.status, body }, null, 2));

if (!response.ok) {
  process.exitCode = 1;
}
