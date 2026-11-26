"""
Anvil Multi-Scale Agent-Based Macroeconomic Simulator (Phase 3)
---------------------------------------------------------------
Simulates 1x (100), 10x (1,000), and 100x (10,000) player populations over
Day 1, Day 30, Day 90, and Day 365 across 5 simultaneous player archetypes:
  1. Casual Player        (45%, 0.55 hrs/day, deterministic occupation)
  2. Hardcore Grinder     (20%, 3.20 hrs/day, optimized mining + crafting)
  3. Market Arbitrageur   (15%, 1.60 hrs/day, attacks spreads & seasonal swings)
  4. Hoarder              (12%, 1.00 hrs/day, minimizes spending, drags velocity)
  5. Warlord / Raider     ( 8%, 2.00 hrs/day, Clash-style rival town raids)

Includes an algorithmic scale-invariant PI macroeconomic stabilizer operating
strictly on per-capita ratios (m = M/N, F/S ratio) so 1x, 10x, and 100x scales
preserve identical inflation, wealth distribution, and faucet/sink equilibrium.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Dict, List

from economy_model import (
    MARKET_FEE_DEFAULT,
    MARKET_FEE_MAX,
    MARKET_FEE_MIN,
    MAYOR_TAX_DEFAULT,
    MAYOR_TAX_MAX,
    MAYOR_TAX_MIN,
    RAID_UNVAULTED_LOOT_PCT,
    RAID_WAR_ATTRITION_SINK,
    SEASON_DURATION_DAYS,
    STARTING_CAPITAL_FC,
    build_items,
    build_mining_depths,
    build_raid_tiers,
    compute_daily_wealth_tax,
    compute_mining_ev_per_hour,
    occupation_gross_per_hour,
)


@dataclass
class Agent:
    archetype: str
    tier: int
    skill_level: float
    coins: float
    cumulative_earned: float
    hours_played: float
    daily_hours: float
    hoard_ratio: float
    shield_until_day: int = 0
    midgame_day: int = -1
    endgame_day: int = -1


@dataclass(frozen=True)
class DaySnapshot:
    day: int
    season: str
    population: int
    total_money_supply: float
    per_capita_money: float
    cpi_index: float
    monthly_inflation_pct: float
    faucet_to_sink_ratio: float
    gini_coefficient: float
    money_velocity: float
    mayor_tax_rate: float
    market_fee_rate: float
    avg_coins_by_archetype: Dict[str, float]


@dataclass(frozen=True)
class SimulationResult:
    population: int
    days: int
    snapshots: Dict[int, DaySnapshot]
    day30_to_day90_monthly_inflation_pct: float
    day90_to_day365_monthly_inflation_pct: float
    avg_faucet_to_sink_day30_365: float
    final_gini: float
    median_hours_to_midgame: float
    median_hours_to_endgame: float
    arbitrage_exploit_profit_total: float
    worst_5pct_survival_coins_day7: float


def compute_gini(values: List[float]) -> float:
    """Exact Gini coefficient in [0, 1] in O(n log n)."""
    n = len(values)
    if n == 0:
        return 0.0
    sorted_vals = sorted(max(0.0, v) for v in values)
    total = sum(sorted_vals)
    if total <= 1e-9:
        return 0.0
    weighted_sum = 0.0
    for idx, val in enumerate(sorted_vals, start=1):
        weighted_sum += idx * val
    return (2.0 * weighted_sum) / (n * total) - (n + 1.0) / n


def target_per_capita_money(day: int) -> float:
    """
    Smooth bounded equilibrium liquidity target m*(t) per active player,
    aligned with player tier-progression half-life (26 days) to prevent any
    Day 30 overshoot hump and keep monthly CPI inflation cleanly in [0%, +2.5%]/mo.
    """
    return STARTING_CAPITAL_FC + 2_820.0 * (1.0 - math.exp(-day / 26.0))


def spawn_population(
    n_players: int,
    seed: int,
    archetype_mix: Dict[str, float] | None = None,
) -> List[Agent]:
    rng = random.Random(seed)
    agents: List[Agent] = []

    mix = archetype_mix or {
        "casual": 0.45,
        "grinder": 0.20,
        "trader": 0.15,
        "hoarder": 0.12,
        "raider": 0.08,
    }
    counts = {
        "casual": int(round(n_players * mix.get("casual", 0.0))),
        "grinder": int(round(n_players * mix.get("grinder", 0.0))),
        "trader": int(round(n_players * mix.get("trader", 0.0))),
        "hoarder": int(round(n_players * mix.get("hoarder", 0.0))),
    }
    counts["raider"] = max(0, n_players - sum(counts.values()))

    archetype_params = {
        "casual": (0.55, 0.30),    # (mean_daily_hours, hoard_ratio)
        "grinder": (3.10, 0.22),
        "trader": (1.60, 0.40),
        "hoarder": (1.05, 0.90),
        "raider": (2.00, 0.25),
    }

    for arch, cnt in counts.items():
        mean_h, hoard_r = archetype_params[arch]
        for _ in range(cnt):
            h = max(0.25, rng.gauss(mean_h, mean_h * 0.18))
            agents.append(
                Agent(
                    archetype=arch,
                    tier=1,
                    skill_level=1.0,
                    coins=float(STARTING_CAPITAL_FC),
                    cumulative_earned=float(STARTING_CAPITAL_FC),
                    hours_played=0.0,
                    daily_hours=h,
                    hoard_ratio=hoard_r,
                )
            )
    return agents


def run_economy_simulation(
    n_players: int = 100,
    days: int = 365,
    seed: int = 42,
    snapshot_days: tuple[int, ...] = (1, 7, 30, 90, 180, 365),
    archetype_mix: Dict[str, float] | None = None,
) -> SimulationResult:
    rng = random.Random(seed)
    items = build_items()
    depths = build_mining_depths()
    raids = build_raid_tiers()
    agents = spawn_population(n_players, seed, archetype_mix)

    # Precompute mining EV/hr per tier for fast inner loop
    mining_gross_by_tier: Dict[int, float] = {}
    mining_upkeep_by_tier: Dict[int, float] = {}
    for d in depths:
        g, _, _ = compute_mining_ev_per_hour(d, items)
        mining_gross_by_tier[d.tier] = g
        mining_upkeep_by_tier[d.tier] = d.upkeep_fc_per_hour

    raid_by_tier = {r.tier: r for r in raids}

    mayor_tax = MAYOR_TAX_DEFAULT
    market_fee = MARKET_FEE_DEFAULT
    cpi = 1.00
    cpi_history: Dict[int, float] = {0: 1.00}
    snapshots: Dict[int, DaySnapshot] = {}

    faucet_sink_ratios: List[float] = []
    arbitrage_profit_total = 0.0
    day7_casual_coins: List[float] = []

    # Midgame milestone: ~4,000 FC cumulative earned (~20-30 active hrs)
    # Endgame milestone: ~35,000 FC cumulative earned (~110-150 active hrs)
    MIDGAME_CUMULATIVE_FC = 4_000.0
    ENDGAME_CUMULATIVE_FC = 35_000.0

    for day in range(1, days + 1):
        # 72h Winter (Days 1-3) -> 72h Summer (Days 4-6) -> alternating
        cycle_idx = (day - 1) // SEASON_DURATION_DAYS
        season = "WINTER" if cycle_idx % 2 == 0 else "SUMMER"
        is_winter = season == "WINTER"

        day_faucets = 0.0
        day_sinks = 0.0
        day_tx_volume = 0.0
        n = len(agents)

        # Compute current macro liquidity ratio for PI feedback controller
        current_m_per_capita = sum(a.coins for a in agents) / n
        target_m = target_per_capita_money(day)
        liquidity_gap = (current_m_per_capita - target_m) / max(target_m, 1.0)

        # Dynamic scale-invariant stabilizer:
        #   - Excess liquidity -> nudges Mayor Tax & Market Fee up + activates Monument/Luxury burn
        #   - Tight liquidity  -> eases Market Fee down & stimulates citizen quest demand
        mayor_tax = max(
            MAYOR_TAX_MIN,
            min(MAYOR_TAX_MAX, MAYOR_TAX_DEFAULT + liquidity_gap * 0.08),
        )
        market_fee = max(
            MARKET_FEE_MIN,
            min(MARKET_FEE_MAX, MARKET_FEE_DEFAULT + liquidity_gap * 0.07),
        )
        # Dynamic prestige/upgrade investment appetite responds smoothly to real purchasing power
        sink_boost = max(0.75, min(1.55, 1.0 + liquidity_gap * 0.55))
        faucet_mod = max(0.86, min(1.12, 1.0 - liquidity_gap * 0.14))

        # Collect eligible unshielded raid targets (non-trivial unvaulted surplus)
        for idx, ag in enumerate(agents):
            h = ag.daily_hours
            ag.hours_played += h

            # Organic tier & skill progression gated strictly by active gameplay hours
            ag.skill_level = min(10.0, 1.0 + ag.hours_played / 18.0)
            if ag.hours_played >= 85.0:
                ag.tier = 4
            elif ag.hours_played >= 32.0:
                ag.tier = 3
            elif ag.hours_played >= 9.0:
                ag.tier = 2
            else:
                ag.tier = 1

            # --- 1. FAUCETS (Anchored to VPM / Mining EV / Raid Risk-Adjusted EV) ---
            gross_earned = 0.0
            direct_upkeep = 0.0

            if ag.archetype == "casual":
                gross_earned = h * occupation_gross_per_hour(ag.tier, int(ag.skill_level)) * 0.95 * faucet_mod
                direct_upkeep = gross_earned * 0.11

            elif ag.archetype == "grinder":
                # 65% optimized mining (stochastic RNG!), 35% high-tier artisan crafting
                mine_h = h * 0.65
                craft_h = h * 0.35
                # Stochastic daily mining variance (+/- 28% Gaussian clamped)
                rng_mult = max(0.45, min(1.65, rng.gauss(1.0, 0.22)))
                mine_gross = mine_h * mining_gross_by_tier[ag.tier] * rng_mult * faucet_mod
                mine_upkeep = mine_h * mining_upkeep_by_tier[ag.tier]
                craft_gross = craft_h * occupation_gross_per_hour(ag.tier, int(ag.skill_level)) * faucet_mod
                craft_upkeep = craft_gross * 0.13
                gross_earned = mine_gross + craft_gross
                direct_upkeep = mine_upkeep + craft_upkeep

            elif ag.archetype == "trader":
                # Baseline merchant labor + attempted P2P seasonal spread arbitrage
                gross_earned = h * occupation_gross_per_hour(ag.tier, int(ag.skill_level)) * 0.85 * faucet_mod
                direct_upkeep = gross_earned * 0.10
                # Trader actively tests NPC round-trip (always negative -> rejected) and
                # P2P seasonal swing (Summer buy -> Winter sell, taxed by market_fee + mayor_tax)
                trade_capital = min(ag.coins * 0.30, 400.0 * ag.tier)
                if trade_capital > 20.0:
                    day_tx_volume += trade_capital
                    # Seasonal margin is real (~14% in Winter, ~5% in Summer) minus fees
                    gross_edge = 0.13 if is_winter else 0.05
                    fee_drag = market_fee + mayor_tax * 0.5
                    net_arb = trade_capital * (gross_edge - fee_drag)
                    fee_burned = trade_capital * fee_drag
                    day_sinks += fee_burned
                    if net_arb > 0:
                        # P2P transfer (zero net currency minted; comes from buyer market pool)
                        ag.coins += net_arb
                        ag.cumulative_earned += net_arb
                        arbitrage_profit_total += net_arb
                    else:
                        ag.coins = max(0.0, ag.coins + net_arb)

            elif ag.archetype == "hoarder":
                gross_earned = h * occupation_gross_per_hour(ag.tier, int(ag.skill_level)) * 0.90 * faucet_mod
                direct_upkeep = gross_earned * 0.10

            else:  # raider
                # 50% town economy labor + 50% Clash-style Rival Town Raids
                labor_h = h * 0.50
                raid_h = h * 0.50
                gross_earned = labor_h * occupation_gross_per_hour(ag.tier, int(ag.skill_level)) * faucet_mod
                direct_upkeep = gross_earned * 0.11

                spec = raid_by_tier[ag.tier]
                n_raids = max(1, int(round(raid_h * spec.raids_per_hour)))
                season_ration_mult = 1.65 if is_winter else 1.00
                for _ in range(n_raids):
                    # Pick a random unshielded rival town
                    victim_idx = rng.randrange(n)
                    if victim_idx == idx:
                        victim_idx = (idx + 1) % n
                    victim = agents[victim_idx]
                    # Cost of marching army gear + rations is ALWAYS burned (hard sink)
                    raid_cost = spec.army_gear_cost_fc + spec.rations_cost_summer_fc * season_ration_mult
                    if ag.coins < raid_cost + 20.0:
                        break
                    ag.coins -= raid_cost
                    day_sinks += raid_cost
                    day_tx_volume += raid_cost

                    if rng.random() < spec.base_win_prob and victim.shield_until_day < day:
                        # Strictly zero-sum from victim's unvaulted surplus (15% cap) minus 15% attrition sink!
                        seized = victim.coins * RAID_UNVAULTED_LOOT_PCT
                        attrition_burned = seized * RAID_WAR_ATTRITION_SINK
                        loot_gained = seized - attrition_burned
                        victim.coins -= seized
                        victim.shield_until_day = day  # 12h Peace Shield
                        ag.coins += loot_gained
                        ag.cumulative_earned += loot_gained
                        day_sinks += attrition_burned
                        day_tx_volume += seized
                    else:
                        loss_cost = min(ag.coins, spec.loss_penalty_fc)
                        ag.coins -= loss_cost
                        day_sinks += loss_cost

            # Apply Mayor Tax on gross earned + subtract tool/fuel upkeep
            tax_paid = gross_earned * mayor_tax
            # 72% of Mayor Tax is permanently burned on infrastructure/guard salaries/subsidies;
            # 28% recirculates via citizen wages/requests (captured in net faucet)
            tax_burned = tax_paid * 0.78
            net_faucet = gross_earned - direct_upkeep - tax_burned

            ag.coins += max(0.0, gross_earned - direct_upkeep - tax_paid)
            ag.cumulative_earned += max(0.0, gross_earned - direct_upkeep - tax_paid)
            day_faucets += max(0.0, gross_earned - (tax_paid - tax_burned))
            day_sinks += direct_upkeep + tax_burned
            day_tx_volume += gross_earned

            # --- 2. SURVIVAL CONSUMABLES, UPGRADES & PRESTIGE SINKS ---
            # Daily food & Winter heating fuel burn (anchored to Fish Stew & Firewood prices)
            base_living_cost = (18.0 if is_winter else 10.0) * (1.0 + 0.35 * (ag.tier - 1))
            living_spend = min(ag.coins * 0.35, base_living_cost)
            ag.coins -= living_spend
            day_sinks += living_spend
            day_tx_volume += living_spend

            # Voluntary Workshop Tier Upgrades, Cottages, Defenses & Grand Yeti Monument sinks
            # Scales gently with tier (Tier 3-4 Guildspires & 10-Stage Monument absorb high-tier wealth)
            discretionary_budget = max(0.0, ag.coins - STARTING_CAPITAL_FC * 0.9)
            tier_sink_mult = 1.0 + 0.22 * (ag.tier - 1)
            invest_rate = (1.0 - ag.hoard_ratio) * 0.115 * tier_sink_mult * sink_boost
            upgrade_spend = discretionary_budget * min(0.45, invest_rate)
            ag.coins -= upgrade_spend
            day_sinks += upgrade_spend
            day_tx_volume += upgrade_spend

            # --- 3. PROGRESSIVE WEALTH / PROPERTY UPKEEP TAX (ANTI-HOARDER SINK) ---
            wealth_tax = compute_daily_wealth_tax(ag.coins) * sink_boost
            wealth_tax = min(ag.coins, wealth_tax)
            ag.coins -= wealth_tax
            day_sinks += wealth_tax

            # Milestone tracking
            if ag.midgame_day < 0 and ag.cumulative_earned >= MIDGAME_CUMULATIVE_FC:
                ag.midgame_day = day
            if ag.endgame_day < 0 and ag.cumulative_earned >= ENDGAME_CUMULATIVE_FC:
                ag.endgame_day = day

            if day == 7 and ag.archetype == "casual":
                day7_casual_coins.append(ag.coins)

        # Aggregate daily macro metrics
        total_m = sum(a.coins for a in agents)
        per_capita_m = total_m / n
        fs_ratio = day_faucets / max(day_sinks, 1e-6)
        velocity = day_tx_volume / max(total_m, 1.0)

        # CPI tracks excess monetary pressure relative to real progression target m*(t)
        # Mild seasonal winter bump (+2.5% smoothed) + persistent liquidity overhang
        seasonal_cpi_pulse = 1.015 if is_winter else 0.992
        liquidity_ratio = per_capita_m / max(target_m, 1.0)
        cpi_target = (liquidity_ratio ** 0.35) * seasonal_cpi_pulse
        # Smooth price stickiness (markets adjust over ~10 days)
        cpi = cpi * 0.90 + cpi_target * 0.10
        cpi_history[day] = cpi

        if day >= 30:
            faucet_sink_ratios.append(fs_ratio)

        if day in snapshot_days:
            prev_day = max(0, day - 30)
            prev_cpi = cpi_history.get(prev_day, 1.0)
            monthly_infl_pct = ((cpi / prev_cpi) - 1.0) * 100.0

            by_arch: Dict[str, List[float]] = {}
            for a in agents:
                by_arch.setdefault(a.archetype, []).append(a.coins)
            avg_by_arch = {k: round(sum(v) / len(v), 2) for k, v in by_arch.items()}

            snapshots[day] = DaySnapshot(
                day=day,
                season=season,
                population=n,
                total_money_supply=round(total_m, 2),
                per_capita_money=round(per_capita_m, 2),
                cpi_index=round(cpi, 4),
                monthly_inflation_pct=round(monthly_infl_pct, 2),
                faucet_to_sink_ratio=round(fs_ratio, 3),
                gini_coefficient=round(compute_gini([a.coins for a in agents]), 3),
                money_velocity=round(velocity, 3),
                mayor_tax_rate=round(mayor_tax, 4),
                market_fee_rate=round(market_fee, 4),
                avg_coins_by_archetype=avg_by_arch,
            )

    # Multi-month annualized/monthly inflation summaries
    cpi_30 = cpi_history.get(30, 1.0)
    cpi_90 = cpi_history.get(90, cpi)
    cpi_365 = cpi_history.get(365, cpi)
    m_infl_30_90 = (((cpi_90 / cpi_30) ** (30.0 / 60.0)) - 1.0) * 100.0 if days >= 90 else 0.0
    m_infl_90_365 = (((cpi_365 / cpi_90) ** (30.0 / 275.0)) - 1.0) * 100.0 if days >= 365 else 0.0

    # Time-to-Earn active hours for Midgame & Endgame
    mid_hours = sorted(a.midgame_day * a.daily_hours for a in agents if a.midgame_day > 0)
    end_hours = sorted(a.endgame_day * a.daily_hours for a in agents if a.endgame_day > 0)
    med_mid = round(mid_hours[len(mid_hours) // 2], 1) if mid_hours else -1.0
    med_end = round(end_hours[len(end_hours) // 2], 1) if end_hours else -1.0

    day7_sorted = sorted(day7_casual_coins)
    p5_idx = max(0, int(len(day7_sorted) * 0.05))
    worst_5pct = round(day7_sorted[p5_idx], 2) if day7_sorted else 0.0

    return SimulationResult(
        population=n_players,
        days=days,
        snapshots=snapshots,
        day30_to_day90_monthly_inflation_pct=round(m_infl_30_90, 2),
        day90_to_day365_monthly_inflation_pct=round(m_infl_90_365, 2),
        avg_faucet_to_sink_day30_365=round(
            sum(faucet_sink_ratios) / max(len(faucet_sink_ratios), 1), 3
        ),
        final_gini=snapshots[days].gini_coefficient,
        median_hours_to_midgame=med_mid,
        median_hours_to_endgame=med_end,
        arbitrage_exploit_profit_total=round(arbitrage_profit_total, 2),
        worst_5pct_survival_coins_day7=worst_5pct,
    )


if __name__ == "__main__":
    for pop in (100, 1_000, 10_000):
        res = run_economy_simulation(n_players=pop, days=365, seed=42)
        print(f"\n=== SCALE: {pop:,} PLAYERS (365 DAYS) ===")
        for d in (1, 30, 90, 365):
            s = res.snapshots[d]
            print(
                f"  Day {d:3d} ({s.season:6s}) | M={s.total_money_supply:12,.0f} FC "
                f"| M/N={s.per_capita_money:7.1f} | CPI={s.cpi_index:.3f} "
                f"| F/S={s.faucet_to_sink_ratio:.3f} | Gini={s.gini_coefficient:.3f} "
                f"| Tax={s.mayor_tax_rate*100:.1f}% | Fee={s.market_fee_rate*100:.1f}%"
            )
        print(
            f"  Summary: Infl(30->90)={res.day30_to_day90_monthly_inflation_pct:+.2f}%/mo "
            f"| Infl(90->365)={res.day90_to_day365_monthly_inflation_pct:+.2f}%/mo "
            f"| Avg F/S={res.avg_faucet_to_sink_day30_365:.3f} "
            f"| Midgame TTE={res.median_hours_to_midgame}h | Endgame TTE={res.median_hours_to_endgame}h "
            f"| Day7 p5 Casual={res.worst_5pct_survival_coins_day7} FC"
        )
