import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

interface GridSliceSheetSpec {
  readonly filename: string;
  readonly cols: number;
  readonly rows: number;
  readonly keys: readonly string[];
}

interface SlicedItem {
  readonly key: string;
  readonly buffer: Buffer;
}

const ROOT = process.cwd();
const RESOURCE_DIR = path.join(ROOT, 'assets', 'resource-asset');
const OUTPUT_DIR = path.join(RESOURCE_DIR, 'compiled');
const GENERATED_RESOURCES_TS = path.join(ROOT, 'src', 'game', 'resource-atlas.ts');
const GENERATED_ICONS_TS = path.join(ROOT, 'src', 'game', 'icon-atlas.ts');

const MAP_NODE_SHEETS: readonly GridSliceSheetSpec[] = [
  {
    filename: 'Map Mineable Ores Sheet.jfif',
    cols: 4,
    rows: 2,
    keys: [
      'nodeStone',
      'nodeCoal',
      'nodeCopper',
      'nodeIron',
      'nodeSilver',
      'nodeGold',
      'nodeDiamond',
      'nodeIceCrystal',
    ],
  },
  {
    filename: 'Map Crops Survival Sheet.jfif',
    cols: 4,
    rows: 3,
    keys: [
      'maizeStage1',
      'maizeStage2',
      'maizeStage3',
      'maizeHarvest',
      'wheatStage1',
      'wheatStage2',
      'wheatStage3',
      'wheatHarvest',
      'cropSnowTurnip',
      'nodeBerryBush',
      'nodeIceHole',
      'nodePineDeadfall',
    ],
  },
  {
    filename: 'Map Crops Expanded Sheet.jfif',
    cols: 4,
    rows: 4,
    keys: [
      'cropSeedMound',
      'turnipStage1',
      'turnipStage2',
      'cropWithered',
      'potatoStage1',
      'potatoStage2',
      'potatoStage3',
      'cropWinterCabbage',
      'barleyStage1',
      'barleyStage2',
      'barleyStage3',
      'cropFlaxMature',
      'pumpkinStage1',
      'pumpkinStage2',
      'pumpkinStage3',
      'nodeBerryBushSummer',
    ],
  },
  {
    filename: 'Map Wild Food Livestock Sheet.jfif',
    cols: 4,
    rows: 3,
    keys: [
      'stumpWinter',
      'stumpSummer',
      'treeOakSummer',
      'treeAppleOrchard',
      'nodeMushrooms',
      'nodeFrostMint',
      'nodeMountainHerbs',
      'nodeBeehive',
      'nodeReedsClay',
      'animalYak',
      'propChickenCoop',
      'propFrostShrine',
    ],
  },
];

const ICON_SHEETS: readonly GridSliceSheetSpec[] = [
  {
    filename: 'Icons Food Produce Sheet.jfif',
    cols: 4,
    rows: 4,
    keys: [
      'lakeTrout',
      'frostCarp',
      'fishStew',
      'smokedFish',
      'maizeCob',
      'wheatSheaf',
      'snowTurnip',
      'mountainBerries',
      'flourSack',
      'artisanBread',
      'yakMilk',
      'alpineCheese',
      'warmthTea',
      'healingSalve',
      'honeyJar',
      'berryPie',
    ],
  },
  {
    filename: 'Icons Materials Ores Sheet.jfif',
    cols: 4,
    rows: 4,
    keys: [
      'frostCoin',
      'firewood',
      'pineLog',
      'pinePlanks',
      'rawStone',
      'coalChunk',
      'copperOre',
      'ironOre',
      'silverOre',
      'goldOre',
      'rawDiamond',
      'iceCrystal',
      'ironIngot',
      'goldIngot',
      'ironNails',
      'glassPane',
    ],
  },
  {
    filename: 'Icons Equipment War Sheet.jfif',
    cols: 4,
    rows: 4,
    keys: [
      'fishingRod',
      'hatchet',
      'filletKnife',
      'pickaxe',
      'copperHoe',
      'sickle',
      'iceAuger',
      'wateringCan',
      'founderCoat',
      'workGloves',
      'kiteShield',
      'battleAxe',
      'founderPouch',
      'rallyHorn',
      'frostMistPotion',
      'anvilBreaker',
    ],
  },
  {
    filename: 'Icons Seeds Saplings Sheet.jfif',
    cols: 4,
    rows: 3,
    keys: [
      'seedMaize',
      'seedWheat',
      'seedTurnip',
      'seedPotato',
      'seedBarley',
      'seedCabbage',
      'seedPumpkin',
      'seedFlax',
      'seedPinecone',
      'seedOakAcorn',
      'seedBerryCutting',
      'seedAppleSapling',
    ],
  },
  {
    filename: 'Icons Meals Produce Sheet.jfif',
    cols: 4,
    rows: 4,
    keys: [
      'frostPotato',
      'barleySheaf',
      'winterCabbage',
      'alpinePumpkin',
      'alpineApple',
      'forestMushroom',
      'frostMint',
      'glacierSalmon',
      'snowHenEggs',
      'churnedButter',
      'rawYakMeat',
      'curedMeat',
      'goldenCornbread',
      'mushroomSoup',
      'yakRoast',
      'spicedAle',
    ],
  },
  {
    filename: 'Icons Craft Politics War Sheet.jfif',
    cols: 4,
    rows: 4,
    keys: [
      'rawFlax',
      'yakWool',
      'woolCloth',
      'tannedLeather',
      'oakLog',
      'riverClay',
      'firedBricks',
      'fertilizerBag',
      'copperIngot',
      'silverIngot',
      'steelIngot',
      'ancientRelic',
      'ballotBox',
      'mayorCrown',
      'wantedBounty',
      'raidAxesShield',
    ],
  },
];

function isExteriorWhiteOrTransparent(
  data: Buffer,
  pixelOffset: number
): boolean {
  const r = data[pixelOffset];
  const g = data[pixelOffset + 1];
  const b = data[pixelOffset + 2];
  const a = data[pixelOffset + 3];

  if (a < 20) {
    return true;
  }

  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const chroma = maxC - minC;

  return minC >= 230 && chroma <= 24;
}

function stripCellWhiteBackground(
  data: Buffer,
  width: number,
  height: number
): void {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const enqueueIfBg = (x: number, y: number): void => {
    const idx = y * width + x;

    if (visited[idx] === 1) {
      return;
    }

    if (isExteriorWhiteOrTransparent(data, idx * 4)) {
      visited[idx] = 1;
      queue[tail] = idx;
      tail += 1;
    }
  };

  for (let x = 0; x < width; x += 1) {
    enqueueIfBg(x, 0);
    enqueueIfBg(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    enqueueIfBg(0, y);
    enqueueIfBg(width - 1, y);
  }

  while (head < tail) {
    const idx = queue[head];

    head += 1;
    data[idx * 4 + 3] = 0;

    const x = idx % width;
    const y = (idx / width) | 0;

    if (x > 0) enqueueIfBg(x - 1, y);
    if (x + 1 < width) enqueueIfBg(x + 1, y);
    if (y > 0) enqueueIfBg(x, y - 1);
    if (y + 1 < height) enqueueIfBg(x, y + 1);
  }

  // Smooth 2px border fringe de-halo
  let currentMask = visited;

  for (let pass = 0; pass < 2; pass += 1) {
    const nextMask = new Uint8Array(currentMask);

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const idx = y * width + x;

        if (currentMask[idx] === 1) {
          continue;
        }

        const touchesBg =
          currentMask[idx - 1] === 1 ||
          currentMask[idx + 1] === 1 ||
          currentMask[idx - width] === 1 ||
          currentMask[idx + width] === 1;

        if (!touchesBg) {
          continue;
        }

        const p = idx * 4;
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];
        const a = data[p + 3];

        if (a === 0) {
          nextMask[idx] = 1;
          continue;
        }

        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const chroma = maxC - minC;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (lum >= 216 && chroma <= 32) {
          const factor = Math.max(0, Math.min(1, (244 - lum) / 40));
          const newAlpha = Math.round(a * factor);

          data[p + 3] = newAlpha;

          if (newAlpha < 24) {
            data[p + 3] = 0;
            nextMask[idx] = 1;
          }
        }
      }
    }

    currentMask = nextMask;
  }
}

function findAlphaBounds(
  data: Buffer,
  width: number,
  height: number
): { left: number; top: number; cropWidth: number; cropHeight: number } {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];

      if (alpha > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { left: 0, top: 0, cropWidth: width, cropHeight: height };
  }

  const pad = 2;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(width - 1, maxX + pad);
  const bottom = Math.min(height - 1, maxY + pad);

  return {
    left,
    top,
    cropWidth: right - left + 1,
    cropHeight: bottom - top + 1,
  };
}

async function sliceSheetToUniformCells(
  spec: GridSliceSheetSpec,
  cellSize: number,
  innerMax: number,
  alignBottom: boolean
): Promise<SlicedItem[]> {
  const inputPath = path.join(RESOURCE_DIR, spec.filename);

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cellW = Math.floor(info.width / spec.cols);
  const cellH = Math.floor(info.height / spec.rows);
  const items: SlicedItem[] = [];

  for (let row = 0; row < spec.rows; row += 1) {
    for (let col = 0; col < spec.cols; col += 1) {
      const idx = row * spec.cols + col;
      const key = spec.keys[idx];
      const startX = col * cellW;
      const startY = row * cellH;
      const cellBuf = Buffer.alloc(cellW * cellH * 4);

      for (let y = 0; y < cellH; y += 1) {
        const srcOff = ((startY + y) * info.width + startX) * 4;
        const dstOff = y * cellW * 4;

        data.copy(cellBuf, dstOff, srcOff, srcOff + cellW * 4);
      }

      stripCellWhiteBackground(cellBuf, cellW, cellH);

      // Clear any 4px stray neighbor bleed on the extreme top/bottom cell border
      for (let y = 0; y < 4; y += 1) {
        for (let x = 0; x < cellW; x += 1) {
          cellBuf[(y * cellW + x) * 4 + 3] = 0;
          cellBuf[((cellH - 1 - y) * cellW + x) * 4 + 3] = 0;
        }
      }

      const bounds = findAlphaBounds(cellBuf, cellW, cellH);

      const resized = await sharp(cellBuf, {
        raw: { width: cellW, height: cellH, channels: 4 },
      })
        .extract({
          left: bounds.left,
          top: bounds.top,
          width: bounds.cropWidth,
          height: bounds.cropHeight,
        })
        .resize({
          width: innerMax,
          height: innerMax,
          fit: 'inside',
          kernel: sharp.kernel.lanczos3,
        })
        .png()
        .toBuffer({ resolveWithObject: true });

      const destLeft = Math.round((cellSize - resized.info.width) * 0.5);

      const destTop = alignBottom
        ? Math.max(4, cellSize - 6 - resized.info.height)
        : Math.round((cellSize - resized.info.height) * 0.5);

      const framed = await sharp({
        create: {
          width: cellSize,
          height: cellSize,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: resized.data, left: destLeft, top: destTop }])
        .png()
        .toBuffer();

      items.push({ key, buffer: framed });
    }
  }

  return items;
}

async function buildGridAtlas(
  items: readonly SlicedItem[],
  cols: number,
  cellSize: number,
  outFileName: string
): Promise<{ width: number; height: number; frames: Record<string, { x: number; y: number }> }> {
  const rows = Math.ceil(items.length / cols);
  const width = cols * cellSize;
  const height = rows * cellSize;
  const frames: Record<string, { x: number; y: number }> = {};

  const composites = items.map((item, i) => {
    const x = (i % cols) * cellSize;
    const y = Math.floor(i / cols) * cellSize;

    frames[item.key] = { x, y };

    return { input: item.buffer, left: x, top: y };
  });

  const result = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(path.join(OUTPUT_DIR, outFileName));

  console.log(
    `    ${outFileName}: ${width}x${height} (${(result.size / 1024).toFixed(1)} KB, ${items.length} sprites)`
  );

  return { width, height, frames };
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('1/3 Slicing 20 on-map mineable ore & crop nodes...');

  const nodeCellSize = 144;

  const nodeGroups = await Promise.all(
    MAP_NODE_SHEETS.map((s) =>
      sliceSheetToUniformCells(s, nodeCellSize, 132, true)
    )
  );

  const allNodes: SlicedItem[] = [];

  for (let i = 0; i < nodeGroups.length; i += 1) {
    for (let j = 0; j < nodeGroups[i].length; j += 1) {
      allNodes.push(nodeGroups[i][j]);
    }
  }

  const nodeAtlas = await buildGridAtlas(
    allNodes,
    8,
    nodeCellSize,
    'resources-atlas.webp'
  );

  console.log('2/3 Slicing 92 Founder Pouch, Seed, Food, Ore, Politics & Equipment icons...');

  const iconCellSize = 96;

  const iconGroups = await Promise.all(
    ICON_SHEETS.map((s) =>
      sliceSheetToUniformCells(s, iconCellSize, 86, false)
    )
  );

  const allIcons: SlicedItem[] = [];

  for (let i = 0; i < iconGroups.length; i += 1) {
    for (let j = 0; j < iconGroups[i].length; j += 1) {
      allIcons.push(iconGroups[i][j]);
    }
  }

  const iconAtlas = await buildGridAtlas(
    allIcons,
    10,
    iconCellSize,
    'icons-atlas.webp'
  );

  console.log('3/3 Generating src/game/resource-atlas.ts & src/game/icon-atlas.ts...');

  const nodeKeys = allNodes.map((n) => n.key);

  const resourceTs = `// Auto-generated by scripts/process-resources.ts — do not edit manually.

export interface GridAtlasFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const RESOURCE_ATLAS_WIDTH = ${nodeAtlas.width};
export const RESOURCE_ATLAS_HEIGHT = ${nodeAtlas.height};
export const RESOURCE_CELL_SIZE = ${nodeCellSize};

export type ResourceNodeKey =
${nodeKeys.map((k) => `  | '${k}'`).join('\n')};

export const RESOURCE_ATLAS_FRAMES = {
${nodeKeys
  .map(
    (k) =>
      `  ${k}: { x: ${nodeAtlas.frames[k].x}, y: ${nodeAtlas.frames[k].y}, width: ${nodeCellSize}, height: ${nodeCellSize} },`
  )
  .join('\n')}
} as const satisfies Record<ResourceNodeKey, GridAtlasFrame>;
`;

  const iconKeys = allIcons.map((ic) => ic.key);

  const iconTs = `// Auto-generated by scripts/process-resources.ts — do not edit manually.

export interface IconAtlasFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const ICON_ATLAS_WIDTH = ${iconAtlas.width};
export const ICON_ATLAS_HEIGHT = ${iconAtlas.height};
export const ICON_CELL_SIZE = ${iconCellSize};

export type GameIconKey =
${iconKeys.map((k) => `  | '${k}'`).join('\n')};

export const ICON_ATLAS_FRAMES = {
${iconKeys
  .map(
    (k) =>
      `  ${k}: { x: ${iconAtlas.frames[k].x}, y: ${iconAtlas.frames[k].y}, width: ${iconCellSize}, height: ${iconCellSize} },`
  )
  .join('\n')}
} as const satisfies Record<GameIconKey, IconAtlasFrame>;
`;

  writeFileSync(GENERATED_RESOURCES_TS, resourceTs, 'utf8');
  writeFileSync(GENERATED_ICONS_TS, iconTs, 'utf8');
  console.log('Done!');
}

void main();
