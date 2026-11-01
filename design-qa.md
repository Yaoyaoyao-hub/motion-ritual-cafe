# Design QA

## Evidence

- Source visual truth: `/Users/yaogong/Documents/Codex/2026-11-01/https-little-ritual-openai-chatgpt-site/work/source-captures/source-game-clean-desktop.png`
- Rendered implementation: `/Users/yaogong/Documents/Codex/2026-11-01/https-little-ritual-openai-chatgpt-site/outputs/pose-cafe/implementation-game-desktop.png`
- Mobile implementation: `/Users/yaogong/Documents/Codex/2026-11-01/https-little-ritual-openai-chatgpt-site/outputs/pose-cafe/implementation-game-mobile.png`
- Pet-follow implementation: `/Users/yaogong/Documents/Codex/2026-11-01/https-little-ritual-openai-chatgpt-site/outputs/pose-cafe/implementation-pet-v2.png`
- End-of-game results: `/Users/yaogong/Documents/Codex/2026-11-01/https-little-ritual-openai-chatgpt-site/outputs/pose-cafe/implementation-results-v2.png`
- Full-view comparison: `/Users/yaogong/Documents/Codex/2026-11-01/https-little-ritual-openai-chatgpt-site/outputs/pose-cafe/design-qa-comparison.png`
- Focused controls comparison: `/Users/yaogong/Documents/Codex/2026-11-01/https-little-ritual-openai-chatgpt-site/outputs/pose-cafe/design-qa-controls-focus.png`
- Desktop viewport: 1280 × 720 CSS px.
- Mobile viewport: 390 × 844 CSS px.
- Source and implementation files: 1280 × 720 pixels. The source browser capture contained a 640 × 360 rendered region in the upper-left because of capture-density scaling; it was cropped and resampled to 1280 × 720 before comparison. The implementation required no density normalization.
- State: playable café world with no motion source connected; welcome overlay dismissed.

## Findings

- No actionable P0, P1, or P2 differences remain.
- [P3] The original reference has a denser surrounding town and more authored prop detail. The prototype intentionally uses original, simplified café geometry rather than copied source assets. Its isometric composition, cream/sage palette, long shadows, rounded floating controls, and editorial serif/sans hierarchy remain visually aligned.
- [P3] The motion-source panel replaces the reference coffee-book control in the upper-right. This is an intentional functional substitution and keeps the same light floating-card language.

## Required fidelity surfaces

- Fonts and typography: Georgia italic display copy and compact Arial utility copy reproduce the reference hierarchy and optical contrast. Wrapping is clean at desktop and mobile sizes.
- Spacing and layout rhythm: floating cards, asymmetric radii, lower control rail, safe edge spacing, and mobile stacking are consistent. No viewport overflow or hidden persistent controls were observed.
- Colors and visual tokens: cream, sage, pale timber, dark moss, and warm shadow tokens closely match the source balance and maintain readable contrast.
- Image quality and asset fidelity: the prototype uses a live Three.js scene with original geometry, clean antialiasing, dynamic lighting, and crisp icon assets. No placeholder imagery, hotlinked source assets, or low-resolution decorative assets are present.
- Copy and content: motion instructions are concise and task-specific. The on-device processing statement, fallback controls, calibration label, and brewing objective are visible and coherent.

## Interaction and browser verification

- Welcome close and keyboard-fallback entry were tested.
- Reset was tested and produced the expected status message.
- Pet naming and hatching were tested; the named companion appeared in the scene and followed the player.
- Movement counting was tested with a jump action, and the end-of-game report showed the correct per-movement total and next-movement coaching fallback.
- Jump, guide, source selection, calibration, recording, pause, file input, and brew controls are present and enabled in their applicable states.
- The local pose model loaded successfully from bundled assets.
- The webcam permission flow was initiated; the browser test environment left its permission prompt pending, so no personal camera frame was captured.
- Desktop and 390 × 844 mobile layouts were rendered and inspected.
- Browser logs were checked. There were no application errors; the only current warning is MediaPipe's informational WebGL error-checking message.

## Comparison history

- Pass 1: full-view and focused-control comparison found no P0/P1/P2 visual issues. The lower control rail, typography, palette, and responsive composition were retained. A deprecated Three.js shadow-map constant discovered during browser verification was replaced with the supported constant and rechecked.
- Pass 2: pet hatch, follower, movement counter, voice toggle, finish control, and results overlay were added. Browser-rendered evidence showed no new P0/P1/P2 issues; the new cards reuse the established cream, sage, serif, and asymmetric-radius system. The results headline pluralization was corrected for a count of one.

## Follow-up polish

- Add more neighboring architecture and small animated props if a closer environmental-density match is desired.
- Add a short sample motion clip as an optional demo source for first-time users.

final result: passed
