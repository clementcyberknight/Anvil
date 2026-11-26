# Game Design Bible: Resources, Crafting Chains, Tools & Occupations

# Anvil — Complete Game Design & Systems Economy Bible

## 1. Core Philosophy: Open Occupations on One Living Map

- **Your Yeti Can Do It All:** The player is **not** locked into a single class. Your Yeti can gather any raw material, learn any trade, and **own/operate any business on your town map** (e.g., you can own a **Farm**, a **Mill**, a **Bakery**, a **Sawmill**, or a **Blacksmith Forge**).
- **Specialize or Vertically Integrate:**
  - _Full Chain Owner:_ Own the **Farm → Mill → Bakery** to turn cheap seeds into high-margin **Bread & Berry Pies** yourself.
  - _Specialist Tycoon:_ Focus your town on a high-level **Mill & Bakery**, buy raw **Maize** from other players' towns on the Marketplace, and export finished **Bread** during Winter at **2x prices**.
    > **Document Purpose:** Authoritative single-source specification for **Anvil**—a multiplayer Yeti town-building, resource-management, and player-driven economy game on **one living, evolving map** governed by a **Summer/Winter seasonal cycle** and a **Cloud AI Mayor**.
    >
    > **Core Rule:** Every raw resource, intermediate material, and final crafted product is cataloged **first** (Sections 2–3), then mapped into explicit `Input => Station + Tool => Output` crafting chains (Section 4), followed by all tools, all 24 playable occupations, seasonal & AI Mayor treasury mechanics, inter-town trade, citizen life, and every supporting gameplay loop (Sections 5–15).

---

## 2. Master Production & Crafting Chains (`Input => Process => Output`)

## Table of Contents

### A. Farming, Milling & Baking Chain (Village Valley)

The backbone of town food and stamina recovery.

1. [Core Pillars, Storyline & The Single-Map World](#1-core-pillars--the-single-map-world)
   - [1.3 World Lore, Founding Storyline & Economic Expansion Arc](#13-world-lore-founding-storyline--economic-expansion-arc)
2. [Master Catalog: Raw Resources (Listed First)](#2-master-catalog-raw-resources-listed-first)
3. [Master Catalog: Processed Intermediates & Final Products (Listed First)](#3-master-catalog-processed-intermediates--final-products-listed-first)
4. [Complete Production & Crafting Chain Maps](#4-complete-production--crafting-chain-maps)
5. [Master Tool, Equipment, Durability & Gear Loop](#5-master-tool-equipment-durability--gear-loop)
6. [Complete Occupation & Business Directory (All 24 Professions)](#6-complete-occupation--business-directory-all-24-professions)
7. [Seasonal Cycle, Weather & Single-Map Transformation (Summer vs. Winter)](#7-seasonal-cycle-weather--single-map-transformation-summer-vs-winter)
8. [The AI Mayor, Business Taxation & Town Treasury Engine](#8-the-ai-mayor-business-taxation--town-treasury-engine)
9. [Dynamic Cloud AI Events & Economic Shocks](#9-dynamic-cloud-ai-events--economic-shocks)
10. [Player-Driven Inter-Town Marketplace & Trade Loop](#10-player-driven-inter-town-marketplace--trade-loop)
11. [Living NPC Citizens, Requests, Relationships & Morale Loop](#11-living-npc-citizens-requests-relationships--morale-loop)
12. [Extended Gameplay Loops (Mining, Survival, Exploration, Cozy Home, Social & Prestige)](#12-extended-gameplay-loops-mining-survival-exploration-cozy-home-social--prestige)
13. [Single-Map Vertical Progression & Building Evolution Matrix (Tier 1–10)](#13-single-map-vertical-progression--building-evolution-matrix-tier-110)
14. [Economy Math, Pricing Formulas, Gold Sinks & Anti-Exploit Rules](#14-economy-math-pricing-formulas-gold-sinks--anti-exploit-rules)
15. [End-to-End Player Journey & Screen/HUD Blueprint](#15-end-to-end-player-journey--screenhud-blueprint)
16. [Questlines, Seasonal Contracts & Achievement Mastery Catalog](#16-questlines-seasonal-contracts--achievement-mastery-catalog)
17. [The 40-Item Heritage Museum & Hidden Single-Map Secrets](#17-the-40-item-heritage-museum--hidden-single-map-secrets)
18. [Tactile Gathering & Crafting Mini-Mechanics (Active Play vs. Cozy Auto)](#18-tactile-gathering--crafting-mini-mechanics-active-play-vs-cozy-auto)
19. [Multi-Archetype Economic Stress-Test & Balance Benchmarks](#19-multi-archetype-economic-stress-test--balance-benchmarks)
20. [Economy Telemetry, Anti-P2W Fair Play Guardrails & Expansion Roadmap](#20-economy-telemetry-anti-p2w-fair-play-guardrails--expansion-roadmap)
21. [Single-Map Resource Node Spawn Atlas & Respawn Economy](#21-single-map-resource-node-spawn-atlas--respawn-economy)
22. [NPC Citizen Daily Schedules, Request Scaling & Winter Morale Dialogues](#22-npc-citizen-daily-schedules-request-scaling--winter-morale-dialogues)
23. [Cloud AI Mayor Guardrails, Clamps & Deterministic Fallbacks (Bun.js)](#23-cloud-ai-mayor-guardrails-clamps--deterministic-fallbacks-bunjs)
24. [Master Glossary & Systems Cross-Reference Matrix](#24-master-glossary--systems-cross-reference-matrix)
25. [Seasonal Festivals, Multiplayer Leaderboards & Yeti Customization Loop](#25-seasonal-festivals-multiplayer-leaderboards--yeti-customization-loop)
26. [Rival Town Raids, Yeti Army & Town Defense Warfare (Clash-Style Economy Combat)](#26-rival-town-raids-yeti-army--town-defense-warfare-clash-style-economy-combat)

---

## 1. Core Pillars & The Single-Map World

### 1.1 High-Level Game Identity

- **You Are the Main Yeti:** Every player directly controls their own Yeti character walking, gathering, building, crafting, and trading inside their own town.
- **Open Occupations:** Your Yeti is never locked into a single class. You can participate in **any** of the 24 occupations and construct/own **any** workshop or business on your town map (a Bakery, a Mill, a Sawmill, a Blacksmith Forge, a Glassworks, a Tavern, etc.).
- **One Living Map:** The entire game happens on **one unified, interconnected map** that evolves vertically (10 visual tiers per plot/landmark) and transforms seasonally between **Summer** and **Winter**.
- **Player-Driven Inter-Town Economy:** Because time, stamina, land plots, and seasonal conditions create natural specialization, players post buy/sell trade orders on a shared **Inter-Town Marketplace**, and players from other towns fulfill them.
- **The Cloud AI Mayor:** An autonomous AI Mayor governs your town's **business taxes**, manages the **Town Treasury**, broadcasts **dynamic economic events**, and decides during **Winter 2x price spikes** whether to **cushion/subsidize prices using the Town Treasury** or **let citizens and businesses absorb the 2x cost**.

### 1.2 Anatomy of the Single Map (5 Core Zones + 3 Unlockable Sub-Zones)

The single map is laid out as a cohesive mountain-valley settlement rendered in `@shopify/react-native-skia`:

| Zone ID                  | Zone Name                                          | Map Position       | Core Role                                                                                    | Summer State                                                                           | Winter State                                                                                                                                    |
| :----------------------- | :------------------------------------------------- | :----------------- | :------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| `zone_village`           | **The Village Square & Valley**                    | Center             | Town Hall, Trade Post, Citizen Homes, Workshops, Farm Plots, Pastures, Yeti Home.            | Green lawns, blooming gardens, outdoor market stalls, flowing millstream.              | Snow-blanketed cobblestone, glowing street lanterns, chimney smoke, frozen millstream (wind-powered mill takes over).                           |
| `zone_forest`            | **Pine & Birch Forest**                            | West               | Logging trees, foraging berries/herbs/mushrooms, beekeeping apiaries, hunting/resin tapping. | Lush canopy, ripe wild berry bushes, active beehives, shaded foraging trails.          | Snow-laden pines, scarce berries, high firewood harvesting demand, rare **Frost Mint** blooms.                                                  |
| `zone_lake`              | **Frozen Lake & River**                            | South              | Fishing docks, reed/clay banks, boat trade pier, ice harvesting.                             | Open blue water; boat fishing, reed/clay gathering on muddy shores, active Waterwheel. | **Freezes solid into walkable ice.** Unlocks **Ice-Fishing Holes**, **Ice Block Sawing**, and a **footpath across the lake** to the Ice Cavern. |
| `zone_mountains`         | **Frostpeak Mountains**                            | North              | Surface rock quarry, copper/coal outcrops, alpine herbs, goat pastures, lookout cliffs.      | Clear switchback trails, steady stone/copper quarrying, mountain ginseng sprouts.      | High windchill (requires Winter Coat or Warmth Tea); avalanche rubble exposes bonus iron veins.                                                 |
| `zone_caves`             | **Deep Echo Caves**                                | Northeast          | Multi-depth underground mining (Iron, Coal, Silver, Gold, Gems, Quartz).                     | Warm relative to winter; steady mining with Lantern Oil.                               | Deeper vents freeze into crystalline walls; higher ore density but faster lantern drain.                                                        |
| `sub_ice_cavern`         | **Glacier Crystal Cavern** _(Unlockable / Winter)_ | Across Frozen Lake | Exclusive high-tier **Ice Crystals** and **Frost Pearls**.                                   | **Inaccessible** (surrounded by deep water unless Tier 8 Ice-Breaker Ferry is built).  | **Walkable across Frozen Lake** — prime Winter risk/reward expedition zone.                                                                     |
| `sub_deep_shaft`         | **Ancient Deep Shaft** _(Unlockable)_              | Beneath Caves      | Endgame **Mithril/Glacier Ore**, **Ancient Relics**, and rare **Gem Geodes**.                | Accessible via Tier 5 Cave Elevator.                                                   | Accessible via Tier 5 Cave Elevator; bonus crystal resonance.                                                                                   |
| `sub_greenhouse_terrace` | **Sun-Glass Terrace** _(Unlockable)_               | East Village Ridge | Glass-enclosed terraces allowing crops to grow even in Winter.                               | +20% exotic crop yield.                                                                | **Only place to grow Summer crops during Winter** (requires Glass Panes + Firewood heating).                                                    |

---

### 1.3 World Lore, Founding Storyline & Economic Expansion Arc

#### The Legend of the First Anvil (Premise)
Two centuries ago, **Frostpeak Valley** was the richest alpine refuge in the North. Centered around a deep spring-fed lake that thawed every Summer, the old Yeti guilds forged the legendary **First Anvil** — a symbol of craft, fair trade, and shared warmth. Every cobblestone road met at its Plaza Stone Well, and its hearths never went cold.

Then came the **Great Blizzard of ’812**. An unrelenting freeze sealed the mountain passes, collapsed the Echo Cave shafts, drained the old Treasury, and scattered the guilds. For generations, Frostpeak Valley stayed buried under snow — leaving behind only the **Plaza Stone Well**, the frozen **Fishing Lake**, a weathered **Town Hall**, and a half-collapsed **Timber Shelter** beside the woods.

> **Core Realism Rule — No Summer Until Hour 72:**
> Every new town begins in **dead Winter (`Hour 0 → Hour 72`)**. Seasons advance strictly on the **72-hour gameplay seasonal cycle** (never by clicking the pond). During the first 72 hours, the mountain passes are snowed shut and the ground is frozen solid — **no Maize, no Wheat, no Bakery, and no Summer crops exist yet**. Everything the town becomes must be earned from ice, timber, fish, and real economic exchange.

#### How the Town Starts & Expands Through Real Economic Activity (The 5-Act Arc)

##### Act I — The First Freeze (`Hours 0–72`: Ice Fishing, Firewood & The First Warm Room)
- **Stranded in Dead Winter:** You arrive in Frostpeak Valley as the **Founder Yeti** — not wandering passively on the map, but commanding the valley directly with your **Founder Pouch** (starting with a worn `Fishing Rod`, `Timber Hatchet`, `Fillet Knife`, and a few `Frost Coins`). Inside the frozen valley, only two stubborn holdouts remain: **Mayor Barnaby** (guarding the tattered original Town Charter inside Town Hall) and **Hector the Architect** (trying to keep a stove lit inside a half-built timber workshop).
- **Where the First Wood Room Comes From:** There is no cozy village yet — just cold wind and snow-heavy pines. Your first job is raw survival: chop deadfall pines for **Split Firewood** (keeping the stove burning) and rough **Pine Logs** so Hector can patch and enclose the **First Warm Timber Room (Yeti Lodge / Bunkroom)**, giving arriving Yetis shelter from the freeze.
- **Where the First Food & Coins Come From (Fish & Fish Stew):** With the earth frozen solid and mountain trade passes blocked, **no grain or Maize exists anywhere in the valley**. The only reliable, cheapest food is **Ice-Hole Lake Trout** pulled from the **Frozen Lake** and boiled with spring water from the **Plaza Stone Well** into steaming bowls of **Fish Stew** (`12–18 FC`) and **Smoked Fish**.
- **The First Economic Loop:** Shivering **Drifters (`Toby`)** wander down from the high ridges drawn by chimney smoke. They pay their first few coins (or trade day-labor hauling logs) for cheap **Fish Stew**, **Smoked Fish**, and **Firewood**. Every bowl sold sends the very first **Business Tax (`8–15%`)** into **Mayor Barnaby’s empty Treasury**, funding the first cleared cobblestone street, the **Lakeside Fishing Pier**, **Smokehouse**, **Sawmill**, and **Hector’s Builder Shop**.

##### Act II — The First Great Thaw (`Hour 72–144`: Summer Opens the Pass, Maize Arrives & The Housing Boom)
- **The 72-Hour Breakthrough:** After surviving your full first **72-hour Winter**, the snow finally melts across Frostpeak Valley, revealing green alpine meadows and unlocking the **Southern Mountain Pass** for the first time in decades!
- **Where Maize & Agriculture Actually Come From:** With the pass thawed, the **First Southern Merchant Caravan** rolls into the **Market Trade Post** — trading **Maize Seeds, Wheat Seeds, Flax Seeds, and Mountain Yaks** in exchange for your Winter stockpile of **Smoked Fish, Pine Planks, and Forged Iron**.
- **Agricultural & Artisan Explosion:** For the first time, you can clear thawed `4×4` meadow blocks into rich **Loamy Soil**, plant the valley’s **first Maize & Wheat**, and commission **Hector’s Builder Crew** to construct the **Windmill Cottage**, **Cozy Bakery**, **Yak Barn**, and **Alpine Cheese Cellar**. Cheap Winter Fish Stew evolves into a full multi-tier economy of **Flour, Artisan Bread, Aged Cheese, Yak Wool, and Iron Tools**.
- **Real Estate & Rent Expansion:** Word of the thawed valley spreads. Autonomous AI Yetis arrive as **Hopeful Drifters**, take wages across farms and workshops, and save enough Frost Coins to rent **Citizen Cottages** built by **you** or rising **Landlord Yetis (`Lord Sterling`)** (financed via **Alistair’s Town Bank**). Builders buy planks from the Sawmill and iron nails from **Torin’s Blacksmith**, expanding cobblestone roads outward across the `5,600`-block valley organically.

##### Act III — Return of the Blizzard (`Hour 144+`: The Winter `2×` Crucible, Crime, Law & The Frost Cult)
- **A Real Town Faces the Freeze:** When the 72-hour Summer ends and **Winter slams back into Frostpeak Valley**, it no longer hits an empty camp — it hits a living economy of tenants, landlords, bakeries, workshops, and a stocked **Town Bank**. Outdoor Maize and Wheat freeze solid, heating demand skyrockets, and market prices spike up to **`2.0×`**.
- **The AI Mayor’s Dilemma:** Mayor Barnaby must decide how to deploy the Summer **Town Treasury**:
  - *Subsidize Essentials (`TARGETED_ESSENTIALS` / `FULL_CUSHION`)* so tenants can afford Bread, Fish Stew, and Firewood, **or**
  - *Enforce `AUSTERITY` / Raise Taxes* to protect the vault, forcing households and shops to absorb the `2×` shock.
- **Emergent Social Fracture:** Economic pressure drives genuine citizen drama:
  - **Crime & Town Watch:** Unemployed, freezing tenants who default on rent can slip into **Outlaw crime (`Sly Rusk`)**, stealing firewood or pilfering unguarded shops — forcing Mayor Barnaby to pay **Town Guards (`Officer Vane`)** out of the Treasury to patrol the Bank, Market, and Cottages (funneling arrest fines back into the Treasury).
  - **The Order of the Eternal Frost (The Cult):** When Winter `2×` spikes and high taxes crush morale, **Elder Vesper** preaches by the Plaza Stone Well, recruiting stressed drifters into the **Frost Cult**. Cultists tithe `30%` of their wages into a secret communal pool to quietly lease a cottage or hire Builders for a hidden **Forest Frost Shrine** — claiming the freeze of ’812 was punishment for unchecked greed.
- **The Founder’s Choice:** Stabilize the valley by building affordable rental cottages, keeping cheap **Fish Stew & Firewood** stocked, and hiring drifters — **or** profit as a Winter arbitrage tycoon exporting Summer stockpiles at `2×` to unprepared neighboring towns while steering Mayor Barnaby with **Civic Favor**.

##### Act IV — Mastering the Freeze (Breaking Seasonal Limits & Regional Trade Empire)
- **Conquering Winter Through Engineering:** Profits from surviving your first full Summer–Winter cycles fund game-changing upgrades:
  - **Sun-Glass Greenhouses** on the East Ridge let you grow Maize, Wheat, and Berries straight through blizzards.
  - **Frost-Core Cold Cellars** halt spoilage permanently so Fish, Milk, and Meat carry seamlessly across seasons.
  - **The Frozen Lake Crossing & Echo Caves Deep Shaft (L4)** unlock **Frost Carp**, **Glacier Ice Crystals**, **Gold Ore**, and buried **Ancient Yeti Relics**.
- **From Survival Camp to Trade Hub:** Through the multiplayer **Inter-Town Marketplace**, your upgraded **Tier 5–10 Sovereign Guildspires** export Masterwork Steel Tools, Heavy Winter Coats, Aged Alpine Cheese, and Frost Carp Chowder across the mountain range.

##### Act V — The Sovereign Valley (Endgame Goals & Four Paths to Legacy)
**Anvil** has no artificial "Game Over" — instead, every survival and economic loop converges on **four interlocking long-term goals**:

| Legacy Pillar | Core Endgame Goal | What It Proves |
| :--- | :--- | :--- |
| **1. The Eternal Aurora Spire** *(Architectural Goal)* | Complete all **10 Stages of the Grand Yeti Monument** in Town Plaza (`Cut Stone → Iron → Silver → Frost Cores → Golden Yeti Crowns → Ancient Relics`). | Your valley grew from one patched Winter wood room and a pot of Fish Stew into a wonder surpassing the kingdom of ’812. |
| **2. A Thriving Living Society** *(Civic & Economic Goal)* | Grow a self-sustaining autonomous town where drifters become homeowners and business owners, citizens reach **Friendship Level 10**, and the town clears a full **Winter `2×` cycle at `>= 85%` Morale** with low crime and a solvent Treasury. | You mastered real economic balance — turning scarcity into shared prosperity. |
| **3. The 40-Item Heritage Museum** *(Discovery & Lore Goal)* | Complete all 4 wings (10 Ancient Relics, 10 Trophy Fish, 10 Frostpeak Gems, 10 Masterwork Heirlooms) to uncover **what truly triggered the Great Blizzard of ’812** and the secret tie between the **Frost Cult** and the makers of the **First Anvil**. | You explored every zone of the single map — Forest, Frozen Lake, Mountains, Glacier Cavern, and Deep Shaft. |
| **4. Sovereign of Frostpeak** *(Multiplayer & Mastery Goal)* | Climb the **Seasonal Prosperity Leaderboard**, sign **Inter-Town Trade Pacts**, master occupations to Level 10, and earn **`Sovereign Founder of Frostpeak`** as a Trade Tycoon, Housing Baron, Master Artisan, or Civic Champion. | Your town stands as a living economic powerhouse visited by players across Anvil. |

---

## 2. Master Catalog: Raw Resources (Listed First)

Every raw resource in **Anvil** is listed below **before** any crafting chain is mapped. All prices are denominated in **Frost Coins (FC)**.

> **Price Columns Explained:**
>
> - **Base (Summer):** Baseline reference value in Summer (`1.0x`).
> - **Winter Peak (2x):** Maximum dynamic seasonal surge value in Winter (`up to 2.0x` depending on marketplace supply/demand and AI Mayor subsidy policy).
> - **Spoilage:** `None` (keeps forever), `Slow` (loses freshness after 2 seasons unless preserved/cold-stored), `Fast` (spoils after 1 season unless processed/smoked/cellared).

### 2.1 Seeds & Agricultural Saplings (Farm Inputs)

| Item ID       | Name                   | Source / Where Obtained           | Base (Summer) | Winter Peak | Stack | Spoilage | Used In                           |
| :------------ | :--------------------- | :-------------------------------- | :-----------: | :---------: | :---: | :------: | :-------------------------------- |
| `seed_maize`  | **Maize Seed**         | Village Seed Stall / Harvest Drop |     3 FC      |    5 FC     |  99   |   None   | Farm Plot → Maize                 |
| `seed_wheat`  | **Wheat Seed**         | Village Seed Stall / Harvest Drop |     3 FC      |    5 FC     |  99   |   None   | Farm Plot → Wheat                 |
| `seed_barley` | **Barley Seed**        | Village Seed Stall / Harvest Drop |     4 FC      |    6 FC     |  99   |   None   | Farm Plot → Barley                |
| `seed_potato` | **Frost Potato Seed**  | Village Seed Stall / Harvest Drop |     4 FC      |    7 FC     |  99   |   None   | Farm Plot → Frost Potato          |
| `seed_flax`   | **Flax Seed**          | Village Seed Stall / Foraging     |     5 FC      |    8 FC     |  99   |   None   | Farm Plot → Raw Flax              |
| `seed_turnip` | **Snow Turnip Seed**   | Village Seed Stall (Winter-hardy) |     4 FC      |    8 FC     |  99   |   None   | Farm Plot → Snow Turnip           |
| `seed_berry`  | **Wild Berry Cutting** | Pine Forest Foraging              |     6 FC      |    10 FC    |  50   |   None   | Orchard Plot → Cultivated Berries |
| `seed_pine`   | **Pinecone Sapling**   | Pine Forest Logging Drop          |     4 FC      |    6 FC     |  99   |   None   | Reforestation Plot → Pine Trees   |
| `seed_oak`    | **Oak Acorn**          | Hardwood Grove Drop               |     8 FC      |    12 FC    |  99   |   None   | Reforestation Plot → Oak Trees    |

### 2.2 Raw Farm Crops (Harvested from Farm Plots & Greenhouse)

| Item ID              | Name             | Biome / Plot                             | Season                        | Tool Required                   | Base (Summer) | Winter Peak | Stack | Spoilage |
| :------------------- | :--------------- | :--------------------------------------- | :---------------------------- | :------------------------------ | :-----------: | :---------: | :---: | :------: |
| `raw_maize`          | **Maize**        | Village Farm                             | Summer (Greenhouse in Winter) | `Hoe`, `Watering Can`, `Sickle` |     8 FC      |    16 FC    |  99   |   Slow   |
| `raw_wheat`          | **Wheat**        | Village Farm                             | Summer (Greenhouse in Winter) | `Hoe`, `Watering Can`, `Sickle` |     8 FC      |    16 FC    |  99   |   Slow   |
| `raw_barley`         | **Barley**       | Village Farm                             | Summer (Greenhouse in Winter) | `Hoe`, `Watering Can`, `Sickle` |     10 FC     |    20 FC    |  99   |   Slow   |
| `raw_potato`         | **Frost Potato** | Village Farm                             | Summer + Early Winter         | `Hoe`, `Spade`                  |     9 FC      |    18 FC    |  99   |   Slow   |
| `raw_turnip`         | **Snow Turnip**  | Village Farm                             | Summer + Winter (Hardy)       | `Hoe`, `Spade`                  |     7 FC      |    14 FC    |  99   |   Slow   |
| `raw_flax`           | **Raw Flax**     | Village Farm                             | Summer                        | `Sickle`                        |     11 FC     |    20 FC    |  99   |   None   |
| `raw_straw`          | **Straw**        | Village Farm (Byproduct of Wheat/Barley) | Summer                        | `Sickle`                        |     3 FC      |    6 FC     |  99   |   None   |
| `raw_sugarcane_root` | **Sweetroot**    | Village Farm / Greenhouse                | Summer                        | `Spade`                         |     12 FC     |    24 FC    |  99   |   Slow   |

### 2.3 Raw Livestock & Apiary Resources (Barn, Coop, Pasture, Apiary)

| Item ID         | Name                     | Source / Animal                 | Season                      | Tool Required              | Base (Summer) | Winter Peak | Stack | Spoilage |
| :-------------- | :----------------------- | :------------------------------ | :-------------------------- | :------------------------- | :-----------: | :---------: | :---: | :------: |
| `raw_milk`      | **Fresh Milk**           | Mountain Yak / Dairy Cow (Barn) | Year-Round                  | `Milk Pail`                |     12 FC     |    24 FC    |  50   |   Fast   |
| `raw_egg`       | **Snow-Hen Egg**         | Village Coop                    | Year-Round                  | `Gathering Basket`         |     6 FC      |    12 FC    |  99   |   Fast   |
| `raw_wool`      | **Thick Yak Wool**       | Mountain Yak / Sheep (Pasture)  | Year-Round                  | `Shears`                   |     14 FC     |    28 FC    |  50   |   None   |
| `raw_hide`      | **Raw Hide**             | Livestock / Ranching            | Year-Round                  | `Skinning Knife`           |     16 FC     |    30 FC    |  50   |   Slow   |
| `raw_meat`      | **Venison / Yak Meat**   | Ranching / Hunting Lodge        | Year-Round                  | `Butcher Knife`            |     18 FC     |    36 FC    |  50   |   Fast   |
| `raw_honeycomb` | **Raw Honeycomb**        | Forest & Village Apiaries       | Summer Peak (Low in Winter) | `Bee Smoker`, `Hive Knife` |     15 FC     |    30 FC    |  50   |   None   |
| `raw_beeswax`   | **Raw Beeswax**          | Apiary Byproduct                | Summer Peak                 | `Hive Knife`               |     10 FC     |    20 FC    |  99   |   None   |
| `raw_manure`    | **Compost / Fertilizer** | Barn Byproduct                  | Year-Round                  | `Shovel`                   |     4 FC      |    6 FC     |  99   |   None   |

### 2.4 Raw Forestry & Foraging Resources (Pine Forest & Mountain Meadows)

| Item ID          | Name                       | Biome                 | Season                  | Tool Required      | Base (Summer) | Winter Peak | Stack | Spoilage |
| :--------------- | :------------------------- | :-------------------- | :---------------------- | :----------------- | :-----------: | :---------: | :---: | :------: |
| `raw_pine_log`   | **Pine Log**               | Pine Forest           | Year-Round              | `Axe`              |     7 FC      |    14 FC    |  99   |   None   |
| `raw_oak_log`    | **Hardwood Oak Log**       | Deep Pine Forest      | Year-Round              | `Iron Axe+`        |     15 FC     |    30 FC    |  99   |   None   |
| `raw_resin`      | **Pine Resin**             | Pine Forest Trees     | Year-Round              | `Tapping Knife`    |     10 FC     |    18 FC    |  99   |   None   |
| `raw_berries`    | **Wild Mountain Berries**  | Pine Forest Bushes    | Summer (Rare in Winter) | `Gathering Basket` |     9 FC      |    18 FC    |  99   |   Fast   |
| `raw_frost_mint` | **Frost Mint**             | Snowy Forest & Cliffs | **Winter Only**         | `Herbalist Sickle` |     18 FC     |    36 FC    |  50   |   Slow   |
| `raw_sun_herb`   | **Sunleaf Herb**           | Forest Clearing       | **Summer Only**         | `Herbalist Sickle` |     12 FC     |    24 FC    |  50   |   Slow   |
| `raw_ginseng`    | **Alpine Ginseng**         | Frostpeak Mountains   | Year-Round (Rare)       | `Herbalist Trowel` |     28 FC     |    56 FC    |  50   |   Slow   |
| `raw_mushroom`   | **Cave Glow-Cap Mushroom** | Echo Caves            | Year-Round              | `Gathering Basket` |     14 FC     |    28 FC    |  50   |   Fast   |
| `raw_reeds`      | **River Reeds**            | Lake & River Banks    | Summer                  | `Sickle`           |     5 FC      |    10 FC    |  99   |   None   |

### 2.5 Raw Mining, Quarrying & Cave Resources (Mountains & Caves)

| Item ID             | Name                    | Biome / Depth                  | Season            | Tool Required     | Base (Summer) | Winter Peak | Stack | Spoilage |
| :------------------ | :---------------------- | :----------------------------- | :---------------- | :---------------- | :-----------: | :---------: | :---: | :------: |
| `raw_stone`         | **Raw Stone**           | Mountain Quarry / Caves        | Year-Round        | `Pickaxe`         |     6 FC      |    12 FC    |  99   |   None   |
| `raw_limestone`     | **Limestone**           | Mountain Quarry                | Year-Round        | `Pickaxe`         |     9 FC      |    16 FC    |  99   |   None   |
| `raw_clay`          | **River Clay**          | Lake Bank (Summer) / Cave Seam | Summer Peak       | `Shovel`          |     7 FC      |    14 FC    |  99   |   None   |
| `raw_silica_sand`   | **Silica Sand**         | Riverbed & Cave Floors         | Year-Round        | `Shovel`          |     8 FC      |    15 FC    |  99   |   None   |
| `raw_coal`          | **Coal**                | Mountains & Echo Caves (L1+)   | Year-Round        | `Pickaxe`         |     11 FC     |    22 FC    |  99   |   None   |
| `raw_copper_ore`    | **Copper Ore**          | Mountains & Echo Caves (L1+)   | Year-Round        | `Pickaxe`         |     12 FC     |    22 FC    |  99   |   None   |
| `raw_iron_ore`      | **Iron Ore**            | Echo Caves (L2+)               | Year-Round        | `Copper Pickaxe+` |     18 FC     |    34 FC    |  99   |   None   |
| `raw_silver_ore`    | **Silver Ore**          | Echo Caves (L3+)               | Year-Round        | `Iron Pickaxe+`   |     30 FC     |    55 FC    |  50   |   None   |
| `raw_gold_ore`      | **Gold Ore**            | Deep Shaft (L4+)               | Year-Round        | `Steel Pickaxe+`  |     50 FC     |    90 FC    |  50   |   None   |
| `raw_salt`          | **Rock Salt**           | Echo Caves (L2+)               | Year-Round        | `Pickaxe`         |     10 FC     |    20 FC    |  99   |   None   |
| `raw_rough_gem`     | **Uncut Alpine Gem**    | Echo Caves (L3+)               | Year-Round        | `Iron Pickaxe+`   |     45 FC     |    80 FC    |  50   |   None   |
| `raw_ice_crystal`   | **Glacier Ice Crystal** | Glacier Crystal Cavern         | **Winter Peak**   | `Steel Pickaxe+`  |     60 FC     |   120 FC    |  50   |   None   |
| `raw_ancient_relic` | **Ancient Yeti Relic**  | Deep Shaft / Hidden Caches     | Year-Round (Rare) | `Explorer Trowel` |    120 FC     |   180 FC    |  20   |   None   |

### 2.6 Raw Fishing, Water & Frozen Lake Resources (Frozen Lake)

| Item ID          | Name                   | Biome                          | Season            | Tool Required              | Base (Summer) | Winter Peak | Stack |                Spoilage                |
| :--------------- | :--------------------- | :----------------------------- | :---------------- | :------------------------- | :-----------: | :---------: | :---: | :------------------------------------: |
| `raw_water`      | **Fresh Spring Water** | Village Well / River           | Year-Round        | `Water Bucket`             |     1 FC      |    2 FC     |  99   |                  None                  |
| `raw_trout`      | **Valley Trout**       | Frozen Lake (Open Water)       | Summer            | `Fishing Rod`              |     11 FC     |    22 FC    |  50   |                  Fast                  |
| `raw_salmon`     | **Glacier Salmon**     | River Rapids / Lake            | Summer            | `Fishing Rod / Net`        |     18 FC     |    36 FC    |  50   |                  Fast                  |
| `raw_frost_carp` | **Frost Carp**         | Frozen Lake (Ice Hole)         | **Winter Only**   | `Ice Auger`, `Fishing Rod` |     24 FC     |    48 FC    |  50   |                  Fast                  |
| `raw_lake_pearl` | **Frost Pearl**        | Deep Lake / Ice Cavern         | Year-Round (Rare) | `Fishing Net / Ice Auger`  |     55 FC     |   100 FC    |  50   |                  None                  |
| `raw_ice_block`  | **Cut Ice Block**      | Frozen Lake Surface            | **Winter Only**   | `Ice Saw`, `Ice Tongs`     |     10 FC     |    20 FC    |  50   | Slow (melts in Summer unless Cellared) |
| `raw_fish_oil`   | **Fish Oil**           | Smokehouse / Fishery Byproduct | Year-Round        | `Fillet Knife`             |     9 FC      |    18 FC    |  50   |                  None                  |

---

## 3. Master Catalog: Processed Intermediates & Final Products (Listed First)

Every processed intermediate material and every final sellable/usable product is listed cleanly below **before** the crafting process diagrams in Section 4.

### 3.1 Processed Intermediate Materials (Refined Inputs for Higher-Tier Crafting)

| Item ID              | Name                           | Category        | Tier | Base (Summer) | Winter Peak | Primary Purpose                                                          |
| :------------------- | :----------------------------- | :-------------- | :--: | :-----------: | :---------: | :----------------------------------------------------------------------- |
| `int_flour`          | **Fine Flour**                 | Grain Milling   |  T1  |     18 FC     |    36 FC    | Core Bakery ingredient (Bread, Pies, Cakes).                             |
| `int_cornmeal`       | **Golden Cornmeal**            | Grain Milling   |  T1  |     18 FC     |    36 FC    | Cornbread, porridge, Tavern batters.                                     |
| `int_malt`           | **Roasted Barley Malt**        | Grain Milling   |  T2  |     22 FC     |    44 FC    | Tavern ales, Winter spiced brews.                                        |
| `int_animal_feed`    | **Mixed Animal Feed**          | Grain Milling   |  T1  |     12 FC     |    24 FC    | Feeds Barn Yaks & Coop Snow-Hens year-round.                             |
| `int_sugar`          | **Refined Sweetroot Sugar**    | Food Refining   |  T2  |     26 FC     |    52 FC    | Berry Jam, Honey Cakes, Glazed Pastries.                                 |
| `int_honey`          | **Strained Honey**             | Apiary Refining |  T1  |     24 FC     |    48 FC    | Baking, Apothecary Tonics, Winter Tea.                                   |
| `int_wax_bar`        | **Purified Beeswax Bar**       | Apiary Refining |  T1  |     18 FC     |    34 FC    | Candles, waterproofing coats, tool polish.                               |
| `int_butter`         | **Churned Butter**             | Dairy           |  T1  |     24 FC     |    48 FC    | Pies, Cakes, Tavern Stews.                                               |
| `int_cheese`         | **Aged Mountain Cheese**       | Dairy           |  T2  |     34 FC     |    68 FC    | High-stamina food, Cheese Pastries, Tavern Fondue.                       |
| `int_fish_fillet`    | **Fresh Fish Fillet**          | Fishery Prep    |  T1  |     22 FC     |    44 FC    | Tavern Grilled Salmon, Fish Stew.                                        |
| `int_cured_meat`     | **Salted Meat**                | Preservation    |  T2  |     32 FC     |    64 FC    | Long-shelf-life Winter meat & Tavern roasts.                             |
| `int_linen_thread`   | **Flax Linen Thread**          | Textiles        |  T1  |     18 FC     |    34 FC    | Fishing lines, woven cloth, sacks, sails.                                |
| `int_linen_cloth`    | **Woven Linen Cloth**          | Textiles        |  T2  |     32 FC     |    60 FC    | Summer tunics, flour sacks, bandages, banners.                           |
| `int_wool_yarn`      | **Spun Yak Wool Yarn**         | Textiles        |  T1  |     22 FC     |    44 FC    | Knitting Winter coats, blankets, scarves.                                |
| `int_wool_cloth`     | **Heavy Wool Cloth**           | Textiles        |  T2  |     42 FC     |    84 FC    | Winter Coats, insulated tents, rugs.                                     |
| `int_leather`        | **Tanned Leather**             | Leathercraft    |  T2  |     36 FC     |    68 FC    | Smelter Bellows, Work Gloves, Boots, Backpacks.                          |
| `int_firewood`       | **Split Firewood**             | Forestry Fuel   |  T1  |     12 FC     |    24 FC    | **Critical Winter fuel:** Ovens, Smokehouses, Town Heating, Greenhouses. |
| `int_pine_plank`     | **Pine Wood Plank**            | Lumber          |  T1  |     16 FC     |    32 FC    | Crates, basic furniture, tool handles, T1–T4 buildings.                  |
| `int_oak_plank`      | **Hardwood Oak Plank**         | Lumber          |  T2  |     34 FC     |    64 FC    | Master furniture, trade wagons, T5–T10 buildings.                        |
| `int_tool_handle`    | **Carved Tool Handle**         | Carpentry       |  T1  |     20 FC     |    36 FC    | Required by **Blacksmith** for every hand tool.                          |
| `int_wood_charcoal`  | **Kiln Charcoal**              | Fuel            |  T2  |     22 FC     |    44 FC    | High-heat fuel substitute for Coal in Smelters.                          |
| `int_pitch`          | **Waterproof Pine Pitch**      | Forestry Chem   |  T2  |     22 FC     |    40 FC    | Boat hulls, roof sealing, torches, lanterns.                             |
| `int_cut_stone`      | **Cut Stone Block**            | Masonry         |  T1  |     16 FC     |    30 FC    | Building foundations, furnaces, cobblestone roads.                       |
| `int_mortar`         | **Lime Mortar**                | Masonry         |  T1  |     14 FC     |    26 FC    | Binds Stone & Bricks in building upgrades.                               |
| `int_brick`          | **Fired Clay Brick**           | Ceramics        |  T1  |     18 FC     |    34 FC    | Bakery ovens, chimneys, T3–T8 town walls & guildhalls.                   |
| `int_millstone`      | **Carved Millstone**           | Masonry         |  T2  |     65 FC     |   120 FC    | Installed/replaced inside **Windmills & Mills**.                         |
| `int_glass_pane`     | **Clear Glass Pane**           | Glassworks      |  T2  |     34 FC     |    68 FC    | **Required for Winter Greenhouses**, windows, lanterns.                  |
| `int_glass_jar`      | **Sealed Glass Jar**           | Glassworks      |  T1  |     16 FC     |    32 FC    | **Required by Apothecary & Kitchen** for jams, honey, tonics.            |
| `int_ceramic_pot`    | **Glazed Ceramic Jar**         | Pottery         |  T1  |     14 FC     |    28 FC    | Food storage, pickling, salted meat preservation.                        |
| `int_copper_bar`     | **Copper Ingot**               | Metallurgy      |  T1  |     28 FC     |    52 FC    | T1 tools, watering cans, wire, pipes, kettles.                           |
| `int_iron_bar`       | **Iron Ingot**                 | Metallurgy      |  T2  |     42 FC     |    80 FC    | T2 tools, iron nails, cookware, hinges, sawblades.                       |
| `int_steel_bar`      | **Tempered Steel Ingot**       | Metallurgy      |  T3  |     78 FC     |   145 FC    | T3 heavy tools, **Ice Augers**, cave elevators, gears.                   |
| `int_silver_bar`     | **Refined Silver Bar**         | Metallurgy      |  T3  |     95 FC     |   175 FC    | Silverware, ornate lanterns, high-tier jewelry.                          |
| `int_gold_bar`       | **Refined Gold Bar**           | Metallurgy      |  T4  |    160 FC     |   290 FC    | Royal crowns, Town Monument inlays, luxury exports.                      |
| `int_iron_nails`     | **Box of Iron Nails**          | Blacksmithing   |  T1  |     24 FC     |    44 FC    | **Required by Carpenters & Builders** for furniture & buildings.         |
| `int_steel_gear`     | **Precision Steel Gear**       | Blacksmithing   |  T3  |     95 FC     |   175 FC    | Mill upgrades, Sawmill machinery, Cave Elevator.                         |
| `int_lantern_oil`    | **Refined Lantern Oil**        | Alchemy / Fuel  |  T1  |     20 FC     |    40 FC    | **Consumed during Cave Mining runs** to illuminate dark depths.          |
| `int_cut_gem`        | **Faceted Alpine Gem**         | Lapidary        |  T3  |    110 FC     |   195 FC    | Jewelry, T4 enchanted tools, Monument crowns.                            |
| `int_frost_core`     | **Refined Frost Crystal Core** | Lapidary        |  T4  |    150 FC     |   280 FC    | **Frost Crystal (T4) Tools**, Perpetual Cold Cellars, Winter Lamps.      |
| `int_shipping_crate` | **Reinforced Trade Crate**     | Logistics       |  T1  |     26 FC     |    48 FC    | Bundles bulk goods for Inter-Town Marketplace fulfillment.               |

---

### 3.2 Final Crafted Products: Bakery, Food & Tavern Meals

| Item ID               | Name                       | Station          | Tier | Base (Summer) | Winter Peak | Stamina / Warmth Effect                                   |
| :-------------------- | :------------------------- | :--------------- | :--: | :-----------: | :---------: | :-------------------------------------------------------- |
| `prod_bread`          | **Artisan Loaf Bread**     | Bakery           |  T1  |     36 FC     |    72 FC    | +25 Stamina; core NPC citizen staple request.             |
| `prod_cornbread`      | **Golden Cornbread**       | Bakery           |  T1  |     38 FC     |    76 FC    | +28 Stamina, +5 Warmth; high demand among Miners.         |
| `prod_berry_pie`      | **Mountain Berry Pie**     | Bakery           |  T2  |     72 FC     |   144 FC    | +55 Stamina, +10% Crafting Speed (10m).                   |
| `prod_cheese_pastry`  | **Flaky Cheese Pastry**    | Bakery           |  T2  |     68 FC     |   136 FC    | +50 Stamina, +15 Warmth.                                  |
| `prod_honey_cake`     | **Glazed Honey Cake**      | Bakery           |  T3  |    115 FC     |   230 FC    | +80 Stamina, +25 Citizen Friendship Gift Bonus.           |
| `prod_smoked_fish`    | **Smoked Glacier Fish**    | Smokehouse       |  T1  |     44 FC     |    88 FC    | +35 Stamina; **never spoils** (prime Winter stockpile).   |
| `prod_berry_jam`      | **Jarred Berry Jam**       | Kitchen / Bakery |  T2  |     58 FC     |   116 FC    | +40 Stamina; **never spoils**; top inter-town trade good. |
| `prod_pickled_turnip` | **Pickled Snow Turnips**   | Kitchen          |  T1  |     34 FC     |    68 FC    | +25 Stamina; cheap Winter survival food for citizens.     |
| `prod_fish_stew`      | **Hot Fish Stew**          | Tavern Kitchen   |  T2  |     78 FC     |   156 FC    | +65 Stamina, +40 Warmth (counters Winter chill).          |
| `prod_winter_chowder` | **Frost Carp Chowder**     | Tavern Kitchen   |  T3  |    130 FC     |   260 FC    | +100 Stamina, +75 Warmth, +15% Gathering Yield (15m).     |
| `prod_roast_feast`    | **Hearty Yak Roast**       | Tavern Kitchen   |  T3  |    120 FC     |   240 FC    | +95 Stamina, +50 Warmth; unlocks Tavern Banquet quests.   |
| `prod_cheese_fondue`  | **Alpine Cheese Fondue**   | Tavern Kitchen   |  T2  |     88 FC     |   176 FC    | +60 Stamina, +60 Warmth; boosts NPC Morale.               |
| `prod_spiced_ale`     | **Warm Spiced Barley Ale** | Tavern Brewery   |  T2  |     64 FC     |   128 FC    | +30 Stamina, +55 Warmth; favorite Winter Tavern drink.    |

---

### 3.3 Final Crafted Products: Apothecary Tonics, Teas & Consumables

| Item ID               | Name                        | Station           | Tier | Base (Summer) | Winter Peak | Gameplay Effect                                               |
| :-------------------- | :-------------------------- | :---------------- | :--: | :-----------: | :---------: | :------------------------------------------------------------ |
| `prod_warmth_tea`     | **Winter Warmth Tea**       | Apothecary        |  T1  |     48 FC     |    96 FC    | **Blocks Winter cold stamina penalty for 15 min.**            |
| `prod_stamina_tonic`  | **Ginseng Stamina Tonic**   | Apothecary        |  T2  |     85 FC     |   170 FC    | Instantly restores 100% Stamina + +15% Move Speed (10m).      |
| `prod_healing_salve`  | **Herbal Healing Salve**    | Apothecary        |  T1  |     46 FC     |    92 FC    | Cures Cave-In fatigue & NPC illness events.                   |
| `prod_glow_elixir`    | **Cave-Sight Elixir**       | Apothecary        |  T2  |     76 FC     |   145 FC    | Highlights hidden cave veins & cuts Lantern Oil drain by 50%. |
| `prod_fertilizer_mix` | **Rich Compost Fertilizer** | Apothecary / Barn |  T1  |     24 FC     |    44 FC    | Cuts crop grow time by 30% + +15% Fine quality chance.        |
| `prod_beeswax_candle` | **Scented Beeswax Candles** | Apothecary / Loom |  T1  |     34 FC     |    68 FC    | Home cozy buff + Winter village lantern supply.               |

---

### 3.4 Final Crafted Products: Furniture, Construction & Town Upgrades

| Item ID                | Name                            | Station                 | Tier | Base (Summer) | Winter Peak | Gameplay / Town Utility                                                  |
| :--------------------- | :------------------------------ | :---------------------- | :--: | :-----------: | :---------: | :----------------------------------------------------------------------- |
| `prod_wood_chair`      | **Pine Dining Chair**           | Carpentry Shop          |  T1  |     45 FC     |    80 FC    | Citizen home furnishing; high-volume Marketplace trade item.             |
| `prod_oak_table`       | **Carved Oak Table**            | Carpentry Shop          |  T2  |    110 FC     |   195 FC    | Cozy Home buff (+5 Max Stamina); Tavern & Citizen upgrades.              |
| `prod_storage_chest`   | **Iron-Bound Storage Chest**    | Carpentry Shop          |  T2  |     95 FC     |   175 FC    | **Expands Warehouse capacity (+50 slots per chest).**                    |
| `prod_warm_hearth`     | **Brick & Iron Fireplace**      | Stonecutter / Forge     |  T2  |    140 FC     |   280 FC    | **Cuts Winter home/workshop heating Firewood cost by 35%.**              |
| `prod_bed_plush`       | **Yak-Wool Plush Bed**          | Carpentry + Tailor      |  T3  |    195 FC     |   360 FC    | Resting at Yeti Home restores 100% Stamina + "Well-Rested" (+10% XP).    |
| `prod_market_stall`    | **Custom Trade Stall**          | Carpentry Shop          |  T2  |    150 FC     |   260 FC    | Unlocks an additional concurrent Marketplace Listing Slot.               |
| `prod_greenhouse_kit`  | **Sun-Glass Greenhouse Kit**    | Glassworks + Builder    |  T3  |    320 FC     |   640 FC    | **Allows Summer crops (Maize/Wheat/Berries) to grow during Winter.**     |
| `prod_cold_cellar_kit` | **Frost-Core Cold Cellar**      | Stonecutter + Lapidary  |  T3  |    290 FC     |   540 FC    | **Stops spoilage on all raw Fish, Milk, Meat, and Berries permanently.** |
| `prod_street_lantern`  | **Wrought-Iron Street Lantern** | Blacksmith + Glassworks |  T2  |     85 FC     |   160 FC    | Illuminates village paths in Winter; boosts Town Prosperity score.       |
| `prod_repair_kit`      | **Universal Tool Repair Kit**   | Blacksmith + Carpentry  |  T1  |     38 FC     |    70 FC    | Restores +50% durability to any worn gathering/crafting tool.            |

---

### 3.5 Final Crafted Products: Clothing, Gear & Luxury Exports

| Item ID              | Name                            | Station              | Tier | Base (Summer) | Winter Peak | Gameplay / Trade Utility                                              |
| :------------------- | :------------------------------ | :------------------- | :--: | :-----------: | :---------: | :-------------------------------------------------------------------- |
| `gear_summer_tunic`  | **Breezy Linen Tunic**          | Tailor Shop          |  T1  |     68 FC     |    90 FC    | +10% Movement Speed during Summer heat.                               |
| `gear_winter_coat`   | **Heavy Yak-Wool Winter Coat**  | Tailor Shop          |  T2  |    155 FC     |   310 FC    | **Reduces Winter cold drain by 75% across Mountains & Frozen Lake.**  |
| `gear_work_gloves`   | **Reinforced Leather Gloves**   | Tailor Shop          |  T2  |     92 FC     |   165 FC    | -15% stamina cost when chopping wood, mining, or farming.             |
| `gear_trader_pack`   | **Leather Trader Backpack**     | Tailor Shop          |  T2  |    140 FC     |   240 FC    | **+20 Personal Carry Inventory Slots** during gathering/mining trips. |
| `gear_frost_boots`   | **Spiked Glacier Boots**        | Tailor + Blacksmith  |  T3  |    210 FC     |   400 FC    | Prevents slipping on Frozen Lake ice + +15% Winter walk speed.        |
| `lux_pearl_necklace` | **Frost Pearl Necklace**        | Jeweler Shop         |  T3  |    260 FC     |   460 FC    | High-margin export; massive NPC Friendship gift (+50).                |
| `lux_gem_ring`       | **Silver & Alpine Gem Ring**    | Jeweler Shop         |  T3  |    310 FC     |   540 FC    | Prestige export good; VIP Royal Caravan order target.                 |
| `lux_yeti_crown`     | **Golden Yeti Sovereign Crown** | Jeweler Shop         |  T4  |    620 FC     |  1,050 FC   | Endgame monument centerpiece & Town Prestige trophy.                  |
| `lux_crystal_chime`  | **Glacier Crystal Windchime**   | Jeweler + Glassworks |  T4  |    390 FC     |   720 FC    | Cozy Home & Town Square decoration (+5% Town Happiness aura).         |

---

## 4. Complete Production & Crafting Chain Maps

Now that every raw resource (Section 2) and processed/final product (Section 3) is defined, this section maps **every single production pipeline** using the explicit **`Input => Building / Station (Tool + Fuel) => Output`** structure.

> **Quality Grade Multiplier (Applies to All Crafted & Gathered Goods):**
>
> - **Standard (1.0x value):** Default output at Occupation Level 1–3.
> - **Fine (1.25x value, +15% buff effect):** Unlocked at Occupation Level 4+ or with `Rich Compost Fertilizer` / `Iron+ Tools`.
> - **Masterwork (1.6x value, +30% buff effect):** Unlocked at Occupation Level 8+ or `Steel/Frost Crystal Tools` & Tier 7+ Workshops.

---

### 4.1 Chain 1: Grain, Milling & Bakery Pipeline

```text
Maize / Wheat Seed  =>  Farm Plot (Hoe + Watering Can)       =>  Raw Maize / Wheat
Raw Maize / Wheat   =>  Windmill / Mill (Millstone)          =>  Flour & Animal Feed
Flour + Water       =>  Bakery (Baking Peel + Firewood)      =>  Bread & Cornbread
Flour + Berries     =>  Bakery (Baking Peel + Butter)        =>  Berry Pie
Flour + Honey + Egg =>  Bakery (Baking Peel + Firewood)      =>  Honey Cake
Maize Seed     => Farm Plot (Hoe + Watering Can + Sickle)     => Maize (x3)
Wheat Seed     => Farm Plot (Hoe + Watering Can + Sickle)     => Wheat (x3) + Straw (x1)
Barley Seed    => Farm Plot (Hoe + Watering Can + Sickle)     => Barley (x3) + Straw (x1)
Sweetroot Seed => Farm Plot (Hoe + Watering Can + Spade)      => Sweetroot (x2)

Maize (x2)     => Mill (Carved Millstone)                     => Golden Cornmeal (x2)
Wheat (x2)     => Mill (Carved Millstone)                     => Fine Flour (x2)
Barley (x2)    => Mill (Carved Millstone + Kiln Heat)         => Roasted Barley Malt (x2)
Maize + Straw  => Mill (Carved Millstone)                     => Mixed Animal Feed (x3)
Sweetroot (x2) => Mill / Press (Press Screw + Firewood)       => Refined Sweetroot Sugar (x2)

Fine Flour + Water            => Bakery (Baking Peel + Firewood)           => Artisan Loaf Bread (x2)
Golden Cornmeal + Milk + Egg  => Bakery (Baking Peel + Firewood)           => Golden Cornbread (x2)
Fine Flour + Berries + Butter => Bakery (Baking Peel + Firewood)           => Mountain Berry Pie (x1)
Fine Flour + Cheese + Butter  => Bakery (Baking Peel + Firewood)           => Flaky Cheese Pastry (x2)
Fine Flour + Honey + Egg + Sugar => Bakery (Baking Peel + Firewood)        => Glazed Honey Cake (x1)
```

| Stage                    | Input(s)                                                  | Building / Location      | Tool(s) & Fuel Needed                 | Output(s)                                       | Seasonal Note                                                     |
| :----------------------- | :-------------------------------------------------------- | :----------------------- | :------------------------------------ | :---------------------------------------------- | :---------------------------------------------------------------- | -------------------------- | ------------- |
| **1. Plant & Harvest**   | `Maize Seed` or `Wheat Seed`                              | **Farm Plot** (Village)  | `Hoe`, `Watering Can`, `Sickle`       | `Maize`, `Wheat`, `Straw`                       | Fast growth in **Summer**; dormant/greenhouse-only in **Winter**. |
| **2. Grind**             | `Maize` or `Wheat`                                        | **Mill** (Village)       | `Stone Millstone`                     | `Flour`, `Cornmeal`, `Animal Feed`              | Runs year-round; processes stockpiled Summer grain.               |
| **3. Bake**              | `Flour`, `Berries`, `Honey`, `Milk/Butter`                | **Bakery** (Village)     | `Baking Peel`, `Firewood` (Oven Fuel) | `Bread`, `Cornbread`, `Berry Pie`, `Honey Cake` | **2x Winter demand** (warm food keeps citizens happy).            |
| Recipe ID                | Inputs (Qty)                                              | Station / Building       | Tool Required                         | Fuel                                            | Time                                                              | Output (Qty)               | Occupation XP |
| :---                     | :---                                                      | :---                     | :---                                  | :---                                            | :---:                                                             | :---                       | :---:         |
| `rec_grow_maize`         | `1 Maize Seed` + `1 Water`                                | Farm Plot / Greenhouse   | `Hoe`, `Watering Can`, `Sickle`       | None                                            | 8m                                                                | `3 Maize` (+1 Seed chance) | 12 Farmer XP  |
| `rec_grow_wheat`         | `1 Wheat Seed` + `1 Water`                                | Farm Plot / Greenhouse   | `Hoe`, `Watering Can`, `Sickle`       | None                                            | 8m                                                                | `3 Wheat` + `1 Straw`      | 12 Farmer XP  |
| `rec_grow_barley`        | `1 Barley Seed` + `1 Water`                               | Farm Plot / Greenhouse   | `Hoe`, `Watering Can`, `Sickle`       | None                                            | 10m                                                               | `3 Barley` + `1 Straw`     | 15 Farmer XP  |
| `rec_grow_potato`        | `1 Frost Potato Seed` + `1 Water`                         | Farm Plot                | `Hoe`, `Spade`                        | None                                            | 10m                                                               | `3 Frost Potato`           | 14 Farmer XP  |
| `rec_grow_turnip`        | `1 Snow Turnip Seed` + `1 Water`                          | Farm Plot (Winter-hardy) | `Hoe`, `Spade`                        | None                                            | 9m                                                                | `3 Snow Turnip`            | 14 Farmer XP  |
| `rec_grow_flax`          | `1 Flax Seed` + `1 Water`                                 | Farm Plot                | `Hoe`, `Sickle`                       | None                                            | 12m                                                               | `3 Raw Flax`               | 16 Farmer XP  |
| `rec_grow_sweetroot`     | `1 Sweetroot Cutting` + `1 Water`                         | Farm Plot / Greenhouse   | `Hoe`, `Spade`                        | None                                            | 14m                                                               | `2 Sweetroot`              | 18 Farmer XP  |
| `rec_mill_flour`         | `2 Wheat`                                                 | Windmill / Mill          | `Carved Millstone`                    | Wind/Water                                      | 2m                                                                | `2 Fine Flour`             | 14 Miller XP  |
| `rec_mill_cornmeal`      | `2 Maize`                                                 | Windmill / Mill          | `Carved Millstone`                    | Wind/Water                                      | 2m                                                                | `2 Golden Cornmeal`        | 14 Miller XP  |
| `rec_mill_malt`          | `2 Barley`                                                | Windmill / Mill          | `Carved Millstone`                    | `1 Firewood`                                    | 3m                                                                | `2 Roasted Barley Malt`    | 18 Miller XP  |
| `rec_mill_feed`          | `1 Maize` + `2 Straw`                                     | Windmill / Mill          | `Carved Millstone`                    | Wind/Water                                      | 90s                                                               | `3 Mixed Animal Feed`      | 10 Miller XP  |
| `rec_refine_sugar`       | `2 Sweetroot` + `1 Water`                                 | Mill Press / Kitchen     | `Cooking Pot`                         | `1 Firewood`                                    | 3m                                                                | `2 Refined Sugar`          | 18 Miller XP  |
| `rec_bake_bread`         | `2 Fine Flour` + `1 Water`                                | Bakery                   | `Baking Peel`                         | `1 Firewood`                                    | 3m                                                                | `2 Artisan Loaf Bread`     | 20 Baker XP   |
| `rec_bake_cornbread`     | `2 Cornmeal` + `1 Milk` + `1 Egg`                         | Bakery                   | `Baking Peel`                         | `1 Firewood`                                    | 3m 30s                                                            | `2 Golden Cornbread`       | 22 Baker XP   |
| `rec_bake_berry_pie`     | `2 Flour` + `3 Berries` + `1 Butter` + `1 Sugar`          | Bakery                   | `Baking Peel`                         | `1 Firewood`                                    | 5m                                                                | `1 Mountain Berry Pie`     | 35 Baker XP   |
| `rec_bake_cheese_pastry` | `2 Flour` + `1 Cheese` + `1 Butter`                       | Bakery                   | `Baking Peel`                         | `1 Firewood`                                    | 4m                                                                | `2 Flaky Cheese Pastry`    | 30 Baker XP   |
| `rec_bake_honey_cake`    | `2 Flour` + `2 Honey` + `2 Eggs` + `1 Sugar` + `1 Butter` | Bakery                   | `Baking Peel`                         | `2 Firewood`                                    | 7m                                                                | `1 Glazed Honey Cake`      | 50 Baker XP   |

---

### B. Livestock, Dairy & Tailoring Chain (Village Pastures)

Turns farm grain into dairy ingredients and warm Winter clothing.

### 4.2 Chain 2: Livestock, Dairy, Leather & Tailoring Pipeline

```text
Animal Feed (Maize/Straw)  =>  Barn & Coop (Milk Pail / Shears)   =>  Raw Milk, Eggs, Raw Wool
Raw Milk                   =>  Dairy Shed (Butter Churn)          =>  Butter & Cheese
Raw Wool                   =>  Spinning Loom (Spindle & Shears)   =>  Wool Yarn & Cloth
Wool Cloth + Leather       =>  Tailor Shop (Needle & Shears)      =>  Warm Winter Coat, Work Gloves, Trader Backpack
Animal Feed (x2)      => Barn / Pasture (Milk Pail + Shears)       => Fresh Milk (x2) + Yak Wool (x2) + Compost (x1)
Animal Feed (x1)      => Village Coop (Gathering Basket)           => Snow-Hen Eggs (x3)
Animal Feed (x2)      => Ranching Yard (Skinning / Butcher Knife)  => Venison/Yak Meat (x2) + Raw Hide (x1)

Fresh Milk (x2)       => Creamery / Dairy Shed (Butter Churn)      => Churned Butter (x2)
Fresh Milk (x3) + Salt=> Creamery / Dairy Shed (Cheese Press)      => Aged Mountain Cheese (x1)

Raw Flax (x2)         => Spinning Loom (Spindle)                   => Flax Linen Thread (x2)
Linen Thread (x2)     => Spinning Loom (Shuttle)                   => Woven Linen Cloth (x1)
Yak Wool (x2)         => Spinning Loom (Spindle)                   => Spun Yak Wool Yarn (x2)
Yak Wool Yarn (x2)    => Spinning Loom (Shuttle)                   => Heavy Wool Cloth (x1)
Raw Hide (x2) + Resin + Salt => Tannery Vat (Scraping Knife)       => Tanned Leather (x2)

Linen Cloth (x2) + Thread          => Tailor Shop (Needle & Shears)=> Breezy Linen Tunic (x1)
Heavy Wool Cloth (x3) + Leather    => Tailor Shop (Needle & Shears)=> Heavy Yak-Wool Winter Coat (x1)
Tanned Leather (x2) + Wool Yarn    => Tailor Shop (Needle & Awl)   => Reinforced Leather Gloves (x1)
Tanned Leather (x3) + Linen + Iron => Tailor Shop (Needle & Awl)   => Leather Trader Backpack (x1)
Tanned Leather (x2) + Wool + Steel => Tailor + Forge (Awl + Hammer)=> Spiked Glacier Boots (x1)
```

| Stage                   | Input(s)                                            | Building / Location | Tool(s) Needed                    | Output(s)                               | What It Unlocks / Crafts                                                      |
| :---------------------- | :-------------------------------------------------- | :------------------ | :-------------------------------- | :-------------------------------------- | :---------------------------------------------------------------------------- | ------------------------------ | ------------- |
| **1. Tend Animals**     | `Animal Feed` (`Maize` / `Straw`)                   | **Barn & Coop**     | `Milk Pail`, `Shears`             | `Milk`, `Eggs`, `Raw Wool`              | Essential inputs for baking, cooking, and clothing.                           |
| **2. Process Dairy**    | `Milk`                                              | **Dairy Shed**      | `Butter Churn`                    | `Butter`, `Aged Cheese`                 | Used in **Bakery** (`Berry Pie`) and **Tavern** (`Cheese Fondue`).            |
| **3. Spin & Weave**     | `Raw Wool`                                          | **Tailor / Loom**   | `Spinning Wheel`, `Tailor Needle` | `Wool Cloth`, `Winter Coat`, `Backpack` | `Winter Coat` prevents Winter stamina drain; `Backpack` adds inventory slots. |
| Recipe ID               | Inputs (Qty)                                        | Station / Building  | Tool Required                     | Fuel                                    | Time                                                                          | Output (Qty)                   | Occupation XP |
| :---                    | :---                                                | :---                | :---                              | :---                                    | :---:                                                                         | :---                           | :---:         |
| `rec_milk_yak`          | `2 Animal Feed`                                     | Barn & Pasture      | `Milk Pail`                       | None                                    | 6m                                                                            | `2 Fresh Milk` + `1 Compost`   | 14 Rancher XP |
| `rec_shear_yak`         | `2 Animal Feed`                                     | Barn & Pasture      | `Shears`                          | None                                    | 8m                                                                            | `2 Thick Yak Wool`             | 16 Rancher XP |
| `rec_gather_eggs`       | `1 Animal Feed`                                     | Village Coop        | `Gathering Basket`                | None                                    | 5m                                                                            | `3 Snow-Hen Eggs`              | 10 Rancher XP |
| `rec_butcher_ranch`     | `3 Animal Feed`                                     | Ranching Yard       | `Butcher Knife`, `Skinning Knife` | None                                    | 10m                                                                           | `2 Yak Meat` + `1 Raw Hide`    | 20 Rancher XP |
| `rec_churn_butter`      | `2 Fresh Milk`                                      | Creamery / Dairy    | `Butter Churn`                    | None                                    | 2m 30s                                                                        | `2 Churned Butter`             | 16 Dairy XP   |
| `rec_press_cheese`      | `3 Fresh Milk` + `1 Rock Salt`                      | Creamery / Dairy    | `Cheese Press`                    | None                                    | 6m                                                                            | `1 Aged Mountain Cheese`       | 28 Dairy XP   |
| `rec_spin_linen`        | `2 Raw Flax`                                        | Spinning Loom       | `Spindle`                         | None                                    | 2m                                                                            | `2 Flax Linen Thread`          | 14 Weaver XP  |
| `rec_weave_linen`       | `2 Flax Linen Thread`                               | Spinning Loom       | `Weaving Shuttle`                 | None                                    | 3m                                                                            | `1 Woven Linen Cloth`          | 20 Weaver XP  |
| `rec_spin_wool`         | `2 Thick Yak Wool`                                  | Spinning Loom       | `Spindle`                         | None                                    | 2m 30s                                                                        | `2 Spun Yak Wool Yarn`         | 16 Weaver XP  |
| `rec_weave_wool`        | `2 Spun Yak Wool Yarn`                              | Spinning Loom       | `Weaving Shuttle`                 | None                                    | 3m 30s                                                                        | `1 Heavy Wool Cloth`           | 24 Weaver XP  |
| `rec_tan_leather`       | `2 Raw Hide` + `1 Pine Resin` + `1 Rock Salt`       | Tannery Vat         | `Scraping Knife`                  | None                                    | 5m                                                                            | `2 Tanned Leather`             | 26 Tailor XP  |
| `rec_craft_tunic`       | `2 Linen Cloth` + `1 Linen Thread`                  | Tailor Shop         | `Tailor Needle`, `Shears`         | None                                    | 4m                                                                            | `1 Breezy Linen Tunic`         | 30 Tailor XP  |
| `rec_craft_winter_coat` | `3 Heavy Wool Cloth` + `1 Leather` + `1 Wax Bar`    | Tailor Shop         | `Tailor Needle`, `Shears`         | None                                    | 7m                                                                            | `1 Heavy Yak-Wool Winter Coat` | 55 Tailor XP  |
| `rec_craft_gloves`      | `2 Tanned Leather` + `1 Wool Yarn`                  | Tailor Shop         | `Leather Awl`, `Needle`           | None                                    | 4m 30s                                                                        | `1 Reinforced Leather Gloves`  | 35 Tailor XP  |
| `rec_craft_backpack`    | `3 Tanned Leather` + `2 Linen Cloth` + `1 Iron Bar` | Tailor Shop         | `Leather Awl`, `Needle`           | None                                    | 6m                                                                            | `1 Leather Trader Backpack`    | 48 Tailor XP  |
| `rec_craft_frost_boots` | `2 Tanned Leather` + `1 Heavy Wool` + `1 Steel Bar` | Tailor Shop         | `Leather Awl`, `Hammer`           | None                                    | 7m 30s                                                                        | `1 Spiked Glacier Boots`       | 60 Tailor XP  |

---

### C. Forestry, Sawmill & Carpentry Chain (Pine Forest)

Supplies fuel for Winter heating/ovens and materials for building upgrades and furniture.

### 4.3 Chain 3: Forestry, Sawmill & Carpentry Pipeline

```text
Pine / Hardwood Tree    =>  Pine Forest (Axe)                        =>  Raw Logs & Resin
Raw Logs                =>  Sawmill (Circular Sawblade)              =>  Wood Planks & Firewood
Wood Planks             =>  Carpentry Shop (Hammer + Chisel)         =>  Tool Handles, Barrels, Crates
Wood Planks + Iron Nails=>  Carpentry Shop (Handsaw + Hammer)        =>  Chairs, Tables, Storage Chests, Market Stalls
Pine Tree          => Pine Forest (Axe)                                  => Pine Log (x3) + Pinecone Sapling (drop)
Oak Tree           => Deep Pine Forest (Iron Axe+)                       => Hardwood Oak Log (x2) + Oak Acorn (drop)
Pine Bark          => Pine Forest (Tapping Knife)                        => Pine Resin (x2)

Pine Log (x2)      => Sawmill (Circular Sawblade)                        => Pine Wood Plank (x2) + Split Firewood (x2)
Pine Log (x1)      => Chopping Block / Sawmill (Axe)                     => Split Firewood (x3)
Oak Log (x2)       => Sawmill (Steel Sawblade)                           => Hardwood Oak Plank (x2) + Split Firewood (x1)
Pine Log (x3)      => Charcoal Kiln (Shovel)                             => Kiln Charcoal (x3)
Pine Resin (x2)    => Forestry Cauldron (Ladle + Firewood)               => Waterproof Pine Pitch (x2)

Pine Plank (x1)                  => Carpentry Shop (Chisel + Knife)      => Carved Tool Handle (x2)
Pine Plank (x2) + Iron Nails (x1)=> Carpentry Shop (Hammer + Handsaw)    => Pine Dining Chair (x1)
Pine Plank (x3) + Iron Nails (x1)=> Carpentry Shop (Hammer + Handsaw)    => Reinforced Trade Crate (x2)
Oak Plank (x3) + Iron Nails (x2) => Carpentry Shop (Hammer + Chisel)     => Carved Oak Table (x1)
Pine Plank (x3) + Iron Bar (x1)  => Carpentry Shop (Hammer + Chisel)     => Iron-Bound Storage Chest (x1)
Oak Plank (x4) + Wool Cloth (x2) => Carpentry Shop (Hammer + Needle)     => Yak-Wool Plush Bed (x1)
Pine Plank (x4) + Linen (x2) + Nails => Carpentry Shop (Hammer + Saw)    => Custom Trade Stall (x1)
```

| Stage                 | Input(s)                                            | Building / Location | Tool(s) Needed                          | Output(s)                                                  | What It Unlocks / Crafts                                                               |
| :-------------------- | :-------------------------------------------------- | :------------------ | :-------------------------------------- | :--------------------------------------------------------- | :------------------------------------------------------------------------------------- | -------------------------------------- | --------------- |
| **1. Chop Timber**    | Forest Trees                                        | **Pine Forest**     | `Axe`                                   | `Raw Logs`, `Pine Resin`                                   | Raw material for all construction and fuel.                                            |
| **2. Mill Wood**      | `Raw Logs`                                          | **Sawmill**         | `Sawblade`                              | `Wood Planks`, `Firewood`                                  | `Firewood` fuels **Bakery**, **Smokehouse**, and **Winter Heating** (2x Winter price). |
| **3. Craft Woodwork** | `Wood Planks`, `Iron Nails`, `Resin`                | **Carpentry Shop**  | `Carpentry Hammer`, `Chisel`, `Handsaw` | `Tool Handles`, `Storage Chest`, `Oak Table`, `Repair Kit` | Upgrades town buildings (`Tier 1..10`) and supplies handles to the **Blacksmith**.     |
| Recipe ID             | Inputs (Qty)                                        | Station / Building  | Tool Required                           | Fuel                                                       | Time                                                                                   | Output (Qty)                           | Occupation XP   |
| :---                  | :---                                                | :---                | :---                                    | :---                                                       | :---:                                                                                  | :---                                   | :---:           |
| `rec_saw_pine`        | `2 Pine Logs`                                       | Sawmill             | `Circular Sawblade`                     | Wind/Water                                                 | 90s                                                                                    | `2 Pine Planks` + `2 Firewood`         | 14 Sawyer XP    |
| `rec_split_firewood`  | `1 Pine Log`                                        | Sawmill / Yard      | `Axe`                                   | None                                                       | 45s                                                                                    | `3 Split Firewood`                     | 8 Sawyer XP     |
| `rec_saw_oak`         | `2 Hardwood Oak Logs`                               | Sawmill             | `Steel Sawblade`                        | Wind/Water                                                 | 2m 30s                                                                                 | `2 Hardwood Oak Planks` + `1 Firewood` | 24 Sawyer XP    |
| `rec_burn_charcoal`   | `3 Pine Logs`                                       | Charcoal Kiln       | `Shovel`                                | `1 Firewood`                                               | 4m                                                                                     | `3 Kiln Charcoal`                      | 18 Sawyer XP    |
| `rec_boil_pitch`      | `2 Pine Resin`                                      | Forestry Cauldron   | `Ladle`                                 | `1 Firewood`                                               | 2m 30s                                                                                 | `2 Waterproof Pine Pitch`              | 18 Forester XP  |
| `rec_carve_handle`    | `1 Pine Plank`                                      | Carpentry Shop      | `Wood Chisel`                           | None                                                       | 60s                                                                                    | `2 Carved Tool Handles`                | 10 Carpenter XP |
| `rec_craft_crate`     | `2 Pine Planks` + `1 Iron Nails`                    | Carpentry Shop      | `Carpentry Hammer`                      | None                                                       | 90s                                                                                    | `2 Reinforced Trade Crates`            | 14 Carpenter XP |
| `rec_craft_chair`     | `2 Pine Planks` + `1 Iron Nails`                    | Carpentry Shop      | `Handsaw`, `Hammer`                     | None                                                       | 3m                                                                                     | `1 Pine Dining Chair`                  | 22 Carpenter XP |
| `rec_craft_table`     | `3 Oak Planks` + `2 Iron Nails` + `1 Wax Bar`       | Carpentry Shop      | `Handsaw`, `Chisel`, `Hammer`           | None                                                       | 6m                                                                                     | `1 Carved Oak Table`                   | 42 Carpenter XP |
| `rec_craft_chest`     | `3 Pine Planks` + `1 Iron Bar` + `1 Iron Nails`     | Carpentry Shop      | `Hammer`, `Chisel`                      | None                                                       | 5m                                                                                     | `1 Iron-Bound Storage Chest`           | 38 Carpenter XP |
| `rec_craft_bed`       | `4 Oak Planks` + `2 Heavy Wool` + `2 Nails`         | Carpentry Shop      | `Hammer`, `Chisel`                      | None                                                       | 8m                                                                                     | `1 Yak-Wool Plush Bed`                 | 65 Carpenter XP |
| `rec_craft_stall`     | `4 Pine Planks` + `2 Linen Cloth` + `2 Nails`       | Carpentry Shop      | `Hammer`, `Handsaw`                     | None                                                       | 7m                                                                                     | `1 Custom Trade Stall`                 | 52 Carpenter XP |
| `rec_craft_peel`      | `2 Pine Planks`                                     | Carpentry Shop      | `Wood Chisel`, `Handsaw`                | None                                                       | 2m                                                                                     | `1 Baking Peel`                        | 16 Carpenter XP |
| `rec_craft_rod`       | `2 Pine Planks` + `1 Linen Thread` + `1 Copper Bar` | Carpentry Shop      | `Carving Knife`                         | None                                                       | 3m                                                                                     | `1 Fishing Rod`                        | 22 Carpenter XP |

---

### D. Mining, Smelting & Blacksmithing Chain (Mountains & Caves)

Produces the tools that every other occupation requires to function.

### 4.4 Chain 4: Quarrying, Masonry, Pottery & Glassblowing Pipeline

```text
Mountain Rock / Clay Pit    =>  Mountain Quarry (Pickaxe + Sledge)   =>  Raw Stone, Limestone, Clay
Raw Stone & Clay            =>  Stonecutter & Kiln (Masonry Trowel)  =>  Cut Stone Blocks, Bricks, Millstones
Copper / Iron / Coal Vein   =>  Mountains & Caves (Pickaxe + Lantern)=>  Copper Ore, Iron Ore, Coal, Ice Crystals
Iron Ore + Coal             =>  Smelter / Foundry (Tongs + Bellows)  =>  Copper Bars, Iron Bars, Steel Ingots
Iron Bar + Wood Tool Handle =>  Blacksmith Forge (Anvil + Hammer)    =>  Axes, Pickaxes, Hoes, Sickles, Sawblades, Nails, Skillets
Raw Stone (x2)               => Stonecutter Yard (Masonry Chisel)          => Cut Stone Block (x2)
Limestone (x2) + Water       => Stonecutter Yard (Masonry Trowel + Firewood)=> Lime Mortar (x3)
Cut Stone Block (x4)         => Stonecutter Yard (Sledgehammer + Chisel)   => Carved Millstone (x1)
River Clay (x2)              => Brick & Pottery Kiln (Masonry Trowel + Fuel)=> Fired Clay Brick (x3)
River Clay (x2) + Resin      => Pottery Kiln (Potter's Wheel + Firewood)   => Glazed Ceramic Jar (x2)

Silica Sand (x2) + Limestone => Glassworks Furnace (Blowpipe + Coal)       => Clear Glass Pane (x2)
Silica Sand (x2)             => Glassworks Furnace (Blowpipe + Firewood)   => Sealed Glass Jar (x3)

Cut Stone (x4) + Bricks (x4) + Iron Bar (x2) => Masonry / Forge            => Brick & Iron Fireplace (x1)
Glass Panes (x6) + Oak Planks (x4) + Steel (x2) => Glassworks + Builder    => Sun-Glass Greenhouse Kit (x1)
Cut Stone (x6) + Mortar (x4) + Frost Core (x1)  => Masonry + Lapidary      => Frost-Core Cold Cellar Kit (x1)
Iron Bar (x2) + Glass Pane (x1) + Oil (x1)      => Forge + Glassworks      => Wrought-Iron Street Lantern (x1)
```

| Stage                  | Input(s)                                                      | Building / Location    | Tool(s) & Fuel Needed                     | Output(s)                                                            | What It Unlocks / Crafts                                                         |
| :--------------------- | :------------------------------------------------------------ | :--------------------- | :---------------------------------------- | :------------------------------------------------------------------- | :------------------------------------------------------------------------------- | ------------------------------- | ----------------- |
| **1. Quarry & Mine**   | Rock Outcrops & Cave Veins                                    | **Mountains & Caves**  | `Pickaxe`, `Sledgehammer`, `Cave Lantern` | `Raw Stone`, `Clay`, `Coal`, `Copper Ore`, `Iron Ore`, `Ice Crystal` | **Winter Bonus:** Frozen Lake path opens the deep **Ice Crystal Cavern**.        |
| **2. Cut & Fire**      | `Raw Stone`, `Clay`, `Firewood`                               | **Stonecutter / Kiln** | `Masonry Trowel`, `Chisel`                | `Cut Stone`, `Bricks`, `Millstone`                                   | Required to construct & upgrade **Mill**, **Bakery Oven**, and **Smelter**.      |
| **3. Smelt**           | `Copper/Iron Ore` + `Coal`                                    | **Smelter / Foundry**  | `Foundry Tongs`, `Bellows`, `Coal`        | `Copper Bar`, `Iron Bar`, `Steel Ingot`                              | Refined metal for tools and machinery.                                           |
| **4. Forge Tools**     | `Iron Bar` + `Tool Handle` (`Wood Plank`)                     | **Blacksmith Forge**   | `Blacksmith Hammer`, `Anvil`              | **All Gathering & Crafting Tools**, `Iron Nails`, `Cookware`         | Every Farmer, Lumberjack, Miner, and Fisher needs tools from the **Blacksmith**. |
| Recipe ID              | Inputs (Qty)                                                  | Station / Building     | Tool Required                             | Fuel                                                                 | Time                                                                             | Output (Qty)                    | Occupation XP     |
| :---                   | :---                                                          | :---                   | :---                                      | :---                                                                 | :---:                                                                            | :---                            | :---:             |
| `rec_cut_stone`        | `2 Raw Stone`                                                 | Stonecutter Yard       | `Masonry Chisel`                          | None                                                                 | 90s                                                                              | `2 Cut Stone Blocks`            | 12 Mason XP       |
| `rec_mix_mortar`       | `2 Limestone` + `1 Water`                                     | Stonecutter Yard       | `Masonry Trowel`                          | `1 Firewood`                                                         | 2m                                                                               | `3 Lime Mortar`                 | 14 Mason XP       |
| `rec_carve_millstone`  | `4 Cut Stone Blocks`                                          | Stonecutter Yard       | `Sledgehammer`, `Chisel`                  | None                                                                 | 5m                                                                               | `1 Carved Millstone`            | 35 Mason XP       |
| `rec_fire_brick`       | `2 River Clay`                                                | Brick & Pottery Kiln   | `Masonry Trowel`                          | `1 Firewood`                                                         | 2m 30s                                                                           | `3 Fired Clay Bricks`           | 16 Mason XP       |
| `rec_throw_pot`        | `2 River Clay` + `1 Resin`                                    | Pottery Kiln           | `Potter's Wheel`                          | `1 Firewood`                                                         | 2m                                                                               | `2 Glazed Ceramic Jars`         | 16 Potter XP      |
| `rec_blow_jar`         | `2 Silica Sand`                                               | Glassworks Furnace     | `Glass Blowpipe`                          | `1 Firewood`                                                         | 2m                                                                               | `3 Sealed Glass Jars`           | 18 Glassblower XP |
| `rec_blow_pane`        | `2 Silica Sand` + `1 Limestone`                               | Glassworks Furnace     | `Glass Blowpipe`                          | `1 Coal`                                                             | 3m 30s                                                                           | `2 Clear Glass Panes`           | 28 Glassblower XP |
| `rec_build_hearth`     | `4 Cut Stone` + `4 Bricks` + `2 Mortar` + `2 Iron Bars`       | Stonecutter / Builder  | `Masonry Trowel`, `Hammer`                | None                                                                 | 7m                                                                               | `1 Brick & Iron Fireplace`      | 55 Mason XP       |
| `rec_build_greenhouse` | `6 Glass Panes` + `4 Oak Planks` + `2 Steel Bars` + `2 Nails` | Glassworks / Builder   | `Trowel`, `Hammer`                        | None                                                                 | 12m                                                                              | `1 Sun-Glass Greenhouse Kit`    | 95 Builder XP     |
| `rec_build_cellar`     | `6 Cut Stone` + `4 Mortar` + `1 Frost Crystal Core`           | Stonecutter / Builder  | `Masonry Trowel`, `Chisel`                | None                                                                 | 10m                                                                              | `1 Frost-Core Cold Cellar Kit`  | 85 Builder XP     |
| `rec_craft_lantern`    | `2 Iron Bars` + `1 Glass Pane` + `1 Lantern Oil`              | Forge / Glassworks     | `Blacksmith Hammer`                       | `1 Coal`                                                             | 4m                                                                               | `1 Wrought-Iron Street Lantern` | 36 Blacksmith XP  |

---

### E. Fishing, Smokehouse & Tavern Cooking Chain (Frozen Lake & Village)

Delivers high-energy meals and rare Winter exports.

### 4.5 Chain 5: Mining, Smelting, Blacksmithing & Gemcutting Pipeline

```text
Open Lake / Winter Ice Hole =>  Frozen Lake (Fishing Rod / Ice Auger)=>  Trout, Salmon, Frost Carp, Lake Pearls
Raw Fish + Firewood         =>  Smokehouse (Fillet Knife)            =>  Fish Fillet, Smoked Fish (Long Shelf Life)
Fish Fillet + Herbs + Broth =>  Tavern Kitchen (Cooking Pot/Skillet) =>  Hot Fish Stew, Grilled Salmon, Winter Chowder
Copper Ore (x2) + Coal (x1)      => Smelter / Foundry (Tongs + Bellows)    => Copper Ingot (x2)
Iron Ore (x2) + Coal (x1)        => Smelter / Foundry (Tongs + Bellows)    => Iron Ingot (x2)
Iron Ingot (x2) + Coal (x2)      => Smelter / Foundry (Tongs + Bellows)    => Tempered Steel Ingot (x1)
Silver Ore (x2) + Coal (x2)      => Smelter / Foundry (Tongs + Bellows)    => Refined Silver Bar (x1)
Gold Ore (x2) + Coal (x2)        => Smelter / Foundry (Tongs + Bellows)    => Refined Gold Bar (x1)

Iron Ingot (x1)                  => Blacksmith Forge (Anvil + Hammer)      => Box of Iron Nails (x3)
Steel Ingot (x2)                 => Blacksmith Forge (Anvil + Hammer)      => Precision Steel Gear (x1)
Iron Ingot (x1) + Tool Handle    => Blacksmith Forge (Anvil + Hammer)      => Universal Tool Repair Kit (x2)
Iron/Steel + Handle              => Blacksmith Forge (Anvil + Hammer)      => All Gathering/Crafting Tools (See Sec. 5)

Uncut Alpine Gem (x1)            => Lapidary Bench (Gem Wheel + Loupe)     => Faceted Alpine Gem (x1)
Glacier Ice Crystal (x2)         => Lapidary Bench (Frost Chisel + Loupe)  => Refined Frost Crystal Core (x1)
Frost Pearl (x2) + Silver Bar    => Jeweler Shop (Fine Pliers + Torch)     => Frost Pearl Necklace (x1)
Faceted Gem (x1) + Silver Bar    => Jeweler Shop (Fine Pliers + Torch)     => Silver & Alpine Gem Ring (x1)
Gold Bar (x2) + Faceted Gem (x2) + Frost Core => Jeweler Shop              => Golden Yeti Sovereign Crown (x1)
Frost Core (x1) + Glass Pane + Silver Bar     => Jeweler + Glassworks      => Glacier Crystal Windchime (x1)
```

| Stage | Input(s) | Building / Location | Tool(s) & Fuel Needed | Output(s) | Seasonal Note |
| Recipe ID | Inputs (Qty) | Station / Building | Tool Required | Fuel | Time | Output (Qty) | Occupation XP |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| `rec_smelt_copper` | `2 Copper Ore` | Smelter / Foundry | `Foundry Tongs`, `Bellows` | `1 Coal` (or `Charcoal`) | 2m | `2 Copper Ingots` | 16 Smelter XP |
| `rec_smelt_iron` | `2 Iron Ore` | Smelter / Foundry | `Foundry Tongs`, `Bellows` | `1 Coal` | 3m | `2 Iron Ingots` | 22 Smelter XP |
| `rec_smelt_steel` | `2 Iron Ingots` + `2 Coal` | Smelter / Foundry | `Foundry Tongs`, `Bellows` | `1 Coal` | 5m | `1 Tempered Steel Ingot` | 38 Smelter XP |
| `rec_smelt_silver` | `2 Silver Ore` | Smelter / Foundry | `Foundry Tongs`, `Bellows` | `2 Coal` | 5m | `1 Refined Silver Bar` | 42 Smelter XP |
| `rec_smelt_gold` | `2 Gold Ore` | Smelter / Foundry | `Foundry Tongs`, `Bellows` | `2 Coal` | 6m | `1 Refined Gold Bar` | 55 Smelter XP |
| `rec_forge_nails` | `1 Iron Ingot` | Blacksmith Forge | `Blacksmith Hammer`, `Anvil` | `1 Coal` | 90s | `3 Boxes of Iron Nails` | 14 Blacksmith XP |
| `rec_forge_gear` | `2 Steel Ingots` | Blacksmith Forge | `Blacksmith Hammer`, `Anvil` | `1 Coal` | 4m | `1 Precision Steel Gear` | 42 Blacksmith XP |
| `rec_forge_repair_kit` | `1 Iron Ingot` + `1 Tool Handle` + `1 Wax Bar` | Blacksmith Forge | `Blacksmith Hammer` | `1 Coal` | 2m | `2 Universal Tool Repair Kits` | 18 Blacksmith XP |
| `rec_cut_gem` | `1 Uncut Alpine Gem` | Lapidary / Jeweler | `Gem Polishing Wheel` | None | 4m | `1 Faceted Alpine Gem` | 40 Jeweler XP |
| `rec_refine_frost_core` | `2 Glacier Ice Crystals` | Lapidary / Jeweler | `Frost Chisel`, `Loupe` | None | 5m | `1 Refined Frost Crystal Core` | 55 Jeweler XP |
| `rec_craft_pearl_neck` | `2 Frost Pearls` + `1 Silver Bar` + `1 Linen Thread` | Jeweler Shop | `Jeweler Pliers`, `Torch` | `1 Charcoal` | 7m | `1 Frost Pearl Necklace` | 70 Jeweler XP |
| `rec_craft_gem_ring` | `1 Faceted Gem` + `1 Silver Bar` | Jeweler Shop | `Jeweler Pliers`, `Torch` | `1 Charcoal` | 7m | `1 Silver & Alpine Gem Ring` | 75 Jeweler XP |
| `rec_craft_crown` | `2 Gold Bars` + `2 Faceted Gems` + `1 Frost Core` | Jeweler Shop | `Jeweler Pliers`, `Torch` | `2 Coal` | 15m | `1 Golden Yeti Sovereign Crown` | 140 Jeweler XP |
| `rec_craft_chime` | `1 Frost Core` + `1 Glass Pane` + `1 Silver Bar` | Jeweler Shop | `Jeweler Pliers` | None | 8m | `1 Glacier Crystal Windchime` | 85 Jeweler XP |

---

### 4.6 Chain 6: Fishing, Smokehouse, Tavern Cooking & Apothecary Pipeline

```text
Trout / Salmon (x2)            => Smokehouse (Fillet Knife)                   => Fresh Fish Fillet (x2) + Fish Oil (x1)
Trout / Salmon / Carp (x2) + Salt => Smokehouse (Fillet Knife + Firewood)     => Smoked Glacier Fish (x2)
Yak Meat (x2) + Rock Salt + Jar   => Smokehouse (Butcher Knife)               => Salted Meat (x2)

Fish Fillet (x2) + Potato + Herbs => Tavern Kitchen (Cooking Pot + Firewood)  => Hot Fish Stew (x2)
Frost Carp (x1) + Milk + Butter + Frost Mint => Tavern Kitchen (Pot + Firewood)=> Frost Carp Chowder (x1)
Salted/Yak Meat (x2) + Turnip + Butter => Tavern Kitchen (Iron Skillet + Fuel)=> Hearty Yak Roast (x1)
Aged Cheese (x2) + Bread (x1)     => Tavern Kitchen (Cooking Pot + Firewood)  => Alpine Cheese Fondue (x1)
Roasted Barley Malt (x2) + Honey + Water => Tavern Brewery (Brew Kettle)      => Warm Spiced Barley Ale (x2)

Raw Honeycomb (x2)                => Apiary Press (Honey Extractor)           => Strained Honey (x2) + Beeswax Bar (x1)
Wild Berries (x3) + Sugar + Jar   => Kitchen / Bakery (Cooking Pot + Fuel)    => Jarred Berry Jam (x2)
Snow Turnip (x3) + Salt + Pot     => Kitchen (Knife)                          => Pickled Snow Turnips (x2)

Frost Mint (x2) + Honey + Jar + Water => Apothecary (Mortar & Pestle + Fuel)  => Winter Warmth Tea (x2)
Ginseng (x1) + Sunleaf (x2) + Honey + Jar => Apothecary (Mortar & Pestle)     => Ginseng Stamina Tonic (x1)
Sunleaf (x2) + Beeswax + Jar          => Apothecary (Mortar & Pestle)         => Herbal Healing Salve (x2)
Glow-Cap Mushroom (x2) + Fish Oil + Jar => Apothecary (Mortar & Pestle)       => Cave-Sight Elixir (x1)
Fish Oil (x2) + Pine Resin (x1) + Jar   => Apothecary / Refinery (Kettle)     => Refined Lantern Oil (x3)
Compost (x2) + Straw (x2)               => Barn / Apothecary (Shovel)         => Rich Compost Fertilizer (x3)
Beeswax Bar (x1) + Linen Thread (x1)    => Apothecary / Loom (Melting Pot)    => Scented Beeswax Candles (x3)
```

| Recipe ID             | Inputs (Qty)                                                 | Station / Building    | Tool Required        | Fuel         |  Time  | Output (Qty)                         |  Occupation XP   |
| :-------------------- | :----------------------------------------------------------- | :-------------------- | :------------------- | :----------- | :----: | :----------------------------------- | :--------------: |
| `rec_fillet_fish`     | `2 Trout` or `1 Salmon`                                      | Smokehouse            | `Fillet Knife`       | None         |  60s   | `2 Fish Fillets` + `1 Fish Oil`      |   12 Smoker XP   |
| `rec_smoke_fish`      | `2 Raw Fish` + `1 Rock Salt`                                 | Smokehouse            | `Fillet Knife`       | `1 Firewood` |   4m   | `2 Smoked Glacier Fish`              |   22 Smoker XP   |
| `rec_cure_meat`       | `2 Yak Meat` + `1 Rock Salt` + `1 Ceramic Jar`               | Smokehouse            | `Butcher Knife`      | None         |   4m   | `2 Salted Meat`                      |   24 Smoker XP   |
| `rec_cook_stew`       | `2 Fish Fillets` + `2 Frost Potatoes` + `1 Sunleaf`          | Tavern Kitchen        | `Cooking Pot`        | `1 Firewood` |   4m   | `2 Hot Fish Stew`                    |    30 Chef XP    |
| `rec_cook_chowder`    | `1 Frost Carp` + `1 Milk` + `1 Butter` + `1 Frost Mint`      | Tavern Kitchen        | `Cooking Pot`        | `2 Firewood` |   6m   | `1 Frost Carp Chowder`               |    52 Chef XP    |
| `rec_cook_roast`      | `2 Yak/Salted Meat` + `2 Turnips` + `1 Butter`               | Tavern Kitchen        | `Iron Skillet`       | `2 Firewood` |   6m   | `1 Hearty Yak Roast`                 |    48 Chef XP    |
| `rec_cook_fondue`     | `2 Aged Cheese` + `1 Bread` + `1 Sunleaf`                    | Tavern Kitchen        | `Cooking Pot`        | `1 Firewood` |   4m   | `1 Alpine Cheese Fondue`             |    36 Chef XP    |
| `rec_brew_ale`        | `2 Barley Malt` + `1 Strained Honey` + `2 Water`             | Tavern Brewery        | `Copper Brew Kettle` | `1 Firewood` |   5m   | `2 Warm Spiced Barley Ale`           |    34 Chef XP    |
| `rec_extract_honey`   | `2 Raw Honeycomb`                                            | Apiary Shed           | `Honey Extractor`    | None         |   2m   | `2 Strained Honey` + `1 Beeswax Bar` | 16 Beekeeper XP  |
| `rec_cook_jam`        | `3 Berries` + `1 Sugar` + `1 Glass Jar`                      | Kitchen / Bakery      | `Cooking Pot`        | `1 Firewood` | 3m 30s | `2 Jarred Berry Jam`                 |    26 Chef XP    |
| `rec_pickle_turnip`   | `3 Snow Turnips` + `1 Rock Salt` + `1 Ceramic Jar`           | Kitchen               | `Chef Knife`         | None         | 2m 30s | `2 Pickled Snow Turnips`             |    16 Chef XP    |
| `rec_brew_warmth_tea` | `2 Frost Mint` + `1 Honey` + `1 Glass Jar` + `1 Water`       | Apothecary Hut        | `Mortar & Pestle`    | `1 Firewood` |   3m   | `2 Winter Warmth Tea`                | 28 Apothecary XP |
| `rec_brew_stamina`    | `1 Alpine Ginseng` + `2 Sunleaf` + `1 Honey` + `1 Glass Jar` | Apothecary Hut        | `Mortar & Pestle`    | `1 Firewood` |   5m   | `1 Ginseng Stamina Tonic`            | 44 Apothecary XP |
| `rec_craft_salve`     | `2 Sunleaf` + `1 Beeswax Bar` + `1 Glass Jar`                | Apothecary Hut        | `Mortar & Pestle`    | None         | 2m 30s | `2 Herbal Healing Salve`             | 22 Apothecary XP |
| `rec_brew_glow`       | `2 Glow-Cap Mushrooms` + `1 Fish Oil` + `1 Glass Jar`        | Apothecary Hut        | `Mortar & Pestle`    | None         |   4m   | `1 Cave-Sight Elixir`                | 38 Apothecary XP |
| `rec_refine_oil`      | `2 Fish Oil` + `1 Pine Resin` + `1 Glass Jar`                | Apothecary / Refinery | `Copper Kettle`      | `1 Firewood` |   2m   | `3 Refined Lantern Oil`              | 16 Apothecary XP |
| `rec_mix_fertilizer`  | `2 Compost` + `2 Straw`                                      | Barn / Apothecary     | `Shovel`             | None         |  90s   | `3 Rich Compost Fertilizer`          |   12 Farmer XP   |
| `rec_dip_candles`     | `1 Beeswax Bar` + `1 Linen Thread`                           | Apothecary / Loom     | `Melting Pot`        | `1 Firewood` |   2m   | `3 Scented Beeswax Candles`          | 16 Beekeeper XP  |

---

## 5. Master Tool, Equipment, Durability & Gear Loop

Tools are the circulatory system of Anvil's economy. Every gathering action and workshop run wears down tools slightly, creating **permanent demand** for **Blacksmiths, Carpenters, Masons, Smelters, and Tailors**.

### 5.1 Four-Tier Tool Progression Matrix

| Tier       | Material           | Crafting Station      | Durability | Gather Speed | Special Bonus                                                  | Repair Cost                       |
| :--------- | :----------------- | :-------------------- | :--------: | :----------: | :------------------------------------------------------------- | :-------------------------------- |
| **Tier 1** | **Copper**         | Blacksmith Forge (L1) |  60 uses   |     1.0x     | Starter tier; breaks basic nodes.                              | `1 Copper Bar` or `1 Repair Kit`  |
| **Tier 2** | **Iron**           | Blacksmith Forge (L3) |  140 uses  |    1.35x     | Unlocks Oak Trees, Iron Ore, +10% Fine quality chance.         | `1 Iron Bar` or `1 Repair Kit`    |
| **Tier 3** | **Tempered Steel** | Blacksmith Forge (L6) |  300 uses  |    1.75x     | Unlocks Gold Ore, Ice Crystals, +20% Fine / +10% Masterwork.   | `1 Steel Bar` or `2 Repair Kits`  |
| **Tier 4** | **Frost Crystal**  | Forge (L9) + Lapidary |  650 uses  |    2.25x     | **+35% double-yield chance**, immune to Winter cold slowdowns. | `1 Frost Core` or `3 Repair Kits` |

### 5.2 Complete Tool Crafting Directory (All 22 Tools)

| Tool ID              | Tool Name                                 | Crafted At               | Base Recipe (Iron / Standard Tier)                  | Primary Occupation(s)                            | Exact Role                                                                           |
| :------------------- | :---------------------------------------- | :----------------------- | :-------------------------------------------------- | :----------------------------------------------- | :----------------------------------------------------------------------------------- |
| **1. Catch Fish**    | Lake Spots                                | **Frozen Lake**          | `Fishing Rod`, `Fishing Net`, `Ice Auger` (Winter)  | `Trout`, `Salmon`, `Frost Carp`, `Lake Pearl`    | In **Winter**, the lake freezes—use an `Ice Auger` to catch high-value `Frost Carp`. |
| **2. Smoke & Cure**  | `Raw Fish` + `Firewood`                   | **Smokehouse**           | `Fillet Knife`, `Firewood`                          | `Smoked Fish`, `Fish Fillet`                     | Preserves Summer catches so they can be sold in Winter at **2x prices**.             |
| **3. Cook Meals**    | `Fish Fillet`, `Maize`, `Herbs`, `Butter` | **Tavern / Kitchen**     | `Iron Skillet`, `Cooking Pot`, `Firewood`           | `Hot Fish Stew`, `Winter Chowder`, `Roast Feast` | Restores maximum Yeti stamina and fulfills high-payout NPC citizen requests.         |
| `tool_hoe`           | **Farming Hoe**                           | Blacksmith Forge         | `1 Iron Bar` + `1 Tool Handle`                      | Farmer                                           | Tills soil on Farm Plots & Greenhouses.                                              |
| `tool_watering_can`  | **Watering Can**                          | Blacksmith Forge         | `2 Copper Bars`                                     | Farmer                                           | Waters crops; reduces growth timer by 15%.                                           |
| `tool_sickle`        | **Harvesting Sickle**                     | Blacksmith Forge         | `1 Iron Bar` + `1 Tool Handle`                      | Farmer, Forager                                  | Harvests Maize, Wheat, Barley, Flax, Reeds, Herbs.                                   |
| `tool_spade`         | **Digging Spade / Shovel**                | Blacksmith Forge         | `1 Iron Bar` + `1 Tool Handle`                      | Farmer, Miner, Builder                           | Harvests Potatoes, Turnips, Clay, Silica Sand, Compost.                              |
| `tool_axe`           | **Woodcutter's Axe**                      | Blacksmith Forge         | `2 Iron Bars` + `1 Tool Handle`                     | Lumberjack, Sawyer                               | Fells Pine/Oak trees and splits Firewood.                                            |
| `tool_tapping_knife` | **Resin Tapping Knife**                   | Blacksmith Forge         | `1 Copper Bar` + `1 Tool Handle`                    | Forester                                         | Extracts Pine Resin without felling trees.                                           |
| `tool_pickaxe`       | **Mining Pickaxe**                        | Blacksmith Forge         | `2 Iron Bars` + `1 Tool Handle`                     | Miner, Mason                                     | Mines Stone, Coal, Copper, Iron, Silver, Gold, Gems, Crystals.                       |
| `tool_sledgehammer`  | **Quarry Sledgehammer**                   | Blacksmith Forge         | `3 Iron Bars` + `1 Tool Handle`                     | Mason, Miner                                     | Splits heavy quarry outcrops and shapes Millstones.                                  |
| `tool_lantern`       | **Cave Oil Lantern**                      | Forge + Glassworks       | `1 Iron Bar` + `1 Glass Pane` + `1 Lantern Oil`     | Miner, Explorer                                  | Required to mine Echo Caves L2+ and Deep Shaft.                                      |
| `tool_fishing_rod`   | **Angler's Fishing Rod**                  | Carpentry Shop           | `2 Pine Planks` + `1 Linen Thread` + `1 Copper Bar` | Angler                                           | Catches Trout, Salmon, and Winter Frost Carp.                                        |
| `tool_fishing_net`   | **Woven Fishing Net**                     | Tailor / Loom            | `3 Linen Thread` + `2 Pine Planks`                  | Angler                                           | Multi-catch Summer fishing & Pearl trawling.                                         |
| `tool_ice_auger`     | **Steel Ice Auger**                       | Blacksmith Forge         | `2 Steel Bars` + `1 Tool Handle`                    | Angler (Winter)                                  | Drills ice holes on Frozen Lake in Winter.                                           |
| `tool_ice_saw`       | **Glacier Ice Saw**                       | Blacksmith Forge         | `2 Iron Bars` + `1 Tool Handle`                     | Angler, Preserver                                | Cuts `Ice Blocks` from the Frozen Lake in Winter.                                    |
| `tool_shears`        | **Wool & Tailor Shears**                  | Blacksmith Forge         | `2 Iron Bars`                                       | Rancher, Tailor                                  | Shears Mountain Yaks and cuts Woven Cloth.                                           |
| `tool_milk_pail`     | **Banded Milk Pail**                      | Carpentry + Forge        | `2 Pine Planks` + `1 Iron Bar`                      | Rancher                                          | Collects Fresh Milk from Barn Yaks.                                                  |
| `tool_bee_smoker`    | **Apiary Bee Smoker**                     | Blacksmith + Tailor      | `1 Copper Bar` + `1 Tanned Leather`                 | Beekeeper                                        | Safely harvests Honeycomb & Beeswax without stings.                                  |
| `tool_sawblade`      | **Circular Sawblade**                     | Blacksmith Forge         | `2 Iron Bars` (or `Steel` for Oak)                  | Sawyer                                           | Installed inside Sawmill; degrades slowly per 100 logs.                              |
| `tool_carpentry_kit` | **Hammer, Handsaw & Chisel**              | Blacksmith Forge         | `2 Iron Bars` + `2 Tool Handles`                    | Carpenter, Builder                               | Crafts Tool Handles, Furniture, Crates, and Building Upgrades.                       |
| `tool_tongs_bellows` | **Foundry Tongs & Bellows**               | Forge + Tailor           | `2 Iron Bars` + `2 Tanned Leather`                  | Smelter                                          | Operates Smelter furnaces for Iron/Steel/Silver/Gold bars.                           |
| `tool_blowpipe`      | **Glassmaker's Blowpipe**                 | Blacksmith Forge         | `2 Iron Bars`                                       | Glassblower                                      | Blows Clear Glass Panes and Sealed Glass Jars.                                       |
| `tool_cooking_set`   | **Skillet, Pot & Baking Peel**            | Forge + Carpentry        | `2 Iron Bars` + `2 Pine Planks`                     | Baker, Chef                                      | Required by Bakery ovens and Tavern stoves.                                          |
| `tool_mortar_loupe`  | **Mortar, Pestle & Gem Loupe**            | Stonecutter + Glassworks | `2 Cut Stone` + `1 Glass Pane`                      | Apothecary, Jeweler                              | Grinds tonics/teas and facets Gems & Frost Cores.                                    |

### 5.3 Durability, Breakage & Maintenance Rules

- **No Permanent Loss of Rare Tools:** When a tool reaches `0%` durability, it does **not** vanish—it enters **`Dull / Broken` state** (0.3x speed, cannot harvest high-tier nodes) until repaired with a `Universal Tool Repair Kit` or at the **Blacksmith Forge**.
- **Workshop Machinery Wear:** Large installed tools (`Millstone`, `Sawblade`, `Foundry Bellows`) lose `1%` integrity per batch completed, creating a recurring late-game demand for Masons, Blacksmiths, and Leatherworkers even among rich towns.

---

### F. Foraging & Apothecary Chain (Forest & Mountain Meadows)

Crafts potions, teas, and buffs that protect Yetis from Winter cold and boost gathering speed.

## 6. Complete Occupation & Business Directory (All 24 Professions)

Every Yeti player can participate in **any** of the 24 occupations below and build, own, and upgrade their buildings directly on the single town map. Each occupation also corresponds to **NPC citizen specialists** who live in your town, request materials, and contribute to the town's prosperity.

---

### 6.1 Primary Gathering & Agricultural Occupations (6 Professions)

#### 1. Farmer (Crop Grower)

- **Owned Map Building(s):** **Farm Plots** (up to 12 plots) + **Sun-Glass Greenhouse** (East Terrace).
- **Core Inputs:** Seeds (`Maize, Wheat, Barley, Potato, Turnip, Flax, Sweetroot`), `Water`, `Rich Compost Fertilizer`.
- **Core Outputs:** All raw farm crops + `Straw` byproduct.
- **Contribution to Town Loop:** Feeds the **Miller** (grain), **Rancher** (straw/maize feed), **Weaver** (flax), and **Tavern** (potatoes/turnips). Without Farmers, food prices skyrocket.
- **Summer vs. Winter Shift:** Peak production in **Summer** (2x growth speed). In **Winter**, open soil freezes—only hardy `Snow Turnips` grow outdoors unless the Yeti builds **Sun-Glass Greenhouses** (using Glass Panes + Firewood).
- **NPC Citizen Counterpart:** _Milo the Farmer_ — requests tools (`Hoe, Watering Can`) and `Fertilizer`, pays in rare seeds & coins.

#### 2. Rancher / Herder (Livestock Keeper)

- **Owned Map Building(s):** **Yak Barn**, **Snow-Hen Coop**, **Alpine Pasture**.
- **Core Inputs:** `Mixed Animal Feed`, `Fresh Water`, `Straw` (bedding).
- **Core Outputs:** `Fresh Milk`, `Snow-Hen Eggs`, `Thick Yak Wool`, `Raw Hide`, `Yak Meat`, `Compost`.
- **Contribution to Town Loop:** Supplies the **Dairy Maker** (`Milk`), **Baker** (`Eggs`), **Weaver/Tailor** (`Wool`, `Hide`), **Smokehouse** (`Meat`), and **Farmer** (`Compost`).
- **Summer vs. Winter Shift:** Operates year-round, but animals consume **+50% Animal Feed** in Winter, forcing Ranchers to stockpile Maize/Straw in Summer or buy from the Inter-Town Marketplace.
- **NPC Citizen Counterpart:** _Bram the Herder_ — requests `Animal Feed` and `Shears`.

#### 3. Beekeeper (Apiarist)

- **Owned Map Building(s):** **Forest Apiary & Honey Shed**.
- **Core Inputs:** `Pine Planks` (hive maintenance), blooming Summer flowers (`Wild Berries` / `Sunleaf` proximity).
- **Core Outputs:** `Raw Honeycomb` → `Strained Honey`, `Purified Beeswax Bar`, `Scented Beeswax Candles`.
- **Contribution to Town Loop:** Supplies **Bakery** (`Honey Cake`), **Tavern** (`Spiced Ale`), **Apothecary** (`Warmth Tea, Healing Salve`), and **Tailor** (`Wax` waterproofing for Winter Coats).
- **Summer vs. Winter Shift:** Abundant in **Summer**; hives hibernate in **Winter** (`-75%` yield), making Strained Honey one of the most lucrative Summer-to-Winter arbitrage items.
- **NPC Citizen Counterpart:** _Pippa the Apiarist_ — requests `Glass Jars` and `Bee Smokers`.

#### 4. Forager / Herbalist Gatherer

- **Owned Map Building(s):** **Forager's Trail Hut** (Pine Forest edge).
- **Core Inputs:** Stamina, `Gathering Basket`, `Herbalist Sickle`, `Warmth Tea` (in Winter).
- **Core Outputs:** `Wild Berries`, `Sunleaf Herb`, `Frost Mint`, `Alpine Ginseng`, `Cave Glow-Cap Mushrooms`, `River Reeds`.
- **Contribution to Town Loop:** Feeds the **Apothecary** (tonics & Winter teas) and **Bakery/Kitchen** (berries for pies & jams).
- **Summer vs. Winter Shift:** Harvests `Berries`, `Sunleaf`, and `Reeds` in **Summer**; switches to exclusive `Frost Mint` and `Alpine Ginseng` runs in **Winter**.
- **NPC Citizen Counterpart:** _Fern the Forager_ — shares daily hidden foraging spot hints on the single map.

#### 5. Lumberjack (Forester / Woodcutter)

- **Owned Map Building(s):** **Forester's Lodge & Tree Nursery** (Pine Forest).
- **Core Inputs:** `Axe`, `Tapping Knife`, `Pinecone Saplings` / `Oak Acorns` (replanting).
- **Core Outputs:** `Pine Logs`, `Hardwood Oak Logs`, `Pine Resin`.
- **Contribution to Town Loop:** Feeds the **Sawyer** (planks & firewood), **Charcoal Kiln**, and **Tannery/Carpentry** (`Resin`).
- **Summer vs. Winter Shift:** Year-round; in **Winter**, Lumberjack logs are in desperate demand because **every workshop and citizen hearth burns Firewood**. Replanting saplings prevents local forest depletion.
- **NPC Citizen Counterpart:** _Torg the Lumberjack_ — requests `Axes`, `Work Gloves`, and `Hot Fish Stew`.

#### 6. Angler (Fisher & Ice-Fisher)

- **Owned Map Building(s):** **Lakeside Pier & Ice-Fishing Shack** (Frozen Lake).
- **Core Inputs:** `Fishing Rod`, `Fishing Net` (Summer), `Steel Ice Auger` + `Ice Saw` (Winter).
- **Core Outputs:** `Valley Trout`, `Glacier Salmon`, `Frost Carp` (Winter), `Frost Pearls`, `Cut Ice Blocks`.
- **Contribution to Town Loop:** Primary protein engine for the **Smokehouse** & **Tavern**, supplies `Fish Oil` for **Cave Lanterns**, `Pearls` for the **Jeweler**, and `Ice Blocks` for **Cold Cellars**.
- **Summer vs. Winter Shift:** **Major seasonal pivot!** Open-water boat fishing in Summer → drilling ice holes for high-value `Frost Carp` and sawing `Ice Blocks` in Winter.
- **NPC Citizen Counterpart:** _Sora the Angler_ — tracks daily Lake school migrations and rare Pearl tides.

---

### 6.2 Raw-Material Processing Occupations (6 Professions)

#### 7. Miner (Quarry & Cavern Miner)

- **Owned Map Building(s):** **Minehead Outpost & Cave Lift** (Mountains / Echo Caves).
- **Core Inputs:** `Pickaxe`, `Refined Lantern Oil`, `Cave-Sight Elixir`, `Cornbread/Stew` (stamina).
- **Core Outputs:** `Raw Stone`, `Limestone`, `Clay`, `Silica Sand`, `Coal`, `Copper/Iron/Silver/Gold Ore`, `Rock Salt`, `Uncut Gems`, `Glacier Ice Crystals`.
- **Contribution to Town Loop:** Feeds **Smelters**, **Stonecutters**, **Glassblowers**, **Jewelers**, and **Smokehouses** (`Rock Salt`).
- **Summer vs. Winter Shift:** Year-round in Echo Caves; **Winter** unlocks the walkable frozen-lake shortcut into the **Glacier Crystal Cavern** for endgame `Ice Crystals`.
- **NPC Citizen Counterpart:** _Grit the Miner_ — warns of cave-in hazards and buys `Lantern Oil` & `Pickaxes`.

#### 8. Sawyer (Sawmill Operator)

- **Owned Map Building(s):** **Water/Wind Sawmill & Charcoal Kiln**.
- **Core Inputs:** `Pine Logs`, `Hardwood Oak Logs`, `Circular Sawblade`.
- **Core Outputs:** `Pine Wood Planks`, `Hardwood Oak Planks`, `Split Firewood`, `Kiln Charcoal`.
- **Contribution to Town Loop:** Turns raw timber into building materials (`Planks`) for **Carpenters/Builders** and fuel (`Firewood`/`Charcoal`) for **Bakers, Chefs, Smelters, and Winter Town Heating**.
- **Summer vs. Winter Shift:** **Water-powered (+20% speed) in Summer**; switches to **Wind/Hand-crank in Winter** when the river freezes unless upgraded with Steel Gears.
- **NPC Citizen Counterpart:** _Orin the Sawyer_ — requests replacement `Sawblades` and `Pine Logs`.

#### 9. Miller (Grain Grinder)

- **Owned Map Building(s):** **Village Windmill / Watermill**.
- **Core Inputs:** `Maize`, `Wheat`, `Barley`, `Straw`, `Sweetroot`, `Carved Millstone`.
- **Core Outputs:** `Fine Flour`, `Golden Cornmeal`, `Roasted Barley Malt`, `Mixed Animal Feed`, `Refined Sugar`.
- **Contribution to Town Loop:** The vital middleman between **Farmers** and **Bakers / Ranchers / Tavern Keepers**. High-volume, high-margin trade hub.
- **Summer vs. Winter Shift:** Runs year-round! Smart Millers buy cheap raw `Maize` and `Wheat` in Summer and grind `Flour` all Winter to sell at **2x**.
- **NPC Citizen Counterpart:** _Nora the Miller_ — requests `Carved Millstones` and bulk grain deliveries.

#### 10. Stonecutter / Mason (Brickmaker)

- **Owned Map Building(s):** **Stonecutter Yard & Brick Kiln**.
- **Core Inputs:** `Raw Stone`, `Limestone`, `River Clay`, `Firewood`.
- **Core Outputs:** `Cut Stone Blocks`, `Lime Mortar`, `Fired Clay Bricks`, `Carved Millstones`, `Brick & Iron Fireplaces`.
- **Contribution to Town Loop:** Essential for **all Tier 3–10 building upgrades**, **Millstones** for Millers, **Fireplaces** that reduce Winter heating costs, and **Cold Cellars**.
- **Summer vs. Winter Shift:** Clay gathering slows when riverbanks freeze in Winter—stockpiling `Bricks` in Summer gives Masons huge Winter construction contracts.
- **NPC Citizen Counterpart:** _Dorn the Mason_ — commissions cobblestone road and town wall projects.

#### 11. Smelter / Metallurgist (Foundry Operator)

- **Owned Map Building(s):** **Blast Furnace & Metal Foundry**.
- **Core Inputs:** Raw Ores (`Copper, Iron, Silver, Gold`), `Coal` or `Kiln Charcoal`, `Foundry Tongs & Bellows`.
- **Core Outputs:** `Copper Ingots`, `Iron Ingots`, `Tempered Steel Ingots`, `Silver Bars`, `Gold Bars`.
- **Contribution to Town Loop:** Feeds the **Blacksmith** (every tool & nail in the game), **Jeweler** (Silver/Gold), and **Builder** (Steel beams & gears).
- **Summer vs. Winter Shift:** High `Coal` consumption competes with Winter heating fuel—forcing strategic coal/charcoal supply management.
- **NPC Citizen Counterpart:** _Kael the Smelter_ — requests `Coal`, `Leather Bellows`, and `Iron Ore`.

#### 12. Smoker / Fishmonger (Food Preserver & Curer)

- **Owned Map Building(s):** **Lakeside Smokehouse & Cold Cellar**.
- **Core Inputs:** Raw Fish (`Trout, Salmon, Frost Carp`), `Yak Meat`, `Rock Salt`, `Firewood`, `Ceramic Jars`, `Ice Blocks`.
- **Core Outputs:** `Fresh Fish Fillet`, `Fish Oil`, `Smoked Glacier Fish`, `Salted Meat`.
- **Contribution to Town Loop:** **Eliminates spoilage!** Converts perishable Summer harvests into permanent Winter reserves and generates `Fish Oil` for Cave Miners' lanterns.
- **Summer vs. Winter Shift:** Crucial in **late Summer** (curing food before Winter) and **mid-Winter** (smoking freshly caught `Frost Carp` for 2x export).
- **NPC Citizen Counterpart:** _Vex the Fishmonger_ — buys fresh catches and sells cured rations.

---

### 6.3 Skilled Artisan, Culinary & Manufacturing Occupations (8 Professions)

#### 13. Baker

- **Owned Map Building(s):** **Village Bakery & Hearth Oven**.
- **Core Inputs:** `Fine Flour`, `Golden Cornmeal`, `Water`, `Milk`, `Eggs`, `Butter`, `Cheese`, `Berries`, `Honey`, `Sugar`, `Firewood`.
- **Core Outputs:** `Artisan Loaf Bread`, `Golden Cornbread`, `Mountain Berry Pie`, `Flaky Cheese Pastry`, `Glazed Honey Cake`.
- **Contribution to Town Loop:** Primary everyday food supplier for NPC citizen requests and players' stamina bars. One of the highest-volume businesses taxed by the **AI Mayor**.
- **Summer vs. Winter Shift:** **Huge Winter 2x price boom!** Bakers who stockpile Flour and Firewood in Summer become the wealthiest business owners during Winter.
- **NPC Citizen Counterpart:** _Mabel the Baker_ — posts daily citizen Bread & Pie quotas.

#### 14. Dairy Maker (Cheesemaker)

- **Owned Map Building(s):** **Village Creamery & Aging Cellar**.
- **Core Inputs:** `Fresh Milk`, `Rock Salt`, `Butter Churn`, `Cheese Press`.
- **Core Outputs:** `Churned Butter`, `Aged Mountain Cheese`.
- **Contribution to Town Loop:** Converts fast-spoiling `Milk` into high-value, long-lasting `Butter` (for **Bakery**) and `Aged Cheese` (for **Tavern Fondue** & **Inter-Town Trade**).
- **Summer vs. Winter Shift:** Aging Cellars run faster in Winter's natural chill (`+15%` Cheese quality bonus in Winter).
- **NPC Citizen Counterpart:** _Clara the Cheesemaker_ — trades specialty cheese wheels for `Rock Salt`.

#### 15. Chef / Tavern Keeper (Cook & Brewer)

- **Owned Map Building(s):** **The Frosty Yeti Tavern & Brewery**.
- **Core Inputs:** `Fish Fillets`, `Frost Carp`, `Yak/Salted Meat`, `Potatoes`, `Turnips`, `Cheese`, `Herbs`, `Barley Malt`, `Honey`, `Firewood`.
- **Core Outputs:** `Hot Fish Stew`, `Frost Carp Chowder`, `Hearty Yak Roast`, `Alpine Cheese Fondue`, `Warm Spiced Barley Ale`, `Berry Jam`, `Pickled Turnips`.
- **Contribution to Town Loop:** Produces the **highest stamina & warmth buffs** in the game and serves as the town's **Morale Hub** (hosting Winter Festivals & Citizen Banquets that counteract high AI Mayor taxes!).
- **Summer vs. Winter Shift:** Essential in **Winter**—players and citizens rely on `Hot Fish Stew`, `Frost Carp Chowder`, and `Spiced Ale` to survive cold penalties.
- **NPC Citizen Counterpart:** _Barkeep Boris_ — shares rumors about AI Mayor plans, upcoming AI Events, and high-demand marketplace items.

#### 16. Blacksmith / Toolsmith

- **Owned Map Building(s):** **The Anvil Blacksmith Forge**.
- **Core Inputs:** `Copper/Iron/Steel Ingots`, `Carved Tool Handles`, `Coal`, `Frost Cores` (T4).
- **Core Outputs:** **All 22 Gathering & Crafting Tools**, `Iron Nails`, `Precision Steel Gears`, `Tool Repair Kits`, `Street Lanterns`.
- **Contribution to Town Loop:** The **anchor of the entire economy**. Every other profession breaks or upgrades tools, guaranteeing constant local and inter-town demand.
- **Summer vs. Winter Shift:** Demand shifts from `Hoes/Sickles/Nets` in Summer to `Axes/Ice Augers/Ice Saws/Steel Pickaxes` in Winter.
- **NPC Citizen Counterpart:** _Barnaby the Blacksmith_ — offers tool tempering upgrades and bulk nail contracts.

#### 17. Carpenter / Woodworker (Furniture Maker)

- **Owned Map Building(s):** **Carpentry & Furniture Workshop**.
- **Core Inputs:** `Pine Planks`, `Oak Planks`, `Iron Nails`, `Beeswax`, `Wool/Linen Cloth`.
- **Core Outputs:** `Carved Tool Handles`, `Trade Crates`, `Fishing Rods`, `Baking Peels`, `Chairs`, `Oak Tables`, `Storage Chests`, `Plush Beds`, `Market Stalls`.
- **Contribution to Town Loop:** Supplies `Tool Handles` to Blacksmiths, `Storage Chests` to expand every player's warehouse, `Trade Crates` for Merchants, and furniture for Cozy Home buffs & citizen upgrades.
- **Summer vs. Winter Shift:** Steady year-round; indoor furniture demand spikes during Winter when citizens spend more time indoors.
- **NPC Citizen Counterpart:** _Alden the Carpenter_ — unlocks new furniture blueprints as friendship rises.

#### 18. Glassblower & Potter (Ceramics & Glass)

- **Owned Map Building(s):** **Glassworks Furnace & Pottery Wheel**.
- **Core Inputs:** `Silica Sand`, `Limestone`, `River Clay`, `Pine Resin`, `Firewood`/`Coal`.
- **Core Outputs:** `Clear Glass Panes`, `Sealed Glass Jars`, `Glazed Ceramic Jars`.
- **Contribution to Town Loop:** Supplies **Glass Jars** required by the **Apothecary & Jam Kitchen**, **Ceramic Jars** for **Cured Meat & Pickling**, and **Clear Glass Panes** required to build **Winter Greenhouses** and **Street Lanterns**.
- **Summer vs. Winter Shift:** Massive late-Summer spike as Farmers rush to buy `Glass Panes` for Winter Greenhouses before the first frost!
- **NPC Citizen Counterpart:** _Lina the Glassblower_ — requests `Silica Sand` and `Coal`.

#### 19. Herbalist / Apothecary (Alchemist)

- **Owned Map Building(s):** **Apothecary & Tonic Hut**.
- **Core Inputs:** `Sunleaf`, `Frost Mint`, `Alpine Ginseng`, `Glow-Cap Mushrooms`, `Strained Honey`, `Beeswax`, `Fish Oil`, `Glass Jars`.
- **Core Outputs:** `Winter Warmth Tea`, `Ginseng Stamina Tonic`, `Herbal Healing Salve`, `Cave-Sight Elixir`, `Refined Lantern Oil`, `Rich Compost Fertilizer`.
- **Contribution to Town Loop:** Keeps **Miners** lit (`Lantern Oil` & `Cave-Sight`), **Farmers** fast (`Fertilizer`), and **everyone warm & healthy** during Winter blizzards and illness events (`Warmth Tea` & `Healing Salve`).
- **Summer vs. Winter Shift:** Sells `Fertilizer` & `Stamina Tonics` in Summer; **Winter Warmth Tea** becomes a mandatory **2x surge commodity** in Winter.
- **NPC Citizen Counterpart:** _Yara the Apothecary_ — alerts the town to seasonal herb blooms and flu outbreaks.

#### 20. Weaver / Tailor (Clothier & Leatherworker)

- **Owned Map Building(s):** **Spinning Loom, Tannery & Tailor Shop**.
- **Core Inputs:** `Raw Flax`, `Thick Yak Wool`, `Raw Hide`, `Pine Resin`, `Rock Salt`, `Beeswax`.
- **Core Outputs:** `Linen Thread/Cloth`, `Wool Yarn/Cloth`, `Tanned Leather`, `Summer Tunics`, `Heavy Yak-Wool Winter Coats`, `Work Gloves`, `Trader Backpacks`, `Spiked Glacier Boots`, `Fishing Nets`.
- **Contribution to Town Loop:** Supplies `Leather` for **Smelter Bellows**, `Linen Thread` for **Fishing Rods/Nets**, `Backpacks` for inventory expansion, and **Winter Coats + Glacier Boots** essential for Winter survival.
- **Summer vs. Winter Shift:** `Summer Tunics` & `Nets` in Summer → massive **2x surge** on `Winter Coats` and `Glacier Boots` in Winter.
- **NPC Citizen Counterpart:** _Sera the Tailor_ — unlocks cosmetic Yeti outfits and seasonal town banners.

---

### 6.4 Luxury, Construction, Trade & Exploration Occupations (4 Professions)

#### 21. Jeweler / Gemcutter (Lapidary)

- **Owned Map Building(s):** **Lapidary & Gemcutter Boutique**.
- **Core Inputs:** `Uncut Alpine Gems`, `Glacier Ice Crystals`, `Frost Pearls`, `Silver Bars`, `Gold Bars`.
- **Core Outputs:** `Faceted Alpine Gems`, `Refined Frost Crystal Cores`, `Pearl Necklaces`, `Gem Rings`, `Golden Yeti Sovereign Crowns`, `Crystal Windchimes`.
- **Contribution to Town Loop:** Endgame prestige & high-margin export engine. `Frost Cores` unlock **Tier 4 Frost Crystal Tools** and **Perpetual Cold Cellars**; jewelry fulfills Royal Caravan & Town Monument contracts.
- **Summer vs. Winter Shift:** Peak crafting in **Winter** when Miners bring back fresh `Glacier Ice Crystals` from the Frozen Lake Cavern.
- **NPC Citizen Counterpart:** _Opal the Jeweler_ — appraises rare geodes and posts high-payout luxury orders.

#### 22. Builder / Architect (Town Contractor)

- **Owned Map Building(s):** **Builder's Yard & Blueprint Table**.
- **Core Inputs:** `Pine/Oak Planks`, `Cut Stone`, `Bricks`, `Mortar`, `Iron Nails`, `Steel Gears`, `Glass Panes`, `Frost Cores`.
- **Core Outputs:** **Building Tier Upgrades (`Tier 1 → Tier 10`)**, `Sun-Glass Greenhouse Kits`, `Cold Cellar Kits`, `Village Roads & Bridges`, **Grand Yeti Monument Stages**.
- **Contribution to Town Loop:** Primary **material sink** of the economy—absorbs huge volumes of Wood, Stone, Bricks, Glass, and Iron so the multiplayer marketplace stays healthy and deflation-free.
- **Summer vs. Winter Shift:** Construction costs standard stamina in Summer; Winter construction requires extra `Firewood` to keep mortar from freezing (unless subsidized by the AI Mayor).
- **NPC Citizen Counterpart:** _Hector the Architect_ — guides Town Hall and single-map landmark upgrades.

#### 23. Merchant / Caravan Trader (Logistics & Broker)

- **Owned Map Building(s):** **Town Trade Post, Custom Market Stalls & Expanded Warehouse**.
- **Core Inputs:** `Reinforced Trade Crates`, `Custom Trade Stalls`, market intelligence, working capital (`Frost Coins`).
- **Core Outputs:** Bulk inter-town order fulfillment, arbitrage profits (buy low in Summer → sell 2x in Winter), reduced marketplace listing fees, expanded concurrent order slots.
- **Contribution to Town Loop:** Connects your single town to the **global multiplayer economy**—bridging towns that specialize in farming with towns that specialize in mining or fishing.
- **Summer vs. Winter Shift:** Buys surplus Summer grain, firewood, and smoked fish cheap; flips them during Winter 2x spikes to under-prepared towns.
- **NPC Citizen Counterpart:** _Gilda the Merchant_ — tracks global price trends and alerts you when another town posts a lucrative buy order.

#### 24. Courier / Explorer (Scout & Cartographer)

- **Owned Map Building(s):** **Scout Outpost & Carrier Roost** (Mountain Trailhead).
- **Core Inputs:** `Stamina Tonics`, `Winter Warmth Tea`, `Lantern Oil`, `Glacier Boots`, `Cave Maps`.
- **Core Outputs:** Discovered hidden chests & `Ancient Yeti Relics`, express inter-town order delivery bonuses (`+15% tip`), unlocked map shortcuts, rare seed & gem vein pins.
- **Contribution to Town Loop:** Adds active exploration & discovery on the single map—locating daily spawned secret caches, delivering urgent NPC letters across zones, and speeding up Inter-Town Marketplace fulfillment.
- **Summer vs. Winter Shift:** Scouts hidden forest groves in Summer; charts safe **Frozen Lake ice paths** and **Ice Cavern shortcuts** in Winter.
- **NPC Citizen Counterpart:** _Kip the Scout_ — hands out daily Exploration Bounties and Relic appraisals.

---

## 7. Seasonal Cycle, Weather & Single-Map Transformation (Summer vs. Winter)

The **Summer ↔ Winter Seasonal Cycle** is the heartbeat of **Anvil**. Because there is **only one map**, seasons physically reshape that map's geography, resource availability, workshop efficiency, citizen needs, and marketplace prices—giving players a fresh strategic puzzle every few days.

### 7.1 Seasonal Clock & Cadence

- **Real-World Synced Server Clock (Authoritative on Bun.js):**
  - **1 Full Seasonal Cycle = 6 Real-World Days** (`72 Hours Summer` → `72 Hours Winter`).
  - Every town shares the same global seasonal clock so the **Inter-Town Marketplace** experiences unified macroeconomic waves (Summer surplus vs. Winter 2x scarcity).
  - **Transition Warning Window (Final 12 Hours of Summer — "The First Frost"):**
    - Visual snow flurries appear on the Skia canvas.
    - The **AI Mayor** issues a **Pre-Winter Treasury Forecast** telling the player how full the Town Treasury is and whether a full subsidy, partial cushion, or zero subsidy is likely.
    - Citizens begin requesting `Firewood`, `Smoked Fish`, `Winter Coats`, and `Bread` at `+25%` bonus payout to prepare.
  - **Spring Thaw Window (Final 6 Hours of Winter — "The Thaw"):**
    - Ice across the Frozen Lake begins cracking (warning banner to finish `Ice Crystal` runs before the bridge melts).
    - Remaining Winter 2x prices gradually ease down (`2.0x → 1.5x → 1.0x`) so players can clear stockpiles without an abrupt crash.

### 7.2 Complete Summer vs. Winter System Comparison

| System / Zone             | Summer (72 Hours — Growth & Prep)                                                                                               | Winter (72 Hours — Scarcity & 2x Crucible)                                                                                                                                                                                       |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Outdoor Farm Plots**    | **100%–120% growth speed** for all crops (`Maize, Wheat, Barley, Flax, Sweetroot, Berries`).                                    | **Soil Frozen:** Only hardy `Snow Turnips` grow outdoors (`-30%` speed). All other crops require a heated **Sun-Glass Greenhouse** (`Glass Panes` + `Firewood`).                                                                 |
| **Frozen Lake & River**   | Open blue water; boat fishing (`Trout, Salmon`), shoreline `Clay` & `Reeds`, active **Waterwheel** (+20% Sawmill & Mill speed). | **Freezes Solid:** Boat pier closes; shoreline Clay/Reeds freeze over; Waterwheel stops (Wind/Gears take over). **Unlocks Ice-Fishing (`Frost Carp`), `Ice Block` sawing, and walkable bridge to the `Glacier Crystal Cavern`.** |
| **Pine Forest**           | Abundant `Wild Berries`, `Sunleaf Herbs`, active `Beehives` (`Honey/Wax`).                                                      | Berries & Beehives dormant (`-75%`); **`Frost Mint` blooms**; Firewood demand surges 2x.                                                                                                                                         |
| **Mountains & Caves**     | Clear mountain trails; warm cave air; standard Lantern Oil drain.                                                               | **Windchill active** on Mountains (drains Warmth/Stamina unless wearing `Winter Coat` or drinking `Warmth Tea`). **Avalanche outcrops** expose bonus `Iron` & `Coal` seams.                                                      |
| **Town Fuel Consumption** | Minimal heating needed; Firewood used only for Ovens/Smokehouses/Kilns.                                                         | **Active Heating Load:** Workshops & Citizen Homes require `Firewood` or `Brick Fireplaces` to avoid `-25%` cold crafting slowdown.                                                                                              |
| **Marketplace Prices**    | Baseline `1.0x` equilibrium; abundant raw supply; ideal time for building upgrades and stockpiling.                             | **Dynamic `1.0x → 2.0x` Surge** based on global/local supply & demand—especially on `Firewood, Coal, Flour, Bread, Stew, Smoked Fish, Warmth Tea, Winter Coats`.                                                                 |
| **NPC Citizen Mood**      | Baseline relaxed; citizens request furniture, clothes, tools, and varied meals.                                                 | **Survival Urgency:** Citizens actively track **Warmth** and **Food Cost**. If the AI Mayor does not subsidize 2x prices, citizen morale drops unless the player helps fulfill requests or hosts Tavern Banquets.                |

### 7.3 Sub-Weather States (Rotates Every 6 Hours Within Each Season)

Within Summer and Winter, the Bun.js server rolls localized **Sub-Weather** that updates Skia particle shaders and applies tactical 6-hour gameplay modifiers:

| Season     | Sub-Weather            | Skia Visual Shader                                              | Gameplay Modifier (6 Hours)                                                                                                                                        |
| :--------- | :--------------------- | :-------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Summer** | **Clear Alpine Sun**   | Warm sunlight rays, gentle drifting clouds                      | `+15%` Farm crop growth speed; `+10%` Apiary honey output.                                                                                                         |
| **Summer** | **Valley Rainshower**  | Animated rain streaks, puddle ripples                           | **Auto-waters all Farm Plots** (saves stamina & Watering Can durability); `+25%` Lake Trout bite rate.                                                             |
| **Summer** | **Golden Breeze**      | Swaying pine shaders, dandelion particles                       | `+25%` Windmill & Sawmill processing speed; `-10%` travel stamina cost.                                                                                            |
| **Summer** | **Heatwave**           | Golden shimmer haze                                             | Crops dry out 2x faster (Watering Can essential); `Breezy Linen Tunic` grants `+15%` gather speed; Cold Cellar prevents rapid spoilage.                            |
| **Winter** | **Crisp Snowfall**     | Gentle drifting snowflakes, soft blue ambient glow              | Standard Winter rules; `+15%` `Frost Mint` spawn rate in Pine Forest.                                                                                              |
| **Winter** | **Howling Blizzard**   | Heavy diagonal snow particles, frosted vignette                 | **2x Windchill drain** outdoors (Winter Coat/Tea critical); outdoor stamina cost `+25%`; **Indoor Bakery/Tavern/Forge crafting speed `+20%`** (cozy hearth bonus). |
| **Winter** | **Aurora Frost Night** | Shimmering `#40A7FC` + `#C0CEF5` northern lights sky reflection | **Glacier Crystal Cavern yields `+40%` Ice Crystals & Frost Pearls**; `Cave-Sight Elixir` lasts 2x longer.                                                         |
| **Winter** | **Deep Freeze**        | Crystalline ice sheen over lake & roofs                         | Lake ice thickness maximizes (`+30%` `Frost Carp` & `Ice Block` yield); non-heated workshops require `+1 Firewood` per batch.                                      |

---

## 8. The AI Mayor, Business Taxation & Town Treasury Engine

In **Anvil**, the **AI Mayor** (an autonomous server-side persona powered by Cloud AI on Bun.js) governs the town's macroeconomic policy. The player owns and operates Yeti businesses on the ground, while the **AI Mayor** taxes businesses, manages the **Town Treasury**, reacts to citizen happiness, and makes the decisive **Winter Price Subsidy** call.

### 8.1 Responsibilities of the AI Mayor

1. **Taxation & Treasury Collection:** Automatically collects tax revenue into the **Town Treasury** from:
   - Player business sales (NPC citizen orders, local shop sales, and Inter-Town Marketplace sell orders).
   - NPC citizen workshop activity (background passive town tax trickle proportional to NPC Occupation Levels and Citizen Happiness).
2. **Dynamic Tax Rate Adjustment (Daily Fiscal Review):**
   - Once every 24 real-world hours (and at every Season Transition), the AI Mayor evaluates the town's economic telemetry (`treasuryBalance`, `daysUntilWinter`, `citizenHappiness`, `activeWorkshopCount`, `averageMarketPrices`) and sets the town's **Business Tax Rate (`5%` to `25%`)**.
   - **Low Tax Regime (`5% – 9%`):** Triggered when the Treasury is already well-funded or when Citizen Happiness is low. Grants citizens a **"Booming Commerce"** mood (`+15%` faster workshop crafting, higher citizen request tips).
   - **Balanced Tax Regime (`10% – 15%`):** Default Summer fiscal stance—steadily builds the Town Treasury without hurting citizen morale.
   - **Austerity / Pre-Winter Tax Hike (`16% – 25%`):** Triggered if the Treasury is dangerously low right before Winter, or if a greedy/cautious AI Mayor wants to build an emergency buffer. Reduces citizen mood slightly (`-10%` happiness) and increases pressure on the player to trade efficiently.
3. **Winter 2x Price Subsidy & Cushioning Decision:**
   - When Winter arrives and prices double (`up to 2.0x`) on high-demand essentials, the AI Mayor decides how to deploy the **Town Treasury** across **4 Distinct Subsidy Modes**.
4. **Public Works & Town Buff Spending:**
   - If the Town Treasury accumulates a healthy surplus after Winter, the AI Mayor can spend Treasury coins on **Town-Wide Projects** (e.g., _Paving Village Roads for +10% Move Speed_, _Lighting Winter Street Lanterns_, or _Funding a Harvest Festival_).

### 8.2 The Town Treasury Ledger (Inflows & Outflows)

Every player can inspect the **Town Hall Ledger** at any time to see _why_ the AI Mayor is making its decisions and plan their own inventory/trading strategy around it!

#### Treasury Inflows (Revenue)

| Source                                 | Calculation                                                                                                                                 | Frequency                       |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------ |
| **Yeti Business Sales Tax**            | `SaleValue × aiMayor.taxRate` (e.g., 12% of Bakery/Forge sales)                                                                             | Per completed sale / order      |
| **Inter-Town Export Tariff**           | `TradeOrderValue × aiMayor.exportTaxRate` (`3% – 10%`)                                                                                      | Per fulfilled Marketplace order |
| **NPC Citizen Poll & Workshop Tax**    | `Σ(CitizenOccupationLevel × 15 FC × HappinessMultiplier)`                                                                                   | Every 6 hours                   |
| **Royal / Inter-Town Contract Bonus**  | `15%` of completed Co-op Event Contract payouts                                                                                             | Per completed AI Event          |
| **Voluntary Player Treasury Donation** | Player may optionally donate coins to the Treasury to earn **Mayor Favor & Civic Prestige XP** (and help prevent a Winter subsidy failure!) | Anytime at Town Hall            |

#### Treasury Outflows (Expenses)

| Expense                        | Calculation                                                                 | Trigger                           |
| :----------------------------- | :-------------------------------------------------------------------------- | :-------------------------------- |
| **Winter Price Subsidies**     | `Σ(CitizenUnitsConsumed × (WinterPrice - SubsidizedPrice))`                 | Every 6 hours during Winter       |
| **Town Infrastructure Upkeep** | `TownLevel × 80 FC` (lantern oil, road repairs, bridge ice-clearing)        | Daily (24h)                       |
| **Emergency Disaster Relief**  | `500 – 2,500 FC` (repairing storm damage or buying emergency grain)         | During Crisis AI Events           |
| **Festival & Morale Grants**   | `600 – 1,500 FC` (funds Summer/Winter Festivals when surplus > 200% target) | When Treasury exceeds reserve cap |

### 8.3 The 4 Winter Subsidy Policies (How the AI Mayor Handles the 2x Spike)

Every 12 hours during Winter, the **AI Mayor** inspects `TreasuryCoverageRatio = TownTreasury / EstimatedRemainingWinterSubsidyCost` and selects one of four transparent policies:

| Policy Mode                                   | Trigger Condition                                               |                      Effective Local Cost to Citizens & Workshops                       | Treasury Drain Rate | Gameplay Impact & Player Strategy                                                                                                                                                                                                                                                                       |
| :-------------------------------------------- | :-------------------------------------------------------------- | :-------------------------------------------------------------------------------------: | :-----------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1. `FULL_CUSHION` (Full Subsidy)**          | `CoverageRatio >= 1.2` & Generous/Balanced Mayor                |           **1.0x – 1.15x** (Treasury absorbs ~85–100% of the 2x Winter spike)           |    **Very High**    | Citizens stay ecstatic (**+25% crafting speed**, zero strikes, maximum Citizen Request frequency). Cheap local inputs let you manufacture `Bread`, `Stew`, and `Tools` locally and **export them on the Inter-Town Marketplace at 2.0x** to unsubsidized towns!                                         |
| **2. `TARGETED_ESSENTIALS` (Smart Cushion)**  | `CoverageRatio 0.6 – 1.19`                                      | **1.25x** on `Firewood, Bread, Soup`; **1.8x – 2.0x** on `Ores, Luxury, Tools, Fabrics` |    **Moderate**     | Citizens stay warm and fed without bankrupting the town. Industrial/luxury goods still spike to **2.0x**, creating huge profits for Blacksmiths, Tailors, and Jewelers.                                                                                                                                 |
| **3. `MINIMAL_RELIEF` (Emergency Rations)**   | `CoverageRatio 0.25 – 0.59`                                     |         **1.65x – 1.85x** across most items; only `Firewood` partially buffered         |       **Low**       | Citizens tighten budgets and complain; workshop speed drops `-10%`. Players who stockpiled raw materials in Summer avoid paying 1.8x prices and dominate the local & global market.                                                                                                                     |
| **4. `NO_SUBSIDY` (Citizens Absorb 2x Cost)** | `CoverageRatio < 0.25` (Treasury near empty) OR Austerity Mayor |                        **Full 2.0x** market prices on everything                        |      **Zero**       | **High-Stakes Survival Economy:** Citizen Happiness drops (`-20%`), NPC requests pay **2.0x Coins** (desperation premium!), and if Happiness falls below 35%, specific guilds threaten a **Work Slowdown** until the player fulfills emergency citizen supply crates or donates to revive the Treasury. |

### 8.4 AI Mayor Personality Archetypes (Replayability & Town Flavor)

Each town's **AI Mayor** rolls (or rotates every 4 seasons via an NPC Town Council election!) one of **5 Distinct Archetypes** that shapes its decrees, dialogue tone, and fiscal bias:

| Archetype                  | Name Example             |                      Tax Bias                      |            Winter Subsidy Bias             | Signature Policy Quirk                                                                                                                                |
| :------------------------- | :----------------------- | :------------------------------------------------: | :----------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The Benevolent Steward** | _Mayor Barnaby Frost_    |                Low–Medium (`8–14%`)                | **Strong Cushion Bias** (subsidizes early) | Prioritizes citizen happiness; risks draining the Treasury late in Winter unless the player boosts tax base or donates.                               |
| **The Iron Accountant**    | _Mayor Helga Ledger_     |               Medium–High (`12–20%`)               |        **Targeted Essentials Only**        | Hoards a massive Treasury reserve; rarely runs out of money, funds cobblestone & infrastructure upgrades rapidly.                                     |
| **The Free-Market Baron**  | _Mayor Viktor Coinbeard_ |                 Very Low (`5–10%`)                 |          **Minimal / No Subsidy**          | Cuts business taxes so players keep almost all profit, but refuses to cushion Winter 2x spikes—rewarding aggressive Summer stockpilers and exporters. |
| **The Guild Patron**       | _Mayor Tessa Anvil_      | Sector-Weighted (`8%` artisans, `18%` raw exports) |        **Subsidizes Fuel & Tools**         | Heavily favors processed goods (`Bakery, Forge, Carpentry, Tavern`) over raw exports.                                                                 |
| **The Chaotic Populist**   | _Mayor Pipsqueak_        |                Swings (`6% ↔ 22%`)                 |         **Event-Driven Festivals**         | Frequently throws surprise festivals and sudden tax holidays, creating wild short-term trading arbitrage windows.                                     |

### 8.5 Player Counterplay & Civic Influence (Even When the AI Controls Taxes)

Even though the **AI Mayor** controls tax rates and Winter subsidies, the player is **never powerless**—you have 5 strategic levers to influence or outplay the AI Mayor:

1. **Petition the Mayor (Town Hall):** Spend **Civic Favor** (earned by fulfilling NPC citizen requests) to submit a formal policy petition (e.g., _"Request Firewood Subsidy"_ or _"Request Temporary Blacksmith Tax Break"_). The Cloud AI Mayor weighs your Favor + Treasury health and responds in character!
2. **Treasury Donations:** Voluntarily top up the Town Treasury right before Winter to guarantee your town qualifies for `FULL_CUSHION` or `TARGETED_ESSENTIALS` instead of suffering a `NO_SUBSIDY` slowdown.
3. **Summer Stockpiling & Vertical Integration:** If your AI Mayor is a _Free-Market Baron_ who won't subsidize Winter, build **Storage Chests + Cold Cellars** in Summer and hoard `Flour, Firewood, Smoked Fish, Coal` so you pay **0 FC** during the 2x Winter spike and sell your extras to other players at **2.0x**!
4. **Cross-Town Arbitrage:** Buy cheaply in towns with `FULL_CUSHION` surplus or Summer producers, and sell into towns facing `NO_SUBSIDY` Winter 2x spikes via the shared Marketplace.
5. **Tavern Banquets & Citizen Gifts:** Counteract high-tax morale penalties directly by gifting `Honey Cakes` or hosting a `Tavern Feast` so your workshops stay at peak speed even during an AI tax hike.

### 8.6 AI Mayor Server Decision Payload (Bun.js Contract)

```json
{
  "townId": "town_88412",
  "mayorArchetype": "IRON_ACCOUNTANT",
  "mayorName": "Mayor Helga Ledger",
  "season": "WINTER",
  "seasonHour": 18,
  "taxPolicy": {
    "businessSalesTax": 0.14,
    "marketplaceExportTax": 0.06,
    "favoredSector": "BAKERY",
    "favoredSectorDiscount": 0.04
  },
  "treasuryState": {
    "currentBalance": 4850,
    "projectedWinterDrain": 5400,
    "subsidyPolicy": "TARGETED_ESSENTIALS",
    "treasurySpentThisTick": 420
  },
  "localPriceMultipliers": {
    "int_firewood": 1.25,
    "prod_bread": 1.2,
    "prod_fish_stew": 1.3,
    "raw_iron_ore": 1.85,
    "gear_winter_coat": 2.0
  },
  "decreeHeadline": "Essentials Cushioned — Industrial Goods Uncapped!",
  "decreeMessage": "Our Treasury will keep Firewood and Bread affordable while this frost lasts. Miners and Tailors must face the full 2x Winter market—plan your exports wisely!"
}
```

---

## 9. Dynamic Cloud AI Events & Economic Shocks

Every **12 hours** (or triggered dynamically when town/marketplace metrics cross thresholds), the remote **Bun.js AI Event Director** generates a **Town or Global Economic Event**. Because one AI generation broadcasts cleanly as a tiny `< 1 KB` JSON delta, AI costs remain near-zero even at massive player scale.

### 9.1 Five Categories of AI Events

1. **Supply Shocks (Resource Reduction):** Reduce yield of a resource for 6–12 hours, instantly spiking its Marketplace price and rewarding stockpilers.
2. **Bountiful Booms (Resource Surplus):** Boost yield or crafting speed for a specific biome/occupation, flooding supply and encouraging bulk buying/crafting.
3. **Demand Surges (External Caravan / Royal Orders):** External buyers demand massive volumes of specific crafted items at `+40% – +100%` payout.
4. **Civic & Social Events (Citizen Petitions / Festivals):** NPC citizens band together to request a town-wide goal (e.g., _Warm the Village Drive_ or _Harvest Bake-Off_).
5. **Fiscal & Policy Twists (AI Mayor Decrees):** Sudden tax holidays, emergency tariff waves, or Treasury matching bonuses.

### 9.2 Library of 24 Concrete AI Event Archetypes

|  #  | Event Name                        | Category       |   Season    | Trigger / Context        | Gameplay & Resource Modifiers                                                                                     | Player Opportunity                                                             |
| :-: | :-------------------------------- | :------------- | :---------: | :----------------------- | :---------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
|  1  | **Pine Beetle Outbreak**          | Supply Shock   |   Summer    | High logging volume      | Forest `Pine Log` yield `-40%` for 8h; `Firewood` & `Planks` value `+50%`.                                        | Sell stockpiled `Planks` or switch to `Oak` / `Stone`.                         |
|  2  | **Great Bakery Boom**             | Demand Surge   |     Any     | High grain supply        | `Bread`, `Berry Pie`, `Honey Cake` citizen & market payouts `+45%`.                                               | Millers & Bakers run double shifts.                                            |
|  3  | **Frozen Lake Blizzard**          | Supply Shock   |   Winter    | Deep Freeze weather      | Outdoor stamina cost `+30%`; `Firewood` & `Warmth Tea` price spikes to `2.0x`.                                    | Sell `Warmth Tea` & `Winter Coats` at peak margin.                             |
|  4  | **Silver Vein Discovery**         | Bountiful Boom |     Any     | Active cave mining       | Echo Caves L3 `Silver Ore` & `Uncut Gem` drop rate `+60%` for 6h.                                                 | Buy `Lantern Oil` & `Pickaxes`, delve caves hard.                              |
|  5  | **Bumper Maize Harvest**          | Bountiful Boom |   Summer    | Clear Sun weather        | Farm `Maize` & `Wheat` harvest `+50%` bonus yield.                                                                | Buy cheap grain on Marketplace and stockpile `Flour`.                          |
|  6  | **Royal Banquet Caravan**         | Demand Surge   |     Any     | Random / Weekly          | External caravan buys `Honey Cake`, `Yak Roast`, `Frost Carp Chowder` at `1.8x`.                                  | Chefs & Bakers team up via Marketplace orders.                                 |
|  7  | **Echo Cave Tremor**              | Supply Shock   |     Any     | Heavy cave mining        | Caves L3–L4 temporarily unstable (`+25%` tool wear); `Iron Bar` price `+60%`.                                     | Blacksmiths sell `Repair Kits` & `Iron Bars` at premium.                       |
|  8  | **Mayor's Tax Holiday**           | Fiscal Twist   |   Summer    | High Treasury surplus    | AI Mayor cuts Business Sales Tax to **0%** for 8 hours!                                                           | Liquidate inventory & fulfill high-value orders tax-free.                      |
|  9  | **Winter Flu Outbreak**           | Civic Crisis   |   Winter    | Unsubsidized cold wave   | 4 NPC citizens fall ill (`-30%` workshop speed) until gifted `Healing Salve`.                                     | Apothecary players sell `Healing Salve` at `2.0x`.                             |
| 10  | **Glacier Melt Cracks**           | Supply Shock   | Late Winter | 24h before Thaw          | `Ice Crystal` & `Frost Carp` yields `+50%` (last-chance rush) before lake thaws!                                  | High-risk sprint across Frozen Lake with `Glacier Boots`.                      |
| 11  | **Blacksmith Apprenticeship Day** | Bountiful Boom |     Any     | Low tool inventory       | Forging speed `+35%`, tool craft Coal cost `-50%` for 6h.                                                         | Mass-produce `Iron/Steel Tools` and `Nails`.                                   |
| 12  | **Dry Millstream**                | Supply Shock   |   Summer    | Heatwave weather         | Waterwheel slows (`-25%` Mill & Sawmill speed) unless Steel-Gear upgraded.                                        | Wind-powered/upgraded Millers capture Marketplace share.                       |
| 13  | **Yeti Midwinter Festival**       | Civic Festival |   Winter    | Mayor Treasury > 120%    | AI Mayor spends Treasury to cut local food prices by `50%`; `+25%` Friendship XP.                                 | Level up NPC citizens rapidly for permanent perks.                             |
| 14  | **Glassworks Rush**               | Demand Surge   | Late Summer | 24h before Winter        | `Clear Glass Panes` & `Greenhouse Kits` surge `+70%` as players prep for Winter.                                  | Glassblowers & Sand Miners make huge Summer profits.                           |
| 15  | **Smuggler's Fog**                | Trade Twist    |     Any     | High AI Mayor tax (>18%) | A mysterious Yeti barge docks at the Lake: `0%` export tariff for 4 hours (limited slots).                        | Bypass high local taxes for one lucrative trade window.                        |
| 16  | **Salmon Migration Run**          | Bountiful Boom |   Summer    | Valley Rainshower        | Frozen Lake `Glacier Salmon` & `Frost Pearl` catch rate `+80%` for 6h.                                            | Anglers + Smokehouses print permanent Winter rations.                          |
| 17  | **Honey Harvest Moon**            | Bountiful Boom |   Summer    | Late Summer              | Apiary `Honeycomb` & `Beeswax` output doubled (`2x`).                                                             | Beekeepers stockpile `Honey` for Winter `Warmth Tea`.                          |
| 18  | **Timber Tariff Dispute**         | Fiscal Twist   |     Any     | Global wood imbalance    | Export tariff on `Raw Logs` doubles (`+10%`), while finished `Furniture` gets `0%` tax!                           | Encourages processing logs into `Chairs/Tables` instead of exporting raw wood. |
| 19  | **Crystal Resonance Surge**       | Bountiful Boom |   Winter    | Aurora Frost Night       | `Glacier Crystal Cavern` spawns double nodes; `Frost Core` crafting `+25%` Masterwork chance.                     | Jewelers & Miners craft Tier 4 Frost Crystal Tools.                            |
| 20  | **Livestock Feed Crunch**         | Supply Shock   |   Winter    | Low Maize/Straw stocks   | Barn animals need `+25%` feed; `Milk`, `Butter`, `Cheese`, `Wool` jump `+65%`.                                    | Ranchers & Millers who stockpiled `Animal Feed` cash in.                       |
| 21  | **Architect's Grand Expo**        | Demand Surge   |   Summer    | High town expansion      | `Cut Stone`, `Bricks`, `Oak Planks`, and `Iron Nails` payout `+40%` on all orders.                                | Masons, Carpenters, and Builders accelerate Town upgrades.                     |
| 22  | **Tavern Storytelling Night**     | Civic Festival |     Any     | Weekend / Random         | Serving `Spiced Ale` & `Cheese Fondue` restores +20% Town Morale & triggers rare hidden quests.                   | Chefs & Brewers boost whole town efficiency.                                   |
| 23  | **Ancient Relic Auction**         | Demand Surge   |     Any     | Rare Explorer drop       | Collector visits Town Square paying `2x Coins + Prestige XP` for `Ancient Relics` & `Gem Rings`.                  | Explorers & Jewelers score massive jackpots.                                   |
| 24  | **Treasury Emergency Drive**      | Civic Crisis   |   Winter    | Treasury < 15%           | AI Mayor offers **2x Civic Favor + Exclusive Mayor Statue Progress** for every 100 FC donated or order fulfilled. | Players rescue the Treasury to unlock `TARGETED_ESSENTIALS` subsidy.           |

---

## 10. Player-Driven Inter-Town Marketplace & Trade Loop

Because every player owns their own town on the single map, the **Shared Inter-Town Marketplace** is the multiplayer nervous system connecting all towns together.

### 10.1 How the Order Book Works (Post Orders & Fulfill Orders)

Every town has a **Town Trade Post** near the Village Square. Players interact with two sides of the global/regional Order Book:

1. **Posting a Sell Order (Exporting Your Surplus):**
   - Choose an item (e.g., `20 Fine Flour`, `5 Heavy Yak-Wool Winter Coats`, `10 Smoked Glacier Fish`), set a **Unit Price** within the live dynamic price band (`0.5x` to `2.0x` seasonal range), and pack it using a `Reinforced Trade Crate` (for bulk bundles of 10+).
   - Items move into **Marketplace Escrow** on the Bun.js server.
   - When a player from another town buys your order:
     - Their Yeti courier visibly walks into your Village Square Trade Post to pick up the crate.
     - You receive **`OrderTotal - (OrderTotal × AI_Mayor_Export_Tax)`** instantly into your coin purse, while the tax cut flows into your **Town Treasury**.
2. **Posting a Buy Order (Requesting Scarce Resources):**
   - Need `15 Clear Glass Panes` for a Winter Greenhouse or `20 Coal` for your Smelter? Post a **Buy Order** offering a competitive price (coins are held in escrow).
   - Any player from another town who has surplus `Glass Panes` or `Coal` can click **Fulfill Order** for instant coins + **Merchant XP + Courier Tip**!
3. **Browsing & Instant Fulfillment ("Contract Board"):**
   - Filter live orders by **Category** (`Raw, Food, Fuel, Tools, Clothing, Building, Luxury`), **Profit Margin**, **Urgency (Winter 2x)**, or **Friends / Trade Pact Towns**.
   - Players who fulfill other towns' Buy Orders rapidly earn **Express Courier Streaks** (`+5% → +15%` bonus coins on 3+ consecutive deliveries).

### 10.2 Dynamic Seasonal Price Bounds (Supply/Demand + 2x Winter Rule)

To prevent bots or gold-sellers from breaking the economy while preserving genuine player-driven price discovery:

- **Summer Price Band:** Players can list/bid between **`0.60x` and `1.35x`** of Base Summer Price.
- **Winter Price Band (Dynamic 2x Surge):**
  - The Bun.js **Market Pricing Engine** recalculates the **Supply/Demand Index (`SDI`)** for every item every 15 minutes across the server cluster:
    - `SDI = TotalActiveBuyDemand / max(TotalActiveSellSupply, 1)`
  - During **Winter**, high-demand items (`Firewood, Coal, Bread, Flour, Stew, Smoked Fish, Warmth Tea, Winter Coats, Ice Crystals`) unlock an expanded ceiling up to **`2.00x` Base Price** (or up to `2.25x` during an active Supply Shock AI Event!).
  - Low-demand Winter items (e.g., `Breezy Linen Tunic`) stay near `0.75x – 1.0x`, rewarding smart traders who read the ticker.

### 10.3 Listing Slots, Escrow Expiry & The AI Travelling Caravan (Anti-Softlock)

- **Active Order Slots:** Start with **3 concurrent order slots**; expand up to **15 slots** by crafting & placing `Custom Trade Stalls` and upgrading your **Town Trade Post** (Tier 1–10).
- **Order Expiry:** Unfulfilled orders automatically return from escrow after **24 hours** (listing deposit of `2%` acts as a gentle anti-spam sink).
- **AI Travelling Yeti Caravan (Liquidity Backstop):**
  - What if a player plays at 4 AM and nobody has listed `Maize Seed` or `Iron Ore`?
  - Every 4 hours, an **AI Travelling Caravan** visits the Trade Post offering limited stock of core essentials at **`1.25x` Summer / `2.0x` Winter** and buying surplus player goods at **`0.70x`**.
  - _Design Rule:_ Player-to-player trades are **always** more profitable (higher sell price, lower buy price) than the AI Caravan—so the Caravan prevents soft-locks without ever cannibalizing player trading!

### 10.4 Inter-Town Trade Pacts (Friend & Guild Synergy)

- Players can sign up to **5 Inter-Town Trade Pacts** with friends or complementary towns (e.g., a Farming/Bakery town signing a pact with a Mining/Blacksmith town).
- **Trade Pact Perks:**
  - **Priority Order Visibility:** Your Trade Pact partners see your Buy/Sell orders 5 minutes before the open public board.
  - **Reduced Export Tariff:** `-2%` tariff discount on orders fulfilled between Pact partners.
  - **Direct Town Visits:** Visit your partner's single map anytime to admire their Tier 1–10 buildings, tip their Tavern, and trigger a daily **Friendly Trade Bonus** (`+15 Stamina` for both players).

---

## 11. Living NPC Citizens, Requests, Relationships & Morale Loop

A town is only alive if its citizens feel like real neighbors, not vending machines. Every player's single map hosts **16 Named Yeti Citizens** who gradually move into your town as you build and upgrade workshops (starting with 5 core citizens on Day 1 and unlocking all 16 by Town Level 8).

### 11.1 The 16 Named Yeti Citizens Roster

|  #  | Citizen Name | Occupation    | Home / Workplace   | Favorite Gift          | Friendship Level 5 Perk          | Friendship Level 10 Master Perk          |
| :-: | :----------- | :------------ | :----------------- | :--------------------- | :------------------------------- | :--------------------------------------- |
|  1  | **Milo**     | Farmer        | Farm Plots         | `Golden Cornbread`     | `-10%` crop grow time            | `+15%` bonus crop seed & Fine yield      |
|  2  | **Bram**     | Rancher       | Yak Barn           | `Hearty Yak Roast`     | `-15%` Winter animal feed cost   | `+20%` Milk & Wool batch output          |
|  3  | **Pippa**    | Beekeeper     | Forest Apiary      | `Mountain Berry Pie`   | `+15%` Honey extraction yield    | Bees remain 50% active in Winter         |
|  4  | **Fern**     | Forager       | Forager's Hut      | `Winter Warmth Tea`    | Daily pin of rare Ginseng/Mint   | `+25%` double-forage chance              |
|  5  | **Torg**     | Lumberjack    | Forester's Lodge   | `Hot Fish Stew`        | `-10%` Axe durability loss       | `+1` bonus `Firewood` per log cut        |
|  6  | **Sora**     | Angler        | Lakeside Pier      | `Spiced Barley Ale`    | `+15%` rare fish bite rate       | `+20%` `Frost Pearl` & `Frost Carp` rate |
|  7  | **Grit**     | Miner         | Minehead Outpost   | `Flaky Cheese Pastry`  | `-15%` Lantern Oil drain         | `+15%` double ore drop in Echo Caves     |
|  8  | **Orin**     | Sawyer        | Sawmill            | `Smoked Glacier Fish`  | `+15%` Sawmill plank speed       | `+10%` free `Charcoal` chance            |
|  9  | **Nora**     | Miller        | Windmill / Mill    | `Glazed Honey Cake`    | `-20%` Millstone wear            | `+15%` bonus `Flour` per grind           |
| 10  | **Dorn**     | Mason         | Stonecutter Yard   | `Alpine Cheese Fondue` | `-10%` Stone/Brick upgrade cost  | `+20%` faster Masonry & Kiln runs        |
| 11  | **Kael**     | Smelter       | Blast Furnace      | `Frost Carp Chowder`   | `-15%` Coal fuel usage           | `+10%` bonus metal bar per smelt         |
| 12  | **Mabel**    | Baker         | Bakery             | `Jarred Berry Jam`     | `+15%` Bakery Fine quality       | `+20%` chance to bake an extra Loaf/Pie  |
| 13  | **Barnaby**  | Blacksmith    | Anvil Forge        | `Warm Spiced Ale`      | `-20%` tool repair cost          | `+15%` max durability on forged tools    |
| 14  | **Alden**    | Carpenter     | Carpentry Shop     | `Aged Mountain Cheese` | Unlocks exclusive furniture sets | `-10%` Plank cost on all furniture       |
| 15  | **Yara**     | Apothecary    | Apothecary Hut     | `Frost Pearl Necklace` | `+20%` tonic buff duration       | Brews `+1` free `Warmth Tea` per batch   |
| 16  | **Boris**    | Tavern Keeper | Frosty Yeti Tavern | `Silver & Gem Ring`    | Daily market trend tip           | Tavern Feasts grant `+25%` Town Morale   |

### 11.2 Citizen Daily Life & Need Meters

Every NPC citizen has **3 Live Meters** tracked in `expo-sqlite` and updated on the 6-hour tick:

1. **Warmth (`0–100`):** Automatically `100` in Summer. In Winter, drops unless the town has **AI Mayor Firewood Subsidies**, `Brick Fireplaces`, or fulfilled `Firewood / Winter Coat` citizen requests.
2. **Satiety / Cost Comfort (`0–100`):** Reflects how affordable `Bread, Stew, Fish, Cheese` are under the current Season + AI Mayor Subsidy Policy.
3. **Happiness / Morale (`0–100`):** Weighted average of `Warmth`, `Satiety`, `AI Mayor Tax Rate`, and `Recent Player Fulfilled Requests`.

#### Town-Wide Morale Thresholds

| Avg Town Happiness | State Name                     | Gameplay Effect on Your Town                                                                                                                                    |
| :----------------: | :----------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    **85 – 100**    | **Thriving / Festival Spirit** | `+25%` Workshop Crafting Speed, `+15%` Citizen Request Coin Tips, `+20%` Passive NPC Tax to Treasury.                                                           |
|    **60 – 84**     | **Content & Productive**       | Standard `1.0x` workshop speeds and normal citizen request frequency.                                                                                           |
|    **35 – 59**     | **Grumbling / Strained**       | `-15%` Workshop Crafting Speed; citizens post urgent complaint requests (paying `1.5x` coins for essentials).                                                   |
|     **0 – 34**     | **Cold & On Strike**           | `-35%` Workshop Crafting Speed; affected guild NPCs pause bonus perks until Warmth/Satiety is restored via player deliveries, Tavern Feast, or AI Mayor relief. |

### 11.3 Citizen Request Loop (Active Resource Demand)

- At any time, **3 to 6 NPC citizens** display floating icons above their heads on the single map with live requests tailored to their occupation and the current season:
  - _Normal Request:_ `Mabel needs 4 Fine Flour & 2 Firewood` → Reward: `135 FC + 25 Baker XP + 15 Friendship + 5 Civic Favor`.
  - _Urgent Winter Request (2x Payout):_ `Grit is freezing in Echo Caves—needs 2 Winter Warmth Tea & 1 Heavy Wool Coat` → Reward: `420 FC + 60 Miner XP + 30 Friendship + Rare Geode`.
  - _Chain Commission:_ `Alden wants 2 Oak Tables for the Tavern` → Unlocks a free **Town Square Bench** visual upgrade!
- **Daily Request Streak:** Completing **5 Citizen Requests in 24 hours** awards a **Town Hero Chest** (`Seeds, Repair Kits, Civic Favor, rare Blueprint fragments`).

---

## 12. Extended Gameplay Loops (Beyond Core Resource, Occupation, Trade, Goal & Mining)

To make **Anvil** endlessly engaging on a single map, **8 additional interconnected gameplay loops** operate alongside the 5 core loops:

---

### 12.1 Loop A: Deep Mining, Cave Delving & Risk/Reward Loop (`Echo Caves` & `Glacier Cavern`)

Mining is not a passive clicker—it is a tactical **push-your-luck expedition loop**:

- **5 Progressive Cave Depths (All Inside the Single Map's Cave System):**
  - **Level 1 — Sunlit Shaft (Open Day 1):** `Stone, Limestone, Coal, Copper Ore`. Zero hazard; no lantern required.
  - **Level 2 — Echo Galleries (Copper Pickaxe + Lantern):** `Iron Ore, Rock Salt, Glow-Cap Mushrooms`. Consumes `1 Lantern Oil` per 3 minutes.
  - **Level 3 — Silver Veins (Iron Pickaxe + Lantern):** `Silver Ore, Uncut Alpine Gems, Deep Coal`. Risk of **Minor Tremor** (costs extra stamina unless wearing `Work Gloves`).
  - **Level 4 — Ancient Deep Shaft (Tier 5 Cave Elevator + Steel Pickaxe):** `Gold Ore, Ancient Yeti Relics, Rich Gem Geodes`. High stamina & oil drain; huge jackpots.
  - **Bonus Zone — Glacier Crystal Cavern (Winter Frozen Lake Crossing):** `Glacier Ice Crystals, Frost Pearls`. Requires `Winter Coat` + `Glacier Boots` + `Steel Pickaxe`—intense **Cold Timer** forces players to plan inventory space (`Trader Backpack`) and `Warmth Tea` rations before descending!
- **Push-Your-Luck Mechanic:** Going deeper increases rare drop probability by `+15%` per floor, but if your **Lantern Oil** or **Stamina** hits `0`, your Yeti must emergency-retreat to the Village (dropping 15% of unbanked raw ore from that run—recoverable on the next dive or protected by a `Cave-Sight Elixir`).

---

### 12.2 Loop B: Yeti Stamina, Warmth, Nutrition & Well-Being Loop

Every physical action ties back into the **Culinary, Apothecary, and Tailoring economies**:

- **Stamina Bar (`100` base, scales up to `220` via Cozy Home & Level):**
  - Chopping/Mining/Tilling costs `2–6 Stamina` per swing (reduced by `Work Gloves` & higher-tier tools).
  - Restored via **Eating Crafted Food** (`Bread, Berry Pie, Fish Stew, Chowder`), **Drinking Tonics** (`Stamina Tonic`), or **Resting in Your Yeti Home** (`Yak-Wool Plush Bed`).
- **Winter Warmth Gauge (`100` in Summer; active drain outdoors in Winter):**
  - Walking in Pine Forest, Frozen Lake, or Mountains in Winter slowly cools your Yeti (`-2` to `-6` Warmth/min depending on Sub-Weather).
  - Standing near a **Village Hearth / Street Lantern / Tavern**, wearing a **`Heavy Yak-Wool Winter Coat`**, or sipping **`Winter Warmth Tea`** / **`Hot Fish Stew`** keeps Warmth full.
  - If Warmth hits `0` (**Chilled**): movement & gathering speed drop `-25%` until warmed up—giving **Tailors, Chefs, and Apothecaries** real mechanical purpose!
- **Well-Fed & Active Buff Slots (Up to 2 Simultaneous Buffs):**
  - **1 Meal Buff** (from Bakery/Tavern: e.g., `+15% Gathering Yield` from _Frost Carp Chowder_ or `+10% Crafting Speed` from _Mountain Berry Pie_).
  - **1 Tonic/Tea Buff** (from Apothecary: e.g., `Cold Immunity` from _Winter Warmth Tea_ or `Lantern Oil Saver` from _Cave-Sight Elixir_).

---

### 12.3 Loop C: Yeti Home Interior, Cozy Decoration & Passive Buff Loop

Your Yeti owns a customizable **Yeti Lodge** right in the Village Square:

- Place crafted furniture (`Carved Oak Table`, `Brick & Iron Fireplace`, `Yak-Wool Plush Bed`, `Glacier Crystal Windchime`, `Storage Chests`, `Beeswax Candles`) inside your Lodge.
- **Cozy Score (`0 – 1,000`):** Every unique furniture tier raises your Lodge's **Cozy Score**, granting permanent passive town perks:
  - **Cozy 100:** `+20 Max Stamina`.
  - **Cozy 250:** `+10% Faster Stamina Recovery` when resting at home.
  - **Cozy 500:** `-20% Winter Heating Firewood` consumption at home.
  - **Cozy 750:** `+10% XP` across all 24 occupations ("Well-Rested Yeti").
  - **Cozy 1,000:** Unlocks **Golden Yeti Trophy Room** visible when friends visit your town!

---

### 12.4 Loop D: Single-Map Exploration, Hidden Secrets, Lore & Relic Museum Loop

Even on **one map**, active exploration stays exciting every day:

- **Daily Secret Spawns (Guided by Kip the Scout):** Every 12 hours, 3–5 hidden spots spawn across the 5 zones—hollowed pine stumps, submerged lake chests (visible through clear Winter ice!), collapsed cave alcoves, and mountain cliff ledges.
- **The Village Heritage Museum (Inside Town Hall):**
  - Donating discovered **`Ancient Yeti Relics`**, **Masterwork Fish**, **Rare Faceted Gems**, and **Seasonal Curios** fills out a **40-slot Collection Wing**.
  - Completing each wing (e.g., _Fossils of Frostpeak_, _Angler's Trophy Wall_, _Ancient Yeti Tools_) permanently buffs your town (`+5% Sell Value`, `+10% Rare Drop Rate`, exclusive cosmetic town statues).

---

### 12.5 Loop E: Spoilage, Cold-Chain Preservation & Strategic Inventory Loop

Adds real economic depth between **Summer Abundance** and **Winter Scarcity**:

- **Perishable Raw Goods (`Milk, Eggs, Berries, Raw Fish, Meat`)** lose freshness if left raw across seasons.
- **3 Ways Players Solve Spoilage (Each Creates Economic Demand):**
  1. **Process Them:** Turn `Milk → Aged Cheese`, `Berries → Jarred Berry Jam`, `Fish → Smoked Glacier Fish`, `Meat → Salted Meat` (all **0% spoilage**!).
  2. **Harvest Winter Ice:** Saw `Cut Ice Blocks` off the Frozen Lake in Winter to pack your cellar for Summer.
  3. **Build the `Frost-Core Cold Cellar`:** Endgame Masonry + Lapidary upgrade that permanently freezes spoilage on all stored perishables.

---

### 12.6 Loop F: Social Visiting, Town Showroom & Co-op Seasonal Festivals Loop

- **Asynchronous Town Visits:** Tap any player on the Inter-Town Marketplace or your Trade Pact list to walk your Yeti around **their** version of the single map—seeing their Tier 1–10 buildings, Monument progress, Cozy Lodge, and active AI Mayor banners.
- **Visitor Actions (Once Per Friend Per Day):**
  - **Warm Their Hearth / Water Their Crops:** Gives your friend a 2-hour `+10%` workshop speed boost and earns you `25 FC + 10 Social XP`.
  - **Shop Their Direct Stall:** Buy directly from their local Trade Stall with `-2%` reduced tariff.
- **Seasonal Co-op Festivals (End of Every 3-Day Season):**
  - **Summer Harvest Fair:** Global & Town-level milestone where players ship `Bread, Berry Pies, Honey, and Furniture` to unlock server-wide Festival Fireworks & cosmetic hats.
  - **Midwinter Frost Gala:** Celebrates surviving Winter; ranks towns by **Winter Prosperity Score** (`TownTreasury + NetTradeProfit × CitizenMorale%`) and hands out seasonal Mayor/Tycoon plaques.

---

### 12.7 Loop G: Goals, Quests, Mastery Ranks & Prestige Loop

Players always have a crystal-clear goal across **four time horizons**:

| Horizon                      | System                                                        | Concrete Examples                                                                                                                                                                                      |
| :--------------------------- | :------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Minute-to-Minute**         | **Active Citizen Requests & Node Runs**                       | Fulfill Mabel's Bread order; harvest Maize before Rainshower ends; finish a 3-minute Cave Iron run.                                                                                                    |
| **Daily (24h)**              | **Daily Town Ledger Checklist**                               | Complete 5 Citizen Requests, fulfill 3 Inter-Town Marketplace orders, check the AI Mayor's Daily Decree, locate 2 Scout secrets.                                                                       |
| **Seasonal (6 Days)**        | **Winter Survival & Prosperity Challenge**                    | Stockpile 50 Firewood + 30 Flour before Winter; achieve `>= 80%` Citizen Happiness through Winter; earn a top-tier Winter Prosperity Medal.                                                            |
| **Long-Term (Weeks/Months)** | **24-Occupation Mastery, Tier 10 Town & Grand Yeti Monument** | Reach Level 10 in favorite occupations, upgrade all map zones to Tier 10 visual splendor, complete the 40-item Heritage Museum, and finish the 10-Stage **Grand Yeti Monument** in the Village Square. |

---

### 12.8 Loop H: Reforestation, Ecological Balance & Sustainable Harvesting Loop

- **Forest Density Meter:** Chopping Pine & Oak trees without replanting `Pinecone Saplings` / `Oak Acorns` thins the local forest (slower tree respawn and lower `Wild Berry` / `Honey` yields). Replanting restores lush canopy and grants a **"Green Steward"** `+10%` Resin & Berry bonus.
- **Lake Stock Health:** Over-fishing one dock reduces bite speed briefly, encouraging Anglers to rotate across the Lake's 4 piers or invest in **Lake Hatchery** upgrades at Tier 6+.

---

## 13. Single-Map Vertical Progression & Building Evolution Matrix (Tier 1–10)

Because the entire game happens on **one map**, progression must feel deeply rewarding in place. Every owned workshop, resource hub, and landmark upgrades vertically across **10 visual and mechanical tiers**—transforming your starter camp into a bustling alpine metropolis.

### 13.1 Universal Workshop Tier Progression Curve (Tier 1 → Tier 10)

|  Tier   | Visual Architecture on Skia Map               | Queue Slots | Craft Speed Bonus | Masterwork Chance | Maintenance / Heat Eff. | Typical Upgrade Materials                                                      | Coin Cost |
| :-----: | :-------------------------------------------- | :---------: | :---------------: | :---------------: | :---------------------: | :----------------------------------------------------------------------------- | :-------: |
| **T1**  | Rough timber shack & canvas awning            |      2      |      `1.00x`      |       `0%`        |        Baseline         | `6 Pine Planks`, `4 Raw Stone`                                                 |  120 FC   |
| **T2**  | Framed pine cabin with wooden sign            |      3      |      `1.10x`      |       `2%`        |        Baseline         | `12 Pine Planks`, `6 Cut Stone`, `4 Iron Nails`                                |  300 FC   |
| **T3**  | Brick chimney & stone foundation              |      3      |      `1.20x`      |       `5%`        |   `-10%` Winter fuel    | `16 Pine Planks`, `10 Bricks`, `8 Mortar`, `6 Nails`                           |  650 FC   |
| **T4**  | Tiled roof, glazed windows, hanging lamp      |      4      |      `1.30x`      |       `8%`        |   `-15%` Winter fuel    | `10 Oak Planks`, `12 Bricks`, `4 Glass Panes`, `4 Iron Bars`                   | 1,250 FC  |
| **T5**  | Stone guildhouse with snow-carved eaves       |      4      |      `1.45x`      |       `12%`       |   `-20%` Winter fuel    | `16 Oak Planks`, `14 Cut Stone`, `6 Iron Bars`, `1 Fireplace`                  | 2,400 FC  |
| **T6**  | Steel-geared machinery & brass trim           |      5      |      `1.60x`      |       `16%`       |   `-25%` Winter fuel    | `20 Oak Planks`, `16 Bricks`, `4 Steel Bars`, `2 Steel Gears`                  | 4,200 FC  |
| **T7**  | Double-story alpine hall + warm lantern posts |      5      |      `1.80x`      |       `22%`       |   `-30%` Winter fuel    | `24 Oak Planks`, `20 Cut Stone`, `6 Glass Panes`, `3 Steel Gears`              | 7,000 FC  |
| **T8**  | Ornate silver-inlaid artisan workshop         |      6      |      `2.00x`      |       `28%`       |   `-35%` Winter fuel    | `30 Oak Planks`, `8 Steel Bars`, `4 Silver Bars`, `2 Street Lanterns`          | 11,500 FC |
| **T9**  | Frost-crystal-lit master guildhall            |      6      |      `2.25x`      |       `35%`       |   `-45%` Winter fuel    | `35 Oak Planks`, `10 Steel Bars`, `4 Frost Cores`, `2 Cut Gems`                | 18,000 FC |
| **T10** | **Grand Sovereign Guildspire (Gold & Frost)** |    **8**    |    **`2.60x`**    |     **`45%`**     | **`-60%` Winter fuel**  | `45 Oak Planks`, `6 Gold Bars`, `6 Frost Cores`, `4 Cut Gems`, `4 Steel Gears` | 30,000 FC |

### 13.2 Complete 28-Structure Single-Map Plot Blueprint

Every ownable building and landmark occupies a dedicated, upgradeable plot on the single map:

|  #  | Building ID         | Building Name                        | Map Zone       | Linked Occupation(s) | Unlock Town Lvl | Special Tier 5 & Tier 10 Visual/Mechanical Milestone                              |
| :-: | :------------------ | :----------------------------------- | :------------- | :------------------- | :-------------: | :-------------------------------------------------------------------------------- |
|  1  | `bld_yeti_lodge`    | **Yeti Home Lodge**                  | Village Center | All (Rest & Cozy)    |       L1        | T5: Second-floor loft + Fireplace; T10: Golden Trophy Hall (+120 Max Stamina).    |
|  2  | `bld_town_hall`     | **Town Hall & Heritage Museum**      | Village Square | AI Mayor / All       |       L1        | T5: Stone Clocktower + Museum Wing; T10: Marble Dome + Council Plaza.             |
|  3  | `bld_trade_post`    | **Town Trade Post & Stalls**         | Village Square | Merchant             |       L1        | T5: 8 Market Slots + Covered Arcade; T10: 15 Market Slots + Airship Mooring.      |
|  4  | `bld_warehouse`     | **Central Town Warehouse**           | Village Square | Merchant / All       |       L1        | T5: 600 Base Slots; T10: 1,800 Slots + Integrated Auto-Sort Ledger.               |
|  5  | `bld_farm_plots`    | **Village Farm Plots**               | Village South  | Farmer               |       L1        | T5: 8 Plots + Irrigation Channels; T10: 12 Plots + Automatic Soil Fertility.      |
|  6  | `bld_windmill`      | **Village Windmill / Watermill**     | Village River  | Miller               |       L1        | T5: Dual Wind+Water Drive (no Winter slowdown); T10: Twin-Sailed Grand Mill.      |
|  7  | `bld_bakery`        | **Village Bakery**                   | Village Square | Baker                |       L1        | T5: Twin Brick Hearth (double batch baking); T10: Royal Patisserie Oven.          |
|  8  | `bld_forester`      | **Forester's Lodge**                 | Pine Forest    | Lumberjack           |       L1        | T5: Sapling Nursery (+20% forest regrowth); T10: Ancient Timber Pavilion.         |
|  9  | `bld_sawmill`       | **River Sawmill & Charcoal Kiln**    | Forest / River | Sawyer               |       L1        | T5: Steel-Geared Circular Saw; T10: Automated Dual-Blade Timber Mill.             |
| 10  | `bld_carpentry`     | **Carpentry & Furniture Shop**       | Village West   | Carpenter            |       L2        | T5: Master Lathe & Showroom; T10: Sovereign Furniture Atelier.                    |
| 11  | `bld_stonecutter`   | **Stonecutter & Brick Kiln**         | Mountain Base  | Stonecutter / Mason  |       L2        | T5: Twin Brick Kilns; T10: Alpine Marble & Millstone Quarry Works.                |
| 12  | `bld_minehead`      | **Minehead & Cave Elevator**         | Echo Caves     | Miner                |       L2        | T5: **Unlocks Deep Shaft (L4 Gold/Relics)**; T10: High-Speed Crystal Lift.        |
| 13  | `bld_smelter`       | **Blast Furnace & Foundry**          | Mountain Base  | Smelter              |       L2        | T5: Dual Crucible Blast Furnace (-20% Coal); T10: Frost-Cooled Steel Foundry.     |
| 14  | `bld_blacksmith`    | **The Anvil Blacksmith Forge**       | Village North  | Blacksmith           |       L2        | T5: Tempered Steel Anvil; T10: **Glacier-Crystal Runeforge (T4 Tools)**.          |
| 15  | `bld_fishing_pier`  | **Lakeside Pier & Ice Shack**        | Frozen Lake    | Angler               |       L2        | T5: Heated Ice-Fishing Cabin + Trawl Pier; T10: Ice-Breaker Harbor Ferry.         |
| 16  | `bld_smokehouse`    | **Smokehouse & Cold Cellar**         | Frozen Lake    | Smoker / Preserver   |       L3        | T5: Triple Smoking Racks; T10: **Perpetual Frost-Core Zero-Spoilage Vault**.      |
| 17  | `bld_coop_barn`     | **Yak Barn & Snow-Hen Coop**         | Village East   | Rancher              |       L3        | T5: Insulated Winter Barn (-30% Winter feed); T10: Alpine Ranch Estate.           |
| 18  | `bld_creamery`      | **Village Creamery & Aging Cellar**  | Village East   | Dairy Maker          |       L3        | T5: Underground Cheese Vault; T10: Master Alpine Fromagerie.                      |
| 19  | `bld_tavern`        | **The Frosty Yeti Tavern**           | Village Square | Chef / Tavern Keeper |       L3        | T5: Banquet Hall & Copper Brewery; T10: Grand Alpine Inn (+15% Town Morale).      |
| 20  | `bld_forager_hut`   | **Forager's Trail Hut**              | Pine Forest    | Forager              |       L3        | T5: Drying Racks & Trail Maps; T10: Woodland Botanical Sanctuary.                 |
| 21  | `bld_apiary`        | **Forest Apiary & Honey Shed**       | Pine Forest    | Beekeeper            |       L4        | T5: Insulated Winter Hives; T10: Golden Honeycomb Pavilion.                       |
| 22  | `bld_apothecary`    | **Apothecary & Tonic Hut**           | Village West   | Apothecary           |       L4        | T5: Copper Distillation Stills; T10: Crystal Alchemical Conservatory.             |
| 23  | `bld_loom_tailor`   | **Spinning Loom, Tannery & Tailor**  | Village West   | Weaver / Tailor      |       L4        | T5: Dual Pedal Loom + Leather Studio; T10: Frostpeak Couture House.               |
| 24  | `bld_glassworks`    | **Glassworks & Pottery Kiln**        | River South    | Glassblower / Potter |       L5        | T5: Continuous Glass Furnace; T10: Cathedral Stained-Glass Studio.                |
| 25  | `bld_greenhouse`    | **Sun-Glass Terrace Greenhouse**     | East Ridge     | Farmer / Glassblower |       L6        | T5: 6 Heated Winter Crop Beds; T10: **12 Year-Round Climate-Controlled Beds**.    |
| 26  | `bld_builder_yard`  | **Builder's Yard & Blueprint Table** | Village North  | Builder / Architect  |       L5        | T5: `-15%` construction time across town; T10: `-30%` build time + Road Lanterns. |
| 27  | `bld_scout_outpost` | **Scout Outpost & Carrier Roost**    | Mountain Trail | Courier / Explorer   |       L5        | T5: +2 Daily Secret Spawns + Express Courier; T10: Royal Cartographer's Spire.    |
| 28  | `bld_jeweler`       | **Lapidary & Gemcutter Boutique**    | Village Square | Jeweler / Gemcutter  |       L7        | T5: Precision Crystal Wheel; T10: Sovereign Treasury Vault & Crown Gallery.       |

### 13.3 The 10-Stage Grand Yeti Monument (Endgame Centerpiece)

Standing in the center of the Village Square, the **Grand Yeti Monument** is the ultimate long-term prestige sink that every visiting player sees immediately:

|    Stage     | Visual Evolution              | Required Materials & Coin Contribution                              | Permanent Town Aura Unlocked                                                   |
| :----------: | :---------------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------------------- |
| **Stage 1**  | Cleared Cobblestone Pedestal  | `20 Cut Stone`, `15 Lime Mortar`, `1,000 FC`                        | `+2%` Village Walk Speed                                                       |
| **Stage 2**  | Carved Stone Plinth           | `40 Cut Stone`, `30 Bricks`, `20 Pine Planks`, `2,500 FC`           | `+3%` All Occupation XP                                                        |
| **Stage 3**  | Wrought-Iron Torch Ring       | `20 Iron Bars`, `10 Street Lanterns`, `5,000 FC`                    | `+5%` Winter Citizen Warmth                                                    |
| **Stage 4**  | Oak & Bronze Relief Panels    | `40 Oak Planks`, `25 Copper Bars`, `15 Iron Nails`, `8,500 FC`      | `+5%` NPC Citizen Request Coin Payout                                          |
| **Stage 5**  | Sculpted Yeti Torso (Stone)   | `80 Cut Stone`, `15 Steel Bars`, `10 Glass Panes`, `14,000 FC`      | `+5%` Workshop Crafting Speed                                                  |
| **Stage 6**  | Silver Fur Inlays             | `20 Silver Bars`, `10 Faceted Gems`, `22,000 FC`                    | `-1%` Marketplace Export Tariff                                                |
| **Stage 7**  | Glowing Frost-Crystal Eyes    | `15 Frost Cores`, `20 Clear Glass Panes`, `35,000 FC`               | `+10%` Rare Drop Rate (Caves & Lake)                                           |
| **Stage 8**  | Golden Anvil & Hammer Crest   | `15 Gold Bars`, `10 Precision Steel Gears`, `50,000 FC`             | `+10%` Masterwork Crafting Chance                                              |
| **Stage 9**  | Sovereign Yeti Crown Topper   | `3 Golden Yeti Sovereign Crowns`, `20 Frost Pearls`, `75,000 FC`    | `+10%` Passive NPC Tax to Town Treasury                                        |
| **Stage 10** | **Eternal Aurora Yeti Spire** | `10 Gold Bars`, `25 Frost Cores`, `10 Ancient Relics`, `120,000 FC` | **Golden Aura on Map + Permanent `+15%` Seasonal Prosperity Score Multiplier** |

### 13.4 Town Level Unlock Schedule (Level 1 → Level 20)

|  Town Level   | Cumulative Town XP | Key Unlocks on the Single Map                                                                                                    |
| :-----------: | :----------------: | :------------------------------------------------------------------------------------------------------------------------------- |
|  **Level 1**  |         0          | Village Square, Pine Forest (outer), Farm Plots (x4), Windmill, Bakery, Sawmill, Trade Post (3 slots), 5 Core Citizens.          |
|  **Level 2**  |        400         | Mountain Quarry, Echo Caves L1, Blacksmith Forge, Carpentry Shop, Stonecutter, Lakeside Pier, Iron Tool blueprints.              |
|  **Level 3**  |       1,100        | Yak Barn & Coop, Creamery, Frosty Yeti Tavern, Smokehouse, Forager's Hut, Echo Caves L2 (`Iron Ore`, `Salt`).                    |
|  **Level 4**  |       2,200        | Forest Apiary, Apothecary Hut, Spinning Loom & Tailor Shop (`Winter Coats`), 10 Active Citizens.                                 |
|  **Level 5**  |       3,800        | Glassworks & Pottery Kiln, Builder's Yard, Scout Outpost, Trade Pacts (3 friends), Echo Caves L3 (`Silver`, `Gems`).             |
|  **Level 6**  |       6,000        | **Sun-Glass Terrace Greenhouse** (Winter farming!), Steel Tools, Cold Cellar blueprints, 13 Active Citizens.                     |
|  **Level 7**  |       9,000        | **Lapidary & Jeweler Boutique**, Grand Yeti Monument (Stage 1), Deep Pine Hardwood Grove.                                        |
|  **Level 8**  |       13,000       | All **16 Named Citizens** unlocked, Cave Elevator (`Deep Shaft L4 Gold & Relics`), 5 Trade Pact Slots.                           |
|  **Level 9**  |       18,500       | **Glacier Crystal Cavern** mastery & Tier 4 Frost Crystal Tools, Workshop Tiers 8–9 unlocked.                                    |
| **Level 10+** |      25,000+       | Workshop Tier 10 (**Grand Sovereign Guildspires**), Monument Stages 6–10, Prestige Seasonal Leaderboards & Cosmetic Town Themes. |

---

## 14. Economy Math, Pricing Formulas, Gold Sinks & Anti-Exploit Rules

A multiplayer player-driven economy only survives long-term if its math prevents hyperinflation, guarantees profitable crafting margins, and keeps the **Winter 2x spike + AI Mayor Treasury** genuinely dramatic.

### 14.1 Master Pricing Formulas

#### A. Marketplace Dynamic Price Ceiling (Server-Calculated Every 15 Minutes)

For every tradable item $i$:

```text
Berry Bushes / Wildflowers  =>  Forest & Mountain (Sickle + Basket)  =>  Wild Berries, Frost Mint, Mountain Ginseng, Honey
Herbs + Honey + Clean Water =>  Apothecary Hut (Mortar & Pestle)     =>  Winter Warmth Tea, Stamina Tonic, Healing Salve
SupplyDemandIndex (SDI_i) = clamp(ActiveBuyVolume_i / max(ActiveSellVolume_i, 10), 0.50, 2.00)

SummerMarketRef_i = BasePrice_i * (0.80 + 0.25 * SDI_i)          // Range: ~0.92x to 1.30x
WinterMarketRef_i = BasePrice_i * (1.00 + 0.50 * SDI_i)          // Range: ~1.25x to 2.00x

EventAdjustedPrice_i = SeasonMarketRef_i * ActiveAIEventMultiplier_i
```

- **Allowed Player Listing Range:**
  - Summer: `[0.60 × BasePrice_i, 1.35 × BasePrice_i]`
  - Winter: `[0.75 × BasePrice_i, 2.00 × BasePrice_i]` (expands to `2.25 × BasePrice_i` during a targeted Supply Shock AI Event)

#### B. Local Town Effective Cost Under AI Mayor Winter Subsidy

When a citizen or local workshop buys/consumes item $i$ in Winter:

```text
SubsidyShare_i ∈ [0.00, 1.00]   // Set by AI Mayor Policy (FULL_CUSHION=0.90, TARGETED=0.75 on essentials / 0.0 on luxury, NO_SUBSIDY=0.0)

LocalEffectivePrice_i = BasePrice_i + (WinterMarketRef_i - BasePrice_i) * (1 - SubsidyShare_i)
TreasuryDrainPerUnit_i = (WinterMarketRef_i - LocalEffectivePrice_i)
```

#### C. Worked Numerical Example: `Artisan Loaf Bread` (`BasePrice = 36 FC`) in Winter

Suppose high Winter demand drives `WinterMarketRef = 72 FC` (**2.0x**):

1. **Town A (`FULL_CUSHION`, `SubsidyShare = 0.90`):**
   - Local citizens pay `36 + (72 - 36) × 0.10 = 39.6 ≈ 40 FC` (**1.11x**).
   - Town A's Treasury pays `72 - 40 = 32 FC` per loaf consumed by citizens.
   - Citizens stay at **95% Happiness (`+25%` craft speed)**; Town A's Baker can export surplus loaves on the Marketplace for **72 FC**!
2. **Town B (`NO_SUBSIDY`, `SubsidyShare = 0.00`):**
   - Local citizens pay the full **72 FC (2.0x)**; Town B's Treasury spends **0 FC**.
   - Citizens lose Happiness (`-20%`), workshops slow down `-15%`, **BUT** urgent citizen Bread requests now pay **72 FC** to the player—so a player who hoarded `Fine Flour` in Summer earns **double coins** per loaf baked!

### 14.2 Value-Added Crafting Margin Verification (Proving Every Occupation Pays)

Every processing step is mathematically tuned to yield **`+25%` to `+60%` value-added profit** over its raw ingredients (before Quality Grade multipliers):

| Crafting Chain Example                                                                     | Raw Input Cost (Summer) | Intermediate Value | Final Output Value (Summer) |   Net Value-Add    | Winter 2x Export Value |
| :----------------------------------------------------------------------------------------- | :---------------------: | :----------------: | :-------------------------: | :----------------: | :--------------------: |
| `2 Wheat (16)` → `2 Flour (36)` → `2 Bread (72)` _(+1 Firewood 12)_                        |          28 FC          |       36 FC        |          **72 FC**          | **+44 FC (+157%)** |       **144 FC**       |
| `2 Maize (16) + 1 Milk (12) + 1 Egg (6)` → `2 Cornmeal` → `2 Cornbread` _(+1 Firewood 12)_ |          46 FC          |       36 FC        |          **76 FC**          | **+30 FC (+65%)**  |       **152 FC**       |
| `2 Pine Logs (14)` → `2 Planks (32) + 2 Firewood (24)`                                     |          14 FC          |       56 FC        |          **56 FC**          | **+42 FC (+300%)** |       **112 FC**       |
| `2 Iron Ore (36) + 1 Coal (11)` → `2 Iron Bars (84)` + `1 Handle (20)` → `1 Iron Axe`      |          67 FC          |       104 FC       |         **145 FC**          | **+78 FC (+116%)** |       **260 FC**       |
| `2 Trout (22) + 1 Salt (10) + 1 Firewood (12)` → `2 Smoked Fish (88)`                      |          44 FC          |         —          |          **88 FC**          | **+44 FC (+100%)** |       **176 FC**       |
| `3 Wool (42) + 1 Hide (16) + 1 Wax (18)` → `3 Wool Cloth + Leather` → `1 Winter Coat`      |          76 FC          |       162 FC       |       **155–185 FC**        | **+95 FC (+125%)** |       **310 FC**       |

_Result:_ Specializing in **any** stage of the chain (Gatherer, Processor, or Master Artisan) is financially viable, and multi-stage vertical integration scales cleanly with time & stamina invested.

### 14.3 AI Mayor Tax Curve & Treasury Simulation (72-Hour Winter)

```text
TargetWinterReserve = TownLevel * 900 FC + (ActiveCitizens * 180 FC)
CoverageRatio       = TownTreasury / max(TargetWinterReserve, 1)

AI_BusinessTaxRate  = clamp(BaseArchetypeTax + (1.0 - CoverageRatio) * 0.10, 0.05, 0.25)
```

- **Example Simulation (Town Level 5, 10 Active Citizens):**
  - `TargetWinterReserve = 5×900 + 10×180 = 6,300 FC`.
  - If the town enters Winter with **7,600 FC** (`CoverageRatio = 1.21`), the AI Mayor lowers tax to `9%` and activates **`FULL_CUSHION`** (`~1,800 FC/day` Treasury drain), keeping the entire town booming through all 3 days of Winter!
  - If the town enters Winter with only **2,400 FC** (`CoverageRatio = 0.38`), the AI Mayor switches to **`MINIMAL_RELIEF`** and raises tax to `17%`—triggering the **"Treasury Emergency Drive"** event where the player can choose to donate/trade to rescue subsidies or ride out the 2x Winter prices as a ruthless exporter.

### 14.4 Structural Gold & Material Sinks (Preventing Multiplayer Hyperinflation)

To keep Frost Coins valuable across months of play, Anvil enforces **8 balanced economic sinks**:

1. **AI Mayor Taxes & Export Tariffs (`5% – 25%`):** Removes coins from circulation into the Town Treasury, which then gets burned on **Winter Subsidies** and **Daily Infrastructure Upkeep**.
2. **Fuel Burn (`Firewood` & `Coal`):** Every Bakery loaf, Tavern stew, Glass pane, Brick, and Smelted bar permanently consumes fuel—guaranteeing non-stop demand for Lumberjacks, Sawyers, and Miners.
3. **Tool & Machinery Wear (`Repair Kits`, `Millstones`, `Sawblades`):** Permanently sinks `Iron Bars`, `Tool Handles`, `Cut Stone`, and `Leather` on every gathering & milling cycle.
4. **Cave Expedition Consumables (`Lantern Oil`, `Warmth Tea`, `Stamina Tonics`, `Food`):** High-tier resource runs consume crafted Apothecary & Culinary items.
5. **Workshop Tier 1–10 Upgrades:** Exponentially absorbs `Oak Planks`, `Cut Stone`, `Bricks`, `Glass Panes`, `Steel Gears`, and `Frost Coins`.
6. **The 10-Stage Grand Yeti Monument:** Absorbs endgame `Gold Bars`, `Faceted Gems`, `Frost Cores`, `Sovereign Crowns`, and `337,000+ FC`.
7. **Marketplace Listing Deposit (`2%`):** Prevents order-book spam and price manipulation.
8. **Cosmetic Yeti Outfits, Town Banners & Festival Fireworks:** Optional prestige coin sinks sold by Sera the Tailor & Boris at the Tavern.

### 14.5 Anti-Exploit & Multiplayer Integrity Guardrails

- **Server-Authoritative Ledger:** All Marketplace orders, coin transfers, AI Mayor taxes, and Treasury balances execute inside atomic PostgreSQL transactions on **Bun.js**.
- **Dynamic Price Band Clamping:** Prevents alt-account coin laundering (cannot list `1 Raw Stone` for `100,000 FC`).
- **Anti-Snipe & Rate Limits:** Max 30 Marketplace fulfillment calls per 5 minutes; server validates harvest/craft timestamps against real elapsed time and tool speed multipliers.

### 14.6 Occupation XP & Leveling Curve (Level 1 → Level 10 Per Profession)

|      Occupation Level      | XP Needed | Total XP | Permanent Mastery Unlock                                                                                  |
| :------------------------: | :-------: | :------: | :-------------------------------------------------------------------------------------------------------- |
|        **Level 1**         |     0     |    0     | Base occupation recipes & Tier 1 workshop access.                                                         |
|        **Level 2**         |    120    |   120    | `+5%` action speed in this occupation.                                                                    |
|        **Level 3**         |    280    |   400    | Unlocks Tier 2 recipes (`Iron` tier, `Berry Pie`, `Cheese`).                                              |
|        **Level 4**         |    500    |   900    | Unlocks **Fine Quality (`1.25x` value)** drops (`10%` base chance).                                       |
|        **Level 5**         |    850    |  1,750   | `-10%` stamina cost for this occupation's actions.                                                        |
|        **Level 6**         |   1,350   |  3,100   | Unlocks Tier 3 recipes (`Steel` tier, `Chowder`, `Greenhouse`, `Gems`).                                   |
|        **Level 7**         |   2,100   |  5,200   | `+10%` chance to save fuel (`Firewood`/`Coal`) on each craft.                                             |
|        **Level 8**         |   3,200   |  8,400   | Unlocks **Masterwork Quality (`1.60x` value)** (`8%` base chance).                                        |
|        **Level 9**         |   4,800   |  13,200  | Unlocks Tier 4 endgame recipes (`Frost Crystal` tools, `Sovereign Crown`).                                |
| **Level 10 (Grandmaster)** |   7,000   |  20,200  | **Master Title Badge**, `+15%` double-output chance, `-2%` local AI Mayor tax on this occupation's sales! |

---

## 3. Master Tool Directory (How Tools Connect Occupations)

## 15. End-to-End Player Journey & Screen/HUD Blueprint

Tools have durability and tier upgrades (`Copper → Iron → Steel → Frost Crystal`), creating constant demand between **Blacksmiths**, **Carpenters**, and **Gatherers**:

### 15.1 The Player Journey (Minute 1 → First Winter → Season 4 Endgame)

| Tool                      | Crafted At       | Recipe Inputs                                     | Used By Occupation         | What It Does                                                               |
| :------------------------ | :--------------- | :------------------------------------------------ | :------------------------- | :------------------------------------------------------------------------- |
| **Hoe**                   | Blacksmith Forge | `1 Iron Bar` + `1 Wood Handle`                    | **Farmer**                 | Tills Farm Plots for planting `Maize` and `Wheat`.                         |
| **Watering Can**          | Blacksmith Forge | `1 Copper/Iron Bar`                               | **Farmer**                 | Waters crops to speed up growth.                                           |
| **Sickle**                | Blacksmith Forge | `1 Iron Bar` + `1 Wood Handle`                    | **Farmer / Forager**       | Harvests mature `Maize`, `Wheat`, and `Herbs`.                             |
| **Axe**                   | Blacksmith Forge | `1 Iron Bar` + `1 Wood Handle`                    | **Lumberjack**             | Chops forest trees for `Raw Logs`.                                         |
| **Pickaxe**               | Blacksmith Forge | `2 Iron Bars` + `1 Wood Handle`                   | **Miner**                  | Mines `Stone`, `Coal`, `Iron Ore`, and `Ice Crystals`.                     |
| **Fishing Rod**           | Carpentry Shop   | `2 Wood Planks` + `1 Wool String` + `1 Iron Hook` | **Angler (Fisher)**        | Catches fish at the **Frozen Lake**.                                       |
| **Ice Auger**             | Blacksmith Forge | `2 Steel Ingots` + `1 Wood Handle`                | **Angler (Winter)**        | Drills through the frozen lake in **Winter** for rare fish.                |
| **Sawblade**              | Blacksmith Forge | `2 Iron Bars`                                     | **Sawmill Operator**       | Installed in the **Sawmill** to cut `Raw Logs` into `Planks` & `Firewood`. |
| **Millstone**             | Stonecutter      | `4 Cut Stone Blocks`                              | **Miller**                 | Installed in the **Mill** to grind `Maize` & `Wheat` into `Flour`.         |
| **Baking Peel**           | Carpentry Shop   | `2 Wood Planks`                                   | **Baker**                  | Loads and removes `Bread` and `Pies` from the **Bakery** oven.             |
| **Cooking Pot & Skillet** | Blacksmith Forge | `2 Iron Bars`                                     | **Chef / Tavern Keeper**   | Cooks `Hot Fish Stew` and `Winter Chowder`.                                |
| **Mortar & Pestle**       | Stonecutter      | `2 Cut Stone Blocks`                              | **Herbalist / Apothecary** | Grinds `Herbs` and `Honey` into tonics and `Winter Warmth Tea`.            |

#### Minute 1–10: Awakening in Your Yeti Town (Summer Day 1)

1. **Onboarding → Arrival:** After tapping **Start Playing**, your Yeti spawns in the **Village Square** of your starter town. The **AI Mayor** greets you with a short decree: _"Welcome! Summer lasts 72 hours. Build up your workshops and help me fill the Town Treasury before the Winter 2x freeze hits!"_
2. **First Gather & Process Loop (`Seed => Maize => Mill => Flour => Bakery => Bread`):**
   - Milo the Farmer hands you a starter `Copper Hoe`, `Watering Can`, and `3 Maize Seeds`.
   - You walk to your **Farm Plot**, plant and water Maize, and chop 2 Pine Trees in the **Pine Forest** with Torg's starter `Copper Axe` to split `Firewood`.
   - You carry your `Maize` to the **Windmill**, grind `Golden Cornmeal` / `Fine Flour`, and walk to your **Bakery** to bake your first `Artisan Loaf Bread`.
3. **First Citizen Request & AI Mayor Tax:**
   - Mabel the Baker has a floating Bread icon above her head—you fulfill her request for `80 FC`.
   - A crisp toast slides in showing **`+70 FC Earned | 10 FC Tax → Town Treasury`** (introducing the AI Mayor & Treasury organically in the first 5 minutes without a wall of text!).

#### Hours 2–48: Building Your First Businesses & Inter-Town Trade (Summer Days 1–2)

1. **Expand Into New Occupations:** You construct the **Sawmill**, **Carpentry Shop**, **Blacksmith Forge**, and **Lakeside Pier** on your single map. You notice crafting `Iron Axes` requires `Iron Ore` from Echo Caves L2 (plus `Lantern Oil` from Fish Oil + Resin).
2. **Enter the Inter-Town Marketplace:** Instead of doing everything solo right away, you list `20 Split Firewood` and `10 Artisan Loaf Bread` on the **Town Trade Post** and post a **Buy Order** for `10 Iron Bars`.
3. **Social Payoff:** Ten minutes later, another player's Yeti courier walks into your Village Square, drops off your `10 Iron Bars`, and buys your `Bread`—leveling up your Blacksmith Forge to Tier 2 and adding tax revenue to your Town Treasury!

#### Hours 48–72: "The First Frost" — Pre-Winter Strategy (Summer Day 3)

1. **AI Mayor Pre-Winter Forecast:** Snow flurries appear across the Skia map. The AI Mayor broadcasts: _"Treasury stands at 3,200 FC (82% of Winter target). Prepare Firewood and Flour—Targeted Essentials Subsidy expected!"_
2. **Your Strategic Prep:**
   - You smoke your summer `Trout` and `Salmon` into non-spoiling `Smoked Glacier Fish`.
   - You stockpile `50 Split Firewood` and `30 Fine Flour` inside your newly crafted `Iron-Bound Storage Chests`.
   - You visit Sera's **Tailor Shop** to stitch a `Heavy Yak-Wool Winter Coat` and brew `Winter Warmth Tea` with Yara.

#### Hours 72–144: The Winter 2x Crucible (Winter Days 1–3)

1. **The Map Transforms:** The Frozen Lake freezes solid overnight! Outdoor crops halt, snow blankets the Village, and Marketplace prices for `Firewood`, `Bread`, `Hot Fish Stew`, and `Warmth Tea` surge to **1.8x – 2.0x**.
2. **AI Mayor's Ruling:** Your AI Mayor activates **`TARGETED_ESSENTIALS`**, spending Treasury coins to cushion local `Bread` and `Firewood` at `1.25x` while leaving `Winter Coats`, `Steel Tools`, and `Frost Carp` at full `2.0x`.
3. **Winter Expedition & Export Windfall:**
   - Putting on your `Winter Coat`, you walk **across the Frozen Lake** to drill ice holes for `Frost Carp` and explore the **Glacier Crystal Cavern** for `Ice Crystals`.
   - Meanwhile, you sell your stockpiled Summer `Flour`, `Smoked Fish`, and fresh `Frost Carp Chowder` on the Inter-Town Marketplace at **2.0x** to Mayors whose treasuries ran dry!

#### Season 2–4 and Beyond: Vertical Mastery & Town Legacy

- Build **Sun-Glass Greenhouses** on the East Ridge to grow `Maize` and `Berries` right through Winter.
- Install a **Frost-Core Cold Cellar** to eliminate spoilage forever.
- Level all **16 Named Citizens** toward Friendship Level 10, upgrade workshops toward **Tier 10 Sovereign Guildspires**, and complete all **10 Stages of the Grand Yeti Monument** in the Village Square.

---

## 4. Occupations & Town Businesses (All Open to the Player's Yeti)

### 15.2 Complete Mobile Screen, Navigation & HUD Architecture (Expo Router)

Your Yeti can practice **any** of these occupations at the same time and construct/upgrade their buildings on the single town map. Named NPC citizens also work in these occupations and give you daily orders:
Designed strictly around the **Yeti Brand Palette** (`Yeti Blue #40A7FC`, `Periwinkle Ice #C0CEF5`, `Obsidian Black #000000 / #0A0A0A`, `Pure White #FFFFFF`, `Frost Gray #E2E2E4`):

| Occupation                  | Map Building(s) You Can Own | Core Inputs Needed                                  | Core Products Sold / Exported                            | Role in the Summer/Winter Economy                                                                            |
| :-------------------------- | :-------------------------- | :-------------------------------------------------- | :------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **1. Farmer**               | **Farm Plots & Barn**       | Seeds, Water, Animal Feed                           | `Maize`, `Wheat`, `Milk`, `Eggs`, `Wool`                 | **Summer powerhouse:** produces the raw food surplus before Winter freezes the fields.                       |
| **2. Miller**               | **Windmill / Watermill**    | `Maize`, `Wheat`, `Millstone`                       | `Flour`, `Cornmeal`, `Animal Feed`                       | **The bottleneck bridge:** every Baker and Rancher depends on the Mill.                                      |
| **3. Baker**                | **Bakery**                  | `Flour`, `Berries`, `Butter`, `Firewood`            | `Bread`, `Cornbread`, `Berry Pie`, `Honey Cake`          | **Winter goldmine:** baked goods spike up to **2x in Winter** unless subsidized by the AI Mayor.             |
| **4. Lumberjack & Sawyer**  | **Sawmill**                 | `Raw Logs`, `Sawblade`                              | `Wood Planks`, `Firewood`                                | **Essential fuel supplier:** every Bakery, Smokehouse, Smelter, and citizen home burns `Firewood` in Winter. |
| **5. Carpenter**            | **Carpentry Workshop**      | `Wood Planks`, `Iron Nails`                         | `Tool Handles`, `Furniture`, `Storage Chests`            | **Expansion driver:** needed to upgrade storage capacity and building tiers (`Tier 1..10`).                  |
| **6. Miner & Smelter**      | **Quarry & Foundry**        | `Raw Ore`, `Coal`, `Raw Stone`                      | `Iron Bars`, `Steel Ingots`, `Cut Stone`, `Ice Crystals` | **Winter explorer:** mines rare `Ice Crystals` when the Frozen Lake freezes over.                            |
| **7. Blacksmith**           | **Blacksmith Forge**        | `Iron Bars`, `Steel Ingots`, `Tool Handles`, `Coal` | **All Tools** (`Axes, Pickaxes, Hoes, Augers, Skillets`) | **Evergreen demand:** tools wear down from gathering, guaranteeing steady sales in every season.             |
| **8. Angler & Smoker**      | **Fishery & Smokehouse**    | `Raw Fish`, `Firewood`, `Ice Auger`                 | `Smoked Fish`, `Frost Carp`, `Lake Pearls`               | **Year-round protein:** ice-fishing in Winter yields exclusive high-price fish.                              |
| **9. Chef / Tavern Keeper** | **Tavern Kitchen**          | `Fish Fillet`, `Maize`, `Cheese`, `Herbs`           | `Hot Fish Stew`, `Winter Chowder`                        | **Stamina engine:** high-tier meals restore gathering stamina and satisfy VIP citizen quests.                |
| **10. Apothecary & Tailor** | **Apothecary & Loom**       | `Herbs`, `Honey`, `Wool`                            | `Winter Warmth Tea`, `Winter Coats`, `Backpacks`         | **Winter survival gear:** protects Yetis from cold penalties during Winter gathering runs.                   |

#### Root Route Structure (`src/app/`)

```text
src/app/
├── _layout.tsx                  # Root Stack (GestureHandlerRootView + MMKV Stack.Protected)
├── onboarding.tsx               # 4-Slide Yeti Onboarding (first-time players)
├── (tabs)/
│   ├── _layout.tsx              # NativeTabs (Town Map, Market, AI Mayor, Journal)
│   ├── index.tsx                # Live Single-Map Skia World (Explore, Gather, Build, Citizens)
│   ├── market.tsx               # Shared Inter-Town Marketplace (Orders, Prices, Trade Pacts)
│   ├── mayor.tsx                # AI Mayor Office, Tax Policy, Town Treasury Ledger & Events
│   └── journal.tsx              # Occupations (24), Recipes, Citizens (16), Quests & Museum
└── (modals)/
    ├── workshop/[id].tsx        # FormSheet: Crafting Queue, Tool Slots & Tier 1-10 Upgrade
    ├── citizen/[id].tsx         # FormSheet: Citizen Dialog, Active Request & Gift Panel
    ├── inventory.tsx            # FormSheet: Personal Carry, Warehouse & Equipped Gear/Tools
    ├── cave-expedition.tsx      # Modal: Cave Depth Selector (L1-L4 + Glacier Cavern) & Lantern HUD
    ├── yeti-lodge.tsx           # Modal: Cozy Home Interior Editor & Rest/Buffs
    └── visit-town/[townId].tsx  # Screen: Visit Another Player's Town Map & Direct Stall
```

#### Persistent In-World HUD (Overlaid on `/(tabs)/index.tsx` Skia Canvas)

- **Top-Left Status Pill (`#FFFFFF` card, `#E2E2E4` border):**
  - Yeti Avatar + Town Level badge (`#40A7FC`).
  - **Stamina Bar** (Yeti Blue `#40A7FC`) + **Winter Warmth Gauge** (Periwinkle Ice `#C0CEF5`, visible in Winter).
  - **Frost Coin Balance** (`tabular-nums`) + active Buff icons (Meal + Tonic).
- **Top-Right Season & Weather Pill:**
  - Current Season (`SUMMER` / `WINTER`) + Countdown Timer (`1d 14h left`) + Sub-Weather icon.
  - Tapping opens the **Seasonal Forecast & 2x Price Ticker** sheet.
- **Top-Center AI Mayor Banner (Collapsible Toast):**
  - Shows active **AI Mayor Decree** or **Live Cloud AI Event** (e.g., _"Winter Targeted Subsidy Active • Tax 12%"_).
- **Bottom Floating Action Dock:**
  - Quick-equip **Active Tool Slot** (shows durability ring), **Inventory Bag** button, **Build / Upgrade Hammer** button, and **Quick-Warp Zone Selector** (`Village | Forest | Lake | Mountain | Caves`).

---

## 5. How the Economy, Marketplace & AI Mayor Tie It All Together

### 15.3 Sensory UX, Audio & Haptics Specification

1. **Interdependent Supply Chains Drive Player Trade:**
   - A player focusing on a **Bakery** needs `Flour` (from a **Mill**), `Firewood` (from a **Sawmill**), and `Butter` (from a **Dairy**). If they don't produce enough locally, they post a buy order on the **Inter-Town Marketplace**.
2. **The AI Mayor's Taxes & Treasury:**
   - Every time your Bakery, Forge, or Market Stall completes a sale, the **AI Mayor** collects a percentage into the **Town Treasury**.
3. **Winter 2x Price Spikes & Subsidy Strategy:**
   - In **Winter**, farm crops stop growing and heating demand doubles—causing `Firewood`, `Flour`, `Bread`, `Hot Fish Stew`, and `Winter Warmth Tea` to surge up to **2x**.
   - If your town's **AI Mayor** has a full Treasury, it can **subsidize local prices** so your workshops keep running cheaply; if the Treasury is low, citizens absorb the **2x cost**—and players who stockpiled `Flour`, `Bread`, and `Firewood` in Summer make a fortune exporting to other towns.
     Every physical loop feels tactile and responsive at 60fps (`react-native-reanimated` + `expo-audio` + `expo-haptics`):

| Gameplay Action                              | Visual Effect (Skia / Reanimated)                                                    | Haptic Feedback (`expo-haptics`)                                         | Audio (`expo-audio`)                                    |
| :------------------------------------------- | :----------------------------------------------------------------------------------- | :----------------------------------------------------------------------- | :------------------------------------------------------ |
| **Chopping Wood / Mining Ore**               | Tool swing arc + wood chips / stone spark particles (`20` Skia circles) + node shake | `ImpactFeedbackStyle.Medium` on impact frame                             | Pitch-randomized (`0.92–1.08`) axe thud / pickaxe clink |
| **Fishing Catch (Bite & Reel)**              | Ripple rings on Lake / Ice Hole + splash burst                                       | `SelectionAsync` on nibble → `NotificationFeedbackType.Success` on catch | Water splash + triumphant chime                         |
| **Harvesting Crops (`Maize/Wheat`)**         | Floating `+3 Maize` pill curving into bag icon                                       | `ImpactFeedbackStyle.Light`                                              | Crisp rustle + soft pop                                 |
| **Blacksmith Forging / Building Upgrade**    | Molten `#40A7FC` frost-forge sparks + radial glow burst                              | `ImpactFeedbackStyle.Heavy` synced to strike                             | Metallic anvil ring                                     |
| **Fulfilling Citizen Request / Market Sale** | Coin arc flying into purse + subtle tax coin splitting toward Town Hall              | `NotificationFeedbackType.Success`                                       | Crisp coin clink + cheerful Yeti grunt                  |
| **AI Mayor Decree / Season Change**          | Smooth Skia snow/sunlight crossfade + decree banner spring-in                        | `ImpactFeedbackStyle.Light`                                              | Brass town bell chime                                   |
| **Tool Low Durability Warning (<15%)**       | Subtle amber pulse on equipped tool ring                                             | `NotificationFeedbackType.Warning`                                       | Metallic creak                                          |

---

### 15.4 Engineering-Ready Data Schemas (`MMKV` + `expo-sqlite` + `Bun.js`)

#### A. Hot Key-Value Keys (`react-native-mmkv` — Synchronous 60fps Access)

```ts
export interface HotTownSessionState {
  readonly playerId: string;
  readonly townId: string;
  readonly townName: string;
  readonly townLevel: number;
  readonly townXp: number;
  readonly coins: number;
  readonly stamina: number;
  readonly maxStamina: number;
  readonly warmth: number;
  readonly equippedToolId: string | null;
  readonly equippedCoatId: string | null;
  readonly equippedBootsId: string | null;
  readonly currentSeason: "SUMMER" | "WINTER";
  readonly seasonEndsAtMs: number;
  readonly currentWeather: string;
  readonly mayorTaxRate: number;
  readonly mayorSubsidyPolicy:
    | "FULL_CUSHION"
    | "TARGETED_ESSENTIALS"
    | "MINIMAL_RELIEF"
    | "NO_SUBSIDY";
  readonly townTreasury: number;
  readonly avgCitizenHappiness: number;
}
```

#### B. Local Relational Tables (`expo-sqlite` — Cold Town State & Caching)

```sql
CREATE TABLE IF NOT EXISTS inventory_items (
  item_id TEXT NOT NULL,
  quality TEXT NOT NULL DEFAULT 'STANDARD', -- 'STANDARD' | 'FINE' | 'MASTERWORK'
  quantity INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT 'BAG',     -- 'BAG' | 'WAREHOUSE' | 'CELLAR'
  expires_at_ms INTEGER,                    -- NULL if non-perishable or in Cold Cellar
  PRIMARY KEY (item_id, quality, location)
);

CREATE TABLE IF NOT EXISTS owned_tools (
  tool_instance_id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL,
  tier TEXT NOT NULL,                       -- 'COPPER' | 'IRON' | 'STEEL' | 'FROST_CRYSTAL'
  durability INTEGER NOT NULL,
  max_durability INTEGER NOT NULL,
  is_equipped INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS town_buildings (
  building_id TEXT PRIMARY KEY,
  plot_x REAL NOT NULL,
  plot_y REAL NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1,
  machinery_integrity INTEGER NOT NULL DEFAULT 100,
  upgrade_completes_at_ms INTEGER
);

CREATE TABLE IF NOT EXISTS production_queues (
  job_id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL,
  recipe_id TEXT NOT NULL,
  batch_count INTEGER NOT NULL DEFAULT 1,
  started_at_ms INTEGER NOT NULL,
  completes_at_ms INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'RUNNING'    -- 'RUNNING' | 'READY' | 'CLAIMED'
);

CREATE TABLE IF NOT EXISTS map_nodes (
  node_id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  resource_item_id TEXT NOT NULL,
  pos_x REAL NOT NULL,
  pos_y REAL NOT NULL,
  remaining_hits INTEGER NOT NULL,
  respawns_at_ms INTEGER
);

CREATE TABLE IF NOT EXISTS occupation_mastery (
  occupation_id TEXT PRIMARY KEY,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS citizens (
  citizen_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  occupation_id TEXT NOT NULL,
  friendship_level INTEGER NOT NULL DEFAULT 1,
  friendship_xp INTEGER NOT NULL DEFAULT 0,
  warmth INTEGER NOT NULL DEFAULT 100,
  satiety INTEGER NOT NULL DEFAULT 100,
  happiness INTEGER NOT NULL DEFAULT 85,
  active_request_json TEXT
);

CREATE TABLE IF NOT EXISTS treasury_ledger (
  entry_id TEXT PRIMARY KEY,
  entry_type TEXT NOT NULL,                 -- 'TAX_IN' | 'TARIFF_IN' | 'DONATION' | 'SUBSIDY_OUT' | 'UPKEEP_OUT'
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS active_economy_events (
  event_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  modifiers_json TEXT NOT NULL,
  starts_at_ms INTEGER NOT NULL,
  ends_at_ms INTEGER NOT NULL
);
```

#### C. Remote Bun.js Server API & Realtime WebSocket Endpoints

| Method / Channel | Endpoint                         | Responsibility                                                                                                                   |
| :--------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `POST`           | `/api/auth/session`              | Authenticates player and returns JWT + initial town hydration snapshot.                                                          |
| `GET`            | `/api/world/clock`               | Returns authoritative global `SUMMER`/`WINTER` timer, Sub-Weather, and active global AI Events.                                  |
| `POST`           | `/api/town/gather`               | Validates node harvest timestamp, tool tier/durability, and active event yield multipliers.                                      |
| `POST`           | `/api/town/craft/start`          | Deducts recipe inputs + fuel, enqueues deterministic production job (`startedAt`, `completesAt`).                                |
| `POST`           | `/api/town/craft/claim`          | Claims completed crafted items, rolls `Standard/Fine/Masterwork` quality, awards Occupation XP.                                  |
| `POST`           | `/api/town/citizen/fulfill`      | Completes NPC citizen request, pays coins, splits AI Mayor tax into **Town Treasury**, updates Morale & Friendship.              |
| `POST`           | `/api/town/building/upgrade`     | Deducts materials/coins and upgrades building plot (`Tier 1..10`) or Monument stage.                                             |
| `GET`            | `/api/mayor/state`               | Returns AI Mayor archetype, active Tax Rates, Winter Subsidy Policy, Treasury Ledger, and latest decree.                         |
| `POST`           | `/api/mayor/petition`            | Submits player Civic Favor petition or voluntary Treasury donation for AI Mayor evaluation.                                      |
| `GET`            | `/api/market/orders`             | Queries shared Inter-Town Marketplace order book with live `SDI` and 2x Winter price bands.                                      |
| `POST`           | `/api/market/orders`             | Escrows items (Sell Order) or coins (Buy Order) on the Inter-Town Marketplace.                                                   |
| `POST`           | `/api/market/orders/:id/fulfill` | Atomic Postgres trade execution: transfers goods/coins, deducts Export Tariff to Treasury, dispatches visitor Yeti courier.      |
| `GET`            | `/api/social/visit/:townId`      | Fetches compact read-only snapshot (`< 20 KB`) of another player's town layout & direct stall for visiting.                      |
| `WS`             | `/ws/town/:townId`               | Live push channel for Marketplace order fills, AI Mayor decrees, Seasonal transitions, and AI Economic Events (`< 1 KB` deltas). |

---

## 16. Questlines, Seasonal Contracts & Achievement Mastery Catalog

To prevent new players from ever feeling lost—and to give veteran players structured milestones across every occupation—**Anvil** layers three quest systems on top of dynamic citizen requests.

### 16.1 Main Founding Questline (12 Guided Milestones)

| Quest # | Quest Title                 | Objective(s)                                                                                                              | Teaches System                   | Rewards                                               |
| :-----: | :-------------------------- | :------------------------------------------------------------------------------------------------------------------------ | :------------------------------- | :---------------------------------------------------- |
| **Q1**  | **First Roots in the Snow** | Equip `Copper Hoe` & `Watering Can`; plant and harvest `3 Maize` on your Farm Plot.                                       | Gathering & Farming              | `60 FC`, `5 Maize Seeds`, `30 Farmer XP`              |
| **Q2**  | **Timber & Hearth**         | Walk to Pine Forest, chop `3 Pine Logs` with `Copper Axe`, split `6 Firewood` at the Sawmill.                             | Forestry & Fuel Loop             | `75 FC`, `2 Pine Planks`, `30 Lumberjack XP`          |
| **Q3**  | **From Grain to Loaf**      | Grind `2 Maize/Wheat` at the **Mill** → `Flour`, then bake `2 Artisan Loaf Bread` at the **Bakery**.                      | Multi-Stage Processing           | `110 FC`, `1 Baking Peel`, `40 Baker XP`              |
| **Q4**  | **Neighbors in Need**       | Fulfill `3 NPC Citizen Requests` in Village Square and view the **Town Hall Treasury Ledger**.                            | Citizen Requests & AI Mayor Tax  | `150 FC`, `15 Civic Favor`, `Town Level 2 Unlock`     |
| **Q5**  | **Strike the Anvil**        | Mine `4 Copper Ore` & `2 Coal` in Echo Caves L1, smelt `2 Copper Bars`, forge `1 Iron Pickaxe`.                           | Mining, Smelting & Blacksmithing | `200 FC`, `2 Repair Kits`, `50 Blacksmith XP`         |
| **Q6**  | **Open for Business**       | Craft `2 Trade Crates`, post `1 Sell Order` and fulfill `1 Buy Order` from another player's town on the Marketplace.      | Inter-Town Player Economy        | `250 FC`, `1 Custom Trade Stall`, `50 Merchant XP`    |
| **Q7**  | **Casting Into the Valley** | Craft a `Fishing Rod`, catch `4 Valley Trout` at the Lake, smoke `2 Smoked Glacier Fish` at the Smokehouse.               | Fishing & Spoilage Prevention    | `260 FC`, `3 Rock Salt`, `50 Angler XP`               |
| **Q8**  | **Before the First Frost**  | Stockpile `25 Split Firewood`, `10 Fine Flour`, and stitch `1 Heavy Yak-Wool Winter Coat` before Winter begins.           | Winter Preparation               | `400 FC`, `2 Winter Warmth Tea`, `50 Tailor XP`       |
| **Q9**  | **Surviving the 2x Freeze** | Complete `1 AI Mayor Policy Review`, fulfill `3 Winter Citizen Requests`, and cross the Frozen Lake with an `Ice Auger`.  | Winter 2x Economy & Frozen Map   | `550 FC`, `1 Steel Ice Auger Blueprint`, `80 Town XP` |
| **Q10** | **Glass Against the Snow**  | Blow `6 Clear Glass Panes` (or buy them on Marketplace) and assemble `1 Sun-Glass Greenhouse Kit`.                        | Glassblowing & Year-Round Crops  | `750 FC`, `5 Sweetroot Cuttings`, `100 Builder XP`    |
| **Q11** | **Echoes of the Deep**      | Upgrade Minehead to Tier 5, brew `1 Cave-Sight Elixir`, and extract `2 Gold Ore` & `1 Ancient Relic` from Deep Shaft L4.  | Cave Delving & Heritage Museum   | `1,200 FC`, `1 Frost Core`, `120 Miner XP`            |
| **Q12** | **The Sovereign Valley**    | Donate to **Grand Yeti Monument Stage 1**, reach Friendship L5 with 5 Citizens, and finish a Winter with `>= 80%` Morale. | Endgame Prestige & Town Mastery  | `2,500 FC`, Title: **`Founder of Frostpeak`**         |

### 16.2 Rotating Seasonal Contracts (Refreshes Every 72-Hour Season)

Every season gives the player **3 Optional High-Payout Contracts** tailored to the current season:

- **Summer Contracts:**
  - _Granary Reserve:_ Grind `40 Fine Flour` or `Golden Cornmeal` before Winter (`+500 FC`, `+150 Miller XP`, `+200 FC Bonus to Town Treasury`).
  - _Lumber Baron:_ Mill `30 Pine Planks` and `40 Split Firewood` (`+450 FC`, `+120 Sawyer XP`, `3 Oak Acorns`).
  - _Preservation Master:_ Produce `15 Smoked Fish` and `10 Jarred Berry Jam` (`+600 FC`, `+140 Smoker XP`).
- **Winter Contracts:**
  - _Warmth Guardian:_ Craft or trade `15 Winter Warmth Tea` and `3 Heavy Yak-Wool Winter Coats` (`+850 FC`, `+150 Apothecary XP`, `+25 Civic Favor`).
  - _Ice-Breaker Expedition:_ Harvest `20 Frost Carp` and `8 Glacier Ice Crystals` across the Frozen Lake (`+1,100 FC`, `+180 Angler/Miner XP`).
  - _Winter Market Tycoon:_ Fulfill `10 Inter-Town Marketplace Orders` during Winter (`+950 FC`, `+160 Merchant XP`, `1 Exclusive Winter Banner`).

### 16.3 Lifetime Achievements & Yeti Titles (30 Milestones)

|  #  | Achievement Name          | Requirement                                            | Unlocked Yeti Title / Reward              |
| :-: | :------------------------ | :----------------------------------------------------- | :---------------------------------------- |
|  1  | **Green Thumb Yeti**      | Harvest 250 total farm crops                           | Title: _Valley Grower_ + `250 FC`         |
|  2  | **Golden Harvest**        | Harvest 50 Masterwork Maize or Wheat                   | `500 FC` + Golden Hoe Skin                |
|  3  | **Master of the Mill**    | Grind 500 units of Flour/Cornmeal/Malt                 | Title: _Grand Miller_ + `400 FC`          |
|  4  | **Scent of Fresh Bread**  | Bake 300 Bakery items                                  | Title: _Master Baker_ + `450 FC`          |
|  5  | **Timber & Saw**          | Fell 300 trees and replant 150 saplings                | Title: _Forest Steward_ + `400 FC`        |
|  6  | **Iron & Fire**           | Smelt 400 metal ingots at the Blast Furnace            | Title: _Furnace Lord_ + `500 FC`          |
|  7  | **Ring of the Anvil**     | Forge 100 tools across all 4 tiers                     | Title: _Anvil Master_ + `600 FC`          |
|  8  | **Frost Crystal Artisan** | Craft all 4 core Frost Crystal (T4) tools              | Title: _Glacier Forger_ + `1,500 FC`      |
|  9  | **Deep Delver**           | Complete 25 Cave runs down to Deep Shaft L4            | Title: _Cave Explorer_ + `750 FC`         |
| 10  | **Lake Whisperer**        | Catch 200 fish including 25 Frost Carp                 | Title: _Ice Angler_ + `500 FC`            |
| 11  | **Zero Waste**            | Preserve 150 Smoked Fish or Salted Meat                | `400 FC` + Smokehouse Banner              |
| 12  | **Heart of the Tavern**   | Cook 200 Tavern meals & brew 50 Spiced Ales            | Title: _Alpine Chef_ + `650 FC`           |
| 13  | **Glass & Clay**          | Blow 150 Glass Panes/Jars & fire 200 Bricks            | Title: _Master Artisan_ + `500 FC`        |
| 14  | **Winter Outfitter**      | Craft 25 Winter Coats & 15 Glacier Boots               | Title: _Frost Tailor_ + `600 FC`          |
| 15  | **Elixir Brewer**         | Brew 150 Apothecary teas, salves & tonics              | Title: _Alchemist_ + `500 FC`             |
| 16  | **Crown Jeweler**         | Craft 10 luxury rings/necklaces & 1 Sovereign Crown    | Title: _Royal Jeweler_ + `2,000 FC`       |
| 17  | **First Trade Pact**      | Sign Trade Pacts with 5 other players' towns           | `400 FC` + `+1` Trade Stall Skin          |
| 18  | **Global Caravan**        | Fulfill 100 Inter-Town Marketplace Orders              | Title: _Trade Tycoon_ + `1,000 FC`        |
| 19  | **Winter Arbitrageur**    | Earn 15,000 FC from 2x Winter Marketplace sales        | Title: _Frost Baron_ + `1,200 FC`         |
| 20  | **Taxpayer of the Year**  | Contribute 10,000 FC in business taxes to Treasury     | Title: _Civic Pillar_ + `800 FC`          |
| 21  | **Treasury Savior**       | Fund a Treasury Donation that unlocks a Winter Subsidy | Title: _People's Champion_ + `1,000 FC`   |
| 22  | **Beloved Neighbor**      | Reach Friendship Level 10 with 8 Named Citizens        | `1,200 FC` + Village Garland Decor        |
| 23  | **Full Town Roster**      | Reach Friendship Level 10 with all 16 Named Citizens   | Title: _Heart of the Valley_ + `3,000 FC` |
| 24  | **Cozy Sovereign**        | Reach `1,000 Cozy Score` inside your Yeti Lodge        | Title: _Cozy Yeti_ + Golden Hearth Skin   |
| 25  | **Curator of Frostpeak**  | Donate all 40 items to the Heritage Museum             | Title: _Grand Curator_ + `3,500 FC`       |
| 26  | **Winter Greenhouse**     | Harvest 100 Summer crops inside a Winter Greenhouse    | `800 FC` + Crystal Planter Decor          |
| 27  | **Master Architect**      | Upgrade 10 town buildings to Tier 10                   | Title: _Grand Architect_ + `4,000 FC`     |
| 28  | **Eternal Monument**      | Complete all 10 Stages of the Grand Yeti Monument      | Title: _Sovereign of Anvil_ + Aurora Cape |
| 29  | **Festival Legend**       | Participate in 4 Summer Fairs & 4 Midwinter Galas      | `1,500 FC` + Festival Fireworks Emote     |
| 30  | **Jack of All Trades**    | Reach Occupation Level 5 in all 24 Professions         | Title: _Polymath Yeti_ + `5,000 FC`       |

---

## 17. The 40-Item Heritage Museum & Hidden Single-Map Secrets

Located inside the **Town Hall**, the **Heritage Museum** rewards active exploration, rare gathering, and masterwork crafting across four themed wings (10 items each). Donating an item removes 1 copy permanently from inventory (acting as a prestige sink) and displays it visually in the Museum gallery.

### 17.1 Wing 1: Ancient Yeti Relics (10 Items — Exploration & Deep Shaft L4)

_Wing Completion Reward: **+10% Movement Speed across all 5 Map Zones + Ancient Yeti Statue**._

|  #  | Relic Name                    | Where Found                       | Season / Condition               |
| :-: | :---------------------------- | :-------------------------------- | :------------------------------- |
|  1  | **Carved Mammoth Tusk**       | Pine Forest hidden stump cache    | Summer / Scout Pin               |
|  2  | **Obsidian Snow-Compass**     | Mountain Pass cliff ledge         | Any Season                       |
|  3  | **Bronze Hearth Idol**        | Echo Caves L2 alcove              | Any Season                       |
|  4  | **Glacier-Etched Runestone**  | Glacier Crystal Cavern            | Winter Frozen Lake Crossing      |
|  5  | **Frozen Amber Beetle**       | Deep Pine Oak felling drop (rare) | Summer                           |
|  6  | **Sunken Trade Bell**         | Frozen Lake submerged chest       | Visible through clear Winter ice |
|  7  | **Elder's Stone Anvil Shard** | Deep Shaft L4                     | Tier 5 Cave Elevator             |
|  8  | **Crystal Wind-Flute**        | Frostpeak Summit                  | Aurora Frost Night weather       |
|  9  | **Gilded Yak Medallion**      | Village Ruins dig spot            | Valley Rainshower                |
| 10  | **First Mayor's Ledger**      | Deep Shaft L4 locked vault        | Explorer Level 7+                |

### 17.2 Wing 2: Alpine Angler's Hall (10 Trophy Specimens — Frozen Lake)

_Wing Completion Reward: **+15% Fishing Speed & +10% Pearl Drop Rate permanently**._

|  #  | Specimen Name               | Habitat                    | Season / Condition          |
| :-: | :-------------------------- | :------------------------- | :-------------------------- |
|  1  | **Golden-Fin Valley Trout** | Lake Shallows              | Summer (Clear Sun)          |
|  2  | **Giant Glacier Salmon**    | River Rapids               | Summer (Rainshower)         |
|  3  | **Crystalline Frost Carp**  | Deep Ice Hole              | Winter (`Steel Ice Auger`)  |
|  4  | **Iridescent Frost Pearl**  | Deep Lake Bed              | Any Season (Rare Trawl)     |
|  5  | **Midnight Echo Eel**       | Cave Underground Pool (L2) | Any Season                  |
|  6  | **Snow-Scale Pike**         | Frozen Lake North Pier     | Winter (Crisp Snowfall)     |
|  7  | **Aurora Jelly-Star**       | Glacier Cavern Pool        | Winter (Aurora Frost Night) |
|  8  | **Ancient Sturgeon**        | River Mouth                | Summer (Fishing Net T3+)    |
|  9  | **Ruby Ice-Crab**           | Frozen Lake Ice Crack      | Late Winter (The Thaw)      |
| 10  | **King Yeti-Bass**          | Center Lake Deep Hole      | Angler Level 8+             |

### 17.3 Wing 3: Frostpeak Mineral & Gem Gallery (10 Specimens — Mountains & Caves)

_Wing Completion Reward: **-15% Tool Durability Loss on Pickaxes & Sledgehammers**._

|  #  | Mineral / Gem Name           | Source Zone                | Condition                      |
| :-: | :--------------------------- | :------------------------- | :----------------------------- |
|  1  | **Banded Copper Geode**      | Echo Caves L1              | Any Pickaxe                    |
|  2  | **Meteorite Iron Nugget**    | Mountain Avalanche Outcrop | Winter Avalanche               |
|  3  | **Pure Snow-Quartz Cluster** | Echo Caves L2              | Iron Pickaxe+                  |
|  4  | **Halite Pink Salt Spire**   | Echo Caves L2 Salt Seam    | Any Season                     |
|  5  | **Silver Filigree Vein**     | Echo Caves L3              | Iron Pickaxe+                  |
|  6  | **Glacier Sapphire**         | Echo Caves L3 Gem Node     | Steel Pickaxe+                 |
|  7  | **Sunfire Topaz**            | Deep Shaft L4              | Steel Pickaxe+                 |
|  8  | **Eternal Frost Diamond**    | Glacier Crystal Cavern     | Winter + Frost Crystal Pickaxe |
|  9  | **Fossilized Alpine Fern**   | Mountain Quarry Limestone  | Summer                         |
| 10  | **Starlight Gold Cluster**   | Deep Shaft L4              | Miner Level 8+                 |

### 17.4 Wing 4: Masterwork Artisan Heirlooms (10 Crafted Masterworks)

_Wing Completion Reward: **+8% Masterwork Crafting Chance across all 24 Occupations**._

1. **Masterwork Glazed Honey Cake** _(Bakery)_
2. **Masterwork Frost Carp Chowder** _(Tavern Kitchen)_
3. **Masterwork Aged Mountain Cheese** _(Creamery)_
4. **Masterwork Carved Oak Table** _(Carpentry Shop)_
5. **Masterwork Heavy Yak-Wool Winter Coat** _(Tailor Shop)_
6. **Masterwork Ginseng Stamina Tonic** _(Apothecary)_
7. **Masterwork Clear Stained-Glass Pane** _(Glassworks)_
8. **Masterwork Frost Crystal Pickaxe** _(Blacksmith Forge)_
9. **Masterwork Frost Pearl Necklace** _(Jeweler)_
10. **Masterwork Golden Yeti Sovereign Crown** _(Jeweler)_

---

## 18. Tactile Gathering & Crafting Mini-Mechanics (Active Play vs. Cozy Auto)

To keep minute-to-minute gameplay joyful on mobile (60fps Skia + Reanimated worklets) without turning routine gathering into a tedious chore, every core interaction supports **Active Sweet-Spot Timing** (bonus yield/quality) alongside **One-Tap Cozy Auto** (baseline speed & yield):

| Activity                     | Active Mini-Mechanic (Mobile Touch)                                                                  | Success Bonus                                                 | Cozy Auto Fallback                        |
| :--------------------------- | :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------ | :---------------------------------------- |
| **Woodcutting (Forest)**     | Tap when the pulsing `#40A7FC` ring crosses the tree trunk notch (3-beat rhythm).                    | **+1 Bonus Log/Firewood** + 0 durability loss on perfect hit. | Hold-to-chop steadily at standard speed.  |
| **Mining (Caves/Mountains)** | Tap the glowing fracture crack that shifts around the rock/ore node.                                 | **2x Mining Speed** + `+15%` Gem/Crystal drop roll.           | Auto-swing Pickaxe until node breaks.     |
| **Fishing & Ice-Fishing**    | Hold/release thumb to keep the Yeti bobber inside the sliding `#C0CEF5` tension zone.                | Guarantees **Fine/Masterwork Fish** + bonus Pearl chance.     | Simple tap-on-bite reel (standard fish).  |
| **Blacksmith Forging**       | Tap 3 descending spark rings on the Anvil in rhythm (`expo-audio` metallic strike + `Heavy` haptic). | **-25% Craft Time** + `+15%` Masterwork Tool durability.      | Queue & collect on timer while exploring. |
| **Bakery & Tavern Hearth**   | Tap the bellows icon once when oven temperature hits the golden band.                                | **+1 Bonus Loaf/Meal** or `+10%` Warmth buff potency.         | Queue batch & claim when ready.           |

---

## 19. Multi-Archetype Economic Stress-Test & Balance Benchmarks

To guarantee that **no single occupation dominates** and that **inter-town trading beats isolated solo grinding**, every major player archetype is balanced against target **Net Frost Coins per Active Hour (`FC/hr`)** across both seasons (tested at **Town Level 5**):

| Player Archetype                  | Primary Owned Buildings                           | Summer Target (`FC/hr`) | Winter Target (`FC/hr` w/ Trade) | Primary Bottleneck (Forces Marketplace Buying)                                                             | Primary Export (Marketplace Selling)                                       |
| :-------------------------------- | :------------------------------------------------ | :---------------------: | :------------------------------: | :--------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| **The Grain & Bakery Mogul**      | Farm Plots, Windmill, Bakery, Greenhouse          |     480 – 620 FC/hr     |      **920 – 1,250 FC/hr**       | Needs `Firewood` (Sawyer), `Butter` (Dairy), `Glass Panes` (Glassblower), `Hoes` (Blacksmith).             | `Flour`, `Bread`, `Berry Pie`, `Honey Cake`.                               |
| **The Mountain Forge Tycoon**     | Minehead, Smelter, Blacksmith Forge, Stonecutter  |     520 – 680 FC/hr     |      **880 – 1,180 FC/hr**       | Needs `Tool Handles` (Carpenter), `Lantern Oil` (Apothecary), `Cornbread/Stew` (Food), `Leather` (Tailor). | `Iron/Steel Tools`, `Ice Augers`, `Nails`, `Steel Gears`, `Cut Stone`.     |
| **The Frozen Lake & Tavern Host** | Lakeside Pier, Smokehouse, Tavern, Apothecary     |     450 – 590 FC/hr     |      **960 – 1,320 FC/hr**       | Needs `Ice Augers` (Blacksmith), `Rock Salt` (Miner), `Barley Malt` (Miller), `Glass Jars` (Glassblower).  | `Smoked Fish`, `Frost Carp Chowder`, `Warmth Tea`, `Spiced Ale`.           |
| **The Timber & Artisan Builder**  | Forester, Sawmill, Carpentry, Glassworks, Tailor  |     470 – 610 FC/hr     |      **900 – 1,200 FC/hr**       | Needs `Iron Nails/Sawblades` (Blacksmith), `Wool/Hide` (Rancher), `Coal` (Miner).                          | `Firewood`, `Oak Planks`, `Storage Chests`, `Winter Coats`, `Glass Panes`. |
| **The Pure Inter-Town Merchant**  | Trade Post (T5+), Warehouse, Custom Stalls, Scout |     420 – 580 FC/hr     |     **1,050 – 1,400 FC/hr**      | Needs high starting capital (`FC`), `Trade Crates` (Carpenter), and strong Summer-to-Winter market timing. | Arbitrage liquidity across all 4 specialized town archetypes.              |

### Balance Verification Rules

1. **Cross-Season Parity:** Summer-heavy roles (Farmer, Beekeeper) earn slightly higher volume in Summer and stockpile for Winter; Winter-heavy roles (Ice-Fisher, Tailor, Apothecary, Crystal Miner) spike dramatically in Winter—yielding near-identical **6-day full-cycle earnings** across all 5 archetypes!
2. **Solo vs. Inter-Town Multiplier:** A player who tries to craft everything solo without using the Marketplace earns ~`1.0x` baseline progression; a player who specializes in 3–5 complementary workshops and trades via the Inter-Town Marketplace earns **`1.35x – 1.65x`** faster progression—making multiplayer trading feel deeply rewarding without ever punishing solo sessions.
3. **AI Mayor Treasury Equilibrium:** Across a balanced 6-day cycle (72h Summer + 72h Winter), an active town generating `10%–14%` business tax + passive NPC taxes naturally accumulates **85%–115% of its `TargetWinterReserve`**—meaning whether the AI Mayor triggers `FULL_CUSHION`, `TARGETED_ESSENTIALS`, or `MINIMAL_RELIEF` depends genuinely on the player's Summer activity, AI Events, and Mayor archetype!

---

## 20. Economy Telemetry, Anti-P2W Fair Play Guardrails & Expansion Roadmap

### 20.1 Live Server Economy Telemetry (Tracked on Bun.js)

The Bun.js backend logs 6 real-time economic health metrics every hour so designers can tune recipe weights or AI Event frequency cleanly:

| Metric                                                   | Healthy Target Range                                     | Automated Corrective Lever                                                                            |
| :------------------------------------------------------- | :------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| **Marketplace Order Fill Time (Median)**                 | `< 12 minutes`                                           | If > 25m, AI Event Director spawns a Demand Surge / Caravan Contract for slow-moving categories.      |
| **Global Coin Velocity (`Coins Traded / Total Supply`)** | `0.18 – 0.35 / day`                                      | Adjusts Festival / Monument event rewards and AI Mayor Tax Holiday frequency.                         |
| **Winter `FULL_CUSHION` vs. `NO_SUBSIDY` Split**         | `35% Full / 45% Targeted / 20% Minimal-None`             | Tunes `TargetWinterReserve` constant so Winter stays tense without wiping out new players.            |
| **Firewood & Food Winter Price Ratio**                   | `1.65x – 2.00x`                                          | Ensures Winter 2x spikes feel real; prevents permanent saturation via fireplace/oven fuel burn.       |
| **Occupation Participation Spread**                      | No single profession > `22%` of total server craft hours | AI Events dynamically boost under-played professions (e.g., _Glassworks Rush_, _Honey Harvest Moon_). |
| **Day-7 Player Retention & Winter Completion Rate**      | `>= 65%` of Day-1 players experience their first Winter  | Tune Summer-to-Winter cadence (`72h / 72h`) so every new player sees both seasons in Week 1.          |

### 20.2 Fair-Play & Zero Pay-to-Win Economy Guardrails

Because **Anvil** has a **Player-Driven Inter-Town Marketplace**, selling coins, raw resources, stamina refills, or Winter tax immunity for real money would destroy player trust and wreck the 2x Winter economy.

- **Allowed (100% Cosmetic & Expressive):**
  - Yeti character hats, scarves, fur tints, and emotes.
  - Village architectural visual themes (e.g., _Aurora Crystal Theme_, _Nordic Timber Theme_, _Sakura Thaw Theme_).
  - Yeti Lodge interior decorative trophies & seasonal fireworks.
- **Strictly Forbidden:**
  - Never sell Frost Coins (`FC`), raw/crafted items, extra Tool durability, Marketplace speedups, or AI Mayor Treasury bailouts for real money.

### 20.3 Phased Implementation Roadmap (From MVP to Full 24-Occupation Economy)

| Phase                                                  | Scope & Shipped Systems                                                                                                                                                                                                               | Target Playable Milestone                                             |
| :----------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------- |
| **Phase 1 — Core Single-Map Loop (Vertical Slice)**    | Single Skia Map (Village + Forest + Lake), Yeti walking/gathering, **Chain 1 (`Seed => Maize => Mill => Flour => Bakery => Bread`)** + Forestry (`Log => Sawmill => Firewood/Plank`), 5 Named Citizens, `MMKV` + `expo-sqlite` state. | Complete playable minute-to-minute loop on Android Emulator at 60fps. |
| **Phase 2 — Mining, Tools & Inter-Town Marketplace**   | Mountains & Echo Caves (L1–L3), Smelter & Blacksmith Forge (Copper/Iron/Steel tools + durability), Bun.js **Shared Inter-Town Marketplace** (post/fulfill buy & sell orders + visiting Yeti courier).                                 | Full multiplayer trading loop between towns.                          |
| **Phase 3 — Seasons, AI Mayor & Town Treasury**        | 72h Summer ↔ 72h Winter clock, Skia snow/frozen lake map transformation, **Cloud AI Mayor** (business taxation, Town Treasury ledger, 4 Winter Subsidy Modes, 2x dynamic pricing), first 12 Cloud AI Events.                          | Full seasonal & macroeconomic tension live!                           |
| **Phase 4 — All 24 Occupations, Cozy Lodge & Endgame** | Glassworks, Winter Greenhouse, Apothecary, Tailor, Tavern, Creamery, Apiary, Jeweler, Deep Shaft L4, Glacier Crystal Cavern, 40-item Heritage Museum, Tier 1–10 Upgrades, and 10-Stage Grand Yeti Monument.                           | Complete 24-profession sandbox ready for long-term live-ops!          |

---

## 21. Single-Map Resource Node Spawn Atlas & Respawn Economy

Every harvestable node on the single map has deterministic respawn timers and seasonal modifiers stored in `map_nodes` (`expo-sqlite`) and validated on **Bun.js**.

### 21.1 Complete Map Node Spawn Table (All 25 Harvestable Node Types)

| Node ID              | Node Name                    | Map Zone               | Active Count | Hits to Harvest | Stamina / Hit | Yield Per Node             |  Summer Respawn  |     Winter Respawn      |
| :------------------- | :--------------------------- | :--------------------- | :----------: | :-------------: | :-----------: | :------------------------- | :--------------: | :---------------------: |
| `node_pine_tree`     | **Alpine Pine Tree**         | Pine Forest            |      18      |        4        |       3       | `3 Pine Logs` (+Sapling)   |       12m        |           16m           |
| `node_oak_tree`      | **Ancient Hardwood Oak**     | Deep Pine Forest       |      8       |        6        |       5       | `2 Oak Logs` (+Acorn)      |       25m        |           35m           |
| `node_resin_bark`    | **Sap-Weeping Pine**         | Pine Forest            |      6       |        2        |       2       | `2 Pine Resin`             |       18m        |           28m           |
| `node_berry_bush`    | **Wild Berry Bush**          | Pine Forest            |      10      |        2        |       2       | `3 Wild Berries`           |       15m        | **Dormant (10% spawn)** |
| `node_sunleaf`       | **Sunleaf Herb Patch**       | Forest Clearing        |      8       |        2        |       2       | `2 Sunleaf Herbs`          |       15m        |       **Dormant**       |
| `node_frost_mint`    | **Frost Mint Cluster**       | Snowy Forest & Cliffs  |      8       |        2        |       2       | `2 Frost Mint`             |   **Dormant**    |  **14m (Winter Only)**  |
| `node_ginseng`       | **Alpine Ginseng Root**      | Frostpeak Mountains    |      4       |        3        |       4       | `1–2 Alpine Ginseng`       |       45m        |           40m           |
| `node_reeds`         | **River Reed Cluster**       | Lake Shore             |      10      |        2        |       2       | `3 River Reeds`            |       12m        |     **Frozen Over**     |
| `node_clay_bank`     | **River Clay Deposit**       | Lake Shore / Cave L1   |      8       |        3        |       3       | `3 River Clay`             |       15m        |     30m (Cave only)     |
| `node_silica_sand`   | **Silica Sand Shoal**        | Riverbed / Cave L1     |      8       |        3        |       3       | `3 Silica Sand`            |       15m        |           22m           |
| `node_stone_rock`    | **Granite Outcrop**          | Mountain Quarry        |      14      |        4        |       3       | `3 Raw Stone`              |       10m        |           12m           |
| `node_limestone`     | **Pale Limestone Seam**      | Mountain Quarry        |      8       |        4        |       3       | `2–3 Limestone`            |       16m        |           18m           |
| `node_coal_seam`     | **Black Coal Vein**          | Mountain / Caves L1–L2 |      12      |        4        |       4       | `2–3 Coal`                 |       15m        |           15m           |
| `node_copper_vein`   | **Copper Ore Vein**          | Mountain / Caves L1    |      10      |        4        |       4       | `2–3 Copper Ore`           |       18m        |           18m           |
| `node_iron_vein`     | **Iron Ore Vein**            | Echo Caves L2          |      10      |        5        |       5       | `2–3 Iron Ore`             |       22m        |  20m (Avalanche bonus)  |
| `node_salt_seam`     | **Pink Rock Salt Seam**      | Echo Caves L2          |      8       |        4        |       4       | `3 Rock Salt`              |       20m        |           20m           |
| `node_glow_cap`      | **Glow-Cap Mushroom Bed**    | Echo Caves L2–L3       |      6       |        2        |       2       | `2 Glow-Cap Mushrooms`     |       24m        |           24m           |
| `node_silver_vein`   | **Silver Ore Vein**          | Echo Caves L3          |      6       |        6        |       6       | `2 Silver Ore`             |       35m        |           35m           |
| `node_gem_geode`     | **Alpine Gem Geode**         | Echo Caves L3–L4       |      4       |        6        |       6       | `1 Uncut Alpine Gem`       |       50m        |           50m           |
| `node_gold_vein`     | **Deep Gold Vein**           | Deep Shaft L4          |      4       |        7        |       7       | `1–2 Gold Ore`             |       60m        |           60m           |
| `node_ice_crystal`   | **Glacier Crystal Spire**    | Glacier Crystal Cavern |      6       |        6        |       6       | `1–2 Glacier Ice Crystals` | **Inaccessible** |  **30m (Winter Peak)**  |
| `node_trout_spot`    | **Valley Trout Ripples**     | Frozen Lake (Open)     |      8       |    Mini-game    |       3       | `1–2 Valley Trout`         |       10m        |     **Frozen Over**     |
| `node_salmon_rapids` | **Glacier Salmon Rapids**    | River Mouth            |      5       |    Mini-game    |       4       | `1–2 Glacier Salmon`       |       16m        |     **Frozen Over**     |
| `node_ice_hole`      | **Drilled Ice-Fishing Hole** | Frozen Lake (Frozen)   |      8       |  Auger + Reel   |       4       | `1–2 Frost Carp` (+Pearl)  |    **Melted**    |  **12m (Winter Only)**  |
| `node_ice_sheet`     | **Clear Ice Block Sheet**    | Frozen Lake Surface    |      10      |   4 (Ice Saw)   |       4       | `2 Cut Ice Blocks`         |    **Melted**    |  **15m (Winter Only)**  |

### 21.2 Node Depletion, Rotation & Anti-Macro Fairness

- **Natural Rotation Loop:** Respawn timers (`10m – 60m`) ensure a player gathering in one zone naturally rotates to another zone (e.g., _Farm Plots → Pine Forest → Echo Caves → Village Bakery → Marketplace_) rather than standing still tapping one rock indefinitely.
- **Daily Secret Cache Spawns:** Alongside static nodes, `3–5` randomized **Explorer Secret Caches** appear every 12 hours in unexplored corners of the single map, containing rare `Seeds`, `Repair Kits`, `Frost Pearls`, or `Ancient Yeti Relics`.

---

## 22. NPC Citizen Daily Schedules, Request Scaling & Winter Morale Dialogues

To make the single map feel genuinely inhabited every time the player opens the app, the **16 Named Yeti Citizens** follow a lightweight, deterministic **6-Hour Village Routine** animated directly on the Skia canvas.

### 22.1 Village Daily Schedule (Synced to Local / In-Game Day-Night Lighting)

| Time Block                    | Skia Lighting Shader               | Where Citizens Are Found on the Single Map                                                                             | Gameplay Interaction Highlight                                                                                 |
| :---------------------------- | :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Morning (`06:00 – 11:00`)** | Crisp cool dawn light              | **Village Square & Trade Post:** Citizens browse stalls, read the AI Mayor's daily board, and walk to their workshops. | Best window for picking up **Daily Citizen Requests** all in one spot.                                         |
| **Midday (`11:00 – 17:00`)**  | Bright alpine daylight             | **At Their Workplaces:** Milo in Farm Plots, Torg in Pine Forest, Barnaby at the Anvil Forge, Sora at the Lake Pier.   | Visiting a citizen _at their workplace_ grants `+10%` bonus Friendship XP on deliveries.                       |
| **Evening (`17:00 – 22:00`)** | Warm golden lantern glow           | **The Frosty Yeti Tavern & Village Square Hearths:** Citizens unwind, swap market rumors, and drink Spiced Ale.        | Ideal time to gift `Honey Cakes` / `Spiced Ale` or host a **Tavern Feast** for town-wide morale!               |
| **Night (`22:00 – 06:00`)**   | Deep `#0A0A0A` starry / Aurora sky | **Inside Homes** (except Grit at the Caves & Boris at the Tavern).                                                     | Requests can still be dropped at each citizen's **Porch Delivery Box** so night-owl players are never blocked! |

### 22.2 Dynamic Citizen Request Scaling Formula

Requests scale smoothly with **Town Level**, **Season**, and the **AI Mayor's Subsidy Policy** so early players get approachable orders and endgame towns get lucrative bulk contracts:

```text
RequestQty       = clamp(round(BaseItemQty * (1 + 0.18 * (TownLevel - 1))), 1, 25)
SeasonPremium    = (Season === 'WINTER' && SubsidyPolicy === 'NO_SUBSIDY') ? 1.85 : (Season === 'WINTER' ? 1.35 : 1.00)
RequestCoinPay   = round(RequestQty * BasePrice * 1.15 * SeasonPremium * (1 + 0.02 * FriendshipLevel))
TaxToTreasury    = round(RequestCoinPay * AI_BusinessTaxRate)
PlayerNetCoins   = RequestCoinPay - TaxToTreasury
```

### 22.3 Sample Citizen Dialogues by Town State (Contextual Immersion)

- **Summer — Thriving (`Morale >= 85%`):**
  - _Mabel (Baker):_ `"The summer sun made this week's wheat golden! Bring me 4 Fine Flour and I'll bake double loaves for the whole square."`
  - _Barnaby (Blacksmith):_ `"Taxes are fair and iron is flowing—bring 2 Iron Bars and I'll tune your Pickaxe edge for free!"`
- **Winter — `FULL_CUSHION` Subsidy Active:**
  - _Torg (Lumberjack):_ `"Bless the Treasury! The AI Mayor kept Firewood affordable so nobody's freezing. Still need 6 Logs for the Sawmill though!"`
  - _Boris (Tavern Keeper):_ `"The whole village is celebrating the Winter Cushion—help me cook 3 Frost Carp Chowders for tonight's feast!"`
- **Winter — `NO_SUBSIDY` (2x Prices Absorbed by Citizens):**
  - _Nora (Miller):_ `"Prices doubled overnight and the Treasury is empty... I'll pay double Frost Coins if you can bring me 6 Maize before dusk!"`
  - _Yara (Apothecary):_ `"Half the square has the winter chills and tea costs 2x. Please help me brew 3 Winter Warmth Teas!"`
- **Winter — Guild Slowdown / Strike Warning (`Morale < 35%`):**
  - _Grit (Miner):_ `"We can't swing pickaxes in this frost on empty stomachs and high taxes! Deliver 4 Hot Fish Stews or petition the Mayor before we close the shaft!"`

---

## 23. Cloud AI Mayor Guardrails, Clamps & Deterministic Fallbacks (Bun.js)

Running an **AI Mayor** on a remote **Bun.js** server gives every town personality and dynamic headlines—while strict server-side mathematical clamps guarantee the AI can **never** break game balance or soft-lock a player.

### 23.1 Strict Server-Side Clamp Contract (Validated at I/O Boundary)

Whenever the Bun.js worker receives a structured JSON policy response from the Cloud LLM (`Gemini Flash-Lite`), it passes through a strict validator **before** committing to PostgreSQL or broadcasting to the client:

| Field                              | Hard Server Clamp                                 | Protection Purpose                                                                                |
| :--------------------------------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------ |
| `taxPolicy.businessSalesTax`       | `clamp(value, 0.05, 0.25)`                        | Prevents confiscatory taxes (>25%) or zero-revenue deadlock during low Treasury.                  |
| `taxPolicy.marketplaceExportTax`   | `clamp(value, 0.03, 0.10)`                        | Ensures inter-town trading always remains profitable.                                             |
| `subsidyPolicy`                    | Must be consistent with `TownTreasury > 0`        | AI cannot promise `FULL_CUSHION` if Treasury balance is `0 FC` (auto-downgrades to `NO_SUBSIDY`). |
| `localPriceMultipliers[item]`      | Summer: `[0.75, 1.35]`, Winter: `[1.00, 2.00]`    | Strictly enforces the game's core **2x Winter** ceiling rule.                                     |
| `eventModifiers.yieldDelta`        | `clamp(value, -0.45, +0.80)`                      | Prevents impossible `0%` resource lockouts or infinite `10x` duplication bugs.                    |
| `decreeHeadline` / `decreeMessage` | Max `72` / `220` chars, stripped of markdown/HTML | Guarantees clean, single-glance rendering on small mobile screens.                                |

### 23.2 Beginner Grace Shield (Town Levels 1–2)

- During a new player's **first 24 hours** (or while `TownLevel <= 2`), the AI Mayor is automatically clamped to **`businessSalesTax <= 0.10`** and guaranteed at least **`TARGETED_ESSENTIALS`** subsidy if they enter Winter immediately—so new players learn the fun of taxes and subsidies without getting crushed on Day 1.

### 23.3 Deterministic Fallback Engine (100% Uptime Guarantee)

If the Cloud LLM API times out, rate-limits, or returns malformed JSON:

1. Bun.js immediately invokes the **Deterministic Mayor Policy Engine** using the exact formulas in Section 14.3 (`CoverageRatio` + `MayorArchetype` bias).
2. Selects a pre-written, archetype-matched decree template (`5 archetypes × 4 subsidy modes × 2 seasons = 40 crisp handcrafted fallback decrees`).
3. Logs the fallback event for ops monitoring—the player experiences **zero errors and zero latency**.

---

## 24. Master Glossary & Systems Cross-Reference Matrix

### 24.1 Core Terms Glossary

- **Frost Coins (`FC`):** Primary currency earned through citizen requests, local workshop sales, and Inter-Town Marketplace orders.
- **Town Treasury:** Public coin reserve owned by the town and governed by the **AI Mayor**—funded by business taxes, export tariffs, passive NPC taxes, and optional player donations; spent on **Winter Price Subsidies**, upkeep, and Festivals.
- **Coverage Ratio:** `TownTreasury / TargetWinterReserve`—the transparent metric driving whether the AI Mayor selects `FULL_CUSHION`, `TARGETED_ESSENTIALS`, `MINIMAL_RELIEF`, or `NO_SUBSIDY` during Winter.
- **Supply/Demand Index (`SDI`):** Live 15-minute ratio of marketplace Buy Order demand to Sell Order supply that moves item prices dynamically up to **2x** in Winter.
- **Civic Favor:** Reputation currency earned by completing NPC Citizen Requests; spent at the Town Hall to petition the AI Mayor for tax breaks or targeted Winter subsidies.
- **Cozy Score (`0–1,000`):** Decoration score of your Yeti Lodge interior unlocking permanent stamina, rest, and XP buffs.
- **Trade Pact:** Mutual friendship agreement between two players' towns granting 5-minute early Marketplace order access, `-2%` tariff discount, and daily town-visiting bonuses.
- **Quality Grades:** `Standard (1.0x)`, `Fine (1.25x)`, and `Masterwork (1.60x)` rolls applied to gathered and crafted goods based on Occupation Level, Tool Tier, and Workshop Tier.

### 24.2 Complete Systems Inventory Audit (Nothing Left Out)

| System Dimension                                                           |               Total Cataloged in This Bible                | Where Defined                      |
| :------------------------------------------------------------------------- | :--------------------------------------------------------: | :--------------------------------- |
| **Single-Map Core Zones + Unlockable Sub-Zones**                           |             **5 Core + 3 Sub-Zones (8 Total)**             | Section 1.2                        |
| **Raw Resources (Seeds, Crops, Livestock, Forest, Mining, Lake)**          |                 **51 Distinct Raw Items**                  | Section 2 (2.1 – 2.6)              |
| **Processed Intermediate Materials**                                       |               **40 Distinct Intermediates**                | Section 3.1                        |
| **Final Crafted Products (Food, Tonics, Furniture, Gear, Luxury)**         |               **38 Distinct Finished Goods**               | Section 3.2 – 3.5                  |
| **Explicit Crafting Recipes (`Input => Station + Tool => Output`)**        |        **87 Mapped Recipes Across 6 Master Chains**        | Section 4 (4.1 – 4.6)              |
| **Tools & 4-Tier Equipment Progression**                                   |      **22 Tools × 4 Tiers (Copper → Frost Crystal)**       | Section 5 (5.1 – 5.3)              |
| **Playable Open Occupations (Yeti Can Own Any Business)**                  |                **24 Complete Professions**                 | Section 6 (6.1 – 6.4)              |
| **Seasons, Transition Windows & Sub-Weather States**                       |            **2 Seasons + 8 Sub-Weather States**            | Section 7 (7.1 – 7.3)              |
| **AI Mayor Archetypes, Tax Regimes & Winter Subsidy Modes**                |             **5 Archetypes × 4 Subsidy Modes**             | Section 8 (8.1 – 8.6) & Section 23 |
| **Dynamic Cloud AI Economic Events**                                       |              **24 Concrete Event Templates**               | Section 9 (9.1 – 9.2)              |
| **Player-Driven Inter-Town Marketplace & Liquidity Systems**               |  **Order Book + Dynamic 2x SDI + Trade Pacts + Caravan**   | Section 10 (10.1 – 10.4)           |
| **Living Named NPC Citizens & Morale States**                              |        **16 Named Citizens × 10 Friendship Levels**        | Section 11 & Section 22            |
| **Extended Gameplay Loops (Mining, Survival, Lodge, Museum, Social, Eco)** |                **8 Additional Deep Loops**                 | Section 12 (12.1 – 12.8)           |
| **Upgradeable Single-Map Buildings & Monument Stages**                     |       **28 Buildings (T1–T10) + 10-Stage Monument**        | Section 13 (13.1 – 13.4)           |
| **Economic Math, Margin Proofs, Sinks & Archetype Benchmarks**             |        **Full Equations + 5-Archetype Stress-Test**        | Section 14 & Section 19            |
| **Quests, Seasonal Contracts, Achievements & Museum Collection**           | **12 Founding Quests + 30 Achievements + 40 Museum Items** | Section 16 & Section 17            |
| **Harvestable Map Nodes, Active Mini-Mechanics & Engineering Schemas**     |   **25 Node Types + 5 Mini-Games + SQLite/MMKV/Bun API**   | Section 15, 18 & 21                |

---

## 25. Seasonal Festivals, Multiplayer Leaderboards & Yeti Customization Loop

At the climax of every 72-hour **Summer** and 72-hour **Winter**, all towns across the server participate in a synchronized **12-Hour Seasonal Festival**—providing a celebratory social payoff, a massive material sink, and seasonal prestige rankings without ever dividing the playerbase onto separate maps.

### 25.1 The Two Signature Seasonal Festivals

#### A. The Summer Harvest Fair (Final 12 Hours of Summer)

- **Visual Transformation on the Single Map:** Bunting banners (`#40A7FC` & `#C0CEF5`) string across the Village Square; Boris rolls out outdoor barrels outside the Tavern; a glowing **Harvest Contribution Arch** appears next to the Town Hall.
- **Festival Mechanics:**
  - **Town Contribution Crates:** Players submit crafted Summer goods (`Bread`, `Berry Pie`, `Honey Cake`, `Smoked Fish`, `Pine Chairs`, `Jarred Berry Jam`) to earn **Festival Tickets** and contribute to a **Global Server Milestone Bar**.
  - **AI Mayor Matching Grant:** If your Town Treasury is above `100%` of its target, the AI Mayor matches `25%` of your Harvest Fair points into bonus **Winter Reserve Coins**!
  - **Server-Wide Milestone Rewards:**
    - _Tier 1 (Community Goal):_ `+10%` Crop & Honey yield during the next Summer.
    - _Tier 2 (Community Goal):_ Free `5 Winter Warmth Teas` delivered to every participating town's mailbox before the First Frost.
    - _Tier 3 (Community Goal):_ Unlocks the **Summer Solstice Fireworks** Skia animation and a seasonal cosmetic Yeti Sun Hat!

#### B. The Midwinter Frost Gala (Final 12 Hours of Winter)

- **Visual Transformation on the Single Map:** Aurora Borealis shaders (`#40A7FC` + `#C0CEF5`) wash across the snowy mountains; ice sculptures flank the Grand Yeti Monument; every Street Lantern burns bright gold.
- **Festival Mechanics:**
  - **Winter Survival Audit:** The AI Mayor presents your **End-of-Winter Town Report Card** detailing total taxes collected, total Treasury subsidies paid, average Citizen Morale, peak 2x trade profit, and rare Winter Crystals mined.
  - **Gala Banquet Submission:** Submitting `Frost Carp Chowder`, `Hearty Yak Roast`, `Spiced Barley Ale`, and `Glacier Crystal Windchimes` earns double **Civic Favor** and exclusive **Winter Gala Badges**.

### 25.2 Seasonal Prosperity Leaderboard & Scoring Formula

Every 6-day full cycle (Summer + Winter), towns are ranked in **Regional Brackets of 100 Similar-Level Towns** (so Level 3 newcomers never compete unfairly against Level 15 veterans!):

```text
SeasonProsperityScore =
    (NetTradeProfit * 1.0)
  + (EndOfWinterTreasury * 0.75)
  + (CitizenRequestsFulfilled * 120)
  + (FestivalContributionPoints * 1.5)
  * (0.50 + AvgWinterCitizenMorale / 100)
  * MonumentStageMultiplier   // 1.00x (Stage 0) up to 1.15x (Stage 10)
```

|          Bracket Finish          | Seasonal Prestige Reward                                                                    |
| :------------------------------: | :------------------------------------------------------------------------------------------ |
|   **Top 1 (Valley Sovereign)**   | `Golden Frost Crown` Cosmetic Aura (6 Days) + `1,500 FC` + `Sovereign Plaque` in Yeti Lodge |
|  **Top 2 – 5 (Master Tycoon)**   | `Silver Anvil Banner` for Town Square + `900 FC` + `3 Masterwork Blueprint Shards`          |
| **Top 6 – 20 (Prosperous Town)** | `Periwinkle Ice Lanterns` Cosmetic Skin + `500 FC` + `20 Civic Favor`                       |
|   **All Active Participants**    | `Winter Survivor Badge` + `250 FC` + `5 Rare Seasonal Seeds`                                |

### 25.3 Yeti Character & Single-Map Cosmetic Customization (Non-P2W Expression)

Unlocked via **Achievements, Museum Wings, Festival Tickets, Sera's Tailor Shop, and Seasonal Ranks**:

| Cosmetic Slot               | Examples                                                                               | Unlock Source                                     |
| :-------------------------- | :------------------------------------------------------------------------------------- | :------------------------------------------------ |
| **Yeti Headwear**           | Gold Tooth Grillz Flex, Miner's Crystal Helmet, Chef's Toque, Baker's Hat, Royal Crown | Achievements / Festivals / Sera the Tailor        |
| **Yeti Outerwear (Visual)** | Alpine Fur Parka, Blacksmith Leather Apron, Merchant Velvet Cloak, Aurora Cape         | Occupation Level 10 Mastery / Tailor Shop         |
| **Tool Visual Skins**       | Golden Hoe, Obsidian Pickaxe, Frost-Rune Axe, Bamboo Angler Rod                        | Achievements / Heritage Museum Wings              |
| **Village Square Banners**  | Custom Town Crest & Color Trim (`#40A7FC`, `#C0CEF5`, `#000000`, `#FFFFFF`)            | Town Level Milestones / Trade Pacts               |
| **Yeti Lodge Themes**       | Rustic Pine Cabin, Glacier Ice Palace, Grand Hearth Manor, Cozy Botanical Loft         | Cozy Score Milestones (`250 / 500 / 750 / 1,000`) |
| **Visitor Emotes**          | Yeti Wave, Anvil Hammer Flex, Sip Warmth Tea, Snowball Toss, Coin Shower               | Social Visiting & Seasonal Festivals              |

### 25.4 Final Verification: Loop-to-Loop Interconnectivity Check

Every single system in **Anvil** feeds at least two other systems with zero isolated dead-ends:

- **Explore & Gather** → feeds **Processing & Occupations** + **Museum Secrets** + **Ecological Reforestation**.
- **Processing & 24 Occupations** → feeds **Tool Durability**, **NPC Citizen Requests**, **Yeti Survival (Stamina/Warmth)**, **Cozy Home Buffs**, and **Building Tier 1–10 Upgrades**.
- **NPC Citizen Requests & Workshops** → fund the **AI Mayor's Town Treasury** via business taxes.
- **Summer Surplus & Town Treasury** → determine the **AI Mayor's Winter Subsidy Policy** during the **Winter 2x Price Spike**.
- **Winter 2x Scarcity & Specialization** → power the **Player-Driven Inter-Town Marketplace**, **Trade Pacts**, **Seasonal Festivals**, and **Grand Yeti Monument** prestige!
- **Blacksmith, Tailor, Smokehouse, Apothecary & Builder Shop** → forge real weapons, armor, rations, tactical brews, defenses, and post-raid repairs for **Rival Town Raids**!

---

## 26. Rival Town Raids, Yeti Army & Town Defense Warfare (Clash-Style Economy Combat)

To inject high-adrenaline multiplayer action directly into **Anvil** without breaking its living economy, players can **train, arm, and deploy a Yeti Army to raid other players' towns** in real-time **60–90 second Clash-of-Clans-style tactical skirmishes** — while fortifying their own `56×100` valley with movable, rotatable defenses.

### 26.1 Core Philosophy: Zero Fake Elixir — Your Economy IS Your War Machine
Unlike traditional base-builders that spawn troops from abstract magic bars, **every soldier, weapon, ration, defense tower, and repair plank in Anvil comes straight from your real town economy** (or the Inter-Town Marketplace):
- **Recruits:** Trained at your **Town Watch Barracks** by enlisting idle **Unemployed Drifters** or paying militia shifts out of Frost Coins.
- **Gear:** Every unit requires real forged weapons/armor from your **Blacksmith** and **Tailor** (`Copper/Iron/Steel` Axes, Spears, Kite Shields, Winter Coats).
- **Marching Rations:** Deploying a Warband costs real food (`Fish Stew`, `Smoked Fish`, `Artisan Bread`, `Winter Warmth Tea`). Attacking across mountain passes during **Winter** doubles Warmth Ration upkeep (`2×`), making Winter raids high-risk, high-reward — and creating wartime demand booms on the Marketplace!

### 26.2 The 7-Class Yeti Army Roster

| # | Unit Class | Combat Role | Priority Target | Real Economic Training Cost | Visual / Sprite Archetype |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Shieldguard Yeti** | Heavy Frontline Tank | Nearest Defense / Watchtower | `1 Iron Bar` + `1 Heavy Wool Cloth` + `1 Fish Stew` + `25 FC` | Heavy alpine kite-shield & steel helm guard |
| **2** | **Battle-Axeman Yeti** | High-DPS Melee Bruiser | Any Structure / Enemy Guard | `1 Iron Axe` + `1 Smoked Fish` + `20 FC` | Rugged plaid Lumberjack warrior with twin-bearded axe |
| **3** | **Ice-Archer Yeti** | Ranged Backline DPS | Watchtowers & Enemy Militia | `2 Pine Planks` + `1 Linen Thread` + `1 Smoked Fish` + `22 FC` | Fur-hooded alpine marksman firing barbed frost arrows |
| **4** | **Raider Rogue Yeti** | Fast Loot Specialist (`1.6×` speed, **`2×` loot carry!**) | **Trade Post, Bank Overflow & Warehouses** | `1 Leather Glove` + `1 Fish Stew` + `18 FC` | Hooded `Sneaky Outlaw` carrying oversized loot sack |
| **5** | **Timber Ram Sapper** | Wall & Defense Breaker (`3×` dmg to Defenses) | **Walls, Gates & Watchtowers** | `4 Pine Planks` + `2 Iron Bars` + `2 Fish Stew` + `40 FC` | Pair of armored Builder/Blacksmith Yetis hefting an iron-shod log ram |
| **6** | **Frost Mystic Yeti** | Support & Tower Debuff (`-30%` enemy tower fire rate) | Follows friendly frontline | `1 Frost Core` (or `2 Frost Mint`) + `1 Warmth Tea` + `35 FC` | Cloaked `Frost Cult` mystic pulsing icy aura |
| **7** | **Field Apothecary** | Squad Healer (tosses warm healing stew/salves) | Lowest-HP friendly Yetis | `2 Healing Salves` + `1 Fish Stew` + `30 FC` | Satchel-bearing healer throwing glowing herbal flasks |

### 26.3 Founder Tactical Orders (Off-Map Active Raid Abilities)
Because **your Founder Yeti commands from off the map**, you tap your **Founder Pouch** mid-raid to trigger up to **3 crafted Tactical Orders**:
1. **Rally Horn (`Copper Bar + Wood`):** Grants `+25%` move speed & attack speed inside a target radius for `8s`.
2. **Hot Fish Stew Drop (`2 Fish Stew + Firewood`):** Heals all Yetis in the drop zone for `35%` HP and removes Winter chill slows.
3. **Frost Mist Veil (`2 Frost Mint + Glass Jar`):** Cloaks your Raider Rogues inside swirling snow fog for `5s` so Watchtowers lose lock-on.
4. **Anvil Breaker (`1 Steel Bar + Coal`):** Heavy seismic drop that cracks Stone Walls and stuns nearby defending Guards for `3s`.

### 26.4 Movable & Rotatable Town Defense Structures (Built by Hector's Builders)
All defenses snap cleanly onto your `4×4` valley grid (movable & rotatable just like buildings!) and are constructed by **Builder Villagers**:

| Defense Structure | Role | Manned / Fueled By | Counterplay |
| :--- | :--- | :--- | :--- |
| **Town Watch Barracks** | Trains attacking army + spawns defending **Town Guards** (`Officer Vane` & Militia) during enemy raids | Salaried via Player or **AI Mayor Treasury** | Upgrade tier to expand Army Camp capacity (`12 → 32` Yetis) |
| **Timber Palisade / Stone Wall** | Channels enemy raiders into defensive kill-zones | `Pine Planks` / `Cut Stone` + `Lime Mortar` | Cracked fast by **Timber Ram Sappers**; leaped by **Raider Rogues** |
| **Guard Watchtower** | Long-range single-target arrows against approaching raiders | Manned by **Town Guards** | Slowed by **Frost Mystics**; tanked by **Shieldguards** |
| **Snowball Catapult** | Splash-damage alpine mortar that knocks back tight Rogue packs | `Cut Stone` + `Cut Ice Blocks` | Blind spot at point-blank melee range |
| **Ice-Slick & Snare Trap** | Hidden cobblestone trap that slows and damages rushing raiders | `Iron Nails` + `Pine Pitch` | Rearmed cheaply by Builders after a raid |
| **Bank Vault Shield** | Protects **`80–90%`** of town Frost Coins & rare goods from theft | Upgraded inside **Town Bank & Treasury** | Ensures raids stay fun and fair — never ruinous! |

### 26.5 Rival Town Raid Loop, Loot Rules & Anti-Griefing Guardrails

1. **Matchmaking & Scouting:** Tap the **War Horn / Scout Rival** action to view matched player towns (same Town Level ±1 and similar Authority Rank). Inspect their actual custom building layout, Watchtower arcs, and available **Unvaulted Loot** before committing.
2. **60–90 Second Real-Time Raid (`120fps` Skia `<Atlas>`):**
   - Tap any snowy perimeter border around the rival town to deploy Yetis from your Warband tray.
   - Units autonomously pathfind along streets and around walls, clash with the rival's **Town Watch Militia**, crack defenses, and haul unvaulted goods back toward the extraction edge.
3. **Economic Stakes (High Thrill, Zero Permanent Destruction):**
   - **Strict Loot Cap:** Raiders can steal **at most `10–20%` of Unvaulted Surplus** sitting in the rival's **Market Trade Post, Warehouses, and active Shops** — **never** their core buildings, never their equipped Founder gear, and never the `80–90%` secured inside their **Town Bank Vault**.
   - **Star Rating & Authority Rank:**
     - `1★`: `40%+` Town Damage or `50%+` Unvaulted Loot seized → `+Authority Rank` + Loot kept.
     - `2★`: Rival **Town Hall** breached → Bonus **War Treasury Spoils** from the rival's unshielded Mayor tax chest.
     - `3★`: Full Raid Sweep → Maximum **Authority Rank** + Rival Town Pennant trophy!
   - **Automatic 12-Hour Peace Shield:** Any town raided immediately gains a **12-hour Peace Shield** (cannot be attacked again until the shield expires or the owner chooses to launch an aggressive raid of their own).
   - **Post-Raid Builder Boom (No Deleted Buildings!):** Hit buildings are **never permanently destroyed** — they visually flip into the **`constructionScaffold`** state for a brief repair window, and **Hector's Builder Villagers** walk out with cheap `Pine Planks` (funded partly by **AI Mayor Emergency Relief**) to hammer them right back to 100%!

### 26.6 AI Mayor Wartime Policy Integration
- **Defense vs. Welfare Trade-off:** When a town gets raided frequently, **AI Mayor Barnaby** dynamically shifts Treasury allocations — hiring extra **Town Guards**, subsidizing `Pine Planks` & `Iron Nails` for rapid repairs, or posting a **Retaliation Bounty** on the attacker's town!
- **Wartime Marketplace Surge:** Active PvP wars across a server naturally drive up Marketplace prices for `Iron Bars`, `Steel Weapons`, `Healing Salves`, `Smoked Fish`, and `Pine Planks` — allowing peaceful industrial towns to profit wildly as arms & ration suppliers!
