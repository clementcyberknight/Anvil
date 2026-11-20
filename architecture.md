# System Architecture: Anvil

## 1. High-Level Tech Stack Overview

| Layer                        | Technology / Package                                       | Primary Responsibility                                                                                                            |
| :--------------------------- | :--------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Mobile Framework**         | Expo (React Native - New Architecture / JSI)               | Cross-platform native runtime with synchronous native bridging (TurboModules/Fabric).                                             |
| **Hot State & Cache**        | `react-native-mmkv`                                        | Synchronous, in-memory/C++ key-value storage for 60fps in-game state ticks, active stats, and UI flags.                           |
| **Cold Local Storage**       | `expo-sqlite`                                              | Relational local database for world lore, historical turn logs, NPC relationships, GeoJSON map caches, and offline saves.         |
| **2D/Shader Rendering**      | `@shopify/react-native-skia`                               | Hardware-accelerated canvas for vector maps (World/City), custom shaders, parallax backgrounds, and Anvil spark particle systems. |
| **Animations & Gestures**    | `react-native-reanimated` + `react-native-gesture-handler` | Worklet-driven map pan/zoom, card swipes, and synchronized Skia animations on the UI thread.                                      |
| **Sensory UX ("The Forge")** | `expo-audio` + `expo-haptics`                              | Low-latency metallic hammer strikes, pitch randomization, ambient forge crackle, and heavy haptic impact feedback.                |
| **Backend Runtime**          | **Bun.js** (`Bun.serve`, Workers)                          | High-throughput TypeScript server for orchestrating AI workflows, world compilation queues, and GeoJSON vector slicing.           |
| **Persistent Cloud DB**      | **Firebase Cloud Firestore**                               | Global marketplace catalog, published World Seeds, user profiles, leaderboards, and community forks.                              |
| **Real-Time Sync**           | **Firebase Realtime Database (RTDB)**                      | Sub-millisecond websocket streaming for background asset generation progress ("Anvil Strikes") and live game sync.                |
| **AI & Asset Pipeline**      | **Firebase AI Logic** + **Nano Banana**                    | On-device inference (Gemini Nano) for fast gameplay turns; Server-side LLMs + Nano Banana for character/background generation.    |

---

## 2. Mobile Client Architecture (Expo Android)

### A. Core Expo & React Native Packages

```json
{
  "dependencies": {
    "expo": "~53.0.0",
    "expo-sqlite": "~15.x",
    "expo-file-system": "~18.x",
    "expo-audio": "~0.3.x",
    "expo-haptics": "~14.x",
    "react-native-mmkv": "^3.x",
    "@shopify/react-native-skia": "^1.x",
    "react-native-reanimated": "~3.x",
    "react-native-gesture-handler": "~2.x",
    "zustand": "^5.x",
    "@react-native-firebase/app": "^21.x",
    "@react-native-firebase/firestore": "^21.x",
    "@react-native-firebase/database": "^21.x",
    "@react-native-firebase/vertexai": "^21.x"
  }
}
```

### B. Local-First Two-Tier Storage Strategy (`MMKV` + `expo-sqlite`)

To guarantee zero-latency gameplay, the client never waits on network requests during active turns:

1. **Hot Path (`react-native-mmkv` + `zustand`):**
   - Holds the active session tick, current resources (e.g., Gold, GDP, Startup Runway, Stability), active map shader uniforms, and current character mood flags.
   - Read/write operations happen synchronously via C++ JSI in `< 0.05ms`, directly driving React Native Skia shared values without frame drops.
2. **Cold Path (`expo-sqlite`):**
   - Stores structured relational data that grows over a playthrough:
     - `worlds`: Metadata, rules JSON, scale type (`MACRO`, `MESO`, `MICRO`).
     - `entities`: Generated NPCs, factions, stats, and local file paths (`expo-file-system`) to Nano Banana WebP portraits.
     - `timeline_events`: Append-only log of every decision and AI-generated outcome (used as RAG context for the on-device AI).
     - `map_regions`: GeoJSON polygon coordinates, owner faction ID, and territory attributes.
   - **Checkpointing:** Every $N$ turns (or on app backgrounding), a background worker flushes dirty `MMKV` state into `expo-sqlite` inside a single transaction, then syncs the delta to Firestore/RTDB.

---

## 3. Rendering & Sensory Engine (`@shopify/react-native-skia`)

### A. Dynamic Background & Map Pipeline

Instead of generating massive raster images for countries or cities, backgrounds are split by game scale:

1. **Unified Skia Map Renderer (Macro & Meso):**
   - The client uses **one single `<SkiaMapCanvas>`** component for all map-based worlds (modern global, historical eras, and city streets).
   - **Unified Format:** Regardless of scenario, the client only consumes **quantized TopoJSON** stored in `expo-sqlite` (`map_regions`), converted into cached `SkPath` objects on the device.
   - **Bun.js Data Routing (Hidden from Client):**
     - *Modern Global / Country:* Uses **Natural Earth (1:50m)** bundled inside the app (~200 KB) for 0ms, zero-network loading.
     - *Historical Eras (e.g., 1880 Nigeria):* Bun.js slices the matching year snapshot from **`aourednik/historical-basemaps`** (~150–300 KB simplified TopoJSON).
     - *City Streets & Districts (e.g., San Francisco):* Bun.js queries **OpenStreetMap (Overpass API)** once per city, simplifies polygons/roads, caches the ~80–150 KB TopoJSON, and returns it with a focused `boundingBox`.
   - **SkSL Custom Shaders:** Skia fragment shaders apply thematic styling in real time:
     - _Alternate History (e.g., Sokoto / Rome):_ Parchment texture shader, dynamic border bleed, and live territory annexation/renaming offline at 60fps.
     - _Startup / Sci-Fi:_ Neon grid / blueprint overlays, district control rings, and pulsing expansion hubs.
   - Camera pan/zoom is handled entirely on the UI thread via `react-native-gesture-handler` matrix transformations applied to the `<Canvas>`.

2. **Micro (Startup / Indoor Life Sim):**
   - Uses a 3-layer parallax scene (Background room/office, Midground props/desks, Foreground characters) generated as compressed transparent WebP layers on the server and composited inside the same Skia `<Canvas>` with dynamic lighting shaders (day/night cycle).

### B. "The Forge" World-Creation UX Pipeline

While the player waits for initial world compilation:

- **RTDB Listener:** The client listens to `/world_builds/{jobId}/milestones`.
- **Audio/Haptic Trigger:** Each milestone event fires an `expo-audio` metallic anvil strike (cycling through 4 audio buffers with playback rate randomized between $0.92$ and $1.08$) alongside `Haptics.impactAsync(Heavy)`.
- **Skia Particle System:** A Reanimated shared value triggers a burst of 20 Skia `<Circle>` spark particles with physics decay and a molten orange-to-gold radial gradient shader on the canvas.

---

## 4. Hybrid AI Architecture (Firebase AI Logic + Nano Banana)

```
+-------------------------------------------------------------------------+
|                        CLIENT (EXPO ANDROID)                            |
|                                                                         |
|  [Player Action] ---> [MMKV State Update] ---> [Firebase AI Logic SDK]  |
|                                                       |                 |
|                                      +----------------+--------------+  |
|                                      |                               |  |
|                            (On-Device Capable)              (Cloud Fallback)
|                             Gemini Nano (AICore)            Gemini Flash |
+--------------------------------------|-------------------------------|--+
                                       v                               v
                        [Instant Narrative & Stat JSON] <--------------+
```

### A. On-Device AI (Fast Gameplay Loop)

- **Engine:** Firebase AI Logic hybrid mode utilizing Android AICore (**Gemini Nano**) locally, with automatic cloud fallback for unsupported devices.
- **Role:** Processes immediate player decisions, dialogue responses, and turn-by-turn stat mutations.
- **Context Injection:** Before prompting the local model, the app queries `expo-sqlite` for the last 5 events and reads current stats from `MMKV`, enforcing a strict JSON schema output:
  ```json
  {
    "narrative": "The Senate rejects your tariff proposal, sparking unrest in Gaul.",
    "statDeltas": { "stability": -10, "treasury": 50 },
    "newMood": "angry"
  }
  ```

### B. Server-Side AI (Heavy World & Asset Forging)

- **Engine:** Bun.js orchestrating server-side **Firebase AI Logic (Gemini Pro/Flash)** + **Nano Banana**.
- **Nano Banana Character Pipeline:**
  1. Server LLM generates structured character visual sheets (era, clothing, expression, seed).
  2. Bun worker dispatches parallel requests to **Nano Banana** to generate consistent character portraits (idle, happy, angry, defeated) and Micro-scale background layers.
  3. Raw outputs are piped through `sharp` on the Bun server to strip backgrounds, resize, and convert into lightweight `WebP` sprites, then uploaded to Firebase Cloud Storage.

---

## 5. Backend Architecture (Bun.js + Firebase)

### A. Why Bun.js?

- Ultra-fast startup and native TypeScript execution.
- Built-in `Worker` threads and fast `fetch` pipeline for orchestrating concurrent calls to Nano Banana, LLM endpoints, and GeoJSON tile slicing without blocking the event loop.

### B. Progressive Asset Generation Queue (Solving the 1-Hour Bottleneck)

Instead of blocking the user until every asset exists, the Bun server processes worlds in two phases:

1. **Synchronous Phase (`POST /api/forge/init` — Target: `< 15 seconds`):**
   - Generates core world rules, starting faction stats, GeoJSON bounding box, and **only the protagonist + 2 primary NPCs** via Nano Banana.
   - Emits 4–5 milestone ticks to **Firebase RTDB** (driving the Anvil hammer strikes on the client).
   - Returns the playable seed package so the user enters the game immediately.

2. **Asynchronous Background Phase (Bun Background Worker — `5 to 45 minutes`):**
   - Continues forging secondary regional leaders, event illustration cards, and mid/late-game assets in the background.
   - As each asset finishes, the Bun worker uploads the `WebP` to Firebase Storage and pushes the download URL to **Firebase RTDB** (`/worlds/{worldId}/live_assets`).
   - The Expo client's background listener downloads the new sprite to `expo-file-system` and registers it in `expo-sqlite` seamlessly while the user is already playing.

### C. Database Split: Firestore vs. Realtime Database (RTDB)

- **Cloud Firestore:**
  - Stores published `WorldPacks` (lore, initial SQLite seed JSON, asset manifest URLs), user accounts, ratings, and community marketplace queries.
- **Firebase Realtime Database (RTDB):**
  - Used strictly for low-latency ephemeral state:
    - `/forge_jobs/{jobId}`: Live milestone streaming during the Anvil hammering screen.
    - `/active_sessions/{sessionId}/asset_stream`: Pushing newly generated Nano Banana sprites to the device mid-game.

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
   - Player starts managing runway, product, and hiring in San Francisco (powered offline by `MMKV` + Gemini Nano).
   - When the startup grows enough to open offices in New York, London, or Lagos, the client downloads only that new city's **~100 KB delta TopoJSON** (or zooms out to the already-bundled **Natural Earth** global map) and merges it into `expo-sqlite`.

### Scenario B: Historical Alternate Reality (*"What if the British never colonized Nigeria?"*)

1. **Prompt & Web Search Grounding:**
   - Server LLM (with **Google Search grounding**) identifies the historical inflection point (e.g., `eraYear: 1880`, `focus: West Africa`) and researches contemporary polities and figures (e.g., *Sokoto Caliphate*, *Benin Kingdom*, *Oyo*, *Lagos*, key rulers and factions).
2. **Historical Map Slicing:**
   - Bun.js loads `world_1880.geojson` from **`historical-basemaps`**, simplifies and quantizes it to **~150–300 KB TopoJSON**, and sets the camera `boundingBox` over West Africa.
3. **Era-Accurate Asset Forging:**
   - **Nano Banana** generates era-accurate portraits of the protagonist and 2–3 key historical leaders, while secondary regional leaders bake asynchronously in the background via RTDB.
4. **Live Territory Manipulation:**
   - Because each polity (`Sokoto`, `Benin`, etc.) is an independent `SkPath` in `map_regions`, player decisions and AI outcomes directly **recolor, annex, split, or rename borders** on the Skia canvas at **60fps offline**.

---

## 7. Low-Connectivity Compression & Security

### A. Compression Pipeline (Target: `< 500 KB – 1.5 MB` per `.worldpack`)
- **Vector Maps:** Douglas-Peucker simplification + **TopoJSON integer arc quantization** + **Brotli** compression shrinks raw 10–15 MB GeoJSONs down to **~80–300 KB**.
- **Nano Banana Sprites:** `sharp` resizes portraits to **256×256** (or **384×384**) and backgrounds to **720px** wide, encoding as **WebP (quality 70–75)** (~15–30 KB per portrait).
- **Single-File `.worldpack`:** Initial SQLite seed + TopoJSON + core WebP sprites are bundled into one Brotli-compressed payload to minimize HTTP round-trips on 2G/3G networks.
- **Deferred Sync:** Turns run 100% offline; secondary assets and Firestore/RTDB state deltas sync only when connectivity is available.

### B. Security Architecture
- **Zero Client Secrets:** Gemini, Google Search grounding, Nano Banana, and Overpass calls happen strictly on **Bun.js**—no API keys are shipped in the Expo app.
- **Firebase Auth + App Check:** All `/api/forge/*` endpoints verify a **Firebase Auth ID token** and **Firebase App Check** token to block unauthorized scripts and bot scraping.
- **Quotas & Schema Validation:** Bun.js enforces per-user forge rate limits and prompt sanitization; the Expo client validates `.worldpack` JSON/SQLite schemas before loading them into `expo-sqlite`.
