import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ECONOMY_PRODUCTION_CONFIG } from '../config/economy-pricing';

const CONFIG_DIR = join(process.cwd(), 'config');

mkdirSync(CONFIG_DIR, { recursive: true });

writeFileSync(
  join(CONFIG_DIR, 'anvil-economy-config.json'),
  `${JSON.stringify(ECONOMY_PRODUCTION_CONFIG, null, 2)}\n`,
  'utf-8'
);

const itemRows: string[] = [
  'id,name,category,tier,ref_price,npc_buy_ask,npc_sell_bid,spread_pct,winter_max_mult,local_subsidy_bound',
];

for (let i = 0; i < ECONOMY_PRODUCTION_CONFIG.items.length; i += 1) {
  const item = ECONOMY_PRODUCTION_CONFIG.items[i];

  const spreadPct =
    Math.round((1 - item.npcSellPrice / item.npcBuyPrice) * 1000) / 10;

  itemRows.push(
    [
      item.id,
      `"${item.name}"`,
      item.category,
      String(item.tier),
      String(item.refPrice),
      String(item.npcBuyPrice),
      String(item.npcSellPrice),
      String(spreadPct),
      String(item.winterMaxMult),
      String(item.localSubsidyBound),
    ].join(',')
  );
}

writeFileSync(
  join(CONFIG_DIR, 'items-pricing.csv'),
  `${itemRows.join('\n')}\n`,
  'utf-8'
);

const occRows: string[] = [
  'id,name,tier,act_unlocked,gross_fc_hr,upkeep_ratio,net_fc_hr_base',
];

for (let i = 0; i < ECONOMY_PRODUCTION_CONFIG.occupations.length; i += 1) {
  const occ = ECONOMY_PRODUCTION_CONFIG.occupations[i];

  occRows.push(
    [
      occ.id,
      `"${occ.name}"`,
      String(occ.tier),
      String(occ.actUnlocked),
      String(occ.grossFcPerHour),
      String(occ.upkeepRatio),
      String(occ.netFcPerHourBase),
    ].join(',')
  );
}

writeFileSync(
  join(CONFIG_DIR, 'occupations-salaries.csv'),
  `${occRows.join('\n')}\n`,
  'utf-8'
);

console.log(
  `Exported ${ECONOMY_PRODUCTION_CONFIG.items.length} items, ` +
    `${ECONOMY_PRODUCTION_CONFIG.occupations.length} occupations, ` +
    `${ECONOMY_PRODUCTION_CONFIG.miningDepths.length} mining depths, and ` +
    `${ECONOMY_PRODUCTION_CONFIG.raidTiers.length} raid tiers into config/.`
);
