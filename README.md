# Anvil — Yeti Town & Player-Driven Economy Game

Anvil is an Expo / React Native mobile game where every player plays directly as the main Yeti character in their own town on **one evolving map**—exploring biomes, gathering resources, crafting goods, fulfilling NPC citizen requests, trading with other players' towns on a shared marketplace, and navigating a **Summer/Winter seasonal economy** governed by an **AI Mayor**.

---

## Core Gameplay Loops

1. **Explore:** Visit the Village, Forest, Frozen Lake, Mountains, and Caves on a single living map to discover resources, named occupation NPCs, quests, and seasonal secrets.
2. **Gather:** Harvest wood, stone, berries, ores, fish, and herbs using crafted tools.
3. **Produce:** Farm crops, raise animals, cook food, process materials, and manufacture furniture and tools across your town's workshops.
4. **Trade:** Post and fulfill trade orders with players from other towns on the shared **Inter-Town Marketplace**.
5. **Expand:** Upgrade buildings across 10 visual tiers, level up citizen occupations, and adapt to the **AI Mayor**—who taxes Yeti businesses into the Town Treasury, triggers economic events, and decides whether to subsidize **2x Winter price spikes** or let citizens absorb the cost.

---

## Tech Stack

- **Runtime & Package Manager:** [Bun](https://bun.sh) (`bun` / `bunx`)
- **Mobile App:** Expo SDK 58 (React Native New Architecture / JSI) + Expo Router (`src/app/`)
- **Storage & State:**
  - `react-native-mmkv` — Hot key-value & session state (inventory counters, seasonal flags, onboarding)
  - `expo-sqlite` — Relational town state (map nodes, building tiers, citizen requests, market cache)
  - `expo-file-system` — Compressed WebP sprite & asset cache
- **Rendering & Motion:** `@shopify/react-native-skia` + `react-native-reanimated` + `react-native-gesture-handler`
- **Backend & Cloud AI:** Remote **Bun.js** server powering the P2P Marketplace, Seasonal Clock, and **Cloud AI Mayor**
- **Linting & Type Safety:** Oxlint + vendored `anti-slop` rules (`oxlint.config.ts`) + strict TypeScript

---

## Getting Started (Bun Only)

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Run on Android Studio Emulator (First build / after adding native modules):**
   ```bash
   bunx expo run:android
   ```

3. **Start the Metro dev server (JS/TS changes):**
   ```bash
   bunx expo start --android
   ```

4. **Run Linting & Typecheck:**
   ```bash
   bunx oxlint
   bunx tsc --noEmit
   bunx expo lint
   ```

---

## Key Documentation

- [Product Specification (`product.md`)](./product.md)
- [System Architecture (`architecture.md`)](./architecture.md)
- [Agent & Engineering Rules (`AGENTS.md`)](./AGENTS.md)
