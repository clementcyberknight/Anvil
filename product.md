# Product Specification: Anvil (Yeti Town & Economy Sandbox)

## 1. Product Vision
A mobile multiplayer town-building, resource-management, and player-driven economy game where every player plays directly as the main Yeti character in their own town on **one living, evolving map**. Players explore biomes, gather raw materials, produce crafted goods, fulfill NPC citizen requests, trade orders with other players' towns on a shared marketplace, and navigate a dynamic **Summer/Winter seasonal economy** governed by an **AI Mayor** that controls town taxes, the Town Treasury, economic events, and Winter price subsidies.

---

## 2. Core Gameplay Pillars (The 5 Player Actions)

1. **Explore**
   * Roam a single cohesive map featuring the **Village, Forest, Frozen Lake, Mountains, and Caves**.
   * Discover seasonal resource nodes, named NPC citizens, quests, and hidden locations (such as Winter-only frozen lake paths and ice caverns).
2. **Gather**
   * Collect **wood, stone, berries, ores, fish, herbs**, and seasonal materials.
   * Use crafted tools and interact directly with the environment with crisp animations and haptics.
3. **Produce**
   * Plant crops, raise animals, process raw materials, cook food, craft furniture, and manufacture products across your town's workshops.
4. **Trade (Player-Driven Marketplace)**
   * Post buy/sell trade orders on the shared **Inter-Town Marketplace** and fulfill orders posted by players from other towns to acquire scarce resources and grow your businesses.
5. **Expand**
   * Upgrade workshops and buildings in place on the single map, unlock deeper biome zones, improve relationships with occupation NPCs, earn XP, and expand your settlement.

---

## 3. Town Life, Seasonal Economy & The AI Mayor

### A. Living Town & Occupations
* Your town is home to NPC citizens with distinct **occupations** (Blacksmith, Chef, Carpenter, Angler, Miner, Herbalist) who actively request resources from you.
* Fulfilling citizen requests levels up their workshop efficiency, increases town prosperity, and grows the local tax base.

### B. The AI Mayor (Taxes, Treasury & Events)
* **AI-Controlled Tax Policy & Treasury:** The **AI Mayor** (powered by our remote Bun.js Cloud AI) sets and adjusts tax rates on Yeti businesses, collects tax revenue into the **Town Treasury**, and triggers dynamic town events that increase or reduce resource yields and demand.
* **Summer vs. Winter Cycle:**
  * **Summer (Growth & Stockpiling):** Standard 1x baseline prices; crops and foraging thrive. Players expand production, trade surpluses, and build reserves while the AI Mayor grows the Town Treasury.
  * **Winter (2x Scarcity & AI Subsidy Decision):** During Winter, resource and marketplace prices can surge up to **2x** depending on supply and demand. The **AI Mayor** evaluates the Town Treasury and town state to decide whether to **cushion/subsidize prices using the Town Treasury** or **let citizens and businesses absorb the 2x cost**—creating high-stakes trading and stockpiling opportunities across the multiplayer marketplace.

---

## 4. Core Loops & Retention (Single-Map Depth)

| Cadence | Loop Focus | Player & AI Mayor Dynamics |
| :--- | :--- | :--- |
| **Minute-to-Minute** | **Gather, Craft & Fulfill** | Walk the map, harvest nodes with tools, load workshop queues, and complete active NPC citizen resource requests. |
| **Daily Loop** | **Trade & Adapt to AI Policy** | Post and fulfill inter-town marketplace orders, react to the AI Mayor's daily tax rate and economic event modifiers, and upgrade town buildings. |
| **Seasonal Loop** | **Summer Prep → Winter 2x Shift** | Stockpile scarce goods in Summer; profit from 2x Winter marketplace demand or adapt to the AI Mayor's Treasury subsidy decision. |

* **Single-Map Stickiness:** Instead of unlocking separate maps, the **single map evolves vertically and seasonally**—buildings visually upgrade across 10 tiers, citizen occupation ranks unlock rare recipes, and Winter physically transforms the lake, forest, and caves.

---

## 5. Brand Identity & Color Palette (Yeti Theme)
Sampled directly from the Anvil Yeti mascot (`assets/yeti/android-icon-background.png`):

| Role | Name | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Brand Blue** | Yeti Blue | `#40A7FC` | Active highlights, interactive accents, links, and badges. |
| **Brand Tint / Splash** | Periwinkle Ice | `#C0CEF5` | Splash screen background, adaptive icon backdrop, primary soft CTA buttons. |
| **Primary Dark / Ink** | Obsidian Black | `#000000` (`#0A0A0A` UI) | Headlines, high-contrast button text, icons, and Yeti linework contrast. |
| **Primary Light Surface** | Pure White | `#FFFFFF` | Main screen backgrounds, cards, and clean editorial layouts. |
| **Secondary Neutral** | Frost Gray | `#E2E2E4` | Subtle borders, inactive indicators, and secondary card surfaces. |
