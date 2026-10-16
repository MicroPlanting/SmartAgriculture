# MicroPlanting — Smart plants. A greener tomorrow.

Static website (plain HTML/CSS/JS, no build step) for GitHub Pages. Firebase Realtime Database + Firebase Authentication, Chart.js (CDN), installable PWA.

## Files
| File | Purpose |
|---|---|
| index.html | Page structure: hero, system diagram, dashboard, irrigation scene, analytics, alerts, about, sign-in dialog |
| style.css | Design system, animation, responsive layout, reduced-motion rules |
| script.js | Firebase auth + live listener on `/readings`, validation, dashboard, alerts, charts, browser sound |
| firebase-config.js | The only file with Firebase settings (apiKey and appId must be filled in) |
| audio.js | Browser-only calm generated music and alert buzzer tone (starts only after a button press) |
| particles.js | Lightweight firefly particle background (paused when hidden, static with reduced motion) |
| thresholds.js | Single source of truth for emergency thresholds and the `evaluate()` function |
| thresholds.test.mjs | Node tests for threshold logic (`node thresholds.test.mjs`) |
| manifest.json, sw.js | PWA manifest and service worker (cache `mp-v3`) |
| icons/ | PLACEHOLDER icons (192, 512). Replace with your real project icons, same file names |

## Project details (as provided)
- Project: MicroPlanting. Tagline: SMART PLANTS. A GREENER TOMORROW.
- Purpose: monitor plant conditions with an ESP32, sensors and automatic irrigation, shown on a website for a school science exhibition.
- Firebase path: `/readings`. Expected fields (verify against your data): temperature, humidity, soil, soil_raw, gas, pump, servo_angle, alarm.
- Hosting: GitHub Pages (relative paths, works under a repo subpath). No server or laptop needs to stay running.

## Thresholds
| Rule | Value | Comparison |
|---|---|---|
| Temperature emergency | 35 °C | `temperature > 35` (35 no, 36 yes) |
| Gas emergency | **1000** (was 500) | `gas > 1000` (1000 no, 1001 yes) |
| Soil dry | raw ≥ 3500 | classification only, never an emergency |
| Servo | opens to 90° above 80% humidity, closed 0° | verify against firmware |

Emergency = `temperature > 35 OR gas > 1000`. Missing, null, NaN or non-numeric readings are shown as unavailable and never trigger an emergency. Gas is a raw reading, not ppm. Dry soil alone never triggers the buzzer.

## Hardware (historical info, verify against your firmware)
ESP32; DHT11 on GPIO 4; servo GPIO 18; soil sensor GPIO 34 (ADC); gas sensor GPIO 35 (ADC); buzzer GPIO 25; pump motor driver on GPIO 26 and 27 (the pins drive the driver, not the pump directly).

## ACTION REQUIRED before it works
1. **Firebase config:** done in firebase-config.js (your real web config). Still required in the console: enable Email/Password sign-in, create a user, and set rules.
2. **ESP32 firmware:** change its gas emergency check to `gas > 1000`. The website cannot do this. Until you do, the physical buzzer still uses the old limit and the site will disagree with it.
3. **Database rules:** allow authenticated users to read `/readings`. Never make the database public.
4. **Icons:** replace the placeholder icons.
5. **Field names:** if your `/readings` fields differ, adjust `parse()` in script.js.

## What the site does and does not claim
- Connection status reflects Firebase only. Hardware status is "unknown" because there is no device heartbeat field.
- "Last update" is when this page received data, not when the sensor measured it.
- The site is monitoring only. It cannot switch the pump, servo or buzzer. The irrigation scene mirrors reported state.
- Browser alert sound is optional, off until you enable it, and does not confirm the physical buzzer.
- Charts use only readings received this session (or a list already stored under `/readings`). Nothing is invented.

## Test
`node thresholds.test.mjs` should print `16 checks passed`. Hardware, Firebase, mobile layout and PWA install have not been tested by the author of this package.

## Deploy to GitHub Pages
1. Put all files and the `icons/` folder in your repository root.
2. Commit and push.
3. GitHub → Settings → Pages → Deploy from a branch → choose branch and `/ (root)` → Save.
4. Open the Pages URL, refresh twice so the new service worker takes over, sign in.
Local preview: `python -m http.server`, then open http://localhost:8000.

## Not built yet
Botanical photo background, watering demo mode, account registration, animated gauges, device heartbeat display (needs a firmware field).
