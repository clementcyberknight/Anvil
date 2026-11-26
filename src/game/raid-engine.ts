import type { TownSpriteKey } from '@/game/town-atlas';
import {
  type ArmyUnitKey,
  getArmyUnitSpec,
  type OfficeHolder,
  getRaidCommandRules,
  type WarbandSlot,
} from '@/game/town-governance';
import { VILLAGER_ROLE_ROW } from '@/game/villager-atlas';

export type TacticalOrderKey = 'rallyHorn' | 'fishStewDrop' | 'frostMistPotion';

export interface RivalBuildingTarget {
  readonly id: string;
  readonly spriteKey: TownSpriteKey;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly drawWidth: number;
  readonly maxHp: number;
  readonly hp: number;
  readonly isDefense: boolean;
  readonly isLootBuilding: boolean;
  readonly isTownHall: boolean;
  readonly attackRange: number;
  readonly attackDps: number;
  readonly lootCoins: number;
  readonly lootFish: number;
  readonly lootFirewood: number;
  readonly cooldownSec: number;
}

export interface RivalTownBlueprint {
  readonly id: string;
  readonly name: string;
  readonly tier: 1 | 2 | 3;
  readonly subtitle: string;
  readonly unvaultedPoolFc: number;
  readonly totalLootCoins: number;
  readonly totalLootFish: number;
  readonly totalLootFirewood: number;
  readonly defenderGuardCount: number;
  readonly buildings: readonly RivalBuildingTarget[];
}

export interface ActiveRaidUnit {
  readonly id: string;
  readonly side: 'ATTACKER' | 'DEFENDER';
  readonly unitKey: ArmyUnitKey | 'guard';
  readonly roleRow: number;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly dps: number;
  readonly moveSpeed: number;
  readonly attackRange: number;
  readonly targetPriority: 'DEFENSE' | 'LOOT' | 'ANY' | 'ALLY_HEAL';
  readonly facingDir: number;
  readonly walkPhase: number;
  readonly isMoving: boolean;
  readonly attackPulse: number;
}

export interface RaidProjectile {
  readonly id: string;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  readonly progress: number;
  readonly color: string;
}

export interface RaidBattleState {
  readonly town: RivalTownBlueprint;
  readonly officeHolder: OfficeHolder;
  readonly remainingSec: number;
  readonly buildings: readonly RivalBuildingTarget[];
  readonly units: readonly ActiveRaidUnit[];
  readonly projectiles: readonly RaidProjectile[];
  readonly deployReserve: readonly WarbandSlot[];
  readonly rallyRemainingSec: number;
  readonly mistRemainingSec: number;
  readonly ordersUsed: readonly TacticalOrderKey[];
  readonly seizedCoins: number;
  readonly seizedFish: number;
  readonly seizedFirewood: number;
  readonly destructionPct: number;
  readonly stars: 0 | 1 | 2 | 3;
  readonly finished: boolean;
  readonly nextUnitSeq: number;
}

export interface RaidOutcomeSummary {
  readonly townId: string;
  readonly townName: string;
  readonly won: boolean;
  readonly stars: 0 | 1 | 2 | 3;
  readonly destructionPct: number;
  readonly playerCoinsEarned: number;
  readonly treasuryTributeCoins: number;
  readonly fishEarned: number;
  readonly firewoodEarned: number;
  readonly authorityDelta: number;
}

export const RAID_ARENA_WIDTH = 900;
export const RAID_ARENA_HEIGHT = 1100;
export const RAID_DURATION_SEC = 60;
const RAID_ATTRITION_SINK = 0.15;

export const RIVAL_TOWNS: readonly RivalTownBlueprint[] = [
  {
    id: 'rival_ironcrag',
    name: 'Ironcrag Hold',
    tier: 1,
    subtitle: 'Border Lumber & Fish Outpost · 15% Unvaulted Loot',
    unvaultedPoolFc: 990,
    totalLootCoins: 148,
    totalLootFish: 4,
    totalLootFirewood: 5,
    defenderGuardCount: 2,
    buildings: [
      {
        id: 'ic_hall',
        spriteKey: 'townHall',
        label: 'Ironcrag Town Hall',
        x: 450,
        y: 430,
        drawWidth: 196,
        maxHp: 420,
        hp: 420,
        isDefense: false,
        isLootBuilding: true,
        isTownHall: true,
        attackRange: 0,
        attackDps: 0,
        lootCoins: 52,
        lootFish: 1,
        lootFirewood: 1,
        cooldownSec: 0,
      },
      {
        id: 'ic_tower_w',
        spriteKey: 'guardWatchtower',
        label: 'West Watchtower',
        x: 280,
        y: 520,
        drawWidth: 126,
        maxHp: 260,
        hp: 260,
        isDefense: true,
        isLootBuilding: false,
        isTownHall: false,
        attackRange: 230,
        attackDps: 24,
        lootCoins: 14,
        lootFish: 0,
        lootFirewood: 0,
        cooldownSec: 0,
      },
      {
        id: 'ic_tower_e',
        spriteKey: 'guardWatchtower',
        label: 'East Watchtower',
        x: 620,
        y: 520,
        drawWidth: 126,
        maxHp: 260,
        hp: 260,
        isDefense: true,
        isLootBuilding: false,
        isTownHall: false,
        attackRange: 230,
        attackDps: 24,
        lootCoins: 14,
        lootFish: 0,
        lootFirewood: 0,
        cooldownSec: 0,
      },
      {
        id: 'ic_trade',
        spriteKey: 'tradePost',
        label: 'Trade Post',
        x: 340,
        y: 660,
        drawWidth: 170,
        maxHp: 250,
        hp: 250,
        isDefense: false,
        isLootBuilding: true,
        isTownHall: false,
        attackRange: 0,
        attackDps: 0,
        lootCoins: 42,
        lootFish: 2,
        lootFirewood: 1,
        cooldownSec: 0,
      },
      {
        id: 'ic_sawmill',
        spriteKey: 'sawmill',
        label: 'Sawmill',
        x: 560,
        y: 660,
        drawWidth: 172,
        maxHp: 230,
        hp: 230,
        isDefense: false,
        isLootBuilding: true,
        isTownHall: false,
        attackRange: 0,
        attackDps: 0,
        lootCoins: 26,
        lootFish: 1,
        lootFirewood: 3,
        cooldownSec: 0,
      },
    ],
  },
  {
    id: 'rival_frostbite',
    name: 'Frostbite Crossing',
    tier: 2,
    subtitle: 'Fortified Market & Catapult Ridge · High Coin Loot',
    unvaultedPoolFc: 1690,
    totalLootCoins: 252,
    totalLootFish: 6,
    totalLootFirewood: 6,
    defenderGuardCount: 3,
    buildings: [
      {
        id: 'fb_hall',
        spriteKey: 'townHall',
        label: 'Frostbite Town Hall',
        x: 450,
        y: 410,
        drawWidth: 196,
        maxHp: 520,
        hp: 520,
        isDefense: false,
        isLootBuilding: true,
        isTownHall: true,
        attackRange: 0,
        attackDps: 0,
        lootCoins: 76,
        lootFish: 1,
        lootFirewood: 2,
        cooldownSec: 0,
      },
      {
        id: 'fb_bank',
        spriteKey: 'bank',
        label: 'Overflow Treasury',
        x: 300,
        y: 500,
        drawWidth: 174,
        maxHp: 340,
        hp: 340,
        isDefense: false,
        isLootBuilding: true,
        isTownHall: false,
        attackRange: 0,
        attackDps: 0,
        lootCoins: 84,
        lootFish: 0,
        lootFirewood: 0,
        cooldownSec: 0,
      },
      {
        id: 'fb_catapult',
        spriteKey: 'snowballCatapult',
        label: 'Snowball Catapult',
        x: 610,
        y: 480,
        drawWidth: 146,
        maxHp: 300,
        hp: 300,
        isDefense: true,
        isLootBuilding: false,
        isTownHall: false,
        attackRange: 270,
        attackDps: 32,
        lootCoins: 18,
        lootFish: 0,
        lootFirewood: 0,
        cooldownSec: 0,
      },
      {
        id: 'fb_tower_s',
        spriteKey: 'guardWatchtower',
        label: 'South Watchtower',
        x: 450,
        y: 620,
        drawWidth: 126,
        maxHp: 310,
        hp: 310,
        isDefense: true,
        isLootBuilding: false,
        isTownHall: false,
        attackRange: 240,
        attackDps: 28,
        lootCoins: 18,
        lootFish: 0,
        lootFirewood: 0,
        cooldownSec: 0,
      },
      {
        id: 'fb_smokehouse',
        spriteKey: 'smokehouse',
        label: 'Smokehouse',
        x: 290,
        y: 680,
        drawWidth: 164,
        maxHp: 260,
        hp: 260,
        isDefense: false,
        isLootBuilding: true,
        isTownHall: false,
        attackRange: 0,
        attackDps: 0,
        lootCoins: 28,
        lootFish: 4,
        lootFirewood: 2,
        cooldownSec: 0,
      },
      {
        id: 'fb_barracks',
        spriteKey: 'barracks',
        label: 'Watch Barracks',
        x: 615,
        y: 680,
        drawWidth: 170,
        maxHp: 300,
        hp: 300,
        isDefense: true,
        isLootBuilding: false,
        isTownHall: false,
        attackRange: 160,
        attackDps: 18,
        lootCoins: 28,
        lootFish: 1,
        lootFirewood: 2,
        cooldownSec: 0,
      },
    ],
  },
];

export function createRaidBattleState(
  town: RivalTownBlueprint,
  warband: readonly WarbandSlot[],
  officeHolder: OfficeHolder
): RaidBattleState {
  const defenderUnits: ActiveRaidUnit[] = [];

  for (let i = 0; i < town.defenderGuardCount; i += 1) {
    const angle = (i / Math.max(1, town.defenderGuardCount)) * Math.PI * 2;

    defenderUnits.push({
      id: `def_guard_${i}`,
      side: 'DEFENDER',
      unitKey: 'guard',
      roleRow: VILLAGER_ROLE_ROW.police,
      x: 450 + Math.cos(angle) * 115,
      y: 540 + Math.sin(angle) * 85,
      hp: 150 + town.tier * 35,
      maxHp: 150 + town.tier * 35,
      dps: 18 + town.tier * 4,
      moveSpeed: 64,
      attackRange: 34,
      targetPriority: 'ANY',
      facingDir: 0,
      walkPhase: i * 1.1,
      isMoving: false,
      attackPulse: 0,
    });
  }

  return {
    town,
    officeHolder,
    remainingSec: RAID_DURATION_SEC,
    buildings: town.buildings.map((b) => ({ ...b })),
    units: defenderUnits,
    projectiles: [],
    deployReserve: warband.map((s) => ({ ...s })),
    rallyRemainingSec: 0,
    mistRemainingSec: 0,
    ordersUsed: [],
    seizedCoins: 0,
    seizedFish: 0,
    seizedFirewood: 0,
    destructionPct: 0,
    stars: 0,
    finished: false,
    nextUnitSeq: 1,
  };
}

export function deployRaidUnit(
  state: RaidBattleState,
  unitKey: ArmyUnitKey,
  x: number,
  y: number
): RaidBattleState {
  if (state.finished) {
    return state;
  }

  const slot = state.deployReserve.find((s) => s.unitKey === unitKey);

  if (slot === undefined || slot.count <= 0) {
    return state;
  }

  const spec = getArmyUnitSpec(unitKey);

  const nextReserve: WarbandSlot[] = [];

  for (let i = 0; i < state.deployReserve.length; i += 1) {
    const item = state.deployReserve[i];

    nextReserve.push(
      item.unitKey === unitKey ? { unitKey, count: item.count - 1 } : item
    );
  }

  const clampedX = Math.max(70, Math.min(RAID_ARENA_WIDTH - 70, x));
  const clampedY = Math.max(120, Math.min(RAID_ARENA_HEIGHT - 120, y));

  const newUnit: ActiveRaidUnit = {
    id: `atk_${state.nextUnitSeq}`,
    side: 'ATTACKER',
    unitKey,
    roleRow: spec.roleRow,
    x: clampedX,
    y: clampedY,
    hp: spec.hp,
    maxHp: spec.hp,
    dps: spec.dps,
    moveSpeed: spec.moveSpeed,
    attackRange: spec.attackRange,
    targetPriority: spec.targetPriority,
    facingDir: clampedY > 550 ? 2 : 0,
    walkPhase: state.nextUnitSeq * 0.7,
    isMoving: true,
    attackPulse: 0,
  };

  return {
    ...state,
    deployReserve: nextReserve,
    units: [...state.units, newUnit],
    nextUnitSeq: state.nextUnitSeq + 1,
  };
}

export function triggerTacticalOrder(
  state: RaidBattleState,
  order: TacticalOrderKey
): RaidBattleState {
  if (state.finished || state.ordersUsed.includes(order)) {
    return state;
  }

  const nextOrders = [...state.ordersUsed, order];

  if (order === 'rallyHorn') {
    return {
      ...state,
      rallyRemainingSec: 8,
      ordersUsed: nextOrders,
    };
  }

  if (order === 'frostMistPotion') {
    return {
      ...state,
      mistRemainingSec: 5.5,
      ordersUsed: nextOrders,
    };
  }

  // Hot Fish Stew Drop: heals all living attackers by 38% max HP
  const healedUnits: ActiveRaidUnit[] = [];

  for (let i = 0; i < state.units.length; i += 1) {
    const u = state.units[i];

    if (u.side === 'ATTACKER' && u.hp > 0) {
      healedUnits.push({
        ...u,
        hp: Math.min(u.maxHp, u.hp + u.maxHp * 0.38),
      });
    } else {
      healedUnits.push(u);
    }
  }

  return {
    ...state,
    units: healedUnits,
    ordersUsed: nextOrders,
  };
}

function calcDir(dx: number, dy: number, fallback: number): number {
  if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) {
    return fallback;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 1 : 3;
  }

  return dy >= 0 ? 0 : 2;
}

export function stepRaidBattle(
  state: RaidBattleState,
  dtSec: number
): RaidBattleState {
  if (state.finished) {
    return state;
  }

  const nextRemaining = Math.max(0, state.remainingSec - dtSec);
  const nextRally = Math.max(0, state.rallyRemainingSec - dtSec);
  const nextMist = Math.max(0, state.mistRemainingSec - dtSec);

  const buildings = state.buildings.map((b) => ({ ...b }));
  const units = state.units.map((u) => ({ ...u }));
  const nextProjectiles: RaidProjectile[] = [];

  for (let i = 0; i < state.projectiles.length; i += 1) {
    const p = state.projectiles[i];
    const np = p.progress + dtSec * 3.4;

    if (np < 1) {
      nextProjectiles.push({ ...p, progress: np });
    }
  }

  let seizedCoins = state.seizedCoins;
  let seizedFish = state.seizedFish;
  let seizedFirewood = state.seizedFirewood;

  const hasMysticAlive = units.some(
    (u) => u.side === 'ATTACKER' && u.hp > 0 && u.unitKey === 'mystic'
  );

  const towerSlowMult = hasMysticAlive ? 0.7 : 1.0;
  const rallySpeedMult = nextRally > 0 ? 1.28 : 1.0;
  const rallyDpsMult = nextRally > 0 ? 1.3 : 1.0;

  // 1. Update every living unit
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i];

    if (u.hp <= 0) {
      continue;
    }

    if (u.side === 'ATTACKER') {
      // Healer prioritizes wounded allies
      if (u.targetPriority === 'ALLY_HEAL') {
        let woundedIdx = -1;
        let lowestRatio = 0.95;

        for (let j = 0; j < units.length; j += 1) {
          const ally = units[j];

          if (ally.side === 'ATTACKER' && ally.hp > 0 && j !== i) {
            const r = ally.hp / ally.maxHp;

            if (r < lowestRatio) {
              lowestRatio = r;
              woundedIdx = j;
            }
          }
        }

        if (woundedIdx >= 0) {
          const ally = units[woundedIdx];
          const dx = ally.x - u.x;
          const dy = ally.y - u.y;
          const dist = Math.hypot(dx, dy);

          if (dist <= u.attackRange) {
            ally.hp = Math.min(ally.maxHp, ally.hp + u.dps * dtSec);
            u.isMoving = false;
            u.facingDir = calcDir(dx, dy, u.facingDir);
            continue;
          }

          const step = u.moveSpeed * rallySpeedMult * dtSec;

          u.x += (dx / Math.max(dist, 1)) * step;
          u.y += (dy / Math.max(dist, 1)) * step;
          u.isMoving = true;
          u.walkPhase += step / 22;
          u.facingDir = calcDir(dx, dy, u.facingDir);
          continue;
        }
      }

      // Check nearby living defender guards first if within engagement distance
      let targetGuardIdx = -1;
      let bestGuardDist = 115;

      for (let g = 0; g < units.length; g += 1) {
        const enemy = units[g];

        if (enemy.side === 'DEFENDER' && enemy.hp > 0) {
          const d = Math.hypot(enemy.x - u.x, enemy.y - u.y);

          if (d < bestGuardDist) {
            bestGuardDist = d;
            targetGuardIdx = g;
          }
        }
      }

      if (targetGuardIdx >= 0 && u.targetPriority !== 'LOOT') {
        const guard = units[targetGuardIdx];
        const dx = guard.x - u.x;
        const dy = guard.y - u.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= u.attackRange) {
          guard.hp = Math.max(0, guard.hp - u.dps * rallyDpsMult * dtSec);
          u.isMoving = false;
          u.facingDir = calcDir(dx, dy, u.facingDir);
          continue;
        }

        const step = u.moveSpeed * rallySpeedMult * dtSec;

        u.x += (dx / Math.max(dist, 1)) * step;
        u.y += (dy / Math.max(dist, 1)) * step;
        u.isMoving = true;
        u.walkPhase += step / 22;
        u.facingDir = calcDir(dx, dy, u.facingDir);
        continue;
      }

      // Otherwise choose highest-priority standing building
      let targetBldIdx = -1;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let b = 0; b < buildings.length; b += 1) {
        const bld = buildings[b];

        if (bld.hp <= 0) {
          continue;
        }

        const d = Math.hypot(bld.x - u.x, bld.y - u.y);
        let penalty = 0;

        if (u.targetPriority === 'DEFENSE' && !bld.isDefense) {
          penalty = 600;
        } else if (u.targetPriority === 'LOOT' && !bld.isLootBuilding) {
          penalty = 650;
        }

        if (d + penalty < bestScore) {
          bestScore = d + penalty;
          targetBldIdx = b;
        }
      }

      if (targetBldIdx >= 0) {
        const bld = buildings[targetBldIdx];
        const dx = bld.x - u.x;
        const dy = bld.y - u.y;
        const dist = Math.hypot(dx, dy);
        const engageRadius = u.attackRange + bld.drawWidth * 0.28;

        if (dist <= engageRadius) {
          const defenseBonus =
            u.unitKey === 'ram' && bld.isDefense ? 1.8 : 1.0;

          const dmg = u.dps * rallyDpsMult * defenseBonus * dtSec;
          const prevHp = bld.hp;

          bld.hp = Math.max(0, bld.hp - dmg);
          u.isMoving = false;
          u.facingDir = calcDir(dx, dy, u.facingDir);
          u.attackPulse += dtSec;

          if (u.attackRange > 80 && u.attackPulse >= 0.7) {
            u.attackPulse = 0;
            nextProjectiles.push({
              id: `proj_u_${i}_${Math.round(nextRemaining * 100)}`,
              fromX: u.x,
              fromY: u.y - 26,
              toX: bld.x,
              toY: bld.y - 20,
              progress: 0,
              color: u.unitKey === 'mystic' ? '#A855F7' : '#38BDF8',
            });
          }

          if (prevHp > 0 && bld.hp <= 0) {
            seizedCoins += bld.lootCoins;
            seizedFish += bld.lootFish;
            seizedFirewood += bld.lootFirewood;
          }
        } else {
          const step = u.moveSpeed * rallySpeedMult * dtSec;

          u.x += (dx / Math.max(dist, 1)) * step;
          u.y += (dy / Math.max(dist, 1)) * step;
          u.isMoving = true;
          u.walkPhase += step / 22;
          u.facingDir = calcDir(dx, dy, u.facingDir);
        }
      }
    } else {
      // Defending Town Guard intercepts nearest visible attacker
      if (nextMist > 0) {
        u.isMoving = false;
        continue;
      }

      let targetAtkIdx = -1;
      let bestDist = Number.POSITIVE_INFINITY;

      for (let a = 0; a < units.length; a += 1) {
        const atk = units[a];

        if (atk.side === 'ATTACKER' && atk.hp > 0) {
          const d = Math.hypot(atk.x - u.x, atk.y - u.y);

          if (d < bestDist) {
            bestDist = d;
            targetAtkIdx = a;
          }
        }
      }

      if (targetAtkIdx >= 0) {
        const atk = units[targetAtkIdx];
        const dx = atk.x - u.x;
        const dy = atk.y - u.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= u.attackRange) {
          atk.hp = Math.max(0, atk.hp - u.dps * dtSec);
          u.isMoving = false;
          u.facingDir = calcDir(dx, dy, u.facingDir);
        } else {
          const step = u.moveSpeed * dtSec;

          u.x += (dx / Math.max(dist, 1)) * step;
          u.y += (dy / Math.max(dist, 1)) * step;
          u.isMoving = true;
          u.walkPhase += step / 22;
          u.facingDir = calcDir(dx, dy, u.facingDir);
        }
      }
    }
  }

  // 2. Defending Watchtowers & Snowball Catapults fire at visible attackers
  if (nextMist <= 0) {
    for (let b = 0; b < buildings.length; b += 1) {
      const bld = buildings[b];

      if (!bld.isDefense || bld.hp <= 0 || bld.attackDps <= 0) {
        continue;
      }

      bld.cooldownSec = Math.max(0, bld.cooldownSec - dtSec * towerSlowMult);

      let nearestAtk = -1;
      let bestDist = bld.attackRange;

      for (let a = 0; a < units.length; a += 1) {
        const atk = units[a];

        if (atk.side === 'ATTACKER' && atk.hp > 0) {
          const d = Math.hypot(atk.x - bld.x, atk.y - bld.y);

          if (d < bestDist) {
            bestDist = d;
            nearestAtk = a;
          }
        }
      }

      if (nearestAtk >= 0 && bld.cooldownSec <= 0) {
        const target = units[nearestAtk];

        target.hp = Math.max(0, target.hp - bld.attackDps * 0.85);
        bld.cooldownSec = 0.85;
        nextProjectiles.push({
          id: `proj_b_${b}_${Math.round(nextRemaining * 100)}`,
          fromX: bld.x,
          fromY: bld.y - 54,
          toX: target.x,
          toY: target.y - 24,
          progress: 0,
          color: bld.spriteKey === 'snowballCatapult' ? '#E0F2FE' : '#F59E0B',
        });
      }
    }
  }

  // 3. Calculate destruction %, stars, and finish condition
  let destroyedCount = 0;
  let townHallDown = false;

  for (let b = 0; b < buildings.length; b += 1) {
    if (buildings[b].hp <= 0) {
      destroyedCount += 1;

      if (buildings[b].isTownHall) {
        townHallDown = true;
      }
    }
  }

  const destructionPct = Math.round(
    (destroyedCount / Math.max(1, buildings.length)) * 100
  );

  let stars: 0 | 1 | 2 | 3 = 0;

  if (destructionPct >= 100) {
    stars = 3;
  } else if (townHallDown && destructionPct >= 40) {
    stars = 2;
  } else if (destructionPct >= 40 || townHallDown) {
    stars = 1;
  }

  let reserveRemaining = 0;

  for (let i = 0; i < state.deployReserve.length; i += 1) {
    reserveRemaining += state.deployReserve[i].count;
  }

  const attackersAlive = units.some((u) => u.side === 'ATTACKER' && u.hp > 0);
  const allCleared = destroyedCount === buildings.length;
  const outOfTroops = reserveRemaining === 0 && !attackersAlive;
  const finished = nextRemaining <= 0 || allCleared || outOfTroops;

  return {
    ...state,
    remainingSec: nextRemaining,
    buildings,
    units: units.filter((u) => u.hp > 0),
    projectiles: nextProjectiles,
    rallyRemainingSec: nextRally,
    mistRemainingSec: nextMist,
    seizedCoins,
    seizedFish,
    seizedFirewood,
    destructionPct,
    stars,
    finished,
  };
}

export function computeRaidOutcomeSummary(
  state: RaidBattleState
): RaidOutcomeSummary {
  const rules = getRaidCommandRules(state.officeHolder);

  const netAfterAttrition = Math.round(
    state.seizedCoins * (1 - RAID_ATTRITION_SINK)
  );

  const playerCoinsEarned = Math.round(
    (netAfterAttrition * rules.playerLootSharePct) / 100
  );

  const treasuryTributeCoins = Math.round(
    (netAfterAttrition * rules.treasuryTributePct) / 100
  );

  const won = state.stars >= 1;
  const authorityDelta = won ? state.stars * 18 : -10;

  return {
    townId: state.town.id,
    townName: state.town.name,
    won,
    stars: state.stars,
    destructionPct: state.destructionPct,
    playerCoinsEarned,
    treasuryTributeCoins,
    fishEarned: state.seizedFish,
    firewoodEarned: state.seizedFirewood,
    authorityDelta,
  };
}
