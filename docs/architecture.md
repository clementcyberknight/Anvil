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
  - Skia shaders and tile layers transition seamlessly between **Summer** (flowing river, lush crops, green forest canopy) and **Winter** (frozen lake surface unlocking ice-fishing & ice-cavern shortcuts, snow particle shaders, Winter soil refreeze decay).
- **Tile Grid, Tiered Building Footprints & Tool Editing (`84px` Tiles):**
  - The valley uses a fine `84 × 84 px` tile grid grouped visually into `4 × 4` blocks (`56 × 100` blocks = `224 × 400` tiles).
  - **Tiered Building Footprints:** Structures declare exact tile footprints (`2×2` defenses/props, `3×3` cottages/small shops, `4×4` workshops/mills, `5×4` civic landmarks/barns) plus a 1-tile **Front Doorway** south of the entrance. Every footprint tile is solid and impassable.
  - **Tool-Gated Tile Shaping (`town_land_tiles` in SQLite):** Default tap mode is safe `Hand / Inspect` (never accidentally digs mud). Players open the wooden **Tool Floater** to equip:
    - **`Hoe` (`1×1` Farm Soil):** Tills a single `1×1` tile of loamy soil for planting. In **Winter**, exposed tilled soil carries a `refreezeAtMs` timer — when frost reclaims the tile, the soil reverts to snowy ground and any unharvested crop on it disappears.
    - **`Shovel` (`1×1` Permanent Path):** Lays a single `1×1` village path tile (frosted cobblestone in Winter, dirt lane in Summer). **Paths never refreeze or decay** across seasons and automatically fuse into the town road network.
- **Dynamic Walkability Grid, Off-Road Forest Trips & House Entry:**
  - A compact `Uint8Array` tile walkability grid is rebuilt only on building placement/move or path/farm edits (`< 0.1 ms`), preventing villagers from ever walking over or through houses — even after buildings are moved.
  - Weighted A\* pathfinding assigns `cost = 1` to permanent **Paths** (`+35%` walk speed), `cost = 4` to **Open Snow/Grass & Forest Edge** (allowing citizens to walk off-road into the forest/lake shore), `cost = 12` to **Farm Soil/Crops**, and `∞` (blocked) to **Buildings & Deep Water**.
  - **Entering & Leaving Houses:** Upon reaching a building's **Front Doorway tile**, villagers smoothly step inside and vanish (`scale = 0` in the Skia `<Atlas>` RSXform buffer — zero React re-renders) for an indoor stay, then reappear at the Front Doorway facing South when they leave.
- **In-Place Building Evolution:**
  - Workshop plots and town landmarks render their current upgrade tier (`Tier 1..10`) directly on the map canvas without loading separate world maps.
- **UI-Thread Camera & Movement:**
  - Pan, zoom, and character pathing run on the UI thread via `react-native-reanimated` worklets and `react-native-gesture-handler`.

### B. Brand & Wooden Parchment UI Tokens

In-world modals, floating cards, edit bars, raid trays, and dock floaters follow a unified **Cozy Wooden Parchment** theme (`src/components/town/wood-theme.ts`) paired with the Yeti brand palette:

| Token | Hex | Role |
| :--- | :--- | :--- |
| `sheetBg` / `cardBg` | `#F5ECD8` / `#FFF9EC` | Warm cream parchment modals, building edit bars, and citizen cards. |
| `sheetBorder` / `dockBorder` | `#8B5A2B` / `#C67432` | Carved oak modal frames and uniform `60×60` squircle dock floaters. |
| `ctaGoldBg` / `inkPrimary` | `#F59E0B` / `#2E1A0B` | Primary amber-gold action pills and high-contrast espresso ink. |
| `brandBlue` | `#40A7FC` | Yeti mascot accent, active highlights, and winter frost accents. |
| `brandIce` | `#C0CEF5` | Splash screen & Android adaptive icon background. |

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

### B. Player-Driven Inter-Town Marketplace & Multiplexed Sync (`src/lib/anvil-live-sync.ts`)
- **Zero-Rerender Multiplexed Native WebSocket (`AnvilMultiplexedSyncClient`):**
  - Opens **one** persistent native `WebSocket` (`perMessageDeflate: true`) multiplexed across `user:<accountId>` (personal sale fills & raid alerts) and `town:<activeTownId>` (live valley intents).
  - Incoming `NPC_INTENT` packets (`~0.08 Hz` intent vectors, `~220 B/s`) bypass React `useState` completely via `liveIntentBridgeRef`, writing directly into `TownMapCanvas`'s Reanimated `SharedValue` flat buffer (`useRSXformBuffer`) for locked 60/120fps motion.
  - **MMKV Idempotent Outbox + `?lastSeq` Cellular Delta Catch-Up:** Optimistic player actions (`HARVEST_GAIN`, `LOCAL_SELL`, `LOCAL_BUY`) commit to `MMKV` in `0 ms` and queue `{ cmdId }` in an `MMKV` outbox; reconnects pass `?lastSeq=<n>` to replay only missed frames (`DELTA_BATCH`) from the server's 256-slot ring buffer.
  - **1-Frame Town Hop (`SWITCH_TOWN`):** Visiting another valley swaps `town:<id>` pub/sub subscriptions over the already-open socket in `< 15 ms` with zero new TLS handshake.
- **Atomic Escrow Order Book (`POST /api/market/orders`, `POST /api/market/orders/:id/fulfill`):**
  - Players post escrowed sell orders from their Pouch; buyers in other valleys fulfill them atomically (`private.settle_intertown_order` / `InterTownMultiplayerHub`), pushing live `ORDER_FILLED` coin chimes to `user:<sellerId>` and crediting the `6%` export tariff to the seller's Home Town Treasury without cross-shard locks.

---

## 5. Performance, Compression & Security

- **Ultra-Lightweight Assets:** All character portraits, item icons, and building sprites are compressed on Bun.js via `sharp` into **WebP (quality 70–75)** (`~15–30 KB` per sprite) and cached via `expo-file-system`.
- **Windows NDK/CMake Path Protection:** `plugins/with-short-cmake-paths.js` configures `buildStagingDirectory` (`C:/cx`) and `-DCMAKE_OBJECT_PATH_MAX=220` so Android native builds succeed cleanly on Windows.
- **Zero Client Secrets & Authoritative Economy:** No LLM or database keys are shipped in the Expo client. All marketplace trades, tax calculations, and AI Mayor rulings are validated server-side on **Bun.js**.
