import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const LAND_DIR = path.join(ROOT, 'assets', 'land-asset');
const OUTPUT_DIR = path.join(LAND_DIR, 'compiled');
const ZONES_TS_PATH = path.join(ROOT, 'src', 'game', 'valley-zones.ts');

// 200x Scale World Architecture (2x of 40x70 = 5,600 playable 4x4 blocks, exact same 336x336px block size):
// Playable Town = 56 blocks wide x 100 blocks tall = 5,600 blocks (89,600 tiles)!
const BLOCK_GRID_SIZE = 4;
const TILE_PX = 84;
const BLOCK_PX = BLOCK_GRID_SIZE * TILE_PX; // 336px per 4x4 block
const BLOCK_COLS = 56;
const BLOCK_ROWS = 100;
const TILE_COLS = BLOCK_COLS * BLOCK_GRID_SIZE; // 224 tiles
const TILE_ROWS = BLOCK_ROWS * BLOCK_GRID_SIZE; // 400 tiles

// 3-block (1008px) lush Pine Forest border ring on all 4 sides of the 56x100 town
const BORDER_BLOCKS = 3;
const BORDER_X = BORDER_BLOCKS * BLOCK_PX; // 1008px
const BORDER_Y = BORDER_BLOCKS * BLOCK_PX; // 1008px
const PLAYABLE_W = BLOCK_COLS * BLOCK_PX; // 18,816px
const PLAYABLE_H = BLOCK_ROWS * BLOCK_PX; // 33,600px
const WORLD_W = PLAYABLE_W + BORDER_X * 2; // 20,832px
const WORLD_H = PLAYABLE_H + BORDER_Y * 2; // 35,616px

// Viewport culling buffer: render visible viewport + 5 blocks outside on every side
const CULL_BUFFER_BLOCKS = 5;

// Central Fishing Lake nestled cleanly inside blocks (27, 48) & (28, 48)
const LAKE_BLOCK_X = 27;
const LAKE_BLOCK_Y = 48;
const LAKE_W = 596;
const LAKE_H = BLOCK_PX; // 336px (exact 1 block row height)

const LAKE_ZONE = {
  id: 'fishing_lake',
  tileX: LAKE_BLOCK_X * BLOCK_GRID_SIZE,
  tileY: LAKE_BLOCK_Y * BLOCK_GRID_SIZE,
  tileW: BLOCK_GRID_SIZE * 2,
  tileH: BLOCK_GRID_SIZE,
  x: Math.round(BORDER_X + (LAKE_BLOCK_X + 1) * BLOCK_PX - LAKE_W * 0.5),
  y: BORDER_Y + LAKE_BLOCK_Y * BLOCK_PX,
  width: LAKE_W,
  height: LAKE_H,
} as const;

function makeCenterBlendMaskSvg(
  width: number,
  height: number,
  marginX: number,
  marginY: number
): Buffer {
  const blur = Math.max(8, Math.round(Math.min(marginX, marginY) * 0.42));
  const innerW = Math.max(1, width - marginX * 2);
  const innerH = Math.max(1, height - marginY * 2);

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="cb" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="${blur}" />
      </filter>
    </defs>
    <rect x="${marginX}" y="${marginY}" width="${innerW}" height="${innerH}" rx="${blur}" ry="${blur}" fill="white" filter="url(#cb)" />
  </svg>`;

  return Buffer.from(svg);
}

/**
 * Converts any upright 2D terrain texture into a TRUE periodic seamless tile
 * (safe for GPU TileMode.Repeat in both X and Y with ZERO upside-down art and ZERO seams)
 * using the wrap-around half-shift cross-blend method.
 */
async function buildSeamlessRepeatBuffer(
  inputPath: string,
  tileW: number,
  tileH: number
): Promise<Buffer> {
  const halfW = Math.floor(tileW / 2);
  const halfH = Math.floor(tileH / 2);

  const srcBuf = await sharp(inputPath)
    .resize(tileW, tileH, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .png()
    .toBuffer();

  const [qTL, qTR, qBL, qBR] = await Promise.all([
    sharp(srcBuf).extract({ left: 0, top: 0, width: halfW, height: halfH }).png().toBuffer(),
    sharp(srcBuf).extract({ left: halfW, top: 0, width: tileW - halfW, height: halfH }).png().toBuffer(),
    sharp(srcBuf).extract({ left: 0, top: halfH, width: halfW, height: tileH - halfH }).png().toBuffer(),
    sharp(srcBuf).extract({ left: halfW, top: halfH, width: tileW - halfW, height: tileH - halfH }).png().toBuffer(),
  ]);

  const shifted = await sharp({
    create: {
      width: tileW,
      height: tileH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      { input: qBR, left: 0, top: 0 },
      { input: qBL, left: tileW - halfW, top: 0 },
      { input: qTR, left: 0, top: tileH - halfH },
      { input: qTL, left: tileW - halfW, top: tileH - halfH },
    ])
    .png()
    .toBuffer();

  const maskSvg = makeCenterBlendMaskSvg(
    tileW,
    tileH,
    Math.round(tileW * 0.14),
    Math.round(tileH * 0.14)
  );

  const centerPatch = await sharp(srcBuf)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return sharp(shifted)
    .composite([{ input: centerPatch, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function buildSeamlessRepeatTile(
  inputPath: string,
  tileW: number,
  tileH: number,
  outputPath: string,
  quality: number
): Promise<{ width: number; height: number; bytes: number }> {
  const buf = await buildSeamlessRepeatBuffer(inputPath, tileW, tileH);

  const res = await sharp(buf).webp({ quality, effort: 6 }).toFile(outputPath);

  return { width: res.width, height: res.height, bytes: res.size };
}

/**
 * Builds the seamless Winter snow repeat tile by softly blending subtle frost tufts & rocks
 * from Snowy Cartoon Terrain into Pure Snowy Terrain Background so the 40x70 valley looks natural.
 */
async function buildWinterSnowRepeatTile(
  tileW: number,
  tileH: number,
  outputPath: string
): Promise<{ width: number; height: number; bytes: number }> {
  const pureSnowPath = path.join(LAND_DIR, 'Pure Snowy Terrain Background.png');
  const rockySnowPath = path.join(
    LAND_DIR,
    'Snowy Cartoon Terrain with Rocks and Icy Grass.png'
  );

  const [pureBuf, rockyBuf] = await Promise.all([
    buildSeamlessRepeatBuffer(pureSnowPath, tileW, tileH),
    buildSeamlessRepeatBuffer(rockySnowPath, tileW, tileH),
  ]);

  const rockMask = Buffer.from(`<svg width="${tileW}" height="${tileH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="rb" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="36" />
      </filter>
    </defs>
    <g filter="url(#rb)" fill="white" opacity="0.65">
      <ellipse cx="${Math.round(tileW * 0.28)}" cy="${Math.round(tileH * 0.34)}" rx="${Math.round(tileW * 0.18)}" ry="${Math.round(tileH * 0.22)}" />
      <ellipse cx="${Math.round(tileW * 0.74)}" cy="${Math.round(tileH * 0.68)}" rx="${Math.round(tileW * 0.17)}" ry="${Math.round(tileH * 0.20)}" />
    </g>
  </svg>`);

  const rockyOverlay = await sharp(rockyBuf)
    .ensureAlpha()
    .composite([{ input: rockMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const res = await sharp(pureBuf)
    .composite([{ input: rockyOverlay, left: 0, top: 0 }])
    .webp({ quality: 88, effort: 6 })
    .toFile(outputPath);

  return { width: res.width, height: res.height, bytes: res.size };
}

/**
 * Compiles the transparent uncut Fishing Lake sprites for Winter and Summer.
 */
async function buildLakeSprite(
  isWinter: boolean,
  outputPath: string
): Promise<{ width: number; height: number; bytes: number }> {
  const resized = await sharp(
    path.join(LAND_DIR, 'Cartoon Frozen Winter Lake.png')
  )
    .resize(LAKE_W, LAKE_H, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  if (isWinter) {
    const mask = Buffer.from(`<svg width="${LAKE_W}" height="${LAKE_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="lb" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      <ellipse cx="${LAKE_W / 2}" cy="${LAKE_H / 2}" rx="${LAKE_W * 0.45}" ry="${LAKE_H * 0.44}" fill="white" filter="url(#lb)" />
    </svg>`);

    const res = await sharp(resized)
      .composite([{ input: mask, blend: 'dest-in' }])
      .webp({ quality: 90, alphaQuality: 100, effort: 6 })
      .toFile(outputPath);

    return { width: res.width, height: res.height, bytes: res.size };
  }

  // Summer: BFS flood-fill strips outer snow while preserving exact organic wavy shoreline
  const { data, info } = await sharp(resized)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.from(data);
  const w = info.width;
  const h = info.height;
  const total = w * h;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isOuterSnow = (idx: number): boolean => {
    const p = idx * 4;
    const r = rgba[p];
    const g = rgba[p + 1];
    const b = rgba[p + 2];

    if (b - r >= 62 && g >= 130 && b >= 195) {
      return false;
    }

    if (b - r >= 55 && r < 125) {
      return false;
    }

    return true;
  };

  const enqueue = (x: number, y: number): void => {
    const idx = y * w + x;

    if (visited[idx] === 1) {
      return;
    }

    if (isOuterSnow(idx)) {
      visited[idx] = 1;
      queue[tail] = idx;
      tail += 1;
    }
  };

  for (let x = 0; x < w; x += 1) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }

  for (let y = 0; y < h; y += 1) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  while (head < tail) {
    const idx = queue[head];

    head += 1;
    rgba[idx * 4 + 3] = 0;

    const x = idx % w;
    const y = (idx / w) | 0;

    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < w) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < h) enqueue(x, y + 1);
  }

  const shoreRgba = Buffer.alloc(total * 4);
  const radius = 8;

  for (let y = radius; y < h - radius; y += 1) {
    for (let x = radius; x < w - radius; x += 1) {
      const idx = y * w + x;

      if (visited[idx] === 0) {
        continue;
      }

      let minD2 = 9999;

      for (let dy = -radius; dy <= radius; dy += 2) {
        for (let dx = -radius; dx <= radius; dx += 2) {
          if (visited[(y + dy) * w + (x + dx)] === 0) {
            const d2 = dx * dx + dy * dy;

            if (d2 < minD2) {
              minD2 = d2;
            }
          }
        }
      }

      if (minD2 <= radius * radius) {
        const d = Math.sqrt(minD2);
        const p = idx * 4;

        if (d <= 4.5) {
          shoreRgba[p] = 196;
          shoreRgba[p + 1] = 166;
          shoreRgba[p + 2] = 108;
          shoreRgba[p + 3] = 232;
        } else {
          const t = (d - 4.5) / (radius - 4.5);

          shoreRgba[p] = 86;
          shoreRgba[p + 1] = 122;
          shoreRgba[p + 2] = 46;
          shoreRgba[p + 3] = Math.round(205 * (1 - t));
        }
      }
    }
  }

  const waterCutout = await sharp(rgba, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png()
    .toBuffer();

  const shoreBank = await sharp(shoreRgba, {
    raw: { width: w, height: h, channels: 4 },
  })
    .blur(1.4)
    .png()
    .toBuffer();

  const res = await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: shoreBank, left: 0, top: 0 },
      { input: waterCutout, left: 0, top: 0 },
    ])
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(outputPath);

  return { width: res.width, height: res.height, bytes: res.size };
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('1/2 Compiling seamless repeat GPU shaders & uncut lake sprites for 100x (40x70 = 2,800 block) town...');

  const [
    winterForest,
    summerForest,
    winterSnow,
    summerGrass,
    loamySoil,
    winterLake,
    summerLake,
  ] = await Promise.all([
    buildSeamlessRepeatTile(
      path.join(LAND_DIR, 'Cozy Snow-Covered Pine Forest.png'),
      860,
      484,
      path.join(OUTPUT_DIR, 'winter-forest-tile.webp'),
      86
    ),
    buildSeamlessRepeatTile(
      path.join(LAND_DIR, 'Vibrant Summer Pine Forest Meadow.png'),
      860,
      484,
      path.join(OUTPUT_DIR, 'summer-forest-tile.webp'),
      86
    ),
    buildWinterSnowRepeatTile(
      920,
      518,
      path.join(OUTPUT_DIR, 'winter-snow-tile.webp')
    ),
    buildSeamlessRepeatTile(
      path.join(LAND_DIR, 'Gemini_Generated_Image_mrsuaemrsuaemrsu 1.png'),
      920,
      518,
      path.join(OUTPUT_DIR, 'summer-grass-tile.webp'),
      86
    ),
    buildSeamlessRepeatTile(
      path.join(LAND_DIR, 'Cartoon Loamy Soil Terrain Tile.png'),
      768,
      432,
      path.join(OUTPUT_DIR, 'loamy-soil.webp'),
      88
    ),
    buildLakeSprite(true, path.join(OUTPUT_DIR, 'winter-lake.webp')),
    buildLakeSprite(false, path.join(OUTPUT_DIR, 'summer-lake.webp')),
  ]);

  const totalKb =
    (winterForest.bytes +
      summerForest.bytes +
      winterSnow.bytes +
      summerGrass.bytes +
      loamySoil.bytes +
      winterLake.bytes +
      summerLake.bytes) /
    1024;

  console.log(`    winter-forest-tile.webp: ${winterForest.width}x${winterForest.height} (${(winterForest.bytes / 1024).toFixed(1)} KB)`);
  console.log(`    summer-forest-tile.webp: ${summerForest.width}x${summerForest.height} (${(summerForest.bytes / 1024).toFixed(1)} KB)`);
  console.log(`    winter-snow-tile.webp:   ${winterSnow.width}x${winterSnow.height} (${(winterSnow.bytes / 1024).toFixed(1)} KB)`);
  console.log(`    summer-grass-tile.webp:  ${summerGrass.width}x${summerGrass.height} (${(summerGrass.bytes / 1024).toFixed(1)} KB)`);
  console.log(`    loamy-soil.webp:         ${loamySoil.width}x${loamySoil.height} (${(loamySoil.bytes / 1024).toFixed(1)} KB)`);
  console.log(`    winter-lake.webp:        ${winterLake.width}x${winterLake.height} (${(winterLake.bytes / 1024).toFixed(1)} KB)`);
  console.log(`    summer-lake.webp:        ${summerLake.width}x${summerLake.height} (${(summerLake.bytes / 1024).toFixed(1)} KB)`);
  console.log(`    Total 100x World GPU Asset Footprint: ${totalKb.toFixed(1)} KB!`);

  console.log('2/2 Generating 100x world geometry in src/game/valley-zones.ts...');

  const tsContent = `// Auto-generated by scripts/build-valley-maps.ts — do not edit manually.

export type DynamicPatchKind = 'PATH' | 'PLANTING';

export interface ValleyZoneRect {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ValleyLakeZone extends ValleyZoneRect {
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
}

export interface ValleyBuildingPlacement {
  readonly id: string;
  readonly spriteKey: 'windmill' | 'bakery';
  readonly blockX: number;
  readonly blockY: number;
  readonly drawWidth: number;
}

/**
 * 100x Scale Strict 4x4 Grid-Per-Block Architecture:
 * - Every Land Block is strictly a 4x4 grid of 84x84px tiles (336x336px per block).
 * - Playable Town = 40 blocks wide x 70 blocks tall = 2,800 blocks (44,800 tiles).
 * - Framed by a 3-block (1008px) Pine Forest perimeter on all 4 sides.
 * - Viewport-culled renderer draws ONLY visible screen + 5 blocks buffer on all sides.
 */
export const BLOCK_GRID_SIZE = ${BLOCK_GRID_SIZE};
export const VALLEY_TILE_PX = ${TILE_PX};
export const VALLEY_BLOCK_PX = ${BLOCK_PX};
export const VALLEY_BLOCK_COLS = ${BLOCK_COLS};
export const VALLEY_BLOCK_ROWS = ${BLOCK_ROWS};
export const VALLEY_TILE_COLS = ${TILE_COLS};
export const VALLEY_TILE_ROWS = ${TILE_ROWS};
export const VALLEY_BORDER_BLOCKS = ${BORDER_BLOCKS};
export const VALLEY_CULL_BUFFER_BLOCKS = ${CULL_BUFFER_BLOCKS};

export const VALLEY_BORDER_X = ${BORDER_X};
export const VALLEY_BORDER_Y = ${BORDER_Y};
export const VALLEY_WORLD_WIDTH = ${WORLD_W};
export const VALLEY_WORLD_HEIGHT = ${WORLD_H};

export const VALLEY_SPAWN_FOCUS_X = ${BORDER_X + 28 * BLOCK_PX};
export const VALLEY_SPAWN_FOCUS_Y = ${BORDER_Y + 50 * BLOCK_PX};

export const VALLEY_PLAYABLE_BOUNDS: ValleyZoneRect = {
  id: 'playable_valley',
  x: ${BORDER_X},
  y: ${BORDER_Y},
  width: ${PLAYABLE_W},
  height: ${PLAYABLE_H},
};

export const VALLEY_LAKE_ZONE: ValleyLakeZone = {
  id: '${LAKE_ZONE.id}',
  tileX: ${LAKE_ZONE.tileX},
  tileY: ${LAKE_ZONE.tileY},
  tileW: ${LAKE_ZONE.tileW},
  tileH: ${LAKE_ZONE.tileH},
  x: ${LAKE_ZONE.x},
  y: ${LAKE_ZONE.y},
  width: ${LAKE_ZONE.width},
  height: ${LAKE_ZONE.height},
};

export const VALLEY_STARTER_BUILDINGS: readonly ValleyBuildingPlacement[] = [
  {
    id: 'starter_windmill',
    spriteKey: 'windmill',
    blockX: 27,
    blockY: 49,
    drawWidth: 318,
  },
  {
    id: 'starter_bakery',
    spriteKey: 'bakery',
    blockX: 28,
    blockY: 50,
    drawWidth: 328,
  },
];

export function isLakeTile(tx: number, ty: number): boolean {
  return (
    tx >= VALLEY_LAKE_ZONE.tileX &&
    tx < VALLEY_LAKE_ZONE.tileX + VALLEY_LAKE_ZONE.tileW &&
    ty >= VALLEY_LAKE_ZONE.tileY &&
    ty < VALLEY_LAKE_ZONE.tileY + VALLEY_LAKE_ZONE.tileH
  );
}

export function isBlockOverlappingLake(blockX: number, blockY: number): boolean {
  const blockMinX = VALLEY_BORDER_X + blockX * VALLEY_BLOCK_PX;
  const blockMaxX = blockMinX + VALLEY_BLOCK_PX;
  const blockMinY = VALLEY_BORDER_Y + blockY * VALLEY_BLOCK_PX;
  const blockMaxY = blockMinY + VALLEY_BLOCK_PX;

  const lakeMinX = VALLEY_LAKE_ZONE.x;
  const lakeMaxX = VALLEY_LAKE_ZONE.x + VALLEY_LAKE_ZONE.width;
  const lakeMinY = VALLEY_LAKE_ZONE.y;
  const lakeMaxY = VALLEY_LAKE_ZONE.y + VALLEY_LAKE_ZONE.height;

  return (
    blockMinX < lakeMaxX &&
    blockMaxX > lakeMinX &&
    blockMinY < lakeMaxY &&
    blockMaxY > lakeMinY
  );
}

export function isBlockOccupiedByBuilding(
  blockX: number,
  blockY: number
): boolean {
  for (let i = 0; i < VALLEY_STARTER_BUILDINGS.length; i += 1) {
    const b = VALLEY_STARTER_BUILDINGS[i];

    if (b.blockX === blockX && b.blockY === blockY) {
      return true;
    }
  }

  return false;
}

export function isBlockBlockedForSoil(blockX: number, blockY: number): boolean {
  return (
    isBlockOverlappingLake(blockX, blockY) ||
    isBlockOccupiedByBuilding(blockX, blockY)
  );
}
`;

  writeFileSync(ZONES_TS_PATH, tsContent, 'utf8');
  console.log('Done!');
}

void main();
