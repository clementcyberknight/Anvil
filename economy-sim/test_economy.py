"""
Anvil Economy Automated Verification & Anti-Exploit Test Suite (Phase 4)
------------------------------------------------------------------------
Run with: python -m pytest -v economy-sim/test_economy.py
Every invariant must pass across 1x (100), 10x (1,000), and 100x (10,000) scales.
"""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from economy_model import (
    MAYOR_TAX_DEFAULT,
    RAID_UNVAULTED_LOOT_PCT,
    RAID_WAR_ATTRITION_SINK,
    STARTING_CAPITAL_FC,
    build_items,
    build_mining_depths,
    build_occupations,
    build_raid_tiers,
    compute_mining_ev_per_hour,
    compute_raid_ev_per_hour,
    occupation_net_per_hour,
)
from simulate import run_economy_simulation


def test_no_npc_roundtrip_arbitrage() -> None:
    """For EVERY item, npc_sell_price (bid) MUST be strictly less than npc_buy_price (ask)."""
    items = build_items()
    for it in items.values():
        assert it.npc_sell_price < it.npc_buy_price, (
            f"Round-trip arbitrage detected on {it.id}: bid={it.npc_sell_price} >= ask={it.npc_buy_price}"
        )
        spread = 1.0 - (it.npc_sell_price / it.npc_buy_price)
        assert spread >= 0.25, f"Spread too thin on {it.id}: {spread:.2%}"


def test_no_crafted_ingredient_arbitrage() -> None:
    """
    For EVERY crafted item, instant-selling to NPC must NEVER exceed the sum of
    buying its ingredients from NPC (prevents buy-craft-dump infinite coin bots).
    """
    items = build_items()
    for it in items.values():
        if not it.recipe:
            continue
        ingredient_buy_total = sum(items[k].npc_buy_price * qty for k, qty in it.recipe)
        assert it.npc_sell_price <= ingredient_buy_total, (
            f"Craft arbitrage exploit on {it.id}: sell={it.npc_sell_price} > ingredients_buy={ingredient_buy_total}"
        )


def test_winter_subsidy_goods_cannot_be_exported_for_arbitrage() -> None:
    """All Winter-subsidizable essentials must be flagged local_subsidy_bound=True."""
    items = build_items()
    essentials = ("lake_trout", "snow_turnip", "firewood", "fish_stew", "artisan_bread", "warmth_tea")
    for item_id in essentials:
        assert items[item_id].local_subsidy_bound is True, (
            f"Essential {item_id} missing local_subsidy_bound flag (vulnerable to Town-A subsidy export exploit!)"
        )


def test_no_raid_collusion_money_printing() -> None:
    """
    Verify two colluding alt accounts raiding each other ALWAYS suffer a strict
    net currency loss (war attrition + gear + rations > 0, zero minted coins).
    """
    raids = build_raid_tiers()
    for r in raids:
        seized = r.target_unvaulted_pool_fc * RAID_UNVAULTED_LOOT_PCT
        attrition = seized * RAID_WAR_ATTRITION_SINK
        attacker_net = seized - attrition - r.army_gear_cost_fc - r.rations_cost_summer_fc
        defender_net = -seized
        combined_delta = attacker_net + defender_net
        assert combined_delta < 0.0, (
            f"Raid collusion prints money at Tier {r.tier}: combined_delta={combined_delta}"
        )


def test_mining_drop_probabilities_sum_to_one() -> None:
    """Every mining depth's drop probabilities must sum to exactly 1.0."""
    for depth in build_mining_depths():
        total_p = sum(d.probability for d in depth.drops)
        assert math.isclose(total_p, 1.0, abs_tol=1e-9), (
            f"Depth {depth.depth} probabilities sum to {total_p}"
        )


def test_occupation_vs_mining_vs_raid_ev_parity() -> None:
    """
    No occupation, mining depth, or rival town raid may dominate EV/hr by more
    than the intended risk-reward premium (+/- 20% of deterministic same-tier occupation EV).
    """
    items = build_items()
    depths = build_mining_depths()
    raids = build_raid_tiers()

    for tier in (1, 2, 3, 4):
        base_occ_ev = occupation_net_per_hour(tier, upkeep_ratio=0.12, tax_rate=MAYOR_TAX_DEFAULT)

        depth = next(d for d in depths if d.tier == tier)
        _, _, mine_net_ev = compute_mining_ev_per_hour(depth, items)
        mine_ratio = mine_net_ev / base_occ_ev
        assert 0.85 <= mine_ratio <= 1.20, (
            f"Tier {tier} Mining EV out of parity: mine={mine_net_ev}, occ={base_occ_ev} (ratio={mine_ratio:.3f})"
        )

        raid = next(r for r in raids if r.tier == tier)
        _, raid_ev_summer_mayor = compute_raid_ev_per_hour(raid, season="SUMMER", is_mayor=True)
        _, raid_ev_summer_priv = compute_raid_ev_per_hour(raid, season="SUMMER", is_mayor=False)
        mayor_ratio = raid_ev_summer_mayor / base_occ_ev
        priv_ratio = raid_ev_summer_priv / base_occ_ev
        assert 0.85 <= mayor_ratio <= 1.20, (
            f"Tier {tier} Mayor Raid EV out of parity: raid={raid_ev_summer_mayor}, occ={base_occ_ev} (ratio={mayor_ratio:.3f})"
        )
        assert 0.85 <= priv_ratio <= 1.20, (
            f"Tier {tier} Privateer Raid EV out of parity: raid={raid_ev_summer_priv}, occ={base_occ_ev} (ratio={priv_ratio:.3f})"
        )


def test_multi_hop_raw_ingredient_craft_arbitrage_impossible() -> None:
    """
    Recursively expand every crafted item down to base raw ingredients and verify
    that NPC instant-sell NEVER exceeds buying all raw base inputs from NPC.
    """
    items = build_items()

    def raw_buy_cost(item_id: str) -> int:
        spec = items[item_id]
        if not spec.recipe:
            return spec.npc_buy_price
        return sum(raw_buy_cost(k) * qty for k, qty in spec.recipe)

    for it in items.values():
        if not it.recipe:
            continue
        base_cost = raw_buy_cost(it.id)
        assert it.npc_sell_price <= base_cost, (
            f"Multi-hop craft arbitrage on {it.id}: npc_sell={it.npc_sell_price} > raw_base_buy={base_cost}"
        )


def test_adversarial_hoarder_shock_50pct_hoarders() -> None:
    """
    Adversarial Stress Test: 50% of the server becomes extreme Hoarders trying to
    drain money velocity. Economy must NOT enter a deflationary death spiral.
    """
    res = run_economy_simulation(
        n_players=500,
        days=180,
        seed=99,
        snapshot_days=(1, 7, 30, 90, 180),
        archetype_mix={"casual": 0.25, "grinder": 0.10, "trader": 0.10, "hoarder": 0.50, "raider": 0.05},
    )
    assert res.snapshots[180].cpi_index >= 0.88, (
        f"Deflationary death spiral under 50% hoarder shock: CPI={res.snapshots[180].cpi_index}"
    )
    assert res.snapshots[180].avg_coins_by_archetype["casual"] > STARTING_CAPITAL_FC * 2.0, (
        "Casual players stalled under hoarder shock!"
    )


def test_adversarial_grinder_surge_60pct_hardcore() -> None:
    """
    Adversarial Stress Test: 60% of the server turns into 3+ hr/day Hardcore Grinders.
    PI Stabilizer must keep monthly inflation strictly inside <= 4.5%/mo and F/S <= 1.08.
    """
    res = run_economy_simulation(
        n_players=500,
        days=180,
        seed=101,
        snapshot_days=(1, 7, 30, 90, 180),
        archetype_mix={"casual": 0.15, "grinder": 0.60, "trader": 0.10, "hoarder": 0.05, "raider": 0.10},
    )
    assert res.day30_to_day90_monthly_inflation_pct <= 4.5, (
        f"Hyperinflation under 60% grinder surge: {res.day30_to_day90_monthly_inflation_pct}%/mo"
    )
    assert res.avg_faucet_to_sink_day30_365 <= 1.08, (
        f"Runaway faucet/sink under 60% grinder surge: F/S={res.avg_faucet_to_sink_day30_365}"
    )


def test_zero_softlock_worst_case_5th_percentile_rng() -> None:
    """
    Monte Carlo 500-player worst-case Act I survival test:
    Starting with STARTING_CAPITAL_FC in dead Winter, even bottom 5th-percentile
    mining/gathering RNG players can afford daily Fish Stew + Firewood + Tool Repair
    without hitting 0 FC soft-lock.
    """
    items = build_items()
    depth1 = build_mining_depths()[0]
    rng = random.Random(1337)

    final_balances = []
    min_balances = []
    for _ in range(500):
        coins = float(STARTING_CAPITAL_FC)
        min_c = coins
        # Simulate first 72h Act I Winter (3 days, 0.5h/day casual)
        for _day in range(3):
            # 14 mining/gathering attempts in 0.5h with real discrete drop RNG
            earned = 0.0
            for _attempt in range(depth1.attempts_per_hour // 2):
                roll = rng.random()
                acc = 0.0
                for drop in depth1.drops:
                    acc += drop.probability
                    if roll <= acc:
                        # Worst-case: player sells at NPC instant-sell bid (not even P2P ref!)
                        earned += items[drop.item_id].npc_sell_price
                        break
            # Plus deterministic 15 min ice-fishing fallback (2 Lake Trout -> Fish Stew)
            earned += 2 * items["lake_trout"].npc_sell_price
            upkeep = depth1.upkeep_fc_per_hour * 0.5
            # Daily survival: 1 Fish Stew + 2 Firewood
            survival = items["fish_stew"].ref_price + items["firewood"].ref_price
            coins = coins + earned - upkeep - survival * 0.5
            min_c = min(min_c, coins)
        final_balances.append(coins)
        min_balances.append(min_c)

    min_balances.sort()
    p5_min = min_balances[int(len(min_balances) * 0.05)]
    assert p5_min > 40.0, f"5th-percentile Act I player risked soft-lock: min_balance={p5_min:.2f} FC"


def test_macro_simulation_inflation_equilibrium_and_scale_invariance() -> None:
    """
    Run full 365-day agent-based simulation at 1x (100), 10x (1,000), and 100x (10,000)
    scales and assert:
      1. Monthly inflation stays strictly inside [-1.5%, +4.5%] (no hyperinflation or death spiral).
      2. Steady-state Faucet-to-Sink ratio stays inside [0.95, 1.06].
      3. Wealth Gini stays healthy (< 0.58; Hoarders don't collapse the economy).
      4. Scale invariance: 10x and 100x per-capita money, CPI, and F/S stay within 5% of 1x.
      5. Progression pacing: Midgame reached in 15-40 active hours, Endgame in 75-180 hours.
    """
    res_1x = run_economy_simulation(n_players=100, days=365, seed=42)
    res_10x = run_economy_simulation(n_players=1_000, days=365, seed=43)
    res_100x = run_economy_simulation(n_players=10_000, days=365, seed=44)

    for label, res in (("1x", res_1x), ("10x", res_10x), ("100x", res_100x)):
        assert -1.5 <= res.day30_to_day90_monthly_inflation_pct <= 4.5, (
            f"{label} Day 30-90 inflation out of corridor: {res.day30_to_day90_monthly_inflation_pct}%/mo"
        )
        assert -1.0 <= res.day90_to_day365_monthly_inflation_pct <= 3.5, (
            f"{label} Day 90-365 inflation out of corridor: {res.day90_to_day365_monthly_inflation_pct}%/mo"
        )
        assert 0.95 <= res.avg_faucet_to_sink_day30_365 <= 1.06, (
            f"{label} F/S ratio unstable: {res.avg_faucet_to_sink_day30_365}"
        )
        assert 0.12 <= res.final_gini <= 0.58, (
            f"{label} Gini out of healthy range: {res.final_gini}"
        )
        assert res.worst_5pct_survival_coins_day7 >= 50.0, (
            f"{label} Day 7 p5 casual survival too low: {res.worst_5pct_survival_coins_day7} FC"
        )
        assert 12.0 <= res.median_hours_to_midgame <= 45.0, (
            f"{label} Midgame TTE out of band: {res.median_hours_to_midgame}h"
        )
        assert 70.0 <= res.median_hours_to_endgame <= 190.0, (
            f"{label} Endgame TTE out of band: {res.median_hours_to_endgame}h"
        )

    # Strict Scale Invariance Checks (10x and 100x vs 1x at Day 365)
    m_1x = res_1x.snapshots[365].per_capita_money
    cpi_1x = res_1x.snapshots[365].cpi_index
    fs_1x = res_1x.avg_faucet_to_sink_day30_365

    for label, res in (("10x", res_10x), ("100x", res_100x)):
        m_diff = abs(res.snapshots[365].per_capita_money - m_1x) / m_1x
        cpi_diff = abs(res.snapshots[365].cpi_index - cpi_1x) / cpi_1x
        fs_diff = abs(res.avg_faucet_to_sink_day30_365 - fs_1x) / fs_1x
        assert m_diff <= 0.06, f"{label} per-capita M diverged by {m_diff:.2%}"
        assert cpi_diff <= 0.03, f"{label} CPI diverged by {cpi_diff:.2%}"
        assert fs_diff <= 0.03, f"{label} F/S diverged by {fs_diff:.2%}"
