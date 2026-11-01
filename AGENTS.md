# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

Camera compatibility is a core requirement. Keep live webcam capture permissive (`video: true`), show specific recovery guidance for permission/device failures, and always preserve recorded-video upload as a first-class fallback because embedded preview browsers may not expose `getUserMedia`.

Keep the camera `<video>` element mounted before calling `getUserMedia`; the stream must have an existing DOM target before startup completes.

The player should be a detailed, articulated human barista, not a capsule/blob. Visiting customers queue and request ordered movement recipes; completed recipes serve customers and all four complete the round.
