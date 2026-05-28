import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bot, CloudLightning, Laugh, RefreshCw, Sparkles } from "lucide-react";
import "./styles.css";

type JokeResponse = {
  joke?: string;
  topic?: string;
  model?: string;
  source?: string;
  generatedAt?: string;
  error?: string;
  detail?: string;
  setup?: string[];
};

const TOPICS = [
  "deploy previews",
  "edge functions",
  "cache invalidation",
  "pull requests",
  "environment variables"
];

const apiUrl = (path: string) => new URL(path, window.location.href).toString();

async function requestJoke(topic: string): Promise<JokeResponse> {
  const response = await fetch(apiUrl("api/joke"), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({ topic })
  });
  const payload = (await response.json()) as JokeResponse;
  if (!response.ok) {
    return {
      ...payload,
      error: payload.error ?? `Request failed with HTTP ${response.status}`
    };
  }
  return payload;
}

function App() {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [response, setResponse] = useState<JokeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const statusLabel = useMemo(() => {
    if (loading) return "asking workers ai";
    if (response?.error) return "needs setup";
    if (response?.joke) return "joke generated";
    return "ready";
  }, [loading, response]);

  const generate = async (nextTopic = topic) => {
    setTopic(nextTopic);
    setLoading(true);
    try {
      setResponse(await requestJoke(nextTopic));
    } catch (error) {
      setResponse({
        error: error instanceof Error ? error.message : "Unable to generate a joke."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">
          <CloudLightning size={16} />
          W7S + Cloudflare Workers AI
        </div>
        <h1>Generate a tiny deployment joke.</h1>
        <p className="lede">
          A Vite frontend calls a Hono backend. The backend uses W7S AI, a
          platform-provided service binding, to ask Workers AI for one short joke.
        </p>
        <div className="facts" aria-label="Example stack">
          <div>
            <span>Frontend</span>
            <strong>React + Vite</strong>
          </div>
          <div>
            <span>Backend</span>
            <strong>Hono Worker</strong>
          </div>
          <div>
            <span>AI</span>
            <strong>W7S AI binding</strong>
          </div>
        </div>
      </section>

      <section className="panel" aria-label="Joke generator">
        <div className="panelHeader">
          <div>
            <span>Status</span>
            <strong>{statusLabel}</strong>
          </div>
          <Bot size={22} />
        </div>

        <div className="topics" aria-label="Joke topics">
          {TOPICS.map((item) => (
            <button
              key={item}
              type="button"
              className={item === topic ? "selected" : ""}
              disabled={loading}
              onClick={() => void generate(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="jokeBox">
          <Laugh size={30} />
          <p>
            {response?.joke ??
              response?.error ??
              "Pick a topic or generate a random joke from the backend."}
          </p>
        </div>

        {response?.setup && (
          <div className="setup">
            {response.setup.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        )}

        {response?.detail && <pre>{response.detail}</pre>}

        <button
          type="button"
          className="primary"
          disabled={loading}
          onClick={() => void generate(TOPICS[Math.floor(Math.random() * TOPICS.length)] ?? topic)}
        >
          {loading ? <RefreshCw className="spin" size={18} /> : <Sparkles size={18} />}
          Generate random joke
        </button>

        {response?.model && (
          <div className="meta">
            <span>{response.model}</span>
            <span>{response.generatedAt}</span>
          </div>
        )}
      </section>
    </main>
  );
}

createRoot(document.querySelector("#root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
