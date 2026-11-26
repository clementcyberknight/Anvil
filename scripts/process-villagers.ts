import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

interface VillagerSheetSpec {
  readonly role: string;
  readonly filename: string;
  readonly label: string;
}

const ROOT = process.cwd();
const VILLAGER_ASSET_DIR = path.join(ROOT, 'assets', 'villager-asset');
const OUTPUT_DIR = path.join(VILLAGER_ASSET_DIR, 'compiled');
const GENERATED_TS_PATH = path.join(ROOT, 'src', 'game', 'villager-atlas.ts');

// 16 columns (4 directions x 4 walk frames) x 22 roles at 92px = 1472 x 2024 (< 2048px GPU cap)
const CELL_SIZE = 92;
const FRAMES_PER_DIR = 4;
const DIRECTIONS_COUNT = 4; // 0: front, 1: right, 2: back, 3: left (mirrored right)
const COLS_PER_ROLE = DIRECTIONS_COUNT * FRAMES_PER_DIR;
const DRAW_INNER_MAX_W = 84;
const DRAW_INNER_MAX_H = 84;
const FEET_BASELINE_Y = 89;

const VILLAGER_SPECS: readonly VillagerSheetSpec[] = [
  {
    role: 'hero',
    filename: 'Chibi Yeti Explorer Walking Cycle.png',
    label: 'Founder Yeti',
  },
  {
    role: 'mayor',
    filename: 'Chibi Yeti Mayor Walk Cycle.png',
    label: 'AI Mayor',
  },
  {
    role: 'citizen',
    filename: 'Chibi Yeti Walk Cycle Sprite Sheet.png',
    label: 'Town Citizen',
  },
  {
    role: 'builder',
    filename: 'Blue Yeti Carpenter Walk Cycle.png',
    label: 'Master Builder',
  },
  {
    role: 'baker',
    filename: 'Bakery Yeti Sprite Sheet.png',
    label: 'Cozy Baker',
  },
  {
    role: 'blacksmith',
    filename: 'Chibi Yeti Blacksmith Sprite Sheet.png',
    label: 'Blacksmith',
  },
  {
    role: 'lumberjack',
    filename: 'Lumberjack Yeti Character Sprite Sheet.png',
    label: 'Lumberjack',
  },
  {
    role: 'farmer',
    filename: 'Yeti Farmer Walking Sprite Sheet.png',
    label: 'Valley Farmer',
  },
  {
    role: 'rancher',
    filename: 'Yeti Farmer Sprite Sheet Poses.png',
    label: 'Yak Rancher',
  },
  {
    role: 'miller',
    filename: 'Chibi Yeti Farmer Walk Cycle.png',
    label: 'Windmill Miller',
  },
  {
    role: 'angler',
    filename: 'Fishing Yeti Walking Sprite Sheet.png',
    label: 'Lake Angler',
  },
  {
    role: 'banker',
    filename: 'Blue Yeti Scholar Walk Cycle.png',
    label: 'Town Banker',
  },
  {
    role: 'landlord',
    filename: 'Chibi Yeti Merchant Walking Sprite Sheet.png',
    label: 'Property Landlord',
  },
  {
    role: 'police',
    filename: 'Chibi Yeti Winter Guard Sprite Sheet.png',
    label: 'Town Guard',
  },
  {
    role: 'criminal',
    filename: 'Sneaky Yeti Rogue Walk Cycle.png',
    label: 'Sneaky Outlaw',
  },
  {
    role: 'cultist',
    filename: 'Chibi Yeti Mystic Walk Cycle.png',
    label: 'Frost Mystic',
  },
  {
    role: 'unemployed',
    filename: 'Sleepy Yeti Wanderer Sprite Sheet.png',
    label: 'Drifter',
  },
  {
    role: 'miner',
    filename: 'Miner Yeti Walk Cycle.jfif',
    label: 'Cave Miner',
  },
  {
    role: 'shieldguard',
    filename: 'Shieldguard Yeti Walk Cycle.jfif',
    label: 'Shieldguard',
  },
  {
    role: 'archer',
    filename: 'Ice Archer Yeti Walk Cycle.jfif',
    label: 'Ice-Archer',
  },
  {
    role: 'ram',
    filename: 'Timber Ram Sapper Yeti Walk Cycle.jfif',
    label: 'Timber Ram Sapper',
  },
  {
    role: 'apothecary',
    filename: 'Field Apothecary Yeti Walk Cycle.jfif',
    label: 'Field Apothecary',
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

  return minC >= 232 && chroma <= 22;
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

  // Soft 2px fringe de-halo on exterior border pixels without touching white fur inside outlines
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

        if (lum >= 216 && chroma <= 30) {
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

interface CompositeCell {
  readonly input: Buffer;
  readonly left: number;
  readonly top: number;
}

async function normalizeCellToSprite(
  cellRgba: Buffer,
  cellW: number,
  cellH: number,
  flipHorizontal: boolean
): Promise<Buffer> {
  const bounds = findAlphaBounds(cellRgba, cellW, cellH);

  let pipeline = sharp(cellRgba, {
    raw: { width: cellW, height: cellH, channels: 4 },
  }).extract({
    left: bounds.left,
    top: bounds.top,
    width: bounds.cropWidth,
    height: bounds.cropHeight,
  });

  if (flipHorizontal) {
    pipeline = pipeline.flop();
  }

  const resized = await pipeline
    .resize({
      width: DRAW_INNER_MAX_W,
      height: DRAW_INNER_MAX_H,
      fit: 'inside',
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  const destLeft = Math.round((CELL_SIZE - resized.info.width) * 0.5);
  const destTop = Math.max(2, FEET_BASELINE_Y - resized.info.height);

  return sharp({
    create: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized.data, left: destLeft, top: destTop }])
    .png()
    .toBuffer();
}

async function processVillagerSheet(
  spec: VillagerSheetSpec,
  rowIndex: number
): Promise<CompositeCell[]> {
  const inputPath = path.join(VILLAGER_ASSET_DIR, spec.filename);

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cellW = Math.floor(info.width / 4);
  const cellH = Math.floor(info.height / 3);
  const composites: CompositeCell[] = [];

  for (let srcRow = 0; srcRow < 3; srcRow += 1) {
    for (let col = 0; col < 4; col += 1) {
      const startX = col * cellW;
      const startY = srcRow * cellH;
      const cellBuf = Buffer.alloc(cellW * cellH * 4);

      for (let y = 0; y < cellH; y += 1) {
        const srcOff = ((startY + y) * info.width + startX) * 4;
        const dstOff = y * cellW * 4;

        data.copy(cellBuf, dstOff, srcOff, srcOff + cellW * 4);
      }

      stripCellWhiteBackground(cellBuf, cellW, cellH);

      const frameBuffer = await normalizeCellToSprite(
        cellBuf,
        cellW,
        cellH,
        false
      );

      composites.push({
        input: frameBuffer,
        left: (srcRow * FRAMES_PER_DIR + col) * CELL_SIZE,
        top: rowIndex * CELL_SIZE,
      });

      // Row 1 is Right-facing; mirror horizontally into Direction 3 (Left-facing) for 1-draw-call <Atlas>
      if (srcRow === 1) {
        const mirroredBuffer = await normalizeCellToSprite(
          cellBuf,
          cellW,
          cellH,
          true
        );

        composites.push({
          input: mirroredBuffer,
          left: (3 * FRAMES_PER_DIR + col) * CELL_SIZE,
          top: rowIndex * CELL_SIZE,
        });
      }
    }
  }

  return composites;
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(
    `1/3 Slicing & de-backgrounding ${VILLAGER_SPECS.length} villager sheets (272 frames with mirrored left)...`
  );

  const allCellGroups = await Promise.all(
    VILLAGER_SPECS.map((spec, idx) => processVillagerSheet(spec, idx))
  );

  const composites: CompositeCell[] = [];

  for (let i = 0; i < allCellGroups.length; i += 1) {
    const group = allCellGroups[i];

    for (let j = 0; j < group.length; j += 1) {
      composites.push(group[j]);
    }
  }

  const atlasWidth = COLS_PER_ROLE * CELL_SIZE;
  const atlasHeight = VILLAGER_SPECS.length * CELL_SIZE;
  const atlasPath = path.join(OUTPUT_DIR, 'villagers-atlas.webp');

  console.log(
    `2/3 Packing villagers-atlas.webp (${atlasWidth}x${atlasHeight})...`
  );

  const result = await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ quality: 88, alphaQuality: 100, effort: 6 })
    .toFile(atlasPath);

  console.log(
    `    villagers-atlas.webp: ${atlasWidth}x${atlasHeight} (${(result.size / 1024).toFixed(1)} KB)`
  );

  console.log('3/3 Writing typed manifest src/game/villager-atlas.ts...');

  const roleUnion = VILLAGER_SPECS.map((s) => `  | '${s.role}'`).join('\n');

  const roleIndexEntries = VILLAGER_SPECS.map(
    (s, idx) => `  ${s.role}: ${idx},`
  ).join('\n');

  const roleLabelEntries = VILLAGER_SPECS.map(
    (s) => `  ${s.role}: '${s.label}',`
  ).join('\n');

  const tsContent = `// Auto-generated by scripts/process-villagers.ts — do not edit manually.

export const VILLAGER_ATLAS_WIDTH = ${atlasWidth};
export const VILLAGER_ATLAS_HEIGHT = ${atlasHeight};
export const VILLAGER_CELL_SIZE = ${CELL_SIZE};
export const VILLAGER_FRAMES_PER_DIR = ${FRAMES_PER_DIR};
export const VILLAGER_DIRECTIONS_COUNT = ${DIRECTIONS_COUNT};
export const VILLAGER_FEET_ANCHOR_X = 0.5;
export const VILLAGER_FEET_ANCHOR_Y = ${(FEET_BASELINE_Y / CELL_SIZE).toFixed(4)};

/**
 * Direction row offsets inside each role's 16-frame strip:
 * 0 = Front (South), 1 = Right (East), 2 = Back (North), 3 = Left (West, pre-mirrored)
 */
export const VILLAGER_DIR_FRONT = 0;
export const VILLAGER_DIR_RIGHT = 1;
export const VILLAGER_DIR_BACK = 2;
export const VILLAGER_DIR_LEFT = 3;

export type VillagerRoleKey =
${roleUnion};

export const VILLAGER_ROLE_ROW = {
${roleIndexEntries}
} as const satisfies Record<VillagerRoleKey, number>;

export const VILLAGER_ROLE_LABEL = {
${roleLabelEntries}
} as const satisfies Record<VillagerRoleKey, string>;
`;

  writeFileSync(GENERATED_TS_PATH, tsContent, 'utf8');
  console.log('Done!');
}

void main();
