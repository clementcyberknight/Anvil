# System Architecture: Anvil

## 1. High-Level Tech Stack Overview

| Layer                        | Technology / Package                                       | Primary Responsibility                                                                                                            |
| :--------------------------- | :--------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Mobile Framework**         | Expo (React Native - New Architecture / JSI)               | Cross-platform native runtime with synchronous native bridging (TurboModules/Fabric).                                             |
| **Hot State & Session**      | `react-native-mmkv`                                        | Synchronous C++/Nitro key-value storage for 60fps inventory counters, stamina, active season/tax flags, and session state.        |
| **Town, Story & Map Storage**| `expo-sqlite`                                              | Relational local database for single-map building states, NPC citizen relationships, crafting queues, and cached market orders.   |
| **Image & Asset Storage**    | `expo-file-system`                                         | Local disk cache for compressed WebP sprites, building tiers, seasonal map layers, and character portraits.                       |
| **2D/Shader Rendering**      | `@shopify/react-native-skia`                               | Hardware-accelerated canvas for the single interactive town map (Village, Forest, Frozen Lake, Mountains, Caves) & weather VFX.   |
| **Animations & Gestures**    | `react-native-reanimated` + `react-native-gesture-handler` | UI-thread worklet character movement, camera pan/zoom, gathering interactions, and UI transitions.                                |
| **Sensory UX**               | `expo-audio` + `expo-haptics`                              | Tool impact feedback (chopping wood, mining ore, reeling fish), coin chimes, and seasonal weather audio.                          |
| **Backend Runtime**          | **Bun.js** (`Bun.serve`, Workers, WebSockets/SSE)          | High-throughput TypeScript server for the P2P Inter-Town Marketplace, seasonal clock, and the **AI Mayor Economy Engine**.        |
| **Cloud DB & Storage**       | **PostgreSQL + Object Storage (R2 / S3)**                  | Authoritative player inventories, marketplace order book, Town Treasury ledgers, and CDN-hosted WebP assets.                      |
| **Cloud AI Engine**          | **Server-Side LLMs (Gemini Flash / Flash-Lite)** + **Nano Banana** | Runs exclusively on Bun.js to power the **AI Mayor** (tax rates, Winter Treasury subsidy decisions, economic events) and assets. |

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

### B. Two-Tier Local Storage Strategy (`MMKV` + `expo-sqlite` + `expo-file-system`)

1. **Hot Path & Session (`react-native-mmkv`):**
   - Stores session auth, onboarding status, live resource balances (`wood, stone, berries, ore, fish, herbs, coins`), current **Season (`SUMMER` | `WINTER`)**, active **AI Mayor Tax Rate**, and **Town Treasury** balance.
   - Synchronous reads/writes (`< 0.05ms`) keep gathering and crafting HUD counters at a locked 60fps.
2. **Relational Town State (`expo-sqlite`):**
   - `map_nodes`: State and respawn timestamps for harvestable nodes across the single map's 5 zones (Village, Forest, Frozen Lake, Mountains, Caves).
   - `buildings`: Plot IDs, upgrade tiers (1–10), and active production/crafting job timestamps (`startedAt`, `completesAt`).
   - `citizens`: Named NPC citizens, their occupation, relationship level, and active resource requests.
   - `economy_events`: Log of AI Mayor tax decrees, Winter subsidy rulings, and active supply/demand multipliers.
3. **Sprite & Asset Cache (`expo-file-system`):**
   - Caches compressed WebP sprites for Yeti characters, items, and building tiers locally on disk.

---

## 3. Single-Map Rendering & Seasonal Engine (`@shopify/react-native-skia`)

### A. The Single Evolving Map
All gameplay takes place on **one unified map** divided into 5 connected zones (**Village Square, Pine Forest, Frozen Lake, Mountain Pass, Crystal Caves**):

- **Seasonal Map Transformation (Summer vs. Winter):**
  - Skia shaders and tile layers transition seamlessly between **Summer** (flowing river, lush crops, green forest canopy) and **Winter** (frozen lake surface unlocking ice-fishing & ice-cavern shortcuts, snow particle shaders, dormant crop fields).
- **In-Place Building Evolution:**
  - Workshop plots and town landmarks render their current upgrade tier (`Tier 1..10`) directly on the map canvas without loading separate world maps.
- **UI-Thread Camera & Movement:**
  - Pan, zoom, and character pathing run on the UI thread via `react-native-reanimated` worklets and `react-native-gesture-handler`.

### B. Brand Design Tokens (Yeti Palette)

Exact hex values sampled from `assets/yeti/android-icon-background.png`:

| Token | Hex | Role |
| :--- | :--- | :--- |
| `brandBlue` | `#40A7FC` | Primary Yeti blue for active accents, focus states, and highlights. |
| `brandIce` | `#C0CEF5` | Splash screen & Android adaptive icon background, primary soft CTA buttons. |
| `brandBlack` | `#000000` (`#0A0A0A` UI) | High-contrast typography, active indicators, and borders. |
| `brandWhite` | `#FFFFFF` | Primary light canvas background and card surfaces. |
| `brandFrost` | `#E2E2E4` | Subtle surface tint and inactive UI elements (sampled from Yeti shading). |

---

## 4. Cloud AI Mayor & Multiplayer Economy Architecture (Remote Bun.js Server)

All AI decision-making and multiplayer marketplace matching run on the remote **Bun.js** server so the mobile app stays lightweight and tamper-proof:

```
+-----------------------------------------------------------------------------+
|                           CLIENT (EXPO MOBILE)                              |
|                                                                             |
|  [Explore / Gather / Produce] ---> [MMKV + SQLite] <---> [Bun.js API / WS]  |
+-----------------------------------------------------------------|-----------+
                                                                  v
+-----------------------------------------------------------------------------+
|                         REMOTE SERVER (BUN.JS)                              |
|                                                                             |
|  1. [Inter-Town Marketplace Engine (PostgreSQL ACID Order Book)]            |
|  2. [Seasonal Clock (Summer <-> Winter 2x Supply/Demand Pricing)]           |
|  3. [AI Mayor Director (Gemini Flash-Lite): Taxes, Treasury & Subsidies]    |
+-----------------------------------------------------------------------------+
```

### A. The AI Mayor Director (Taxes, Treasury & Winter Subsidies)
The **AI Mayor** is an autonomous server-side agent that governs the town's fiscal policy and economic events:

1. **Dynamic Business Taxation:**
   - Evaluates town production volume and Treasury reserves, setting the **Town Tax Rate** on Yeti business earnings and marketplace sales, routing tax revenue into the **Town Treasury**.
2. **Winter 2x Price Spike & Subsidy Decision:**
   - When the seasonal clock switches to **Winter**, essential and scarce commodities spike up to **2x** based on marketplace supply and demand.
   - The **AI Mayor** inspects the **Town Treasury** and outputs a structured policy decision:
     ```json
     {
       "season": "WINTER",
       "taxRate": 0.14,
       "subsidyPolicy": "PARTIAL_CUSHION",
       "treasurySpent": 1200,
       "priceMultipliers": { "firewood": 1.25, "fish": 2.0, "iron_ore": 1.8 },
       "decree": "The Treasury will cushion firewood costs this Winter, but fish and ore traders must brave the 2x market!"
     }
     ```
   - **Subsidized Goods:** Keep citizen happiness and workshop speeds high while draining the Town Treasury.
   - **Unsubsidized (2x) Goods:** Force citizens/players to absorb the 2x cost locally—or create massive profit opportunities for players who stockpiled in Summer and sell on the Inter-Town Marketplace.
3. **AI Economic Events:**
   - Generates periodic supply/demand shocks (e.g., *Cave Frost Collapse*, *Harvest Festival*, *Timber Shortage*) that buff or reduce specific resource yields and trigger new NPC citizen requests.

### B. Player-Driven Inter-Town Marketplace
- **Shared Order Book (`POST /api/market/orders`, `POST /api/market/fulfill`):**
  - Players post buy or sell orders for resources (`wood, stone, ore, fish, herbs, cooked food, furniture, tools`).
  - Players from other towns fulfill those orders. Every trade executes inside an atomic PostgreSQL transaction (escrowing items, transferring coins, and deducting the AI Mayor's tax cut into the Town Treasury).
- **Live Price & Order Updates:**
  - Bun.js broadcasts order fills, seasonal transitions, and AI Mayor decrees over lightweight WebSockets/SSE (`< 1–2 KB` JSON payloads).

---

## 5. Performance, Compression & Security

- **Ultra-Lightweight Assets:** All character portraits, item icons, and building sprites are compressed on Bun.js via `sharp` into **WebP (quality 70–75)** (`~15–30 KB` per sprite) and cached via `expo-file-system`.
- **Windows NDK/CMake Path Protection:** `plugins/with-short-cmake-paths.js` configures `buildStagingDirectory` (`C:/cx`) and `-DCMAKE_OBJECT_PATH_MAX=220` so Android native builds succeed cleanly on Windows.
- **Zero Client Secrets & Authoritative Economy:** No LLM or database keys are shipped in the Expo client. All marketplace trades, tax calculations, and AI Mayor rulings are validated server-side on **Bun.js**.
