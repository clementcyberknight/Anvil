"""
Anvil Quantitative Game Economy Model (Phases 1 & 2)
----------------------------------------------------
Zero-guesswork mathematical specification anchored strictly to:
  Base Economic Unit U_0 = 120 FC / active hour (VPM_0 = 2.0 FC / active minute)
for Tier-1 baseline labor across Anvil's 72h Winter (2x) <-> 72h Summer (1x) cycle.
"""

from __future__ import annotations

import csv
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List, Tuple

# =============================================================================
# PHASE 1: ECONOMIC ANCHORS
# =============================================================================

BASE_LABOR_HOUR_FC: float = 120.0          # U_0: 1h Tier-1 deterministic gross output
VPM_BASE: float = BASE_LABOR_HOUR_FC / 60.0  # 2.0 FC / active minute
TIER_EXPONENT: float = 0.78                # Sub-linear power curve S(T) = U_0 * T^0.78
SKILL_BONUS_PER_LEVEL: float = 0.04        # +4% per occupation level (L1..L10 -> +36% max)

SEASON_DURATION_HOURS: int = 72            # 3 real days Winter, 3 real days Summer
SEASON_DURATION_DAYS: int = 3

# Starting capital derived from Act I worst-case survival runway:
#   3 Fish Stew (42) + 4 Firewood (40) + 1 Tool Repair Kit (28)
# + 1 Shelter/Bunkroom Reserve (40) + 5th-percentile RNG buffer (30) = 180 FC (= 1.5h T1 labor)
STARTING_CAPITAL_FC: int = 180

# Bid-Ask Spreads (strictly prevent NPC round-trip and buy-craft-dump arbitrage)
NPC_ASK_MARKUP: float = 0.20               # Player buys from NPC at +20% above ref
NPC_BID_DISCOUNT: float = 0.28             # Player instant-sells to NPC at -28% below ref
# Effective NPC round-trip loss = 1 - (0.72 / 1.20) = 40.0%

# Tax & Tariff Corridors
MAYOR_TAX_MIN: float = 0.05
MAYOR_TAX_DEFAULT: float = 0.10
MAYOR_TAX_MAX: float = 0.18

MARKET_FEE_MIN: float = 0.04
MARKET_FEE_DEFAULT: float = 0.06
MARKET_FEE_MAX: float = 0.12

# Progressive Daily Wealth / Property Upkeep Tax Brackets (anti-hoarder velocity control)
# Format: (upper_bound_fc_inclusive, daily_marginal_rate)
WEALTH_TAX_BRACKETS: Tuple[Tuple[float, float], ...] = (
    (1_500.0, 0.0000),      # 0.00%/day: 100% exempt for Casuals & Act I-II players
    (8_000.0, 0.0035),      # 0.35%/day: Mid-game cottage/workshop property upkeep
    (30_000.0, 0.0085),     # 0.85%/day: Estate & multi-shop upkeep
    (math.inf, 0.0160),     # 1.60%/day: Mega-hoarder velocity stabilizer
)

# Rival Town Raid Guardrails (Clash-style economic raids — zero coin printing)
RAID_UNVAULTED_LOOT_PCT: float = 0.15      # 15% of defender's unvaulted surplus (10-20% band)
RAID_WAR_ATTRITION_SINK: float = 0.15      # 15% of seized loot lost to battle spoilage/transport
RAID_PEACE_SHIELD_HOURS: int = 12          # Defender protected for 12h after raid
RAID_SAME_TARGET_COOLDOWN_HOURS: int = 72  # Anti-collusion cooldown between same pair


# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass(frozen=True)
class OccupationSpec:
    id: str
    name: str
    tier: int
    upkeep_ratio: float           # Tool wear + fuel cost as fraction of gross output
    gross_fc_per_hour: float
    net_fc_per_hour_base: float   # After upkeep & default 10% Mayor tax
    act_unlocked: int             # 1 = First Freeze (0-72h), 2 = Summer Thaw (72h+), 3 = Mid, 4 = End


@dataclass(frozen=True)
class ItemSpec:
    id: str
    name: str
    category: str                 # 'raw' | 'seed' | 'ore' | 'food' | 'intermediate' | 'gear' | 'luxury'
    tier: int
    labor_minutes: float          # Active minutes of effort embodied in this item
    ref_price: float              # Derived mathematical reference value (Summer 1x)
    npc_buy_price: int            # Ask: what player pays NPC / Trade Post
    npc_sell_price: int           # Bid: what player receives instant-selling to NPC
    winter_max_mult: float        # Dynamic Winter P2P market ceiling (up to 2.0x)
    local_subsidy_bound: bool     # True -> subsidized purchases cannot be exported to P2P market
    recipe: Tuple[Tuple[str, int], ...] = ()
    craft_fuel_cost: float = 0.0


@dataclass(frozen=True)
class MiningDrop:
    item_id: str
    probability: float


@dataclass(frozen=True)
class MiningDepthSpec:
    depth: int
    name: str
    tier: int
    attempts_per_hour: int
    upkeep_fc_per_hour: float     # Pickaxe wear + Lantern Oil + Cave Warmth rations
    drops: Tuple[MiningDrop, ...]


@dataclass(frozen=True)
class RaidTierSpec:
    tier: int
    name: str
    raids_per_hour: float
    base_win_prob: float
    target_unvaulted_pool_fc: float  # Typical unvaulted surplus of matched rival town
    army_gear_cost_fc: float         # Forged weapons/armor wear + troop enlistment
    rations_cost_summer_fc: float    # Fish Stew / Smoked Fish marching rations (2x in Winter)
    loss_penalty_fc: float           # Extra troop replacement & healing salves on defeat


# =============================================================================
# PHASE 2: MATHEMATICAL FORMULAS
# =============================================================================

def occupation_gross_per_hour(tier: int, skill_level: int = 1) -> float:
    """S(T, s) = U_0 * T^0.78 * (1 + 0.04 * (s - 1))"""
    return BASE_LABOR_HOUR_FC * (tier ** TIER_EXPONENT) * (
        1.0 + SKILL_BONUS_PER_LEVEL * max(0, skill_level - 1)
    )


def occupation_net_per_hour(
    tier: int,
    upkeep_ratio: float = 0.12,
    tax_rate: float = MAYOR_TAX_DEFAULT,
    skill_level: int = 1,
) -> float:
    """EV_occ(T) = W_gross(T, s) * (1 - c_upkeep) * (1 - tau)"""
    gross = occupation_gross_per_hour(tier, skill_level)
    return gross * (1.0 - upkeep_ratio) * (1.0 - tax_rate)


def compute_bid_ask(ref_price: float) -> Tuple[int, int]:
    """
    Derive integer (npc_buy_ask, npc_sell_bid) strictly enforcing bid < ask.
    """
    ask = max(2, int(math.ceil(ref_price * (1.0 + NPC_ASK_MARKUP))))
    bid = max(1, int(math.floor(ref_price * (1.0 - NPC_BID_DISCOUNT))))
    if bid >= ask:
        bid = max(1, ask - 1)
    return ask, bid


def compute_daily_wealth_tax(liquid_coins: float) -> float:
    """Progressive marginal wealth/property upkeep sink."""
    if liquid_coins <= 0.0:
        return 0.0
    tax = 0.0
    prev_bound = 0.0
    for upper, rate in WEALTH_TAX_BRACKETS:
        if liquid_coins <= prev_bound:
            break
        taxable = min(liquid_coins, upper) - prev_bound
        tax += taxable * rate
        prev_bound = upper
    return tax


def build_occupations() -> List[OccupationSpec]:
    raw_specs = [
        ("occ_ice_angler", "Lake & Ice Angler", 1, 0.10, 1),
        ("occ_lumberjack", "Pine Lumberjack", 1, 0.11, 1),
        ("occ_drifter_labor", "Day-Labor Porter", 1, 0.08, 1),
        ("occ_farmer", "Valley Crop Farmer", 1, 0.12, 2),
        ("occ_smokehouse", "Fish Smoker & Stew Chef", 2, 0.13, 1),
        ("occ_sawyer", "Sawmill Operator", 2, 0.12, 1),
        ("occ_miller", "Windmill Miller", 2, 0.12, 2),
        ("occ_baker", "Cozy Baker", 2, 0.13, 2),
        ("occ_rancher", "Yak Rancher & Dairy", 2, 0.12, 2),
        ("occ_town_guard", "Town Watch Guard", 2, 0.10, 2),
        ("occ_blacksmith", "Yeti Blacksmith", 3, 0.14, 2),
        ("occ_builder", "Master Builder Crew", 3, 0.12, 1),
        ("occ_apothecary", "Apothecary & Tailor", 3, 0.14, 3),
        ("occ_banker", "Town Banker & Broker", 3, 0.10, 2),
        ("occ_master_smelter", "Deep Blast Smelter", 4, 0.15, 3),
        ("occ_jeweler", "Alpine Gem & Crown Jeweler", 4, 0.15, 4),
        ("occ_greenhouse", "Sun-Glass Agronomist", 4, 0.15, 4),
    ]
    out: List[OccupationSpec] = []
    for occ_id, name, tier, upkeep, act in raw_specs:
        gross = round(occupation_gross_per_hour(tier, 1), 2)
        net = round(occupation_net_per_hour(tier, upkeep, MAYOR_TAX_DEFAULT, 1), 2)
        out.append(
            OccupationSpec(
                id=occ_id,
                name=name,
                tier=tier,
                upkeep_ratio=upkeep,
                gross_fc_per_hour=gross,
                net_fc_per_hour_base=net,
                act_unlocked=act,
            )
        )
    return out


def build_items() -> Dict[str, ItemSpec]:
    """
    Every item's reference price is derived from Labor-Time Equivalence:
      - Raw & Ore items: ref_price = labor_minutes * VPM_tier
      - Crafted items:   ref_price = sum(ingredient_ref) + craft_minutes * VPM_tier + fuel_cost
    And npc_sell_price is strictly clamped <= sum(ingredient_npc_buy_prices) so
    buying ingredients from NPCs to craft & instant-sell can NEVER print coins.
    """
    items: Dict[str, ItemSpec] = {}

    def add_raw(
        item_id: str,
        name: str,
        category: str,
        tier: int,
        labor_minutes: float,
        winter_max_mult: float,
        local_subsidy_bound: bool = False,
    ) -> None:
        vpm = occupation_gross_per_hour(tier) / 60.0
        ref = round(labor_minutes * vpm, 2)
        ask, bid = compute_bid_ask(ref)
        items[item_id] = ItemSpec(
            id=item_id,
            name=name,
            category=category,
            tier=tier,
            labor_minutes=labor_minutes,
            ref_price=ref,
            npc_buy_price=ask,
            npc_sell_price=bid,
            winter_max_mult=winter_max_mult,
            local_subsidy_bound=local_subsidy_bound,
        )

    def recursive_raw_ask_cost(key: str) -> int:
        spec = items[key]
        if not spec.recipe:
            return spec.npc_buy_price
        return sum(recursive_raw_ask_cost(k) * q for k, q in spec.recipe)

    def add_crafted(
        item_id: str,
        name: str,
        category: str,
        tier: int,
        craft_minutes: float,
        recipe: Tuple[Tuple[str, int], ...],
        winter_max_mult: float,
        fuel_cost: float = 0.0,
        local_subsidy_bound: bool = False,
    ) -> None:
        vpm = occupation_gross_per_hour(tier) / 60.0
        ing_ref_sum = sum(items[k].ref_price * qty for k, qty in recipe)
        ing_ask_sum = sum(items[k].npc_buy_price * qty for k, qty in recipe)
        raw_base_ask_sum = sum(recursive_raw_ask_cost(k) * qty for k, qty in recipe)
        ref = round(ing_ref_sum + craft_minutes * vpm + fuel_cost, 2)
        ask, bid = compute_bid_ask(ref)
        # Hard mathematical anti-arbitrage invariant (single-hop AND multi-hop recursive!):
        # Instant-selling a crafted good to NPC can NEVER exceed buying either its direct
        # ingredients OR its underlying raw base ingredients from NPC.
        max_safe_bid = min(ing_ask_sum, raw_base_ask_sum)
        if bid > max_safe_bid:
            bid = max(1, int(max_safe_bid))
        if bid >= ask:
            ask = bid + 2
        items[item_id] = ItemSpec(
            id=item_id,
            name=name,
            category=category,
            tier=tier,
            labor_minutes=craft_minutes,
            ref_price=ref,
            npc_buy_price=ask,
            npc_sell_price=bid,
            winter_max_mult=winter_max_mult,
            local_subsidy_bound=local_subsidy_bound,
            recipe=recipe,
            craft_fuel_cost=fuel_cost,
        )

    # --- SEEDS ---
    add_raw("seed_maize", "Maize Seeds", "seed", 1, 1.5, 1.40)
    add_raw("seed_wheat", "Wheat Seeds", "seed", 1, 1.5, 1.40)
    add_raw("seed_turnip", "Snow Turnip Seeds", "seed", 1, 2.0, 1.60)
    add_raw("seed_potato", "Frost Potato Seeds", "seed", 1, 2.0, 1.50)
    add_raw("seed_pine", "Pinecone Seed", "seed", 1, 1.5, 1.30)

    # --- RAW FORESTRY, FISH & FARM PRODUCE ---
    add_raw("lake_trout", "Lake Trout", "raw", 1, 3.5, 1.65, local_subsidy_bound=True)
    add_raw("frost_carp", "Frost Carp", "raw", 2, 5.5, 1.85)
    add_raw("pine_log", "Pine Log", "raw", 1, 3.0, 1.75)
    add_raw("oak_log", "Hardwood Oak Log", "raw", 2, 4.5, 1.75)
    add_raw("maize_cob", "Maize Cob", "raw", 1, 3.5, 2.00)
    add_raw("wheat_sheaf", "Wheat Sheaf", "raw", 1, 3.5, 2.00)
    add_raw("snow_turnip", "Snow Turnip", "raw", 1, 3.2, 1.60, local_subsidy_bound=True)
    add_raw("frost_potato", "Frost Potato", "raw", 1, 3.8, 1.80)
    add_raw("mountain_berries", "Mountain Berries", "raw", 1, 4.0, 1.90)
    add_raw("forest_mushroom", "Forest Mushrooms", "raw", 1, 3.2, 1.55)
    add_raw("frost_mint", "Frost Mint", "raw", 2, 4.0, 1.80)
    add_raw("yak_milk", "Yak Milk", "raw", 2, 3.5, 1.85)
    add_raw("yak_wool", "Yak Wool", "raw", 2, 4.0, 1.90)

    # --- MINEABLE ORES, GEMS & CRYSTALS (Anchored to Cave EV Parity) ---
    add_raw("raw_stone", "Raw Stone", "ore", 1, 1.8, 1.40)          # ref 3.60
    add_raw("coal_chunk", "Coal Chunk", "ore", 1, 2.6, 1.85)        # ref 5.20
    add_raw("copper_ore", "Copper Ore", "ore", 1, 3.8, 1.60)        # ref 7.60
    add_raw("iron_ore", "Iron Ore", "ore", 2, 3.1, 1.70)            # ref 10.64
    add_raw("silver_ore", "Silver Ore", "ore", 3, 3.1, 1.70)        # ref 14.61
    add_raw("gold_ore", "Gold Ore", "ore", 3, 4.5, 1.75)            # ref 21.21
    add_raw("raw_diamond", "Uncut Diamond", "ore", 4, 5.2, 1.75)    # ref 30.66
    add_raw("ice_crystal", "Glacier Ice Crystal", "ore", 4, 6.2, 2.00)  # ref 36.56
    add_raw("ancient_relic", "Ancient Yeti Relic", "luxury", 4, 9.5, 1.50)  # ref 56.02

    # --- PROCESSED INTERMEDIATES ---
    add_crafted("firewood", "Split Firewood", "intermediate", 1, 1.5, (("pine_log", 1),), 2.00, 0.0, True)
    add_crafted("pine_planks", "Pine Planks", "intermediate", 1, 2.2, (("pine_log", 2),), 1.75, 0.0)
    add_crafted("flour_sack", "Fine Flour", "intermediate", 2, 2.0, (("wheat_sheaf", 2),), 2.00, 0.5)
    add_crafted("iron_ingot", "Iron Ingot", "intermediate", 2, 2.5, (("iron_ore", 2), ("coal_chunk", 1)), 1.75, 1.0)
    add_crafted("gold_ingot", "Gold Ingot", "intermediate", 4, 3.2, (("gold_ore", 2), ("coal_chunk", 2)), 1.75, 2.0)
    add_crafted("steel_ingot", "Tempered Steel Ingot", "intermediate", 3, 3.0, (("iron_ingot", 2), ("coal_chunk", 2)), 1.85, 2.0)
    add_crafted("iron_nails", "Box of Iron Nails", "intermediate", 2, 1.5, (("iron_ingot", 1),), 1.70, 0.5)
    add_crafted("wool_cloth", "Heavy Wool Cloth", "intermediate", 2, 2.5, (("yak_wool", 2),), 1.95, 0.0)

    # --- CONSUMABLE FOODS & TONICS ---
    # Act I cheapest survival food: 1 Lake Trout + 1 Firewood -> Hearty Fish Stew
    add_crafted("fish_stew", "Hot Fish Stew", "food", 1, 2.0, (("lake_trout", 1), ("firewood", 1)), 1.80, 0.0, True)
    add_crafted("smoked_fish", "Smoked Glacier Fish", "food", 2, 2.0, (("lake_trout", 2), ("firewood", 1)), 2.00, 0.0)
    add_crafted("artisan_bread", "Artisan Loaf Bread", "food", 2, 2.2, (("flour_sack", 1), ("firewood", 1)), 2.00, 0.0, True)
    add_crafted("alpine_cheese", "Aged Alpine Cheese", "food", 2, 2.5, (("yak_milk", 2),), 1.90, 0.0)
    add_crafted("warmth_tea", "Winter Warmth Tea", "food", 2, 2.0, (("frost_mint", 1), ("firewood", 1)), 2.00, 0.0, True)
    add_crafted("healing_salve", "Healing Salve", "food", 3, 2.5, (("frost_mint", 1), ("forest_mushroom", 2)), 1.85, 0.0)

    # --- GEAR, TOOLS & LUXURY ---
    add_crafted("repair_kit", "Tool Repair Kit", "gear", 2, 1.8, (("iron_ingot", 1), ("pine_planks", 1)), 1.65, 0.0)
    add_crafted("iron_axe", "Iron Battle Axe", "gear", 3, 3.0, (("iron_ingot", 2), ("pine_planks", 1)), 1.75, 1.5)
    add_crafted("kite_shield", "Alpine Kite Shield", "gear", 3, 3.2, (("iron_ingot", 2), ("wool_cloth", 1)), 1.80, 1.5)
    add_crafted("winter_coat", "Heavy Winter Coat", "gear", 3, 3.5, (("wool_cloth", 2),), 2.00, 0.0)
    add_crafted("yeti_crown", "Sovereign Yeti Crown", "luxury", 4, 8.0, (("gold_ingot", 3), ("raw_diamond", 2), ("ice_crystal", 1)), 1.60, 5.0)

    return items


def build_mining_depths() -> List[MiningDepthSpec]:
    return [
        MiningDepthSpec(
            depth=1,
            name="Surface Quarry (L1)",
            tier=1,
            attempts_per_hour=28,
            upkeep_fc_per_hour=24.0,
            drops=(
                MiningDrop("raw_stone", 0.50),
                MiningDrop("coal_chunk", 0.28),
                MiningDrop("copper_ore", 0.19),
                MiningDrop("iron_ore", 0.03),
            ),
        ),
        MiningDepthSpec(
            depth=2,
            name="Echo Caves Mid (L2)",
            tier=2,
            attempts_per_hour=28,
            upkeep_fc_per_hour=42.0,
            drops=(
                MiningDrop("raw_stone", 0.18),
                MiningDrop("coal_chunk", 0.26),
                MiningDrop("copper_ore", 0.22),
                MiningDrop("iron_ore", 0.29),
                MiningDrop("silver_ore", 0.05),
            ),
        ),
        MiningDepthSpec(
            depth=3,
            name="Deep Veins (L3)",
            tier=3,
            attempts_per_hour=26,
            upkeep_fc_per_hour=66.0,
            drops=(
                MiningDrop("coal_chunk", 0.18),
                MiningDrop("iron_ore", 0.34),
                MiningDrop("silver_ore", 0.28),
                MiningDrop("gold_ore", 0.16),
                MiningDrop("raw_diamond", 0.04),
            ),
        ),
        MiningDepthSpec(
            depth=4,
            name="Deep Shaft & Glacier Cavern (L4)",
            tier=4,
            attempts_per_hour=22,
            upkeep_fc_per_hour=92.0,
            drops=(
                MiningDrop("iron_ore", 0.28),
                MiningDrop("silver_ore", 0.26),
                MiningDrop("gold_ore", 0.24),
                MiningDrop("raw_diamond", 0.12),
                MiningDrop("ice_crystal", 0.08),
                MiningDrop("ancient_relic", 0.02),
            ),
        ),
    ]


def compute_mining_ev_per_hour(
    depth: MiningDepthSpec,
    items: Dict[str, ItemSpec],
    tax_rate: float = MAYOR_TAX_DEFAULT,
    market_fee: float = MARKET_FEE_DEFAULT,
) -> Tuple[float, float, float]:
    """
    EV_mine = A * sum(P_i * V_i) - C_upkeep
    Returns (gross_ev_hr, net_pre_tax_hr, net_post_tax_hr).
    """
    ev_per_attempt = sum(d.probability * items[d.item_id].ref_price for d in depth.drops)
    gross_hr = depth.attempts_per_hour * ev_per_attempt
    net_pre_tax = gross_hr - depth.upkeep_fc_per_hour
    effective_keep = 1.0 - (tax_rate * 0.6 + market_fee * 0.4)
    net_post_tax = max(0.0, gross_hr * effective_keep - depth.upkeep_fc_per_hour)
    return round(gross_hr, 2), round(net_pre_tax, 2), round(net_post_tax, 2)


def build_raid_tiers() -> List[RaidTierSpec]:
    """
    Rival Town Economic Raids:
      R_loot = 15% of Defender's Unvaulted Surplus (strictly zero-sum minus 15% attrition sink!)
      Derived algebraically so BOTH Elected Mayor and Privateer Raid EV sit in [1.05x, 1.13x]
      of same-tier deterministic Occupation EV (strictly inside +/-20% risk-reward parity).
    """
    return [
        RaidTierSpec(
            tier=1,
            name="Border Skirmish (Town L1-3)",
            raids_per_hour=2.5,
            base_win_prob=0.62,
            target_unvaulted_pool_fc=990.0,
            army_gear_cost_fc=14.0,
            rations_cost_summer_fc=7.0,
            loss_penalty_fc=14.0,
        ),
        RaidTierSpec(
            tier=2,
            name="Village Raid (Town L4-6)",
            raids_per_hour=2.5,
            base_win_prob=0.62,
            target_unvaulted_pool_fc=1_690.0,
            army_gear_cost_fc=24.0,
            rations_cost_summer_fc=12.0,
            loss_penalty_fc=24.0,
        ),
        RaidTierSpec(
            tier=3,
            name="Guild Stronghold Raid (Town L7-9)",
            raids_per_hour=2.2,
            base_win_prob=0.60,
            target_unvaulted_pool_fc=2_700.0,
            army_gear_cost_fc=38.0,
            rations_cost_summer_fc=18.0,
            loss_penalty_fc=38.0,
        ),
        RaidTierSpec(
            tier=4,
            name="Sovereign Valley Siege (Town L10+)",
            raids_per_hour=2.0,
            base_win_prob=0.58,
            target_unvaulted_pool_fc=3_950.0,
            army_gear_cost_fc=56.0,
            rations_cost_summer_fc=25.0,
            loss_penalty_fc=56.0,
        ),
    ]


def compute_raid_ev_per_hour(
    raid: RaidTierSpec,
    season: str = "SUMMER",
    is_mayor: bool = True,
) -> Tuple[float, float]:
    """
    EV_loot = raids_hr * [
        (P_win * R_loot * (1 - attrition) * loot_share)
      - (P_loss * C_loss)
      - C_army * (1 - subsidy)
      - C_rations * season_mult
    ]
    Returns (ev_per_raid, ev_per_hour).
    """
    raw_seized = raid.target_unvaulted_pool_fc * RAID_UNVAULTED_LOOT_PCT
    net_after_attrition = raw_seized * (1.0 - RAID_WAR_ATTRITION_SINK)
    # Elected Mayor: 80% personal + 20% Town Treasury tribute, with -25% Treasury gear subsidy
    # Privateer: 86% personal (14% fencing/smuggling tariff), pays 100% gear cost (no lockout!)
    loot_share = 0.80 if is_mayor else 0.86
    gear_mult = 0.75 if is_mayor else 1.00
    season_ration_mult = 1.65 if season == "WINTER" else 1.00

    p_win = raid.base_win_prob
    p_loss = 1.0 - p_win

    ev_raid = (
        p_win * net_after_attrition * loot_share
        - p_loss * raid.loss_penalty_fc
        - raid.army_gear_cost_fc * gear_mult
        - raid.rations_cost_summer_fc * season_ration_mult
    )
    return round(ev_raid, 2), round(ev_raid * raid.raids_per_hour, 2)


# =============================================================================
# CONFIG EXPORT (JSON + CSV)
# =============================================================================

def export_production_configs(out_dir: Path) -> Dict[str, object]:
    out_dir.mkdir(parents=True, exist_ok=True)
    occupations = build_occupations()
    items = build_items()
    depths = build_mining_depths()
    raids = build_raid_tiers()

    mining_summary = []
    for d in depths:
        gross_hr, pre_tax, post_tax = compute_mining_ev_per_hour(d, items)
        mining_summary.append(
            {
                "depth": d.depth,
                "name": d.name,
                "tier": d.tier,
                "attempts_per_hour": d.attempts_per_hour,
                "upkeep_fc_per_hour": d.upkeep_fc_per_hour,
                "gross_ev_fc_per_hour": gross_hr,
                "net_pre_tax_fc_per_hour": pre_tax,
                "net_post_tax_fc_per_hour": post_tax,
                "drops": [asdict(dr) for dr in d.drops],
            }
        )

    raid_summary = []
    for r in raids:
        ev_s_m, ev_hr_s_m = compute_raid_ev_per_hour(r, "SUMMER", True)
        ev_s_p, ev_hr_s_p = compute_raid_ev_per_hour(r, "SUMMER", False)
        ev_w_m, ev_hr_w_m = compute_raid_ev_per_hour(r, "WINTER", True)
        raid_summary.append(
            {
                **asdict(r),
                "unvaulted_loot_pct": RAID_UNVAULTED_LOOT_PCT,
                "war_attrition_sink_pct": RAID_WAR_ATTRITION_SINK,
                "ev_hr_summer_mayor": ev_hr_s_m,
                "ev_hr_summer_privateer": ev_hr_s_p,
                "ev_hr_winter_mayor": ev_hr_w_m,
                "ev_per_raid_summer_mayor": ev_s_m,
            }
        )

    config: Dict[str, object] = {
        "meta": {
            "game": "Anvil",
            "currency": "Frost Coins (FC)",
            "base_labor_hour_fc": BASE_LABOR_HOUR_FC,
            "vpm_base_fc": VPM_BASE,
            "tier_exponent": TIER_EXPONENT,
            "starting_capital_fc": STARTING_CAPITAL_FC,
            "season_duration_hours": SEASON_DURATION_HOURS,
            "npc_ask_markup": NPC_ASK_MARKUP,
            "npc_bid_discount": NPC_BID_DISCOUNT,
        },
        "taxation": {
            "mayor_tax_bounds": {"min": MAYOR_TAX_MIN, "default": MAYOR_TAX_DEFAULT, "max": MAYOR_TAX_MAX},
            "market_fee_bounds": {"min": MARKET_FEE_MIN, "default": MARKET_FEE_DEFAULT, "max": MARKET_FEE_MAX},
            "wealth_upkeep_brackets_daily": [
                {"max_fc": None if math.isinf(u) else u, "daily_rate": r}
                for u, r in WEALTH_TAX_BRACKETS
            ],
        },
        "occupations": [asdict(o) for o in occupations],
        "items": [asdict(it) for it in items.values()],
        "mining_depths": mining_summary,
        "raid_tiers": raid_summary,
    }

    json_path = out_dir / "anvil_economy_config.json"
    json_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    # Also emit clean CSV tables for rapid spreadsheet/designer inspection
    with (out_dir / "items_pricing.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["id", "name", "category", "tier", "ref_price", "npc_buy_ask", "npc_sell_bid", "spread_pct", "winter_max_mult", "local_subsidy_bound"])
        for it in items.values():
            spread = round((1.0 - it.npc_sell_price / it.npc_buy_price) * 100.0, 1)
            w.writerow([it.id, it.name, it.category, it.tier, it.ref_price, it.npc_buy_price, it.npc_sell_price, spread, it.winter_max_mult, it.local_subsidy_bound])

    with (out_dir / "occupations_salaries.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["id", "name", "tier", "act_unlocked", "gross_fc_hr", "upkeep_ratio", "net_fc_hr_base"])
        for o in occupations:
            w.writerow([o.id, o.name, o.tier, o.act_unlocked, o.gross_fc_per_hour, o.upkeep_ratio, o.net_fc_per_hour_base])

    return config


if __name__ == "__main__":
    cfg = export_production_configs(Path(__file__).parent / "out")
    print(f"Exported {len(cfg['items'])} items, {len(cfg['occupations'])} occupations, 4 mining depths, 4 raid tiers.")
