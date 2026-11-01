# Motion Ritual Café

A cozy, browser-based pose-controlled café game. Use a webcam or recorded video to steer the player, hatch a companion pet, brew coffee, and review movement totals at the end of each round.

## Features

- On-device pose detection with MediaPipe Pose Landmarker
- Webcam and recorded-video inputs
- Lean, step, squat-and-rise, and raised-hand controls
- Hatchable custom pet that follows the player
- Per-movement counting and an end-of-game summary
- Voice announcements with browser speech fallback
- Optional OpenAI coaching and text-to-speech endpoints
- Keyboard fallback: WASD, Space, and E

## Run locally

```bash
npm install
npm run dev
```

Open the local URL in Chrome or Safari and allow camera access. The ChatGPT embedded preview browser may not expose `getUserMedia`; recorded-video input remains available there.

## Build and test

```bash
npm run build
npm run test:sites
```

## Optional OpenAI features

Set `OPENAI_API_KEY` in the hosting environment to enable the server-side coaching and generated voice routes. Never expose the key in browser code or commit it to source control.

Without a key, the game uses deterministic local coaching and the browser's built-in speech synthesis.

## Privacy

Pose tracking runs in the browser. Camera and uploaded-video frames are not sent to the server by this app.

## Live demo

[motion-ritual-cafe.gy960902.chatgpt.site](https://motion-ritual-cafe.gy960902.chatgpt.site)
