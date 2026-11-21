# Product Specification: Project "What If" (Infinite World Sandbox)

## 1. Product Vision
An AI-powered mobile sandbox platform where players can create, publish, and play infinite "What If" alternate reality simulations. From grand geopolitical strategy ("What if Rome never fell?") to hyper-local roleplay ("College dropout building a tech startup in a garage"), the engine adapts its UI, maps, and narrative dynamically.

---

## 2. Core Pillars
* **Infinite Scopes:** Seamlessly shift between Macro-scale (World/Country maps), Meso-scale (City streets/neighborhoods), and Micro-scale (Single building/office).
* **Zero-Latency Gameplay:** Powered by fast local caching (`MMKV` + `expo-sqlite`) and lightweight cloud AI turns on our remote Bun.js server so the app stays tiny and snappy.
* **Living Visuals:** Dynamic vector maps and custom Skia shaders combined with Nano Banana character portraits that react to the game state.
* **Community Marketplace:** Creators build "World Seeds" (rules, starting lore, visual style) and publish them for others to play, fork, and rate.

---

## 2.5 Brand Identity & Color Palette (Yeti Theme)
Sampled directly from the Anvil Yeti mascot (`assets/yeti/android-icon-background.png`) to keep the UI crisp, playful, and high-contrast:

| Role | Name | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Brand Blue** | Yeti Blue | `#40A7FC` | Active highlights, interactive accents, links, and badges. |
| **Brand Tint / Splash** | Periwinkle Ice | `#C0CEF5` | Splash screen background, adaptive icon backdrop, soft accent containers. |
| **Primary Dark / Ink** | Obsidian Black | `#000000` (`#0A0A0A` UI) | Headlines, primary pill CTAs, icons, and Yeti linework contrast. |
| **Primary Light Surface** | Pure White | `#FFFFFF` | Main screen backgrounds, cards, and inverse button labels. |
| **Secondary Neutral** | Frost Gray | `#E2E2E4` | Subtle borders, inactive indicators, and secondary card surfaces. |

---

## 3. Game Modes & Visual Scopes
To make the game feel "as real as possible and fast," the background canvas adapts to the prompt's scale:

| Scale | Example Scenario | Background Rendering Strategy | Core Mechanics |
| :--- | :--- | :--- | :--- |
| **Macro (Global/National)** | *What if Rome never fell?* / *Alien Invasion* | Interactive Vector World Map rendered via **Shopify Skia** with custom territory shaders & borders. | Diplomacy, resource management, troop/fleet movement, timeline advancement. |
| **Meso (City/Regional)** | *Cyberpunk Crime Syndicate in Neo-Tokyo* | Real-world city street/building footprints (GeoJSON) styled dynamically on the Skia canvas. | Territory control, location scouting, localized events, transit. |
| **Micro (Life/Sim)** | *College dropout creating a tech startup* | Layered parallax 2.5D scene generated on the server (e.g., a dynamic garage/office) with Skia lighting/particle effects. | Dialogue trees, skill building, cash-flow management, character relationships. |

---

## 4. Solving the "1-Hour Asset Generation" Bottleneck
Waiting 60 minutes for a world to compile will hurt creator retention. Instead, we use a **3-Stage Progressive Asset Pipeline**:

1. **Stage 1: Instant Blueprint (< 15 Seconds)**
   * Creator types the prompt.
   * Server LLM generates the world rules, starting factions/stats, and generates **only the 3-5 core starting characters** via Nano Banana.
   * If Macro/Meso scale, vector map coordinates and Skia color palettes are selected instantly (0 seconds generation time).
2. **Stage 2: Playable State (< 45 Seconds)**
   * Creator/Player can immediately jump into the game.
   * Remote Bun.js server handles fast cloud AI narrative turns over compact JSON payloads.
3. **Stage 3: Asynchronous Background Baking (5–30 Minutes in Background)**
   * While the creator tests their world or after they hit "Publish", a Bun.js background worker queue generates secondary NPCs, event cards, and regional variations, streaming them silently to the device over **WebSockets / SSE**.

---

## 5. User Loops

### A. The Creator Loop ("World Forging")
1. **Prompting:** User enters a "What If" scenario and selects a Scale (World, City, or Life Sim).
2. **Rule Tuning:** AI suggests starting parameters (e.g., *Roman Tech Level: 1990s*, *Starting Cash: $1,500*). Creator tweaks sliders.
3. **Preview & Publish:** Core characters and map shaders load instantly. Creator hits publish; the Bun.js server queues deep asset generation and lists the world on the Discovery Feed.

### B. The Player Loop ("Living the Simulation")
1. **Discovery:** Browse trending worlds on the home feed.
2. **Fast Boot:** Download the lightweight `.worldpack` (SQLite seed + initial WebP character sprites) in seconds.
3. **Turn/Real-time Play:** Make decisions via free-text or dynamic action buttons. MMKV updates stats at 60fps; Skia animates map borders or character expressions.
