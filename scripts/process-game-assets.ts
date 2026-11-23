import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

interface SpriteSourceSpec {
  readonly key: string;
  readonly inputPath: string;
  readonly maxWidth: number;
  readonly flipHorizontal?: boolean;
  readonly removeWhiteBg: boolean;
  readonly clearAllPureWhite?: boolean;
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
const GENERATED_TS_PATH = path.join(ROOT, 'src', 'game', 'town-atlas.ts');

const SPRITE_SPECS: readonly SpriteSourceSpec[] = [
  {
    key: 'soilTilled',
    inputPath: path.join(GAME_ASSET_DIR, 'Cute Isometric Tilled Farm Plot.png'),
    maxWidth: 220,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.56,
  },
  {
    key: 'soilGarden',
    inputPath: path.join(GAME_ASSET_DIR, 'Isometric Garden Plot Tile.png'),
    maxWidth: 220,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.56,
  },
  {
    key: 'soilSeedlings',
    inputPath: path.join(GAME_ASSET_DIR, 'Seedlings and Cornfield Tiles1.png'),
    maxWidth: 220,
    removeWhiteBg: true,
    clearAllPureWhite: true,
    anchorX: 0.5,
    anchorY: 0.62,
  },
  {
    key: 'soilCornfield',
    inputPath: path.join(GAME_ASSET_DIR, 'Seedlings and Cornfield Tiles2.png'),
    maxWidth: 230,
    removeWhiteBg: true,
    clearAllPureWhite: true,
    anchorX: 0.5,
    anchorY: 0.68,
  },
  {
    key: 'tileSnow',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Isometric Terrain Tile.png'),
    maxWidth: 220,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.55,
  },
  {
    key: 'tileGrass',
    inputPath: path.join(GAME_ASSET_DIR, 'Isometric Grassy Farm Tile.png'),
    maxWidth: 220,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.55,
  },
  {
    key: 'fenceRight',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Isometric Farm Fence.png'),
    maxWidth: 200,
    removeWhiteBg: true,
    extraSeeds: [
      [0.5, 0.52],
      [0.5, 0.66],
      [0.42, 0.56],
      [0.58, 0.48],
    ],
    anchorX: 0.5,
    anchorY: 0.72,
  },
  {
    key: 'fenceLeft',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Isometric Farm Fence.png'),
    maxWidth: 200,
    flipHorizontal: true,
    removeWhiteBg: true,
    extraSeeds: [
      [0.5, 0.52],
      [0.5, 0.66],
      [0.42, 0.48],
      [0.58, 0.56],
    ],
    anchorX: 0.5,
    anchorY: 0.72,
  },
  {
    key: 'pineTree',
    inputPath: path.join(GAME_ASSET_DIR, 'Snow-Covered Cartoon Pine Tree.png'),
    maxWidth: 280,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.88,
  },
  {
    key: 'bakery',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Cozy Bakery Storefront.png'),
    maxWidth: 420,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.78,
  },
  {
    key: 'windmill',
    inputPath: path.join(GAME_ASSET_DIR, 'Snowy Windmill Cottage.png'),
    maxWidth: 420,
    removeWhiteBg: true,
    anchorX: 0.5,
    anchorY: 0.82,
  },
  {
    key: 'yeti',
    inputPath: path.join(ROOT, 'assets', 'yeti', 'android-icon-background.png'),
    maxWidth: 160,
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

  return minC >= 224 && chroma <= 26;
}

function stripExteriorWhiteBackground(
  data: Buffer,
  width: number,
  height: number,
  extraSeeds?: readonly (readonly [number, number])[],
  clearAllPureWhite?: boolean
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

  if (clearAllPureWhite) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        const p = idx * 4;
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];
        const minC = Math.min(r, g, b);
        const maxC = Math.max(r, g, b);

        if (minC >= 238 && maxC - minC <= 14) {
          visited[idx] = 1;
          queue[tail] = idx;
          tail += 1;
        }
      }
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

        if (lum >= 205 && chroma <= 38) {
          const factor = Math.max(0, Math.min(1, (242 - lum) / 48));
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

async function processSprite(spec: SpriteSourceSpec): Promise<ProcessedSprite> {
  let pipeline = sharp(spec.inputPath).ensureAlpha();

  if (spec.flipHorizontal) {
    pipeline = pipeline.flop();
  }

  const { data, info } = await pipeline
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.from(data);

  if (spec.removeWhiteBg) {
    stripExteriorWhiteBackground(
      rgba,
      info.width,
      info.height,
      spec.extraSeeds,
      spec.clearAllPureWhite
    );
  }

  const bounds = findAlphaBounds(rgba, info.width, info.height);

  const cropped = sharp(rgba, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  }).extract({
    left: bounds.left,
    top: bounds.top,
    width: bounds.cropWidth,
    height: bounds.cropHeight,
  });

  const resized = await cropped
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

async function compileBaseMap(
  inputName: string,
  outputName: string
): Promise<{ width: number; height: number; bytes: number }> {
  const inputPath = path.join(GAME_ASSET_DIR, inputName);
  const outputPath = path.join(OUTPUT_DIR, outputName);

  const result = await sharp(inputPath)
    .resize({
      width: 1920,
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
    .webp({ quality: 88, effort: 6 })
    .toFile(outputPath);

  return {
    width: result.width,
    height: result.height,
    bytes: result.size,
  };
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('1/3 Compiling Winter & Summer valley base maps to WebP...');

  const [winterMap, summerMap] = await Promise.all([
    compileBaseMap('Pastel Snowy Winter Game Map.png', 'winter-map.webp'),
    compileBaseMap('Vibrant Summer Meadow Game Map.png', 'summer-map.webp'),
  ]);

  console.log(
    `    winter-map.webp: ${winterMap.width}x${winterMap.height} (${(winterMap.bytes / 1024).toFixed(1)} KB)`
  );
  console.log(
    `    summer-map.webp: ${summerMap.width}x${summerMap.height} (${(summerMap.bytes / 1024).toFixed(1)} KB)`
  );

  console.log('2/3 Stripping exterior white backgrounds & trimming 12 sprites...');

  const processed = await Promise.all(SPRITE_SPECS.map(processSprite));
  const atlasWidth = 1024;
  const { packed, atlasHeight } = packSpritesOnShelves(processed, atlasWidth, 10);

  const atlasPath = path.join(OUTPUT_DIR, 'town-atlas.webp');

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
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(atlasPath);

  console.log(
    `    town-atlas.webp: ${atlasWidth}x${atlasHeight} (${(atlasResult.size / 1024).toFixed(1)} KB)`
  );

  console.log('3/3 Generating TypeScript atlas manifest src/game/town-atlas.ts...');

  const frameEntries = packed
    .sort((a, b) => a.key.localeCompare(b.key))
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

export const VALLEY_MAP_WIDTH = ${winterMap.width};
export const VALLEY_MAP_HEIGHT = ${winterMap.height};
export const TOWN_ATLAS_WIDTH = ${atlasWidth};
export const TOWN_ATLAS_HEIGHT = ${atlasHeight};

export type TownSpriteKey =
${packed
  .sort((a, b) => a.key.localeCompare(b.key))
  .map((s) => `  | '${s.key}'`)
  .join('\n')};

export const TOWN_ATLAS_FRAMES = {
${frameEntries}
} as const satisfies Record<TownSpriteKey, AtlasSpriteFrame>;
`;

  writeFileSync(GENERATED_TS_PATH, tsContent, 'utf8');

  const totalKb =
    (winterMap.bytes + summerMap.bytes + atlasResult.size) / 1024;

  console.log(
    `Done! Total compiled WebP asset footprint: ${totalKb.toFixed(1)} KB (down from ~19,000 KB raw PNGs).`
  );
}

void main();
