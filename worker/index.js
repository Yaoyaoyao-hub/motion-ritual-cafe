const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

async function parseBody(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 16_384) throw new Error("Request too large");
  return request.json();
}

async function coachResponse(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: "OpenAI coaching is not configured" }, 503);
  const { counts = {}, petName = null } = await parseBody(request);
  const allowedCounts = Object.fromEntries(
    ["leanLeft", "leanRight", "stepForward", "stepBack", "jump", "interact"]
      .map((key) => [key, Math.max(0, Math.min(9999, Number(counts[key]) || 0))]),
  );
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_DECISION_MODEL || "gpt-6-astra",
      input: [
        {
          role: "system",
          content: [{
            type: "input_text",
            text: "You are a warm, concise movement coach inside a gentle coffee game. Review the movement counts, celebrate without making health claims, and choose exactly one underused movement for the next round.",
          }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: JSON.stringify({ movementCounts: allowedCounts, companionName: petName }) }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "movement_decision",
          strict: true,
          schema: {
            type: "object",
            properties: {
              headline: { type: "string" },
              nextMovement: { type: "string", enum: ["Lean left", "Lean right", "Step closer", "Step back", "Squat and rise", "Raise a hand"] },
              encouragement: { type: "string" },
            },
            required: ["headline", "nextMovement", "encouragement"],
            additionalProperties: false,
          },
        },
      },
    }),
  });
  if (!response.ok) return json({ error: "OpenAI coaching request failed" }, 502);
  const payload = await response.json();
  const text = payload.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === "output_text")?.text;
  if (!text) return json({ error: "OpenAI coaching returned no decision" }, 502);
  return json({ ...JSON.parse(text), source: "openai" });
}

async function speechResponse(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: "OpenAI speech is not configured" }, 503);
  const { text = "" } = await parseBody(request);
  const input = String(text).trim().slice(0, 80);
  if (!input) return json({ error: "Movement name is required" }, 400);
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: env.OPENAI_TTS_VOICE || "marin",
      input,
      instructions: "Warm, gentle café guide. Clearly say only the short movement name.",
      response_format: "mp3",
    }),
  });
  if (!response.ok) return json({ error: "OpenAI speech request failed" }, 502);
  return new Response(response.body, {
    status: 200,
    headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=300" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/coach") {
      try {
        return await coachResponse(request, env);
      } catch {
        return json({ error: "Invalid coaching request" }, 400);
      }
    }
    if (request.method === "POST" && url.pathname === "/api/speak") {
      try {
        return await speechResponse(request, env);
      } catch {
        return json({ error: "Invalid speech request" }, 400);
      }
    }

    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
