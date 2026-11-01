# Motion Ritual Café

A cozy, browser-based pose-controlled café game built with React, Three.js, and MediaPipe. Play as an animated barista, welcome four customers, and complete their coffee recipes through body movements. Hatch a companion pet and review your movement totals at the end of each round.

[Play the live game](https://motion-ritual-cafe.gy960902.chatgpt.site)

## Features

- On-device pose detection with MediaPipe Pose Landmarker
- Webcam and recorded-video inputs
- Lean, step, squat-and-rise, and raised-hand controls
- Detailed barista with face, hair, apron, articulated limbs, and walking animation
- Four distinct customers who arrive, queue, request drinks, and leave after serving
- Ordered movement recipes with repetition progress
- Hatchable custom pet that follows the player
- Separate results for each round: movement totals, customer count, and round number
- Fresh-round reset, including when changing pets from the results screen
- Voice announcements with browser speech fallback
- Optional OpenAI coaching and text-to-speech endpoints
- Keyboard fallback: WASD, Space, and E

## Run locally

Use Node.js 22 or later and npm. The repository is private, so cloning requires access to the owner's GitHub account or an invitation.

```bash
git clone https://github.com/Yaoyaoyao-hub/motion-ritual-cafe.git
cd motion-ritual-cafe
npm ci
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`) in Chrome or Safari. Choose **Use webcam** and allow camera access, **Choose video** for a clip, or the keyboard option. Embedded browsers may limit camera access; opening the site directly in a normal browser is a useful troubleshooting step.

The pose model and WebAssembly files are bundled in `public/`; no external model download is required at runtime. Local Vite serves the frontend only. OpenAI routes require a deployed Worker; local play uses the built-in fallbacks.

## How to play

1. With pose input, stand so your shoulders and hips are visible. Hold a relaxed stance for calibration.
2. Read the current customer's request. Complete its movement steps in the displayed order.
3. Return to neutral between repetitions. A held lean or raised hand counts as one gesture, not one count per video frame.
4. Serve the drink with a raised hand once the recipe steps are complete. The next customer takes their place.
5. Serve all four customers to finish automatically, or choose **Finish** to end early. **Play another morning** starts a fresh round.

| Action | Body control | Keyboard |
| --- | --- | --- |
| Lean left | Lean left, then return to neutral | A / Left arrow |
| Lean right | Lean right, then return to neutral | D / Right arrow |
| Step closer | Move closer to the camera | W / Up arrow |
| Step back | Move farther from the camera | S / Down arrow |
| Froth / shake / jump | Squat and rise | Space |
| Serve | Raise a hand, then lower it | E |

The Jump and Raise hand buttons also provide those actions. Counts represent recognized gestures or discrete control actions, not measured physical steps. A short debounce prevents duplicate counts. Keyboard controls work when focus is on the game; click the café scene if focus remains on a form or button.

### Customer recipes

| Customer | Drink | Movement sequence |
| --- | --- | --- |
| Jun | Cloud cappuccino | Squat + rise ×2 → raise a hand ×1 |
| Amara | Honey oat latte | Lean left ×2 → lean right ×2 → raise a hand ×1 |
| Theo | Double espresso | Step closer ×2 → step back ×2 → raise a hand ×1 |
| Iris | Maple iced coffee | Squat + rise ×2 → lean left ×1 → lean right ×1 → raise a hand ×1 |

All recognized movements contribute to movement totals, but only the required current action advances a recipe. Serving all four recipes requires at least 18 accepted actions. Ending early reports partial progress.

### Pets and results

Choose **Hatch a companion** to select a name, shape, and colour, or use a local image. Pet name, shape, and colour persist in this browser; uploaded pet images are session-only.

Finishing freezes a snapshot of that round's movement counts and customers served. The results show the round number. Starting again clears counts and recipe progress, resets pose calibration, and ignores coaching responses still arriving from previous rounds. **New round + change pet** also starts with fresh statistics.

## Build and test

```bash
npm run build
npm run test:sites
node --test tests/orders.test.mjs
npm run preview
```

Build before running the Sites tests: they verify generated deployment files. The tests cover Worker asset/API handling and ordered customer progression/reset. `npm run preview` serves the built frontend for a local check; it does not run the Worker API.

Live pose accuracy depends on lighting, framing, camera quality, and browser support. Automated tests do not validate a physical webcam session.

## Optional OpenAI features

Set `OPENAI_API_KEY` as a secret in the Worker hosting environment to enable the server-side coaching and generated voice routes. Never expose the key in browser code or commit it to source control.

| Setting | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Server-side API credential |
| `OPENAI_DECISION_MODEL` | Responses API model used for end-of-round coaching; choose a model available to your account |
| `OPENAI_TTS_MODEL` | Speech model; code default is `gpt-4o-mini-tts` |
| `OPENAI_TTS_VOICE` | Speech voice; code default is `marin` |

`POST /api/coach` receives movement counts and an optional pet name, and returns a headline, next movement, and encouragement. `POST /api/speak` receives a short movement name and returns MP3 audio. The implementation lives in `worker/index.js`; generated speech is disclosed in the results screen.

Without a key, the game uses deterministic local coaching and the browser's built-in speech synthesis.

## Privacy

Pose tracking runs in the browser. Camera and uploaded-video frames are not sent to the server by this app. Optional coaching sends movement counts and the pet name to OpenAI; optional speech sends the movement label. Pet images stay on the device.

## Project structure

```text
src/App.jsx                  Input, pose detection, round state, pets, and results
src/CafeScene.jsx            Three.js café, barista, customers, and animations
src/orders.js               Customer recipes and progression reducer
src/styles.css              Responsive interface styling
public/models/              Bundled MediaPipe pose model
public/wasm/                Bundled MediaPipe runtime
worker/index.js             Static asset routing and optional OpenAI endpoints
scripts/prepare-sites-build.mjs  Builds the Sites deployment layout
tests/                      Worker and customer progression checks
.openai/hosting.json         Existing Sites project identity
```

## Deployment

The live version is hosted on Sites. `npm run build` creates `dist/client`, `dist/server/index.js`, and `dist/.openai/hosting.json`. Sites publication uses the existing project ID in `.openai/hosting.json`; publishing a separate copy requires its own registered project identity.

GitHub stores the source and bundled runtime assets. Pushing to GitHub does not automatically deploy the website. `node_modules`, generated `dist` output, local screenshots, and secret files are excluded from the GitHub source branch.

## Troubleshooting

- **Camera cannot start:** open the HTTPS site directly in Chrome or Safari, check browser and OS camera permissions, and close other apps using the camera. Localhost also supports camera access.
- **Tracking is uncertain:** improve lighting, keep shoulders and hips visible, and use Calibrate after changing position.
- **Old finish screen:** refresh to load the latest build, then start a new morning. Verify the round number shown on the results screen.
- **No OpenAI voice/coaching:** check the Worker secret and model availability. Browser speech and local coaching remain available without the integration.
