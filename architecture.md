# System Architecture: Anvil

## 1. High-Level Tech Stack Overview

| Layer                        | Technology / Package                                       | Primary Responsibility                                                                                                            |
| :--------------------------- | :--------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Mobile Framework**         | Expo (React Native - New Architecture / JSI)               | Cross-platform native runtime with synchronous native bridging (TurboModules/Fabric).                                             |
| **Hot State & Session**      | `react-native-mmkv`                                        | Synchronous, in-memory/C++ key-value storage for 60fps in-game state ticks, active stats, session state, and UI flags.            |
| **Cold Local Storage**       | `expo-sqlite`                                              | Relational local database for cached world lore, timeline logs, NPC relationships, TopoJSON map caches, and saved sessions.       |
| **Image & Asset Storage**    | `expo-file-system`                                         | Local disk cache for compressed WebP portraits, logos, 2.5D office layers, and downloaded `.worldpack` archives.                  |
| **2D/Shader Rendering**      | `@shopify/react-native-skia`                               | Hardware-accelerated canvas for vector maps (World/City), custom shaders, parallax backgrounds, and Anvil spark particle systems. |
| **Animations & Gestures**    | `react-native-reanimated` + `react-native-gesture-handler` | Worklet-driven map pan/zoom, card swipes, and synchronized Skia animations on the UI thread.                                      |
| **Sensory UX ("The Forge")** | `expo-audio` + `expo-haptics`                              | Low-latency metallic hammer strikes, pitch randomization, ambient forge crackle, and heavy haptic impact feedback.                |
| **Backend Runtime**          | **Bun.js** (`Bun.serve`, Workers, WebSockets/SSE)          | High-throughput TypeScript server for orchestrating cloud AI turns, world compilation queues, and TopoJSON vector slicing.        |
| **Cloud Storage & DB**       | **PostgreSQL + Object Storage (R2 / S3)**                  | Global marketplace catalog, published World Seeds, user profiles, leaderboards, and CDN-hosted compressed `.worldpack` WebP assets. |
| **Cloud AI & Asset Pipeline**| **Server-Side LLMs (Gemini Flash / Flash-Lite)** + **Nano Banana** | All AI text turns, web-search grounding, and character/background/logo generation run exclusively on the remote Bun.js server. |

---

## 2. Mobile Client Architecture (Expo)

### A. Core Expo & React Native Packages

```json
{
  "dependencies": {
    "expo": "~58.0.25",
    "expo-router": "~58.0.31",
    "expo-sqlite": "latest",
    "expo-file-system": "latest",
    "expo-audio": "latest",
    "expo-haptics": "~58.0.8",
    "react-native-mmkv": "^4.3.2",
    "react-native-nitro-modules": "^0.37.2",
    "@shopify/react-native-skia": "latest",
    "react-native-reanimated": "4.7.1",
    "react-native-gesture-handler": "~3.3.0"
  }
}
```

### B. Lightweight Client Storage Strategy (`MMKV` + `expo-sqlite` + `expo-file-system`)

Keeping the client thin and fast—no heavy on-device ML weights:

1. **Hot Path & Session (`react-native-mmkv`):**
   - Holds the active session tick, auth/session tokens, onboarding flags, current resources (e.g., Gold, GDP, Startup Runway, Stability), active map shader uniforms, and character mood flags.
   - Read/write operations happen synchronously via C++ JSI in `< 0.05ms`, directly driving UI and Skia shared values without frame drops.
2. **Story, Lore & Map Cache (`expo-sqlite`):**
   - Stores structured relational data downloaded in the `.worldpack`:
     - `worlds`: Metadata, rules JSON, scale type (`MACRO`, `MESO`, `MICRO`).
     - `entities`: Generated NPCs, factions, stats, and local `expo-file-system` paths to Nano Banana WebP portraits.
     - `timeline_events`: Append-only log of decisions and AI-generated outcomes.
     - `map_regions`: Quantized TopoJSON polygon coordinates, owner faction ID, and territory attributes.
3. **Binary Asset Cache (`expo-file-system`):**
   - Stores downloaded WebP sprites, startup logos, and 2.5D scene layers locally so they never re-download across sessions.

---

## 3. Rendering & Sensory Engine (`@shopify/react-native-skia`)

### A. Dynamic Background & Map Pipeline

Instead of generating massive raster images for countries or cities, backgrounds are split by game scale:

1. **Unified Skia Map Renderer (Macro & Meso):**
   - The client uses **one single `<SkiaMapCanvas>`** component for all map-based worlds (modern global, historical eras, and city streets).
   - **Unified Format:** Regardless of scenario, the client only consumes **quantized TopoJSON** stored in `expo-sqlite` (`map_regions`), converted into cached `SkPath` objects on the device.
   - **Bun.js Data Routing (Hidden from Client):**
     - *Modern Global / Country:* Uses **Natural Earth (1:50m)** bundled inside the app (~200 KB) for instant loading.
     - *Historical Eras (e.g., 1880 Nigeria):* Bun.js slices the matching year snapshot from **`aourednik/historical-basemaps`** (~150–300 KB simplified TopoJSON).
     - *City Streets & Districts (e.g., San Francisco):* Bun.js queries **OpenStreetMap (Overpass API)** once per city, simplifies polygons/roads, caches the ~80–150 KB TopoJSON, and returns it with a focused `boundingBox`.
   - **SkSL Custom Shaders:** Skia fragment shaders apply thematic styling in real time:
     - _Alternate History (e.g., Sokoto / Rome):_ Parchment texture shader, dynamic border bleed, and live territory annexation/renaming at 60fps.
     - _Startup / Sci-Fi:_ Neon grid / blueprint overlays, district control rings, and pulsing expansion hubs.
   - Camera pan/zoom is handled entirely on the UI thread via `react-native-gesture-handler` matrix transformations applied to the `<Canvas>`.

2. **Micro (Startup / Indoor Life Sim):**
   - Uses a 3-layer parallax scene (Background room/office, Midground props/desks, Foreground characters) generated as compressed transparent WebP layers on the server and composited inside the same Skia `<Canvas>` with dynamic lighting shaders (day/night cycle).

### B. "The Forge" World-Creation UX Pipeline

While the player waits for initial world compilation:

- **Live Progress Stream (SSE / WebSocket):** The client subscribes to `/api/forge/{jobId}/events` on the Bun.js server.
- **Audio/Haptic Trigger:** Each milestone event fires an `expo-audio` metallic anvil strike (cycling through 4 audio buffers with playback rate randomized between $0.92$ and $1.08$) alongside `Haptics.impactAsync(Heavy)`.
- **Skia Particle System:** A Reanimated shared value triggers a burst of 20 Skia `<Circle>` spark particles with physics decay and a radial gradient shader on the canvas.

### C. Brand Design Tokens (Yeti Palette)

Exact hex values sampled from `assets/yeti/android-icon-background.png` for consistent UI, splash screen, adaptive icon, and Skia shader accents:

| Token | Hex | Role |
| :--- | :--- | :--- |
| `brandBlue` | `#40A7FC` | Primary Yeti blue for active accents, focus states, and highlights. |
| `brandIce` | `#C0CEF5` | Splash screen & Android adaptive icon background, soft tint surfaces. |
| `brandBlack` | `#000000` (`#0A0A0A` UI) | High-contrast typography, primary pill CTAs, and borders. |
| `brandWhite` | `#FFFFFF` | Primary light canvas background and inverse text. |
| `brandFrost` | `#E2E2E4` | Subtle surface tint and inactive UI elements (sampled from Yeti shading). |

---

## 4. Cloud AI Architecture (Remote Bun.js Server)

All AI inference and asset generation runs on the remote **Bun.js** server so the mobile app stays ultra-lightweight, fast, and consistent across every device:

```
+-------------------------------------------------------------------------+
|                         CLIENT (EXPO MOBILE)                            |
|                                                                         |
|  [Player Action] ---> [MMKV Optimistic State] ---> [POST /api/turn]     |
+-------------------------------------------------------------|-----------+
                                                              v
+-------------------------------------------------------------------------+
|                       REMOTE SERVER (BUN.JS)                            |
|                                                                         |
|  [Fast Cloud LLM (Flash-Lite / Flash)] + [Nano Banana Image Worker]     |
+-------------------------------------------------------------|-----------+
                                                              v
                     [Compact JSON Delta: narrative, statDeltas, borders]
```

### A. Fast Gameplay Turn Endpoint (`POST /api/turn`)

- **Engine:** Server-side **Gemini Flash-Lite** (lowest latency & cost) with strict JSON schema output.
- **Payload Efficiency:** The client sends only the player action + compact session state delta; the server returns a tiny JSON response (< 1 KB):
  ```json
  {
    "narrative": "The Senate rejects your tariff proposal, sparking unrest in Gaul.",
    "statDeltas": { "stability": -10, "treasury": 50 },
    "newMood": "angry"
  }
  ```

### B. Heavy World & Asset Forging (`POST /api/forge/init`)

- **Engine:** Bun.js orchestrating server-side **Gemini Flash** (with web-search grounding for historical/real-world accuracy) + **Nano Banana**.
- **Nano Banana Character & Scene Pipeline:**
  1. Server LLM generates structured character visual sheets (era, clothing, expression, seed).
  2. Bun worker dispatches parallel requests to **Nano Banana** to generate consistent character portraits, startup logos, and Micro-scale background layers.
  3. Raw outputs are piped through `sharp` on the Bun server to strip backgrounds, resize, and convert into lightweight `WebP` sprites, then uploaded to CDN object storage (Cloudflare R2 / S3).

---

## 5. Backend Architecture (Bun.js)

### A. Why Bun.js?

- Ultra-fast startup and native TypeScript execution.
- Built-in `Worker` threads, native WebSockets/SSE, and fast `fetch` pipeline for orchestrating concurrent calls to Cloud LLMs, Nano Banana, and TopoJSON tile slicing without blocking the event loop.

### B. Progressive Asset Generation Queue (Solving the 1-Hour Bottleneck)

Instead of blocking the user until every asset exists, the Bun server processes worlds in two phases:

1. **Synchronous Phase (`POST /api/forge/init` — Target: `< 15 seconds`):**
   - Generates core world rules, starting faction stats, TopoJSON bounding box, and **only the protagonist + 2 primary NPCs** (plus startup logo/office if applicable) via Nano Banana.
   - Emits 4–5 milestone ticks over SSE/WebSocket (driving the Anvil hammer strikes on the client).
   - Returns the playable `.worldpack` seed so the user enters the game immediately.

2. **Asynchronous Background Phase (Bun Background Worker — `5 to 45 minutes`):**
   - Continues forging secondary regional leaders, event illustration cards, and mid/late-game assets in the background.
   - As each asset finishes, the Bun worker uploads the `WebP` to CDN storage and pushes the asset URL over WebSocket/SSE to the client.
   - The Expo client downloads the new sprite to `expo-file-system` and registers it in `expo-sqlite` seamlessly while the user is already playing.

---

## 6. End-to-End Scenario Walkthroughs

### Scenario A: Modern Startup Expansion (*"What if my startup did not fail?"*)

1. **Prompt & Intent (`POST /api/forge/init`):**
   - Server LLM extracts `scale: MESO`, `city: "San Francisco"`, `expansionScope: GLOBAL`.
2. **Map Generation:**
   - Bun.js slices San Francisco streets/districts from **OpenStreetMap (Overpass)** (or hits server cache), simplifies geometry, and returns a **~100 KB** quantized TopoJSON centered on SF.
3. **Server Asset Forging (`< 15s`):**
   - **Nano Banana** generates the **startup logo**, **2.5D office/garage layers**, and **founder + co-founder portraits** in parallel, compressed via `sharp` to WebP.
4. **Gameplay & City-to-Country Expansion:**
   - Player manages runway, product, and hiring in San Francisco with fast cloud AI turns from Bun.js and 60fps UI updates via `MMKV` + Skia.
   - When the startup grows enough to open offices in New York, London, or Lagos, the client downloads only that new city's **~100 KB delta TopoJSON** (or zooms out to the already-bundled **Natural Earth** global map) and merges it into `expo-sqlite`.

### Scenario B: Historical Alternate Reality (*"What if the British never colonized Nigeria?"*)

1. **Prompt & Web Search Grounding:**
   - Server LLM (with web-search grounding) identifies the historical inflection point (e.g., `eraYear: 1880`, `focus: West Africa`) and researches contemporary polities and figures (e.g., *Sokoto Caliphate*, *Benin Kingdom*, *Oyo*, *Lagos*, key rulers and factions).
2. **Historical Map Slicing:**
   - Bun.js loads `world_1880.geojson` from **`historical-basemaps`**, simplifies and quantizes it to **~150–300 KB TopoJSON**, and sets the camera `boundingBox` over West Africa.
3. **Era-Accurate Asset Forging:**
   - **Nano Banana** generates era-accurate portraits of the protagonist and 2–3 key historical leaders, while secondary regional leaders bake asynchronously in the background.
4. **Live Territory Manipulation:**
   - Because each polity (`Sokoto`, `Benin`, etc.) is an independent `SkPath` in `map_regions`, player decisions and cloud AI outcomes directly **recolor, annex, split, or rename borders** on the Skia canvas at **60fps**.

---

## 7. Low-Connectivity Compression & Security

### A. Compression Pipeline (Target: `< 500 KB – 1.5 MB` per `.worldpack`)
- **Vector Maps:** Douglas-Peucker simplification + **TopoJSON integer arc quantization** + **Brotli** compression shrinks raw 10–15 MB GeoJSONs down to **~80–300 KB**.
- **Nano Banana Sprites:** `sharp` resizes portraits to **256×256** (or **384×384**) and backgrounds to **720px** wide, encoding as **WebP (quality 70–75)** (~15–30 KB per portrait).
- **Single-File `.worldpack`:** Initial SQLite seed + TopoJSON + core WebP sprites are bundled into one Brotli-compressed payload to minimize HTTP round-trips on slow mobile connections.
- **Tiny Turn Payloads:** Cloud AI turn requests and responses stay under ~1–2 KB JSON so gameplay remains responsive even on weak 3G connections.

### B. Security Architecture
- **Zero Client Secrets:** All LLM, web-search grounding, Nano Banana, and Overpass calls happen strictly on **Bun.js**—no API keys are ever shipped in the Expo app.
- **Authenticated API & Rate Limiting:** All `/api/forge/*` and `/api/turn` endpoints require signed auth tokens (JWT / session auth) with per-user rate limits and prompt sanitization to prevent abuse and cost spikes.
- **Schema Validation:** The Expo client strictly validates downloaded `.worldpack` and `/api/turn` JSON payloads at the I/O boundary before writing to `MMKV` or `expo-sqlite`.
