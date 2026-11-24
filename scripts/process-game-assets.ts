import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import { TOWN_ATLAS_FRAMES, type TownSpriteKey } from '../src/game/town-atlas';

interface SpriteSourceSpec {
  readonly key: string;
  readonly inputPath: string;
  readonly maxWidth: number;
  readonly removeWhiteBg: boolean;
  readonly extraSeeds?: readonly (readonly [number, number])[];
  readonly anchorX: number;
  readonly anchorY: number;
}

interface ProcessedSprite {
  readonly key: string;
  readonly width: number;
  readonly height: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly buffer: Buffer;
}

interface PackedSprite {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly buffer: Buffer;
}

const ROOT = process.cwd();
const GAME_ASSET_DIR = path.join(ROOT, 'assets', 'game_asset');
const OUTPUT_DIR = path.join(GAME_ASSET_DIR, 'compiled');
const LAND_OUTPUT_DIR = path.join(ROOT, 'assets', 'land-asset', 'compiled');
const GENERATED_TS_PATH = path.join(ROOT, 'src', 'game', 'town-atlas.ts');

const SPRITE_SPECS: readonly SpriteSourceSpec[] = [
  {
    key: 'townHall',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Bear Town Hall.png'),
    maxWidth: 420,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'bank',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Bear Bank Treasury.png'),
    maxWidth: 400,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'blacksmith',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Yeti Blacksmith Shop.png'),
    maxWidth: 380,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'tradePost',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Fantasy Market Hall.png'),
    maxWidth: 380,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.82,
  },
  {
    key: 'yetiLodge',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Yeti Cabin Game Icon.png'),
    maxWidth: 360,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'cottage',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Cottage with Glowing Windows.png'),
    maxWidth: 340,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'bakery',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Cozy Bakery Storefront.png'),
    maxWidth: 360,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.80,
  },
  {
    key: 'windmill',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Windmill Cottage.png'),
    maxWidth: 360,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'sawmill',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Cozy Sawmill Workshop.png'),
    maxWidth: 380,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'builderShop',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Architect\u2019s Workshop.png'),
    maxWidth: 380,
    removeWhiteBg: true,
    extraSeeds: [[0.82, 0.28]],
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'yakBarn',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Cozy Barn Game Asset.png'),
    maxWidth: 380,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'cheeseCellar',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Alpine Cheese Creamery.png'),
    maxWidth: 350,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'fishingPier',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Winter Fishing Cabin Dock.png'),
    maxWidth: 380,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'smokehouse',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Medieval Smokehouse Cottage.png'),
    maxWidth: 360,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'constructionFrame',
    inputPath: path.join(
      GAME_ASSET_DIR,
      'Snowy Timber House Under Construction.png'
    ),
    maxWidth: 360,
    removeWhiteBg: true,
    extraSeeds: [
      [0.25, 0.34],
      [0.42, 0.32],
      [0.72, 0.25],
      [0.78, 0.28],
      [0.83, 0.39],
      [0.52, 0.88],
      [0.6, 0.84],
    ],
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'constructionScaffold',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Cottage Under Construction.png'),
    maxWidth: 360,
    removeWhiteBg: true,
    extraSeeds: [
      [0.42, 0.14],
      [0.51, 0.17],
      [0.29, 0.23],
      [0.39, 0.27],
      [0.2, 0.31],
      [0.3, 0.35],
    ],
    anchorX: 0.5,
    anchorY: 0.84,
  },
  {
    key: 'stoneWell',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Medieval Stone Well.png'),
    maxWidth: 260,
    removeWhiteBg: true,
    // Clear hollow open-air windows inside the timber well frame around the rope & bucket
    extraSeeds: [
      [0.37, 0.57],
      [0.62, 0.56],
      [0.41, 0.42],
      [0.58, 0.48],
    ],
    anchorX: 0.5,
    anchorY: 0.86,
  },
  {
    key: 'streetLantern',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Whimsical Lantern Post.png'),
    maxWidth: 160,
    removeWhiteBg: true,
    extraSeeds: [
      [0.64, 0.22],
      [0.51, 0.25],
    ],
    anchorX: 0.43,
    anchorY: 0.94,
  },
  {
    key: 'signpost',
    inputPath: path.join(
      GAME_ASSET_DIR,
      'Snowy Woodland Signpost with Barrels and Crate.png'
    ),
    maxWidth: 210,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.90,
  },
  {
    key: 'pineTree',
    inputPath: path.join(GAME_ASSET_DIR, 'Snow-Covered Cartoon Pine Tree.png'),
    maxWidth: 260,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.90,
  },
  {
    key: 'pineSapling',
    inputPath: path.join(GAME_ASSET_DIR, 'Snow-Capped Cartoon Pine Tree.png'),
    maxWidth: 220,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.90,
  },
  {
    key: 'summerPine',
    inputPath: path.join(GAME_ASSET_DIR, 'Cartoon Evergreen Tree Game Asset.png'),
    maxWidth: 260,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.90,
  },
  {
    key: 'yeti',
    inputPath: path.join(ROOT, 'assets', 'yeti', 'android-icon-background.png'),
    maxWidth: 140,
    removeWhiteBg: false,
    anchorX: 0.5,
    anchorY: 0.86,
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

  return minC >= 228 && chroma <= 24;
}

function stripExteriorWhiteBackground(
  data: Buffer,
  width: number,
  height: number,
  extraSeeds?: readonly (readonly [number, number])[]
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

  if (extraSeeds) {
    for (const [rx, ry] of extraSeeds) {
      const sx = Math.max(0, Math.min(width - 1, Math.round(rx * width)));
      const sy = Math.max(0, Math.min(height - 1, Math.round(ry * height)));

      enqueueIfBg(sx, sy);
    }
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

  // Smoothly de-halo 2px anti-aliased whitish fringe adjacent to removed background
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

        if (lum >= 208 && chroma <= 36) {
          const factor = Math.max(0, Math.min(1, (242 - lum) / 46));
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

      if (alpha > 16) {
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

async function processSprite(
  spec: SpriteSourceSpec,
  existingAtlasBuffer: Buffer | null
): Promise<ProcessedSprite> {
  if (!existsSync(spec.inputPath)) {
    const existingFrame =
      existingAtlasBuffer !== null && spec.key in TOWN_ATLAS_FRAMES
        ? TOWN_ATLAS_FRAMES[spec.key as TownSpriteKey]
        : null;

    if (existingFrame === null || existingAtlasBuffer === null) {
      throw new Error(`Missing source file for sprite "${spec.key}": ${spec.inputPath}`);
    }

    const extracted = await sharp(existingAtlasBuffer)
      .extract({
        left: existingFrame.x,
        top: existingFrame.y,
        width: existingFrame.width,
        height: existingFrame.height,
      })
      .png()
      .toBuffer();

    return {
      key: spec.key,
      width: existingFrame.width,
      height: existingFrame.height,
      anchorX: spec.anchorX,
      anchorY: spec.anchorY,
      buffer: extracted,
    };
  }

  const { data, info } = await sharp(spec.inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.from(data);

  if (spec.removeWhiteBg) {
    stripExteriorWhiteBackground(rgba, info.width, info.height, spec.extraSeeds);
  }

  const bounds = findAlphaBounds(rgba, info.width, info.height);

  const resized = await sharp(rgba, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .extract({
      left: bounds.left,
      top: bounds.top,
      width: bounds.cropWidth,
      height: bounds.cropHeight,
    })
    .resize({
      width: spec.maxWidth,
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    key: spec.key,
    width: resized.info.width,
    height: resized.info.height,
    anchorX: spec.anchorX,
    anchorY: spec.anchorY,
    buffer: resized.data,
  };
}

function packSpritesOnShelves(
  sprites: readonly ProcessedSprite[],
  atlasWidth: number,
  padding: number
): { packed: PackedSprite[]; atlasHeight: number } {
  const sorted = [...sprites].sort((a, b) => b.height - a.height);
  const packed: PackedSprite[] = [];

  let cursorX = padding;
  let cursorY = padding;
  let shelfHeight = 0;

  for (const sprite of sorted) {
    if (cursorX + sprite.width + padding > atlasWidth) {
      cursorX = padding;
      cursorY += shelfHeight + padding;
      shelfHeight = 0;
    }

    packed.push({
      key: sprite.key,
      x: cursorX,
      y: cursorY,
      width: sprite.width,
      height: sprite.height,
      anchorX: sprite.anchorX,
      anchorY: sprite.anchorY,
      buffer: sprite.buffer,
    });

    cursorX += sprite.width + padding;

    if (sprite.height > shelfHeight) {
      shelfHeight = sprite.height;
    }
  }

  const rawHeight = cursorY + shelfHeight + padding;
  const atlasHeight = Math.ceil(rawHeight / 16) * 16;

  return { packed, atlasHeight };
}

async function compileCobblestoneStreets(): Promise<void> {
  mkdirSync(LAND_OUTPUT_DIR, { recursive: true });

  const cobbleSrc = path.join(
    GAME_ASSET_DIR,
    'Hand-Painted Cobblestone Path Texture.png'
  );

  if (!existsSync(cobbleSrc)) {
    console.log(
      '    Cobblestone raw PNG already cleaned up — preserving compiled street WebPs.'
    );

    return;
  }

  // Tile scale tuned so individual 800s flagstones look realistic relative to buildings & lamps
  const tileW = 460;
  const tileH = 306;

  const [summerRes, winterRes] = await Promise.all([
    sharp(cobbleSrc)
      .resize(tileW, tileH, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .webp({ quality: 88, effort: 6 })
      .toFile(path.join(LAND_OUTPUT_DIR, 'summer-street-tile.webp')),
    sharp(cobbleSrc)
      .resize(tileW, tileH, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .modulate({ saturation: 0.42, brightness: 1.08 })
      .tint({ r: 214, g: 226, b: 246 })
      .webp({ quality: 88, effort: 6 })
      .toFile(path.join(LAND_OUTPUT_DIR, 'winter-street-tile.webp')),
  ]);

  console.log(
    `    summer-street-tile.webp (cobblestone): ${summerRes.width}x${summerRes.height} (${(summerRes.size / 1024).toFixed(1)} KB)`
  );
  console.log(
    `    winter-street-tile.webp (frosted cobble): ${winterRes.width}x${winterRes.height} (${(winterRes.size / 1024).toFixed(1)} KB)`
  );
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('1/3 Compiling 800s cobblestone Winter & Summer street textures...');
  await compileCobblestoneStreets();

  console.log(
    `2/3 Stripping exterior white backgrounds & packing all ${SPRITE_SPECS.length} sprites...`
  );

  const atlasPath = path.join(OUTPUT_DIR, 'town-atlas.webp');
  const existingAtlasBuffer = existsSync(atlasPath)
    ? await sharp(atlasPath).ensureAlpha().png().toBuffer()
    : null;

  const processed = await Promise.all(
    SPRITE_SPECS.map((spec) => processSprite(spec, existingAtlasBuffer))
  );
  const atlasWidth = 1600;
  const { packed, atlasHeight } = packSpritesOnShelves(processed, atlasWidth, 12);

  const atlasResult = await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      packed.map((s) => ({
        input: s.buffer,
        left: s.x,
        top: s.y,
      }))
    )
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(atlasPath);

  console.log(
    `    town-atlas.webp: ${atlasWidth}x${atlasHeight} (${(atlasResult.size / 1024).toFixed(1)} KB)`
  );

  console.log('3/3 Generating typed atlas manifest src/game/town-atlas.ts...');

  const sortedByKey = [...packed].sort((a, b) => a.key.localeCompare(b.key));

  const frameEntries = sortedByKey
    .map(
      (s) =>
        `  ${s.key}: {\n    x: ${s.x},\n    y: ${s.y},\n    width: ${s.width},\n    height: ${s.height},\n    anchorX: ${s.anchorX},\n    anchorY: ${s.anchorY},\n  },`
    )
    .join('\n');

  const tsContent = `// Auto-generated by scripts/process-game-assets.ts — do not edit manually.

export interface AtlasSpriteFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly anchorX: number;
  readonly anchorY: number;
}

export const TOWN_ATLAS_WIDTH = ${atlasWidth};
export const TOWN_ATLAS_HEIGHT = ${atlasHeight};

export type TownSpriteKey =
${sortedByKey.map((s) => `  | '${s.key}'`).join('\n')};

export const TOWN_ATLAS_FRAMES = {
${frameEntries}
} as const satisfies Record<TownSpriteKey, AtlasSpriteFrame>;
`;

  writeFileSync(GENERATED_TS_PATH, tsContent, 'utf8');
  console.log('Done!');
}

void main();
