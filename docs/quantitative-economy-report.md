# Anvil — Quantitative Game Economy Specification, Multi-Scale Simulation & Anti-Exploit Audit

> **Zero-Guesswork Guarantee:** Every single wage, item price, bid-ask spread, mining drop rate, raid loot cap, and tax bracket in this report is algebraically derived from one Base Economic Unit ($U_0 = 120\text{ FC/hr}$), simulated across **100 (1x), 1,000 (10x), and 10,000 (100x)** active agents over **365 days**, and verified by **11/11 passing `pytest` anti-exploit & macroeconomic invariant tests**.

---

## 1. Phase 1 — Anchors & Base Economic Unit

Anchored directly to Anvil's game design ([game-design.md](file:///c:/Users/NCC/3D%20Objects/anvil/docs/game-design.md), [economy-villager.md](file:///c:/Users/NCC/3D%20Objects/anvil/docs/economy-villager.md), and Act I's 72h Winter start):

| Anchor Parameter | Value | Mathematical Rationale |
| :--- | :---: | :--- |
| **Base Economic Unit ($U_0$)** | **`120 FC / active hour`** (`VPM_0 = 2.0 FC/min`) | All raw goods, salaries, cave drops, and raids normalize to Tier-1 labor time. |
| **Starting Capital ($C_0$)** | **`180 FC`** (`1.5h` T1 labor) | Exact Act I worst-case 72h survival runway: `3` Fish Stew (`42`) + `4` Firewood (`40`) + `1` Repair Kit (`28`) + Shelter reserve (`40`) + 5th-percentile RNG buffer (`30`). Zero Day-1 inflation, zero soft-lock. |
| **Seasonal Clock** | **72h Winter ↔ 72h Summer** | Starts in dead Winter (`Hours 0–72`, Fish/Fish Stew/Firewood/Timber); Hour 72 First Thaw opens the Southern Pass (Maize/Wheat/Yaks). |
| **Market Architecture** | **Hybrid** (NPC Trade Post + P2P Inter-Town Order Book + Mayor Treasury) | NPC bid-ask bounds prevent collapse; P2P order book drives price discovery; Mayor Treasury absorbs taxes & cushions Winter `2×` shocks. |
| **Progression Pacing (TTE)** | Mid-Game **`~28h`** · End-Game **`~141h`** | Verified via 365-day simulation across all 5 player archetypes. |

---

## 2. Phase 2 — Governing Mathematical Equations

### 2.1 Occupation Salaries (Sub-Linear Power Scaling)
To reward mastery without causing exponential late-game hyperinflation, gross wage per active hour scales via a sub-linear power curve ($T \in \{1,2,3,4\}$, skill level $s \in [1,10]$):

$$W_{\text{gross}}(T, s) = U_0 \cdot T^{0.78} \cdot \big(1 + 0.04 \cdot (s - 1)\big)$$

$$EV_{\text{occ}}(T) = W_{\text{gross}}(T, 1) \cdot (1 - c_{\text{upkeep}}) \cdot (1 - \tau_{\text{mayor}})$$

### 2.2 Stochastic Mining Expected Value (4 Echo Cave Depths)
$$EV_{\text{mine}}(L) = A_L \cdot \left(\sum_{i} P_{L,i} \cdot V_i\right) \cdot \big(1 - \tau_{\text{eff}}\big) - C_{\text{upkeep}}(L)$$
where $\sum_i P_{L,i} = 1$, $A_L \in [22, 28]$ swings/hr, and $C_{\text{upkeep}}(L)$ sinks Pickaxe wear, Lantern Oil, and Cave Warmth rations.

### 2.3 Risk-Adjusted Rival Town Raid Expected Value (Zero Coin Printing)
$$EV_{\text{raid}}(T) = R_{\text{hr}} \cdot \Big[ P_{\text{win}} \cdot \big(R_{\text{loot}} \cdot (1 - \alpha_{\text{attrition}}) \cdot \sigma_{\text{role}}\big) - (1 - P_{\text{win}}) \cdot C_{\text{loss}} - C_{\text{army}} \cdot \gamma_{\text{role}} - C_{\text{rations}} \cdot \mu_{\text{season}} \Big]$$
- **$R_{\text{loot}} = 15\%$** of Defender's Unvaulted Surplus (zero-sum transfer — never minted!).
- **$\alpha_{\text{attrition}} = 15\%$** permanently burned as battle spoilage/transport loss (makes alt-account collusion strictly money-losing!).
- **Role Parity:** Elected Mayor ($\sigma = 0.80, \gamma = 0.75$ Treasury subsidy, `+20%` Treasury tribute) vs. Out-of-Office Privateer ($\sigma = 0.86$ after `14%` smuggling tariff, $\gamma = 1.00$ full cost).
- **Winter Warfare Cost:** $\mu_{\text{winter}} = 1.65\times$ ration burn (spiking wartime demand for Fish Stew, Smoked Fish, and Warmth Tea).

### 2.4 Verified EV/Hour Parity Across All 4 Tiers (No Dominant Meta)

| Tier | Deterministic Occupation Net EV/hr | Mining Net EV/hr (`vs. Occ`) | Elected Mayor Raid Summer EV/hr (`vs. Occ`) | Privateer Raid Summer EV/hr (`vs. Occ`) | Mayor Raid Winter EV/hr |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **T1** | `95.04 FC/hr` | `104.74` (`1.102×`) | `99.47` (`1.047×`) | `102.46` (`1.078×`) | `88.09 FC/hr` |
| **T2** | `163.20 FC/hr` | `150.13` (`0.920×`) | `169.39` (`1.038×`) | `174.43` (`1.069×`) | `149.89 FC/hr` |
| **T3** | `223.90 FC/hr` | `249.95` (`1.116×`) | `227.79` (`1.017×`) | `234.15` (`1.046×`) | `202.05 FC/hr` |
| **T4** | `280.23 FC/hr` | `302.84` (`1.081×`) | `286.32` (`1.022×`) | `293.38` (`1.047×`) | `253.82 FC/hr` |

### 2.5 Pricing, Bid-Ask Spread & Multi-Hop Anti-Arbitrage Theorem
- **Reference Price:** $P_{\text{ref}}(c) = \sum_k q_k P_{\text{ref}}(k) + \text{CraftMin}(c) \cdot \text{VPM}_{\text{tier}} + C_{\text{fuel}}$
- **NPC Ask (Player Buys):** $P_{\text{ask}}(i) = \lceil 1.20 \cdot P_{\text{ref}}(i) \rceil$
- **NPC Bid (Player Instant-Sells):** $P_{\text{bid}}(i) = \min\Big(\lfloor 0.72 \cdot P_{\text{ref}}(i) \rfloor,\; \sum_k q_k P_{\text{ask}}(k),\; \sum_{\text{raw } r} q_r P_{\text{ask}}(r)\Big)$
- **Winter Subsidy Bound:** Every Winter-subsidizable essential (`Lake Trout`, `Snow Turnip`, `Firewood`, `Fish Stew`, `Artisan Bread`, `Warmth Tea`) is flagged `local_subsidy_bound = true`, blocking subsidized-buy → P2P-marketplace-export loops.

### 2.6 Macroeconomic Stabilizer (Scale-Invariant PI Controller)
Let $m(t) = M(t) / N$ be per-capita liquid Frost Coins and $m^*(t) = 180 + 2{,}820(1 - e^{-t/26})$ be target progression liquidity. Define the normalized liquidity gap $g(t) = \frac{m(t) - m^*(t)}{m^*(t)}$:
- **Mayor Tax Rate:** $\tau_{\text{mayor}}(t) = \text{clamp}(0.10 + 0.08 \cdot g(t),\; 0.05,\; 0.18)$
- **P2P Marketplace Fee:** $\tau_{\text{mkt}}(t) = \text{clamp}(0.06 + 0.07 \cdot g(t),\; 0.04,\; 0.12)$
- **Progressive Daily Wealth/Property Upkeep Sink:** `0.00%` (`0–1,500 FC`), `0.35%` (`1.5k–8k`), `0.85%` (`8k–30k`), `1.60%` (`30k+`).

---

## 3. Phase 3 — Multi-Scale Simulation Results (1x, 10x, 100x over 365 Days)

Simulated with [simulate.py](file:///c:/Users/NCC/3D%20Objects/anvil/economy-sim/simulate.py) across **5 simultaneous player archetypes** (`45%` Casual, `20%` Hardcore Grinder, `15%` Market Arbitrageur, `12%` Hoarder, `8%` Raider):

| Scale | Day 30 `M/N` | Day 90 `M/N` | Day 365 `M/N` | Day 365 CPI | Infl (`30→90`) | Infl (`90→365`) | Avg `F/S` (`30–365`) | Day 365 Gini | Mid / End TTE | Day 7 p5 Casual |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1x (`100`)** | `2,100 FC` | `2,931 FC` | `3,225 FC` | `1.029` | `-0.16%/mo` | `+0.30%/mo` | `0.984` | `0.423` | `28.1h / 140.9h` | `244.9 FC` |
| **10x (`1,000`)** | `2,072 FC` | `2,913 FC` | `3,216 FC` | `1.027` | `-0.03%/mo` | `+0.31%/mo` | `0.985` | `0.427` | `28.1h / 140.6h` | `265.1 FC` |
| **100x (`10,000`)** | `2,080 FC` | `2,926 FC` | `3,227 FC` | `1.028` | `-0.03%/mo` | `+0.31%/mo` | `0.985` | `0.430` | `28.1h / 140.7h` | `256.0 FC` |

**Scale Invariance Proof:** Scaling active players by **100×** (`100 → 10,000`) changes Day 365 per-capita money by **`0.06%`**, CPI by **`0.10%`**, and Faucet-to-Sink equilibrium by **`0.10%`**.

### Adversarial Stress Tests (Trying to Break the Economy)
1. **50% Extreme Hoarder Shock (180 Days, 500 Players):** `CPI = 1.168` (zero deflationary spiral), `Gini = 0.404`, Casual players still grew to **`707 FC`** (`3.9×` starting capital) as progressive wealth upkeep taxed idle hoards (`14.4%` tax / `9.9%` fee).
2. **60% Hardcore Grinder Bot Surge (180 Days, 500 Players):** PI Stabilizer held `CPI = 1.073`, `Avg F/S = 1.000`, `Mayor Tax = 11.7%`, `Market Fee = 7.5%` — **zero hyperinflation**.

---

## 4. Phase 4 — Automated `pytest` Verification Results (`11 / 11 PASSED`)

Executed via `python -m pytest -v economy-sim/test_economy.py` ([test_economy.py](file:///c:/Users/NCC/3D%20Objects/anvil/economy-sim/test_economy.py)):

- **3 Real Exploits Caught & Fixed During Tuning:**
  1. *Multi-hop Bread Arbitrage:* `2 Wheat (18) + 1 Pine Log (8) = 26 FC` vs initial `artisan_bread` NPC bid `27 FC` (`+1 FC` multi-hop bot loop) → fixed by enforcing recursive raw-base ask clamping inside `add_crafted()`.
  2. *Tier 4 Deep Shaft L4 Dominance:* Initial L4 Diamond/Crystal drop rates yielded `384.8 FC/hr` (`1.373×` T4 occupation) → calibrated to `22` swings/hr, `12%` Diamond, `8%` Crystal, `92 FC/hr` upkeep → **`302.8 FC/hr` (`1.081×`)**.
  3. *Tier 1 Raid Underpayment & Privateer Over-Share:* Initial T1 raid paid `0.767×` and `94%` Privateer split exceeded `1.20×` → calibrated unvaulted raid pools and `14%` Privateer smuggling tariff → BOTH Mayor (`1.02–1.05×`) and Privateer (`1.05–1.08×`) sit cleanly inside parity.

| # | Automated Test | Invariant Verified | Status |
| :-: | :--- | :--- | :---: |
| 1 | `test_no_npc_roundtrip_arbitrage` | `npc_sell < npc_buy` with `>= 25%` spread on all 46 items | **PASSED** |
| 2 | `test_no_crafted_ingredient_arbitrage` | `crafted_sell <= sum(direct_ingredient_buy)` | **PASSED** |
| 3 | `test_multi_hop_raw_ingredient_craft_arbitrage_impossible` | Recursive raw-base expansion has zero multi-hop craft arbitrage | **PASSED** |
| 4 | `test_winter_subsidy_goods_cannot_be_exported_for_arbitrage` | All 6 Winter essentials enforce `local_subsidy_bound=True` | **PASSED** |
| 5 | `test_no_raid_collusion_money_printing` | Colluding alt-raids always produce strict negative net currency | **PASSED** |
| 6 | `test_mining_drop_probabilities_sum_to_one` | All 4 Echo Cave depths sum to `1.000000000` | **PASSED** |
| 7 | `test_occupation_vs_mining_vs_raid_ev_parity` | All tiers of Mining, Mayor Raid & Privateer Raid within `[0.85, 1.20]×` | **PASSED** |
| 8 | `test_zero_softlock_worst_case_5th_percentile_rng` | 500-player Act I Monte Carlo p5 min balance `> 40 FC` | **PASSED** |
| 9 | `test_adversarial_hoarder_shock_50pct_hoarders` | Zero deflationary collapse under 50% extreme hoarders | **PASSED** |
| 10 | `test_adversarial_grinder_surge_60pct_hardcore` | Zero hyperinflation under 60% 3+ hr/day grinders | **PASSED** |
| 11 | `test_macro_simulation_inflation_equilibrium_and_scale_invariance` | 1x / 10x / 100x scale invariance, CPI corridor, F/S & Gini bounds | **PASSED** |

---

## 5. Production-Ready Engine Configs (Ready to Import Into Bun.js & Expo)

- **Master JSON Config:** [anvil_economy_config.json](file:///c:/Users/NCC/3D%20Objects/anvil/economy-sim/out/anvil_economy_config.json) (`46` items, `17` occupations, `4` mining depths, `4` raid tiers, tax brackets)
- **Item Pricing & Spreads CSV:** [items_pricing.csv](file:///c:/Users/NCC/3D%20Objects/anvil/economy-sim/out/items_pricing.csv)
- **Occupation Salaries CSV:** [occupations_salaries.csv](file:///c:/Users/NCC/3D%20Objects/anvil/economy-sim/out/occupations_salaries.csv)
- **Executable Model, Simulator & Test Suite:** [economy_model.py](file:///c:/Users/NCC/3D%20Objects/anvil/economy-sim/economy_model.py) · [simulate.py](file:///c:/Users/NCC/3D%20Objects/anvil/economy-sim/simulate.py) · [test_economy.py](file:///c:/Users/NCC/3D%20Objects/anvil/economy-sim/test_economy.py)
